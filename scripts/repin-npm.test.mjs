import assert from "node:assert/strict";
import test from "node:test";

import { plan, stampOf } from "./repin-npm.mjs";

const SHA = (c) => c.repeat(40);

// A status file whose `built` lists these entries, newest first.
function status(...built) {
  return { schema: 2, built };
}

function build(commit, npm) {
  return { commit, versions: { go: null, images: {}, npm } };
}

// plan() with status files, local builds and an npmjs.com answer given in
// advance, so no test reaches the network or the build store.
function run(pkg, { files = {}, locals = {}, npmjs = () => true, goMod = false, local = true } = {}) {
  const asked = [];
  return plan(pkg, {
    readStatus: async (name) => files[name] ?? null,
    readLocal: async (name) => locals[name] ?? null,
    onNpmjs: async (name, version) => {
      asked.push(`${name}@${version}`);
      return npmjs(name, version);
    },
    goMod,
    local,
  }).then((steps) => ({ steps, asked }));
}

const kinds = (steps) => steps.map((s) => [s.name, s.kind, s.to]);

test("a pin moves to the npm version of the first build its project lists", async () => {
  const { steps } = await run(
    { devDependencies: { "@codesweep-ai/lint": "0.0.0-20260920225222-bf7ecaaea067" } },
    {
      files: {
        "@codesweep-ai/lint": status(
          build(SHA("b"), { "@codesweep-ai/lint": "0.0.0-20260924012322-bbbbbbbbbbbb" }),
          build(SHA("a"), { "@codesweep-ai/lint": "0.0.0-20260923000000-aaaaaaaaaaaa" }),
        ),
      },
    },
  );
  assert.deepEqual(kinds(steps), [["@codesweep-ai/lint", "move", "0.0.0-20260924012322-bbbbbbbbbbbb"]]);
  assert.equal(steps[0].section, "devDependencies");
  assert.equal(steps[0].line, "@codesweep-ai/lint: bbbbbbb, the last commit its CI built");
});

test("a pin already on the last build stays, and says where it is", async () => {
  const version = "0.3.1-dev.20260924012330.ddddddd";
  const { steps } = await run(
    { dependencies: { "@codesweep-ai/ui": version } },
    { files: { "@codesweep-ai/ui": status(build(SHA("d"), { "@codesweep-ai/ui": version })) } },
  );
  assert.deepEqual(kinds(steps), [["@codesweep-ai/ui", "current", version]]);
  assert.equal(steps[0].section, "dependencies");
});

test("a pin whose project lists no build, or cannot be read, is held", async () => {
  const pkg = {
    devDependencies: {
      "@codesweep-ai/ledger": "0.0.0-20260920230337-e974225af350",
      "@codesweep-ai/lint": "0.0.0-20260920225222-bf7ecaaea067",
      "@codesweep-ai/npmrevs": "0.0.0-20260920020255-40937e144093",
    },
  };
  const { steps } = await run(pkg, {
    files: {
      "@codesweep-ai/ledger": status(),
      "@codesweep-ai/lint": { schema: 1, built: { commit: SHA("e") } },
    },
  });
  assert.deepEqual(kinds(steps), [
    ["@codesweep-ai/ledger", "held", undefined],
    ["@codesweep-ai/lint", "held", undefined],
    ["@codesweep-ai/npmrevs", "held", undefined],
  ]);
  for (const s of steps) assert.match(s.line, /held, as its status file lists no build(, and the build store holds none)?$/);
});

test("where npm lists no version yet, the build's npm image names it", async () => {
  // The Pages run npm's own run starts can read npmjs.com before the version it
  // just published is listed there, so the file names it under the image alone.
  const to = "0.0.0-20260924043614-8dc49164da20";
  const { steps } = await run(
    { devDependencies: { "@codesweep-ai/ledger": "0.0.0-20260924012323-7c1bbd8d179a" } },
    {
      files: {
        "@codesweep-ai/ledger": status({
          commit: SHA("8"),
          versions: { go: null, images: { "npm/ledger": to }, npm: {} },
        }),
      },
    },
  );
  assert.deepEqual(kinds(steps), [["@codesweep-ai/ledger", "move", to]]);
});

test("a build that names no npm version holds the pin", async () => {
  const { steps } = await run(
    { dependencies: { "@codesweep-ai/ui": "0.3.1-dev.20260922213837.7d44127" } },
    { files: { "@codesweep-ai/ui": status(build(SHA("f"), {})) } },
  );
  assert.deepEqual(kinds(steps), [["@codesweep-ai/ui", "held", undefined]]);
  assert.match(steps[0].line, /names no npm version/);
});

test("a range is left alone, and so is every package outside the scope", async () => {
  const { steps } = await run({
    dependencies: { "@codesweep-ai/ui": "^0.3.0", react: "18.3.1", "@types/react": "18.3.12" },
  });
  assert.deepEqual(kinds(steps), [["@codesweep-ai/ui", "left", undefined]]);
});

