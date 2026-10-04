import type { DossierDocModel } from "./model";
import { DECL, W, xml } from "./xml";
import { fontDefinition } from "./fonts";
export function stylesXml(model: DossierDocModel) {
  const run = `<w:rPr><w:rFonts w:ascii="${xml(model.theme.font)}" w:hAnsi="${xml(model.theme.font)}"/><w:color w:val="${model.theme.ink}"/><w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="de-CH"/></w:rPr>`;
  return `${DECL}<w:styles xmlns:w="${W}"><w:docDefaults><w:rPrDefault>${run}</w:rPrDefault><w:pPrDefault><w:pPr><w:widowControl/><w:spacing w:after="80" w:line="288" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/>${run}</w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:outlineLvl w:val="0"/></w:pPr></w:style></w:styles>`;
}
export function fontTableXml(fonts: Set<string>) {
  return `${DECL}<w:fonts xmlns:w="${W}">${[...fonts]
    .sort()
    .map((font) => {
      const definition = fontDefinition(font);
      return `<w:font w:name="${xml(font)}"><w:altName w:val="${xml(definition.fallback)}"/><w:family w:val="${definition.family}"/><w:pitch w:val="${definition.pitch}"/></w:font>`;
    })
    .join("")}</w:fonts>`;
}
