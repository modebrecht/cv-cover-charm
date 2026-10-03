import type { DossierDocModel } from "./model";
import { DECL, W, xml } from "./xml";
import { WORD_FONTS } from "./fonts";
export function stylesXml(model: DossierDocModel) {
  const run = `<w:rPr><w:rFonts w:ascii="${xml(model.theme.font)}" w:hAnsi="${xml(model.theme.font)}"/><w:color w:val="${model.theme.ink}"/><w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="de-CH"/></w:rPr>`;
  return `${DECL}<w:styles xmlns:w="${W}"><w:docDefaults><w:rPrDefault>${run}</w:rPrDefault><w:pPrDefault><w:pPr><w:widowControl/><w:spacing w:after="80" w:line="288" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/>${run}</w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:outlineLvl w:val="0"/></w:pPr></w:style></w:styles>`;
}
export function fontTableXml(fonts: Set<string>) {
  return `${DECL}<w:fonts xmlns:w="${W}">${[...fonts]
    .sort()
    .map((font) => {
      const fallback =
        Object.values(WORD_FONTS).find((entry) => entry.font === font)?.fallback ??
        "Liberation Sans";
      return `<w:font w:name="${xml(font)}"><w:altName w:val="${xml(fallback)}"/><w:family w:val="auto"/></w:font>`;
    })
    .join("")}</w:fonts>`;
}
export function numberingXml() {
  return `${DECL}<w:numbering xmlns:w="${W}">${Object.values(LIST_DEFINITIONS)
    .map(
      ({ id, format, text }) =>
        `<w:abstractNum w:abstractNumId="${id - 1}"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="${format}"/><w:lvlText w:val="${text}"/><w:lvlJc w:val="left"/><w:pPr><w:tabs><w:tab w:val="num" w:pos="240"/></w:tabs><w:ind w:left="240" w:hanging="240"/></w:pPr></w:lvl></w:abstractNum>`,
    )
    .join("")}${Object.values(LIST_DEFINITIONS)
    .map(({ id }) => `<w:num w:numId="${id}"><w:abstractNumId w:val="${id - 1}"/></w:num>`)
    .join("")}</w:numbering>`;
}
export const LIST_DEFINITIONS = {
  bullet: { id: 1, format: "bullet", text: "•" },
  number: { id: 2, format: "decimal", text: "%1." },
  dash: { id: 3, format: "bullet", text: "–" },
  plus: { id: 4, format: "bullet", text: "+" },
  dot: { id: 5, format: "bullet", text: "·" },
} as const;
