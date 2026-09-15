import assert from "node:assert/strict";
import test from "node:test";

import {
  compareVersions,
  containerfile,
  highestVersion,
  imageFor,
  parseName,
  selectRetained,
  tagForCommit,
} from "./npm-images.mjs";

// What an image keeps, and which image a fetch takes, are decided by version
// order, so an order that disagrees with npm's would keep an older build and
// fetch the wrong one.

test("ranks versions the way a registry does", () => {
  const ordered = [
    "0.2.0",
    "0.3.0-dev.9",
    "0.3.0-dev.10",
    "0.3.0-dev.alpha",
    "0.3.0",
    "0.3.1-dev.20260831063919.0d88493",
    "0.3.1-dev.20260915044436.19a76fb",
    "1.0.0",
  ];
  const shuffled = [...ordered].reverse();
  assert.deepEqual(shuffled.sort(compareVersions), ordered);
});

test("ranks Go pseudo-versions by their timestamp", () => {
  // One alphanumeric identifier, so the fixed-width timestamp compares as text.
  assert.equal(compareVersions("0.0.0-20260910225058-47654833d481", "0.0.0-20260915044436-9f21070d14c8"), -1);
});

test("refuses a version that is not semver", () => {
  assert.throws(() => compareVersions("1.0", "1.0.0"), /not a semver version/);
});

test("fetches the highest tag that is a version", () => {
  assert.equal(highestVersion(["latest", "0.3.1-dev.9.19a76fb", "0.3.1-dev.10.0d88493", "0.3.0"]), "0.3.1-dev.10.0d88493");
  assert.equal(highestVersion(["latest"]), undefined);
});

test("finds the image a commit published by the sha its version ends with", () => {
  const sha = "9f21070d14c852ce2745d81836ff6bdbe3b7e3a2";
  const tags = [
    "0.0.0-20260910225058-47654833d481",
    "0.0.0-20260915044436-9f21070d14c8", // Go's twelve characters
    "0.3.1-dev.20260915044436.9f21070", // dev-version.mjs's seven
  ];

  assert.equal(tagForCommit(tags, sha), "0.3.1-dev.20260915044436.9f21070");
  assert.equal(tagForCommit(tags.slice(0, 2), sha), "0.0.0-20260915044436-9f21070d14c8");
  assert.equal(tagForCommit(tags, "0000000000000000000000000000000000000000"), undefined);
  // A release's last identifier is too short to be a sha, so it never matches.
  assert.equal(tagForCommit(["1.2.3"], "3aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"), undefined);
});

test("names the image for the package: its scope the owner, its name the image under npm/", () => {
  assert.equal(imageFor("ghcr.io", "@codesweep-ai/lint"), "ghcr.io/codesweep-ai/npm/lint");
  assert.equal(imageFor("ghcr.io", "@codesweep-ai/ui"), "ghcr.io/codesweep-ai/npm/ui");
  assert.throws(() => parseName("lint"), /not a scoped package name/);
  // A fetch copies every version the newest image holds, so it names no version.
  assert.throws(() => parseName("@codesweep-ai/ui@0.3.0"), /not a scoped package name/);
});

const pkg = (name, version) => ({ name, version, filename: `${name}-${version}.tgz` });

test("keeps the newest of each package name, counted per name", () => {
  const carried = [];
  for (let i = 10; i < 30; i++) {
    carried.push(pkg("@o/cli", `0.1.0-dev.${i}`), pkg("@o/cli-linux-x64", `0.1.0-dev.${i}`));
  }
  const built = [pkg("@o/cli", "0.1.0-dev.30"), pkg("@o/cli-linux-x64", "0.1.0-dev.30")];

  const kept = selectRetained(built, carried, 5);

  for (const name of ["@o/cli", "@o/cli-linux-x64"]) {
    assert.deepEqual(
      kept.filter((p) => p.name === name).map((p) => p.version),
      ["0.1.0-dev.26", "0.1.0-dev.27", "0.1.0-dev.28", "0.1.0-dev.29", "0.1.0-dev.30"],
    );
  }
});

test("keeps this build's tarballs whatever their rank", () => {
  // The image is named for this build's version, so it has to carry that
  // version even when carried versions rank above it.
  const carried = ["0.2.0-dev.1", "0.2.0-dev.2", "0.2.0-dev.3"].map((v) => pkg("@o/ui", v));
  const kept = selectRetained([pkg("@o/ui", "0.1.1-dev.1")], carried, 2);

  assert.deepEqual(kept.map((p) => p.version), ["0.1.1-dev.1", "0.2.0-dev.3"]);
});

test("replaces a carried copy of a version this build made again", () => {
  const carried = { ...pkg("@o/ui", "0.1.1-dev.1"), file: "carried" };
  const built = { ...pkg("@o/ui", "0.1.1-dev.1"), file: "built" };

  assert.deepEqual(selectRetained([built], [carried]).map((p) => p.file), ["built"]);
});

test("gives every tarball a COPY of its own", () => {
  const out = containerfile([pkg("@o/a", "1.0.0"), pkg("@o/b", "1.0.0")], {
    "org.opencontainers.image.source": "https://github.com/o/a",
  });

  assert.equal(
    out,
    [
      "FROM scratch",
      'COPY ["@o/a-1.0.0.tgz","/"]',
      'COPY ["@o/b-1.0.0.tgz","/"]',
      'LABEL org.opencontainers.image.source="https://github.com/o/a"',
      'CMD ["/noop"]',
      "",
    ].join("\n"),
  );
});
