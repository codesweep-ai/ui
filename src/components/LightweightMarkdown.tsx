import {
  createElement,
  Fragment,
  type CSSProperties,
  type ReactNode,
} from "react";

import type {
  MarkdownComponents,
  MarkdownRendererProps,
} from "./MarkdownViewer";

interface RenderContext {
  components: MarkdownComponents;
  keyPrefix: string;
}

interface ListMatch {
  indent: number;
  ordered: boolean;
  marker: string;
  text: string;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  colon: ":",
  gt: ">",
  lt: "<",
  quot: '"',
};

function decodeEntities(value: string) {
  return value.replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z]+);/gi, (entity, name: string) => {
    if (name[0] === "#") {
      const hex = name[1]?.toLowerCase() === "x";
      const codePoint = Number.parseInt(name.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }
    return NAMED_ENTITIES[name.toLowerCase()] ?? entity;
  });
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, "")
    .replace(/ /g, "-");
}

function inlineText(value: string) {
  return decodeEntities(value)
    .replace(/!?(\[)([^\]]+)\]\(([^)]+)\)/g, "$2")
    .replace(/[`*_~]/g, "");
}

function element(
  tag: string,
  props: Record<string, unknown>,
  children: ReactNode,
  context: RenderContext,
  key: string,
) {
  const Component = context.components[tag] ?? tag;
  return createElement(Component, { ...props, key }, children);
}

function appendText(nodes: ReactNode[], value: string) {
  if (!value) return;
  const decoded = decodeEntities(value);
  const previous = nodes[nodes.length - 1];
  if (typeof previous === "string") nodes[nodes.length - 1] = previous + decoded;
  else nodes.push(decoded);
}

function findClosingDelimiter(value: string, start: number, delimiter: string) {
  let cursor = start;
  while (cursor < value.length) {
    const found = value.indexOf(delimiter, cursor);
    if (found < 0) return -1;
    let escapes = 0;
    for (let index = found - 1; index >= 0 && value[index] === "\\"; index--) escapes++;
    if (escapes % 2 === 0) return found;
    cursor = found + delimiter.length;
  }
  return -1;
}

function parseInline(value: string, context: RenderContext): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let part = 0;
  const key = () => `${context.keyPrefix}-i${part++}`;

  while (cursor < value.length) {
    if (value[cursor] === "\\" && cursor + 1 < value.length) {
      appendText(nodes, value[cursor + 1]);
      cursor += 2;
      continue;
    }

    if (value[cursor] === "`") {
      let ticks = 1;
      while (value[cursor + ticks] === "`") ticks++;
      const delimiter = "`".repeat(ticks);
      const end = findClosingDelimiter(value, cursor + ticks, delimiter);
      if (end >= 0) {
        let code = value
          .slice(cursor + ticks, end)
          .replace(/\\\|/g, "|")
          .replace(/\n/g, " ");
        if (/^\s.*\s$/.test(code) && /\S/.test(code)) code = code.slice(1, -1);
        nodes.push(element("code", {}, code, context, key()));
        cursor = end + ticks;
        continue;
      }
    }

    const image = value.slice(cursor).match(/^!\[([^\]]*)\]\((\S+?)(?:\s+["']([^"']*)["'])?\)/);
    if (image) {
      nodes.push(element("img", { src: decodeEntities(image[2]), alt: decodeEntities(image[1]), title: image[3] }, null, context, key()));
      cursor += image[0].length;
      continue;
    }

    const link = value.slice(cursor).match(/^\[([^\]]+)\]\((\S+?)(?:\s+["']([^"']*)["'])?\)/);
    if (link) {
      nodes.push(
        element(
          "a",
          { href: decodeEntities(link[2]), title: link[3] },
          parseInline(link[1], { ...context, keyPrefix: key() }),
          context,
          key(),
        ),
      );
      cursor += link[0].length;
      continue;
    }

    const delimiter = value.startsWith("**", cursor)
      ? "**"
      : value.startsWith("__", cursor)
        ? "__"
        : null;
    if (delimiter) {
      const end = findClosingDelimiter(value, cursor + 2, delimiter);
      if (end > cursor + 2) {
        nodes.push(
          element(
            "strong",
            {},
            parseInline(value.slice(cursor + 2, end), { ...context, keyPrefix: key() }),
            context,
            key(),
          ),
        );
        cursor = end + 2;
        continue;
      }
    }

    if (value.startsWith("~~", cursor)) {
      const end = findClosingDelimiter(value, cursor + 2, "~~");
      if (end > cursor + 2) {
        nodes.push(
          element(
            "del",
            {},
            parseInline(value.slice(cursor + 2, end), { ...context, keyPrefix: key() }),
            context,
            key(),
          ),
        );
        cursor = end + 2;
        continue;
      }
    }

    if (value[cursor] === "\n" && cursor >= 2 && value.slice(cursor - 2, cursor) === "  ") {
      const previous = nodes[nodes.length - 1];
      if (typeof previous === "string") nodes[nodes.length - 1] = previous.slice(0, -2);
      nodes.push(element("br", {}, null, context, key()));
      cursor++;
      continue;
    }

    const nextSpecial = value.slice(cursor + 1).search(/[\\`![\]*_~\n]/);
    const end = nextSpecial < 0 ? value.length : cursor + 1 + nextSpecial;
    appendText(nodes, value.slice(cursor, end));
    cursor = end;
  }

  return nodes;
}

function matchList(line: string): ListMatch | null {
  const match = line.match(/^(\s{0,3})([-+*]|\d+[.)])\s+(.*)$/);
  if (!match) return null;
  return {
    indent: match[1].length,
    ordered: /^\d/.test(match[2]),
    marker: match[2],
    text: match[3],
  };
}

function splitTableRow(line: string) {
  const cells: string[] = [];
  let current = "";
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (char === "\\" && line[index + 1] === "|") {
      current += "\\|";
      index++;
    } else if (char === "|") {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  if (cells[0] === "") cells.shift();
  if (cells[cells.length - 1] === "") cells.pop();
  return cells;
}

function tableDelimiter(line: string) {
  const cells = splitTableRow(line);
  if (cells.length === 0 || cells.some((cell) => !/^:?-+:?$/.test(cell))) return null;
  return cells.map((cell) =>
    cell.startsWith(":") && cell.endsWith(":")
      ? "center"
      : cell.startsWith(":")
        ? "left"
        : cell.endsWith(":")
          ? "right"
          : undefined,
  ) satisfies Array<CSSProperties["textAlign"] | undefined>;
}

function startsBlock(lines: string[], index: number) {
  const line = lines[index] ?? "";
  if (/^\s{0,3}(#{1,6})\s+/.test(line)) return true;
  if (/^\s{0,3}(`{3,}|~{3,})/.test(line)) return true;
  if (/^\s{0,3}>/.test(line)) return true;
  if (matchList(line)) return true;
  if (/^\s{0,3}((\*\s*){3,}|(-\s*){3,}|(_\s*){3,})$/.test(line)) return true;
  return index + 1 < lines.length && tableDelimiter(lines[index + 1]) !== null;
}

