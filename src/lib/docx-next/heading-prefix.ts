import type { DocBlock, SectionBlock } from "./model";

/** Attach a heading to an explicitly declared semantic prefix using existing native blocks.
 * The caller declares the prefix boundary; no text, height or page measurement is used.
 * This is opt-in composition. The flowing description is outside the atomic prefix;
 * attachment of its opening is not guaranteed. Default Sidebar support is unchanged.
 */
export function sectionHeadingPrefix(
  section: SectionBlock,
  prefixBlockCount: number,
): SectionBlock {
  const first = section.blocks[0];
  const content = first?.kind === "entry" ? first.blocks : first ? [first] : [];
  if (
    !section.heading ||
    !Number.isInteger(prefixBlockCount) ||
    prefixBlockCount < 1 ||
    prefixBlockCount > content.length ||
    content.slice(0, prefixBlockCount).some((block) => block.kind !== "paragraph")
  )
    throw new Error(`DOCX Next invalid heading prefix ${section.id}`);
  const inset = section.contentIndentMm ?? 0;
  const insetBlocks = (blocks: DocBlock[], id: string): DocBlock[] =>
    !inset || !blocks.length
      ? blocks
      : [
          {
            kind: "section",
            id,
            placement: section.placement,
            width: "full",
            startPage: 1,
            contentIndentMm: inset,
            blocks,
          },
        ];
  const prefix = content
    .slice(0, prefixBlockCount)
    .map((block, index) =>
      index === prefixBlockCount - 1 && block.kind === "paragraph"
        ? { ...block, keepNext: false }
        : block,
    );
  const attachment: DocBlock = {
    kind: "entry",
    id: `${section.id}.heading-prefix`,
    keepTogether: true,
    blocks: [
      { ...section.heading, keepNext: false },
      ...insetBlocks(prefix, `${section.id}.prefix-content`),
    ],
  };
  const blocks: DocBlock[] =
    first.kind === "entry"
      ? [
          {
            ...first,
            keepTogether: false,
            blocks: [
              attachment,
              ...insetBlocks(content.slice(prefixBlockCount), `${first.id}.prefix-tail`),
            ],
          },
        ]
      : [attachment];
  return {
    ...section,
    heading: undefined,
    contentIndentMm: 0,
    blocks: [
      ...blocks,
      ...insetBlocks(section.blocks.slice(1), `${section.id}.prefix-continuation`),
    ],
  };
}
