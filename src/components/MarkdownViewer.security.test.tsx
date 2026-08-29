import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MarkdownViewer } from "./MarkdownViewer";
import { MarkdownViewer as RichMarkdownViewer } from "../markdown/rich";

const viewers = [
  ["lightweight", MarkdownViewer],
  ["rich", RichMarkdownViewer],
] as const;

describe.each(viewers)("MarkdownViewer link and HTML policy — %s", (_, Viewer) => {
  it("allows only the documented schemes and relative URLs", () => {
    const content = [
      "[https](https://example.com)",
      "[http](http://example.com)",
      "[ircs](ircs://irc.example.com/channel)",
      "[irc](irc://irc.example.com/channel)",
      "[mail](mailto:team@example.com)",
      "[xmpp](xmpp:room@example.com)",
      "[relative](../guide/readme.md)",
      "[anchor](#heading)",
    ].join(" ");
    const { container } = render(<Viewer content={content} />);
    const hrefs = Array.from(container.querySelectorAll("a"), (link) => link.getAttribute("href"));
    expect(hrefs).toEqual([
      "https://example.com",
      "http://example.com",
      "ircs://irc.example.com/channel",
      "irc://irc.example.com/channel",
      "mailto:team@example.com",
      "xmpp:room@example.com",
      "../guide/readme.md",
      "#heading",
    ]);
  });

  it("empties disallowed schemes", () => {
    const { container } = render(
      <Viewer content={"[js](javascript:alert(1)) [data](data:text/html,boom) [file](file:///etc/passwd) [entity](javascript&#58;alert(1))"} />,
    );
    expect(Array.from(container.querySelectorAll("a"), (link) => link.getAttribute("href"))).toEqual([
      "",
      "",
      "",
      "",
    ]);
  });

  it("renders raw HTML and attribute-shaped text inertly", () => {
    const { container } = render(
      <Viewer content={'<img src=x onerror="alert(1)"> [safe](https://example.com/\" onmouseover=\"alert(1))'} />,
    );
    expect(container.querySelector("article img")).toBeNull();
    expect(container.querySelector("[onerror], [onmouseover]")).toBeNull();
    expect(container.querySelector("article")).toHaveTextContent("<img src=x");
  });
});

describe("MarkdownViewer rich plugin boundary", () => {
  it("escapes raw HTML before rehype plugins receive the tree", () => {
    let sawRawNode = false;
    const auditRawHtml = () => (tree: unknown) => {
      const pending: unknown[] = [tree];
      while (pending.length) {
        const node = pending.pop();
        if (!node || typeof node !== "object") continue;
        const record = node as Record<string, unknown>;
        if (record.type === "raw") sawRawNode = true;
        if (Array.isArray(record.children)) pending.push(...record.children);
      }
    };

    const { container } = render(
      <RichMarkdownViewer
        content={'<button onclick="alert(1)">unsafe</button>'}
        rehypePlugins={[auditRawHtml]}
      />,
    );
    expect(sawRawNode).toBe(false);
    expect(container.querySelector("article button")).toBeNull();
    expect(container.querySelector("article")).toHaveTextContent("<button onclick=");
  });
});
