import { walkBlocks, type DossierDocModel, type Paragraph } from "./model";
import { DECL, W } from "./xml";

const LIST_DEFINITIONS = {
  bullet: { abstractId: 0, format: "bullet", text: "•" },
  number: { abstractId: 1, format: "decimal", text: "%1." },
  dash: { abstractId: 2, format: "bullet", text: "–" },
  plus: { abstractId: 3, format: "bullet", text: "+" },
  dot: { abstractId: 4, format: "bullet", text: "·" },
} as const;

/** One central numbering plan: semantic groups own their counters before XML. */
export function planNumbering(model: DossierDocModel) {
  const groups = new Map<string, { id: number; kind: NonNullable<Paragraph["list"]> }>();
  const ids = new Map<string, number>();
  for (const part of [model.cover, model.letter, model.cv]) {
    for (const block of walkBlocks([
      ...part.blocks,
      ...part.header,
      ...(part.firstHeader ?? []),
      ...part.footer,
      ...(part.firstFooter ?? []),
    ])) {
      if (block.kind !== "paragraph" || !block.list) continue;
      if (!LIST_DEFINITIONS[block.list]) throw new Error(`DOCX Next invalid list ${block.id}`);
      if (!block.listGroupId?.trim())
        throw new Error(`DOCX Next missing semantic list group ${block.id}`);
      const key = `${part.id}:${block.listGroupId}`;
      if (!groups.has(key)) groups.set(key, { id: groups.size + 1, kind: block.list });
      const group = groups.get(key)!;
      if (group.kind !== block.list) throw new Error(`DOCX Next mixed list kinds in group ${key}`);
      ids.set(block.id, group.id);
    }
  }
  const abstracts = Object.values(LIST_DEFINITIONS)
    .map(
      ({ abstractId, format, text }) =>
        `<w:abstractNum w:abstractNumId="${abstractId}"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="${format}"/><w:lvlText w:val="${text}"/><w:lvlJc w:val="left"/><w:pPr><w:tabs><w:tab w:val="num" w:pos="240"/></w:tabs><w:ind w:left="240" w:hanging="240"/></w:pPr></w:lvl></w:abstractNum>`,
    )
    .join("");
  const instances = [...groups.values()]
    .map(
      ({ id, kind }) =>
        `<w:num w:numId="${id}"><w:abstractNumId w:val="${LIST_DEFINITIONS[kind].abstractId}"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>`,
    )
    .join("");
  return { ids, xml: `${DECL}<w:numbering xmlns:w="${W}">${abstracts}${instances}</w:numbering>` };
}