test("without a go.mod, npmrevs moves only to a version npmjs.com holds", async () => {
  const pkg = { devDependencies: { "@codesweep-ai/npmrevs": "0.0.0-20260920020255-40937e144093" } };
  const to = "0.0.0-20260924012324-0b587a7c4645";
  const files = { "@codesweep-ai/npmrevs": status(build(SHA("0"), { "@codesweep-ai/npmrevs": to })) };

  const image = await run(pkg, { files, npmjs: () => false });
  assert.deepEqual(kinds(image.steps), [["@codesweep-ai/npmrevs", "held", undefined]]);
  assert.match(image.steps[0].line, /is only an image/);
  assert.deepEqual(image.asked, [`@codesweep-ai/npmrevs@${to}`]);

  const npm = await run(pkg, { files, npmjs: () => true });
  assert.deepEqual(kinds(npm.steps), [["@codesweep-ai/npmrevs", "move", to]]);
});

test("with a go.mod, npmrevs moves like any pin, and npmjs.com is not asked", async () => {
  const to = "0.0.0-20260924012324-0b587a7c4645";
  const { steps, asked } = await run(
    { devDependencies: { "@codesweep-ai/npmrevs": "0.0.0-20260920020255-40937e144093" } },
    {
      files: { "@codesweep-ai/npmrevs": status(build(SHA("0"), { "@codesweep-ai/npmrevs": to })) },
      npmjs: () => false,
      goMod: true,
    },
  );
  assert.deepEqual(kinds(steps), [["@codesweep-ai/npmrevs", "move", to]]);
  assert.deepEqual(asked, []);
});

test("only npmrevs asks npmjs.com, as only it has to be there before the registry is up", async () => {
  const to = "0.0.0-20260924012322-5ffce6301cbf";
  const { steps, asked } = await run(
    { devDependencies: { "@codesweep-ai/lint": "0.0.0-20260920225222-bf7ecaaea067" } },
    {
      files: { "@codesweep-ai/lint": status(build(SHA("5"), { "@codesweep-ai/lint": to })) },
      npmjs: () => false,
    },
  );
  assert.deepEqual(kinds(steps), [["@codesweep-ai/lint", "move", to]]);
  assert.deepEqual(asked, []);
});

// Local builds, recorded by a clean `make ci` or `npm run ci` in the build store.
const LINT = "@codesweep-ai/lint";
const CI_LINT = "0.0.0-20260925060713-0d7c772789e8";
const LOCAL_LINT = "0.0.0-20260925204130-a8ec53cb0c46";
const lintCI = { [LINT]: status(build("0d7c772789e8".padEnd(40, "0"), { [LINT]: CI_LINT })) };
const lintLocal = (version = LOCAL_LINT) => ({
  [LINT]: { commit: version.slice(-12).padEnd(40, "0"), version, recorded: "2026-09-25T20:42:02Z" },
});
const lintPin = { devDependencies: { [LINT]: "0.0.0-20260924012322-5ffce6301cbf" } };

test("the commit time is read out of either kind of npm version", () => {
  assert.equal(stampOf("0.0.0-20260925204130-a8ec53cb0c46"), "20260925204130");
  assert.equal(stampOf("0.3.1-dev.20260925204130.2a232a0"), "20260925204130");
  assert.equal(stampOf("1.2.3"), null);
});

test("a local build newer than the last CI build is the one pinned, and says so", async () => {
  const { steps } = await run(lintPin, { files: lintCI, locals: lintLocal() });
  assert.deepEqual(kinds(steps), [[LINT, "move", LOCAL_LINT]]);
  assert.equal(steps[0].local, true);
  assert.equal(steps[0].line, `${LINT}: a8ec53c, a local build recorded 2026-09-25 20:42:02Z`);
});

test("a CI build newer than the newest local one wins", async () => {
  const older = "0.0.0-20260925010000-111111111111";
  const { steps } = await run(lintPin, { files: lintCI, locals: lintLocal(older) });
  assert.deepEqual(kinds(steps), [[LINT, "move", CI_LINT]]);
  assert.equal(steps[0].local, false);
});

test("a tie goes to the CI build, which can be pushed", async () => {
  const same = "0.0.0-20260925060713-222222222222";
  const { steps } = await run(lintPin, { files: lintCI, locals: lintLocal(same) });
  assert.deepEqual(kinds(steps), [[LINT, "move", CI_LINT]]);
});

test("with local builds off, only the last CI build counts", async () => {
  const { steps } = await run(lintPin, { files: lintCI, locals: lintLocal(), local: false });
  assert.deepEqual(kinds(steps), [[LINT, "move", CI_LINT]]);
});

test("a project CI never built is pinned at its local build", async () => {
  const { steps } = await run(lintPin, { locals: lintLocal() });
  assert.deepEqual(kinds(steps), [[LINT, "move", LOCAL_LINT]]);
});

test("without a go.mod, npmrevs never moves to a local build", async () => {
  const name = "@codesweep-ai/npmrevs";
  const ci = "0.0.0-20260924012324-0b587a7c4645";
  const { steps } = await run(
    { devDependencies: { [name]: "0.0.0-20260920020255-40937e144093" } },
    {
      files: { [name]: status(build(SHA("0"), { [name]: ci })) },
      locals: { [name]: { commit: SHA("6"), version: "0.0.0-20260925204130-613d6a5b014e", recorded: "x" } },
    },
  );
  assert.deepEqual(kinds(steps), [[name, "move", ci]]);
});
