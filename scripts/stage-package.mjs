#!/usr/bin/env node
// Assemble the tarball's contents in a directory, and publish that directory.
//
// The README is the project's own, with two changes a reader who installed the
// package needs. Its relative links point at documents that are not in the
// tarball, so they become absolute URLs into the repository; and the Docs
// section says so plainly, rather than leaving the reader to discover it by
// following one.
//
// Deriving it here rather than keeping a second README in the tree is what
// stops the two drifting: there is one README to edit, and this is the only
// place that knows how the published copy differs from it.
//
// npm always takes README.md from the root of the package it is publishing, and
// no manifest field redirects it. Since this package is the repository, the
// only way to ship a different README is to publish a different root. So this
// builds one: nothing in the working tree is touched, and the staged directory
// is what `npm publish` is pointed at.
//
//   npm run stage && npm publish .package
//
// Publishing from the repository root instead would ship the project README,
// which is why the root manifest refuses it.

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STAGE = join(ROOT, ".package");

const manifest = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

const REPO = "https://github.com/codesweep-ai/ui";

export function publishedReadme(text, ref) {
  if (!ref) throw new Error("stage-package: no commit to pin the documentation links to.");

  // Said once, at the top of the list a reader would otherwise start following.
  const docs = "## Docs\n\n";
  const note =
    `The documentation lives in the [codesweep-ai/ui](${REPO})\n` +
    "GitHub repository rather than in this package. Every link below is pinned\n" +
    `to \`${ref}\`, the commit this build came from, so it describes what you\n` +
    "installed and not whatever `main` holds when you follow it.\n\n" +
    "`catalog.json` is the exception: it ships beside the code. It is the same\n" +
    "index as `CATALOG.md`, as data, and it cannot disagree with the build it\n" +
    "came in.\n\n";
  if (!text.includes(docs)) {
    throw new Error("stage-package: README.md has no `## Docs` section to introduce.");
  }
  text = text.replace(docs, docs + note);

  // A relative link resolves against the repository, which the reader has not
  // got. GitHub serves a directory under /tree/ and a file under /blob/.
  //
  // The label may itself be an image, as the licence badge is, so it has to be
  // allowed to contain one. Matching `[^\]]*` instead stops at the image's own
  // bracket and leaves that link relative.
  const LINK = /\[((?:[^[\]]|!\[[^\]]*\]\([^)]*\))*)\]\((?!https?:|mailto:|#)([^)\s]+)\)/g;
  // Pinned to the commit rather than to `main`. A reader on a dev build from
  // an older commit would otherwise be sent to documentation for code they do
  // not have, which is CUI-071: three applications pinned to one dev build
  // would have started reading a branch 152 commits ahead of it. A sha is
  // available for a dev build and a release alike, and unlike a tag it cannot
  // be repointed afterwards.
  text = text.replace(LINK, (whole, label, target) =>
    `[${label}](${REPO}/${target.endsWith("/") ? "tree" : "blob"}/${ref}/${target.replace(/\/$/, "")})`);

  // Nothing may reach the tarball still pointing at a path the reader has not
  // got. A link this missed would 404 from the npm page and from node_modules
  // alike, and neither is somewhere a broken link gets noticed quickly.
  // Deliberately looser than LINK: a form LINK does not recognise, such as a
  // link carrying a title, would otherwise pass through unrewritten and
  // unreported. The guard has to be able to see what the rewrite cannot.
  const missed = text.match(/\]\(\s*(?!https?:|mailto:|#|<)[^)]+\)/g);
  if (missed) {
    throw new Error(`stage-package: ${missed.length} link(s) still relative: ${missed.join(", ")}`);
  }
  return text;
}

/** The commit this build came from, which build.mjs stamps into dist. */
function builtCommit(root) {
  const stamp = join(root, "dist", "BUILD.json");
  if (!existsSync(stamp)) {
    throw new Error("stage-package: dist/BUILD.json is missing, so there is no commit to pin to.");
  }
  const { sha } = JSON.parse(readFileSync(stamp, "utf8"));
  if (!sha) throw new Error("stage-package: dist/BUILD.json records no sha.");
  return sha;
}

// Importable for its rewrite, which is the part worth testing, without staging
// anything as a side effect of the import.
const invokedDirectly =
  process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url;

if (invokedDirectly) {
try {
if (!existsSync(join(ROOT, "dist"))) {
  console.error("stage-package: dist/ is not built. Run `npm run build` first.");
  process.exit(1);
}

// A fresh directory every time. Reusing one would keep a file that a later
// build stopped producing, and the tarball would carry it for ever.
rmSync(STAGE, { recursive: true, force: true });
mkdirSync(STAGE);

// catalog.json ships: it is the index this project tells an agent to read
// first, and a shipped artifact cannot disagree with the build it came in.
for (const entry of ["dist", "LICENSE", "NOTICE", "catalog.json"]) {
  cpSync(join(ROOT, entry), join(STAGE, entry), { recursive: true });
}

// The one file that differs between the two roots.
writeFileSync(
  join(STAGE, "README.md"),
  publishedReadme(readFileSync(join(ROOT, "README.md"), "utf8"), builtCommit(ROOT)),
);

// The staged manifest describes a package rather than a working repository.
// Dropping the scripts also stops npm running any lifecycle hook against the
// staged copy, so `npm publish .package` builds nothing and packs what is here.
delete manifest.scripts;
delete manifest.devDependencies;
writeFileSync(join(STAGE, "package.json"), JSON.stringify(manifest, null, 2) + "\n");

console.log(`staged ${manifest.name}@${manifest.version} in .package/`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
}
