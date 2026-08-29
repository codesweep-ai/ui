import type { SpecFrontmatter as Frontmatter } from "../data/specDocs";

/**
 * Every spec carries structured frontmatter — `status`, `since`, `summary`,
 * `use_when`, `avoid_when`, `related`, `note`. Rendered as YAML at the top of
 * the document it just looks like noise, so it becomes this panel instead.
 *
 * `avoid_when` is the row that earns its place: `MarkdownViewer`'s says
 * "Only syntax highlighting is needed → CodeBlock", which is precisely the
 * guidance a consumer needs before it reaches for the heavier entry.
 */
export function SpecFrontmatter({
  frontmatter,
  onSelectRelated,
}: {
  frontmatter: Frontmatter;
  onSelectRelated?: (name: string) => void;
}) {
  const { status, since, summary, use_when, avoid_when, related, note } = frontmatter;
  const hasBody =
    summary || note || use_when?.length || avoid_when?.length || related?.length;
  if (!hasBody && !status) return null;

  return (
    <aside className="cs-preview-spec-frontmatter" data-preview-spec-frontmatter="">
      {(status || since) && (
        <div className="cs-preview-spec-frontmatter-badges">
          {status && <span className="cs-preview-spec-frontmatter-status">{status}</span>}
          {since && <span className="cs-preview-spec-frontmatter-since">since {since}</span>}
        </div>
      )}

      {summary && <p className="cs-preview-spec-frontmatter-summary">{summary}</p>}

      {use_when && use_when.length > 0 && (
        <SpecList title="Use when" items={use_when} />
      )}
      {avoid_when && avoid_when.length > 0 && (
        <SpecList title="Avoid when" items={avoid_when} />
      )}

      {note && <p className="cs-preview-spec-frontmatter-note">{note}</p>}

      {related && related.length > 0 && (
        <div className="cs-preview-spec-frontmatter-related">
          <h4 className="cs-preview-spec-frontmatter-heading">Related</h4>
          <div className="cs-preview-spec-frontmatter-badges">
            {related.map((name) => (
              <button
                key={name}
                type="button"
                className="cs-preview-spec-frontmatter-link"
                onClick={() => onSelectRelated?.(name)}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

function SpecList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="cs-preview-spec-frontmatter-heading">{title}</h4>
      <ul className="cs-preview-spec-frontmatter-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
