# Core dependency audit

The package keeps Mermaid as an optional peer behind the `./mermaid` and `./markdown` entry points.
A scratch project depending only on the packed tarball and importing the root entry ran:

```sh
npm install
node index.mjs
npm ls mermaid --depth=0
npm audit --omit=dev
```

On 2026-08-21 the core exports loaded, Mermaid was absent, and npm reported zero vulnerabilities
across 147 installed packages.
