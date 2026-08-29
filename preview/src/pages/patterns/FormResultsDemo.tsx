import { useState, useCallback } from "react";
import {
  Card,
  Dropdown,
  SearchInput,
  HighlightText,
  StatusBadge,
} from "@codesweep-ai/ui";
import { CodeBlock } from "@codesweep-ai/ui/code";
import {
  languageOptions,
  scopeOptions,
  searchResults,
  type SearchResult,
} from "../../data/patternFixtures";

export function FormResultsDemo() {
  const [language, setLanguage] = useState("all");
  const [scope, setScope] = useState("all");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);

  const handleSearch = useCallback(
    (searchValue: string) => {
      if (searchValue === "") {
        setResults(null);
        return;
      }
      // Simulate a search — in a real app this would be an API call.
      // The query narrows the set as it lengthens; the dropdowns narrow it
      // further. Matching the query is what makes a result a result: filtering
      // on the dropdowns alone left rows on screen that the query no longer
      // matched, which read as matches failing to clear (OPEN.md §7.16).
      const needle = searchValue.toLowerCase();
      const filtered = searchResults.filter((r) => {
        if (language !== "all" && r.language !== language) return false;
        if (scope !== "all" && !r.file.startsWith(scope)) return false;
        return (
          r.file.toLowerCase().includes(needle) ||
          r.code.toLowerCase().includes(needle)
        );
      });
      setResults(filtered);
    },
    [language, scope]
  );

  return (
    <div className="cs-preview-pages-patterns-form-results-demo-10 ">
      {/* Search form — pinned at top */}
      <div className="cs-preview-pages-patterns-form-results-demo-11 ">
        <Card header="Code Search">
          <div className="cs-preview-pages-patterns-form-results-demo-13 ">
            <Dropdown
              value={language}
              onChange={setLanguage}
              options={languageOptions}
            />
            <Dropdown
              value={scope}
              onChange={setScope}
              options={scopeOptions}
            />
            <SearchInput
              value={query}
              onChange={setQuery}
              onSearch={handleSearch}
              placeholder="Search for code..."
              minChars={3}
              className="cs-preview-pages-patterns-form-results-demo-15 "
            />
          </div>
        </Card>
      </div>

      {/* Results — scrollable */}
      <div className="cs-preview-pages-patterns-form-results-demo-16 ">
        {results !== null && (
          <div className="cs-preview-pages-patterns-form-results-demo-17 ">
            <span className="cs-preview-pages-patterns-form-results-demo-18 ">
              {results.length} result{results.length !== 1 ? "s" : ""}
            </span>
            {results.length === 0 ? (
              <div className="cs-preview-pages-patterns-form-results-demo-21 ">
                No results found. Try adjusting your filters.
              </div>
            ) : (
              results.map((r, i) => (
                <Card key={i} variant="tight">
                  <div className="cs-preview-pages-patterns-form-results-demo-23 ">
                    <div className="cs-preview-pages-patterns-form-results-demo-24 ">
                      <StatusBadge
                        label={r.relevanceLabel}
                        status={r.relevance}
                      />
                      <span className="cs-preview-pages-patterns-form-results-demo-25 ">
                        <HighlightText text={`${r.file}:${r.line}`} query={query} />
                      </span>
                    </div>
                    <CodeBlock
                      code={r.code}
                      language={r.language}
                      source={r.file}
                      highlightQuery={query}
                    />
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
