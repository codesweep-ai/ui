import assert from "node:assert/strict";
import test from "node:test";

import { plan } from "./repin-npm.mjs";

const SHA = (c) => c.repeat(40);

// A status file whose `built` lists these entries, newest first.
function status(...built) {
  return { schema: 2, built };
}

function build(commit, npm) {
  return { commit, versions: { go: null, images: {}, npm } };
}

// plan() with status files and an npmjs.com answer given in advance, so no test
// reaches the network.
function run(pkg, { files = {}, npmjs = () => true, goMod = false } = {}) {
  const asked = [];
  return plan(pkg, {
    readStatus: async (name) => files[name] ?? null,
    onNpmjs: async (name, version) => {
      asked.push(`${name}@${version}`);
      return npmjs(name, version);
    },
    goMod,
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
  for (const s of steps) assert.match(s.line, /held, as its status file lists no build$/);
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
