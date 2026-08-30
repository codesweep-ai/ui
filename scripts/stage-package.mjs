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
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STAGE = join(ROOT, ".package");

const manifest = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

const REPO = "https://github.com/codesweep-ai/ui";

function publishedReadme(text) {
  // Said once, at the top of the list a reader would otherwise start following.
  const docs = "## Docs\n\n";
  const note =
    `The documentation lives in the [codesweep-ai/ui](${REPO})\n` +
    "GitHub repository, and none of it ships in this package.\n\n";
  if (!text.includes(docs)) {
    console.error("stage-package: README.md has no `## Docs` section to introduce.");
    process.exit(1);
  }
  text = text.replace(docs, docs + note);

  // A relative link resolves against the repository, which the reader has not
  // got. GitHub serves a directory under /tree/ and a file under /blob/.
  //
  // The label may itself be an image, as the licence badge is, so it has to be
  // allowed to contain one. Matching `[^\]]*` instead stops at the image's own
  // bracket and leaves that link relative.
  const LINK = /\[((?:[^[\]]|!\[[^\]]*\]\([^)]*\))*)\]\((?!https?:|mailto:|#)([^)\s]+)\)/g;
  text = text.replace(LINK, (whole, label, target) =>
    `[${label}](${REPO}/${target.endsWith("/") ? "tree" : "blob"}/main/${target.replace(/\/$/, "")})`);

  // Nothing may reach the tarball still pointing at a path the reader has not
  // got. A link this missed would 404 from the npm page and from node_modules
  // alike, and neither is somewhere a broken link gets noticed quickly.
  // Deliberately looser than LINK: a form LINK does not recognise, such as a
  // link carrying a title, would otherwise pass through unrewritten and
  // unreported. The guard has to be able to see what the rewrite cannot.
  const missed = text.match(/\]\(\s*(?!https?:|mailto:|#|<)[^)]+\)/g);
  if (missed) {
    console.error(`stage-package: ${missed.length} link(s) still relative: ${missed.join(", ")}`);
    process.exit(1);
  }
  return text;
}

if (!existsSync(join(ROOT, "dist"))) {
  console.error("stage-package: dist/ is not built. Run `npm run build` first.");
  process.exit(1);
}

// A fresh directory every time. Reusing one would keep a file that a later
// build stopped producing, and the tarball would carry it for ever.
rmSync(STAGE, { recursive: true, force: true });
mkdirSync(STAGE);

for (const entry of ["dist", "LICENSE", "NOTICE"]) {
  cpSync(join(ROOT, entry), join(STAGE, entry), { recursive: true });
}

// The one file that differs between the two roots.
writeFileSync(join(STAGE, "README.md"), publishedReadme(readFileSync(join(ROOT, "README.md"), "utf8")));

// The staged manifest describes a package rather than a working repository.
// Dropping the scripts also stops npm running any lifecycle hook against the
// staged copy, so `npm publish .package` builds nothing and packs what is here.
delete manifest.scripts;
delete manifest.devDependencies;
writeFileSync(join(STAGE, "package.json"), JSON.stringify(manifest, null, 2) + "\n");

console.log(`staged ${manifest.name}@${manifest.version} in .package/`);
