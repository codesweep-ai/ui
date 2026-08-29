/**
 * One document, chosen so that every rung of the ladder is visibly different.
 *
 * - tables, task lists, strikethrough, alerts, links: identical on every flavor,
 *   because the lightweight parser implements all of them. That is the point —
 *   most consumers never need to leave flavor 1.
 * - the ```bash fence: flat text until a flavor supplies highlighting.
 * - the ```mermaid fence: a code block until a flavor supplies a renderer.
 * - the footnote and the bare autolink: rendered as literal text by the
 *   lightweight parser and properly by the rich one. Without these, flavor 4
 *   looks like it buys nothing and someone picks it by default again.
 */
export const flavorSampleDoc = `## Release checklist

Tables, task lists and alerts render the same on **every** flavor below.

| Gate | Stage | Blocking |
| :--- | :---- | -------: |
| \`npm test\` | build | yes |
| visual parity | review | yes |

- [x] tag the release
- [ ] publish the notes
- ~~roll back the previous tag~~

> [!NOTE]
> The lightweight parser already covers everything above.

Install it:

\`\`\`bash
# flat text until a flavor adds highlighting
export ENTRY="@codesweep-ai/ui/markdown"
if [ -z "$ENTRY" ]; then
  echo "pick a flavor first" >&2
  exit 1
fi
npm install "$ENTRY" && npm run size:subpaths
\`\`\`

\`\`\`mermaid
flowchart LR
  Author --> Viewer
  Viewer --> Reader
\`\`\`

Footnotes[^1] and bare autolinks like <https://example.com/docs> need the full
parser — the lightweight one leaves both as literal text.

[^1]: Only flavors 4 and above resolve this.
`;
