# Consumer DOM contract checker

Consumer repositories declare every selector that reaches into a UI component.
The declared inventory is primary evidence; the checker also scans CSS and
runtime JavaScript/TypeScript for explicit structural descents and generated
class references.

Run from this package:

```sh
npm run check:consumer-dom -- --root /path/to/consumer --inventory /path/to/consumer-dom-inventory.json
```

At a repository root that contains committed generated or vendored bundles,
exclude those files from the corroborating scan with one or more repeatable
globs:

```sh
npm run check:consumer-dom -- --root /path/to/consumer --inventory /path/to/inventory.json --exclude 'internal/**/assets/**' --exclude 'vendor/**'
```

Globs are matched against forward-slash paths relative to `--root`; `*`, `**`,
and `?` are supported. Exclusions never suppress declared inventory rows, which
remain primary evidence.

The inventory may be a JSON array, or an object with a `selectors` array:

```json
{
  "selectors": [
    {
      "file": "src/app.css",
      "line": 67,
      "selector": "[data-component=MarkdownViewer] [data-markdown-paragraph]",
      "component": "MarkdownViewer"
    },
    {
      "file": "src/App.tsx",
      "line": 263,
      "selector": "[data-search-input]",
      "component": "SearchInput"
    }
  ]
}
```

Each result prints the file, line, selector, evidence source, and whether it
resolves to a hook documented in a component spec. Generated `cs-component-*`
classes are always unresolved. The command exits 1 when any reference is
unresolved, 0 when all resolve, and 2 for invalid input or invocation.
