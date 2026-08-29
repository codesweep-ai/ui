# Packed-package parity

Check B installs `npm pack` output in a scratch copy of `preview/` after removing its source alias.
The scratch app imports every public core and heavy subpath through the package export map. Both
source and installed previews are served with Vite, rendered in Chromium at 1440×900, and compared
with `@codesweep-ai/ui/testing` after the `StreamingText` demo is marked done and Mermaid has
rendered.

The comparison uses a 0.1% changed-pixel threshold and also requires exact equality of the visible
text and semantic-structure sets. On 2026-08-21 it reported equal text sets, equal semantic sets,
matching dimensions, and zero changed pixels. The scratch install reported zero vulnerabilities.
