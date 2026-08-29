export const markdownConformanceCorpus = `# Parser conformance

Paragraph with **bold text**, \`inline code\`, and an [allowed link](https://example.com/docs).

> A blockquote with **strong text**.

- outer item
  - nested item
- second item

1. first
2. second

| Feature | Detail |
| :--- | ---: |
| inline pipe | \`left \\| right\` |
| nested list source | - outer
  - inner |

\`\`\`typescript
const answer = 42;
\`\`\`

Raw HTML stays text: <button onclick="alert(1)">unsafe</button>.

\`\`\`text
an unclosed fence remains code`;
