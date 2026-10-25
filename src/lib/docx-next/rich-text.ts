import type { Alignment, DocBlock, Paragraph, TextRun, TextStyle } from "./model";
import { SEMANTIC_LIST_KINDS } from "./model";

/** Parse the editor's sanitized HTML grammar without a DOM or browser measurements. */
type Node = { tag: string; attrs: Record<string, string>; children: (Node | string)[] };
function decode(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (all, key: string) => {
    const named: Record<string, string> = {
      amp: "&",
      lt: "<",
      gt: ">",
      quot: '"',
      apos: "'",
      nbsp: "\u00a0",
    };
    if (!key.startsWith("#")) return named[key.toLowerCase()] ?? all;
    const code =
      key[1].toLowerCase() === "x" ? parseInt(key.slice(2), 16) : parseInt(key.slice(1), 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "\ufffd";
  });
}
function parse(html: string): Node {
  const root: Node = { tag: "root", attrs: {}, children: [] };
  const stack = [root];
  for (const token of html.match(/<!--[\s\S]*?-->|<[^>]*>|[^<]+/g) ?? []) {
    if (token.startsWith("<!--")) continue;
    if (!token.startsWith("<")) {
      stack.at(-1)!.children.push(decode(token));
      continue;
    }
    const tag = token.match(/^<\/?([a-z0-9]+)/i)?.[1]?.toLowerCase();
    if (!tag) continue;
    if (token.startsWith("</")) {
      let index = stack.length - 1;
      while (index > 0 && stack[index].tag !== tag) index -= 1;
      if (index > 0) stack.length = index;
      continue;
    }
    const attrs = Object.fromEntries(
      [...token.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map((match) => [
        match[1].toLowerCase(),
        decode(match[2] ?? match[3]),
      ]),
    );
    const node = { tag, attrs, children: [] };
    stack.at(-1)!.children.push(node);
    if (!["br", "hr", "img"].includes(tag) && !token.endsWith("/>")) stack.push(node);
  }
  return root;
}
function runs(node: Node | string, style: TextStyle, id: string, output: TextRun[]): void {
  if (typeof node === "string") {
    if (node) output.push({ id: `${id}.run:${output.length}`, text: node, style: { ...style } });
    return;
  }
  if (["script", "style", "img"].includes(node.tag)) return;
  const next = { ...style };
  if (["strong", "b"].includes(node.tag)) next.bold = true;
  if (["em", "i"].includes(node.tag)) next.italic = true;
  if (node.tag === "u") next.underline = true;
  const color =
    node.attrs["data-letter-text-color"] ?? node.attrs.style?.match(/color:\s*(#[\da-f]{6})/i)?.[1];
  if (color && /^#[\da-f]{6}$/i.test(color)) next.color = color.slice(1).toUpperCase();
  if (node.tag === "br") {
    output.push({ id: `${id}.run:${output.length}`, text: "\n", style: next });
    return;
  }
  node.children.forEach((child) => runs(child, next, id, output));
}
/** Adjacent items share a list; intervening blocks and separate cells start a new group. */
function groupLists(blocks: DocBlock[]): DocBlock[] {
  let previousKind: Paragraph["list"];
  let groupId: string | undefined;
  for (const block of blocks) {
    if (block.kind === "paragraph" && block.list) {
      if (block.list !== previousKind) groupId = `${block.id}.list`;
      block.listGroupId = groupId;
      previousKind = block.list;
    } else {
      previousKind = undefined;
      groupId = undefined;
    }
    if (block.kind === "table") block.rows.forEach((row) => row.cells.forEach(groupLists));
    else if (block.kind === "columns") block.columns.forEach(groupLists);
    else if ("blocks" in block) groupLists(block.blocks);
  }
  return blocks;
}
export function richLetterBlocks(
  html: string | undefined,
  text: string,
  style: TextStyle,
  spaceMm: number,
  lineHeight: number,
): DocBlock[] {
  const nodes: (Node | string)[] = html?.trim()
    ? parse(html).children
    : text
        .replace(/\r/g, "")
        .split("\n")
        .map((value) => ({ tag: "p", attrs: {}, children: [value] }));
  const make = (node: Node | string, id: string): DocBlock => {
    const columns = typeof node !== "string" ? Number(node.attrs["data-columns"]) : 0;
    if (typeof node !== "string" && (columns === 2 || columns === 3)) {
      const attrs = { ...node.attrs };
      delete attrs["data-columns"];
      attrs["data-align"] = "left";
      return {
        kind: "column-flow",
        id,
        count: columns,
        gapMm: 5,
        blocks: [make({ ...node, attrs }, `${id}.content`)],
      };
    }
    if (typeof node !== "string" && node.tag === "table") {
      const rows = node.children
        .flatMap((child) =>
          typeof child !== "string" && child.tag === "tbody" ? child.children : [child],
        )
        .filter((child): child is Node => typeof child !== "string" && child.tag === "tr");
      const count = Math.max(
        1,
        ...rows.map(
          (row) =>
            row.children.filter(
              (child) => typeof child !== "string" && ["td", "th"].includes(child.tag),
            ).length,
        ),
      );
      return {
        kind: "table",
        id,
        widths: Array(count).fill(1 / count),
        rows: rows.map((row, r) => ({
          keepTogether: false,
          cells: Array.from({ length: count }, (_, c) => {
            const cell = row.children.filter(
              (child): child is Node =>
                typeof child !== "string" && ["td", "th"].includes(child.tag),
            )[c];
            return cell ? cellBlocks(cell, `${id}.row:${r}.cell:${c}`) : [];
          }),
        })),
      };
    }
    if (
      typeof node !== "string" &&
      ["div", "p"].includes(node.tag) &&
      !node.attrs["data-columns"] &&
      node.children.some(
        (child) => typeof child !== "string" && ["div", "p", "table", "hr"].includes(child.tag),
      )
    )
      return { kind: "group", id, blocks: cellBlocks(node, id) };
    const content: TextRun[] = [];
    runs(node, style, id, content);
    const align = typeof node !== "string" ? node.attrs["data-align"] : undefined;
    const paragraph: Paragraph = {
      kind: "paragraph",
      id,
      role: "body",
      runs: content,
      align: ["left", "right", "center", "justify"].includes(align ?? "")
        ? (align as Alignment)
        : "justify",
      beforeMm: 0,
      afterMm: spaceMm,
      lineHeight,
      keepNext: false,
      keepLines: false,
    };
    if (typeof node !== "string" && node.tag === "hr") paragraph.ruleColor = style.color;
    if (
      typeof node !== "string" &&
      SEMANTIC_LIST_KINDS.includes(node.attrs["data-list"] as NonNullable<Paragraph["list"]>)
    )
      paragraph.list = node.attrs["data-list"] as Paragraph["list"];
    return paragraph;
  };
  const cellBlocks = (cell: Node, id: string): DocBlock[] => {
    const blocks: DocBlock[] = [];
    let inline: (Node | string)[] = [];
    const flush = () => {
      if (!inline.length) return;
      blocks.push(make({ ...cell, children: inline }, `${id}.paragraph:${blocks.length}`));
      inline = [];
    };
    for (const child of cell.children) {
      if (typeof child !== "string" && ["div", "p", "table", "hr"].includes(child.tag)) {
        flush();
        blocks.push(make(child, `${id}.block:${blocks.length}`));
      } else inline.push(child);
    }
    flush();
    return blocks;
  };
  return groupLists(
    nodes
      .filter((node) => typeof node !== "string" || !!node.trim())
      .map((node, index) => make(node, `letter.body.paragraph:${index}`)),
  );
}
