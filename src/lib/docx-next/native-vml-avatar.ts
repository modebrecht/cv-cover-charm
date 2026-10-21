import type { Paragraph, ParagraphFrameBlock } from "./model";
import { twips, xml } from "./xml";

/** Separate, explicit candidate ONLY. One VML circle owns both editable text
 * and color; the exact-height single-cell table provides Word/Writer's
 * vertical text alignment. Writer's bare VML textbox renders text at the top.
 * Do not use for standard production DOCX without desktop Word Save/Reopen QA.
 */
export function nativeVMLAvatarRun(
  frame: ParagraphFrameBlock,
  id: number,
  renderParagraph: (p: Paragraph) => string,
): string {
  const s = frame.surface;
  if (!s || s.diagnosticShapeFormat !== "legacy-vml" ||
      s.radiusMm * 2 !== Math.min(frame.widthMm, s.heightMm) ||
      s.verticalAlign !== "center" ||
      !Number.isFinite(frame.xMm) || !Number.isFinite(frame.yMm))
    throw Error("DOCX Next invalid diagnostic VML avatar");
  const pt = (mm: number) => (mm * 72 / 25.4).toFixed(3);
  const width = twips(frame.widthMm), height = twips(s.heightMm);
  const inside = frame.paragraphs.map(renderParagraph).join("");
  const fill = s.fillColor
    ? ' filled="t" fillcolor="#' + xml(s.fillColor) + '"'
    : ' filled="f"';
  const stroke = s.borderWidthMm && s.borderColor
    ? ' stroked="t" strokecolor="#' + xml(s.borderColor) +
      '" strokeweight="' + pt(s.borderWidthMm) + 'pt"'
    : ' stroked="f"';
  const style = 'position:absolute;margin-left:' + pt(frame.xMm) +
    'pt;margin-top:' + pt(frame.yMm) + 'pt;width:' + pt(frame.widthMm) +
    'pt;height:' + pt(s.heightMm) +
    'pt;z-index:251658240;mso-position-horizontal-relative:page;' +
    'mso-position-vertical-relative:page;mso-wrap-style:none';
  const table = '<w:tbl><w:tblPr><w:tblW w:w="' + width +
    '" w:type="dxa"/><w:tblLayout w:type="fixed"/>' +
    '<w:tblCellMar><w:left w:w="0" w:type="dxa"/>' +
    '<w:right w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr>' +
    '<w:tblGrid><w:gridCol w:w="' + width + '"/></w:tblGrid>' +
    '<w:tr><w:trPr><w:trHeight w:val="' + height +
    '" w:hRule="exact"/></w:trPr><w:tc><w:tcPr>' +
    '<w:tcW w:w="' + width + '" w:type="dxa"/>' +
    '<w:vAlign w:val="center"/></w:tcPr>' + inside +
    '</w:tc></w:tr></w:tbl>';
  return '<w:r><w:pict><v:oval xmlns:v="urn:schemas-microsoft-com:vml"' +
    ' id="' + xml(frame.id) + '-' + id + '" style="' + style + '"' +
    fill + stroke + '><v:textbox inset="0pt,0pt,0pt,0pt"' +
    ' style="mso-fit-shape-to-text:f"><w:txbxContent>' + table +
    '</w:txbxContent></v:textbox></v:oval></w:pict></w:r>';
}