function parseBlocks(lines: string[], context: RenderContext): ReactNode[] {
  const blocks: ReactNode[] = [];
  let index = 0;
  let block = 0;
  const nextContext = () => ({ ...context, keyPrefix: `${context.keyPrefix}-b${block++}` });

  while (index < lines.length) {
    if (!lines[index].trim()) {
      index++;
      continue;
    }

    const currentContext = nextContext();
    const fence = lines[index].match(/^\s{0,3}(`{3,}|~{3,})\s*([^\s`]*)?.*$/);
    if (fence) {
      const marker = fence[1];
      const language = fence[2] ?? "";
      const code: string[] = [];
      index++;
      while (index < lines.length && !new RegExp(`^\\s{0,3}${marker[0]}{${marker.length},}\\s*$`).test(lines[index])) {
        code.push(lines[index]);
        index++;
      }
      if (index < lines.length) index++;
      const codeNode = element(
        "code",
        language ? { className: `language-${language}` } : {},
        `${code.join("\n")}\n`,
        currentContext,
        `${currentContext.keyPrefix}-code`,
      );
      blocks.push(element("pre", {}, codeNode, currentContext, currentContext.keyPrefix));
      continue;
    }

    const heading = lines[index].match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      const text = heading[2];
      const tag = `h${heading[1].length}`;
      blocks.push(
        element(
          tag,
          { id: slugify(inlineText(text)) },
          parseInline(text, currentContext),
          currentContext,
          currentContext.keyPrefix,
        ),
      );
      index++;
      continue;
    }

    if (index + 1 < lines.length && /^\s{0,3}(=+|-+)\s*$/.test(lines[index + 1])) {
      const tag = lines[index + 1].trim()[0] === "=" ? "h1" : "h2";
      const text = lines[index].trim();
      blocks.push(element(tag, { id: slugify(inlineText(text)) }, parseInline(text, currentContext), currentContext, currentContext.keyPrefix));
      index += 2;
      continue;
    }

    if (/^\s{0,3}>/.test(lines[index])) {
      const quoteLines: string[] = [];
      while (index < lines.length && (/^\s{0,3}>/.test(lines[index]) || !lines[index].trim())) {
        quoteLines.push(lines[index].replace(/^\s{0,3}> ?/, ""));
        index++;
      }
      blocks.push(element("blockquote", {}, parseBlocks(quoteLines, currentContext), currentContext, currentContext.keyPrefix));
      continue;
    }

    const list = matchList(lines[index]);
    if (list) {
      const ordered = list.ordered;
      const listItems: ReactNode[] = [];
      let hasTasks = false;
      const start = ordered ? Number.parseInt(list.marker, 10) : undefined;
      let itemIndex = 0;

      while (index < lines.length) {
        const item = matchList(lines[index]);
        if (!item || item.ordered !== ordered || item.indent !== list.indent) break;
        const itemContext = { ...currentContext, keyPrefix: `${currentContext.keyPrefix}-li${itemIndex++}` };
        let text = item.text;
        const nestedLines: string[] = [];
        index++;
        while (index < lines.length) {
          const next = matchList(lines[index]);
          if (next && next.indent === list.indent) break;
          if (!lines[index].trim()) {
            nestedLines.push("");
            index++;
            continue;
          }
          const leading = lines[index].match(/^\s*/)?.[0].length ?? 0;
          if (leading > list.indent) {
            nestedLines.push(lines[index].slice(Math.min(leading, list.indent + 2)));
            index++;
            continue;
          }
          break;
        }

        const task = text.match(/^\[([ xX])\]\s+(.*)$/);
        const children: ReactNode[] = [];
        if (task) {
          hasTasks = true;
          text = task[2];
          children.push(
            element(
              "input",
              { type: "checkbox", checked: task[1].toLowerCase() === "x", disabled: true },
              null,
              itemContext,
              `${itemContext.keyPrefix}-check`,
            ),
            " ",
          );
        }
        children.push(...parseInline(text, itemContext));
        if (nestedLines.some((line) => line.trim())) children.push(...parseBlocks(nestedLines, itemContext));
        listItems.push(
          element(
            "li",
            task ? { className: "task-list-item" } : {},
            children,
            itemContext,
            itemContext.keyPrefix,
          ),
        );
      }

      blocks.push(
        element(
          ordered ? "ol" : "ul",
          { ...(ordered && start !== 1 ? { start } : {}), ...(hasTasks ? { className: "contains-task-list" } : {}) },
          listItems,
          currentContext,
          currentContext.keyPrefix,
        ),
      );
      continue;
    }

    const alignments = index + 1 < lines.length ? tableDelimiter(lines[index + 1]) : null;
    if (alignments) {
      const headers = splitTableRow(lines[index]);
      const width = headers.length;
      index += 2;
      const rows: string[][] = [];
      while (
        index < lines.length &&
        lines[index].includes("|") &&
        lines[index].trim() &&
        !matchList(lines[index])
      ) {
        const cells = splitTableRow(lines[index]);
        rows.push(Array.from({ length: width }, (_, cell) => cells[cell] ?? ""));
        index++;
      }
      const renderCells = (cells: string[], tag: "th" | "td", rowKey: string) =>
        cells.map((cell, cellIndex) =>
          element(
            tag,
            alignments[cellIndex] ? { style: { textAlign: alignments[cellIndex] } } : {},
            parseInline(cell, { ...currentContext, keyPrefix: `${rowKey}-c${cellIndex}` }),
            currentContext,
            `${rowKey}-c${cellIndex}`,
          ),
        );
      const headRow = element("tr", {}, renderCells(headers, "th", `${currentContext.keyPrefix}-head`), currentContext, `${currentContext.keyPrefix}-head`);
      const bodyRows = rows.map((row, rowIndex) =>
        element("tr", {}, renderCells(row, "td", `${currentContext.keyPrefix}-r${rowIndex}`), currentContext, `${currentContext.keyPrefix}-r${rowIndex}`),
      );
      blocks.push(
        element(
          "table",
          {},
          [
            element("thead", {}, headRow, currentContext, `${currentContext.keyPrefix}-thead`),
            ...(bodyRows.length ? [element("tbody", {}, bodyRows, currentContext, `${currentContext.keyPrefix}-tbody`)] : []),
          ],
          currentContext,
          currentContext.keyPrefix,
        ),
      );
      continue;
    }

    if (/^\s{0,3}((\*\s*){3,}|(-\s*){3,}|(_\s*){3,})$/.test(lines[index])) {
      blocks.push(element("hr", {}, null, currentContext, currentContext.keyPrefix));
      index++;
      continue;
    }

    const paragraph: string[] = [lines[index].trimStart()];
    index++;
    while (index < lines.length && lines[index].trim() && !startsBlock(lines, index)) {
      paragraph.push(lines[index]);
      index++;
    }
    blocks.push(
      element(
        "p",
        {},
        parseInline(paragraph.join("\n"), currentContext),
        currentContext,
        currentContext.keyPrefix,
      ),
    );
  }

  return blocks;
}

export function LightweightMarkdown({ content, components }: MarkdownRendererProps) {
  return (
    <Fragment>
      {parseBlocks(content.replace(/\r\n?/g, "\n").split("\n"), {
        components,
        keyPrefix: "markdown",
      })}
    </Fragment>
  );
}
