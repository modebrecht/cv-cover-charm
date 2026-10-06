import type { Paragraph, ParagraphFrameBlock, TextRun } from "./model";
import { xml, twips } from "./xml";

export function control(id: string, content: string) {
  return `<w:sdt><w:sdtPr><w:alias w:val="${xml(id)}"/><w:tag w:val="${xml(id)}"/></w:sdtPr><w:sdtContent>${content}</w:sdtContent></w:sdt>`;
}
function runProperties(style: TextRun["style"]): string {
  return `<w:rPr><w:rFonts w:ascii="${xml(style.font)}" w:hAnsi="${xml(style.font)}"/><w:b w:val="${style.bold ? 1 : 0}"/><w:i w:val="${style.italic ? 1 : 0}"/>${style.allCaps !== undefined ? `<w:caps w:val="${style.allCaps ? 1 : 0}"/>` : ""}<w:color w:val="${xml(style.color)}"/>${style.trackingPt !== undefined ? `<w:spacing w:val="${Math.round(style.trackingPt * 20)}"/>` : ""}<w:sz w:val="${Math.round(style.sizePt * 2)}"/><w:szCs w:val="${Math.round(style.sizePt * 2)}"/><w:u w:val="${style.underline ? "single" : "none"}"/>${style.backgroundColor ? `<w:shd w:val="clear" w:color="auto" w:fill="${style.backgroundColor}"/>` : ""}</w:rPr>`;
}
function run(value: TextRun): string {
  const tokens = value.text
    .replace(/\r/g, "")
    .split(/(\n|\t)/)
    .map((token) =>
      token === "\n"
        ? "<w:br/>"
        : token === "\t"
          ? "<w:tab/>"
          : `<w:t xml:space="preserve">${xml(token)}</w:t>`,
    )
    .join("");
  return `<w:r>${runProperties(value.style)}${tokens}</w:r>`;
}
export function paragraph(
  value: Paragraph,
  drawingRuns = "",
  numberingId?: number,
  frame?: Pick<ParagraphFrameBlock, "xMm" | "yMm" | "widthMm">,
): string {
  if (value.list && !numberingId) throw new Error(`DOCX Next unplanned list ${value.id}`);
  const style = value.role === "heading" ? "Heading1" : value.role === "title" ? "Title" : "Normal";
  const rule = value.ruleColor
    ? `<w:pBdr><w:bottom w:val="single" w:sz="4" w:space="2" w:color="${xml(value.ruleColor)}"/></w:pBdr>`
    : "";
  const frameProperties = frame
    ? `<w:framePr w:w="${twips(frame.widthMm)}" w:hRule="auto" w:hSpace="0" w:vSpace="0" w:wrap="around" w:vAnchor="page" w:hAnchor="page" w:x="${twips(frame.xMm)}" w:y="${twips(frame.yMm)}"/>`
    : "";
  // Follow schema ordering (numPr, borders/shading, spacing, alignment) for Word compatibility.
  const props = `<w:pPr><w:pStyle w:val="${style}"/><w:keepNext w:val="${value.keepNext ? 1 : 0}"/><w:keepLines w:val="${value.keepLines ? 1 : 0}"/>${frameProperties}<w:widowControl/>${value.list ? `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="${numberingId}"/></w:numPr>` : ""}${rule}<w:spacing w:before="${twips(value.beforeMm)}" w:after="${twips(value.afterMm)}" w:line="${Math.round(240 * value.lineHeight)}" w:lineRule="auto"/>${value.indentMm !== undefined ? `<w:ind w:left="${twips(value.indentMm)}"/>` : ""}<w:jc w:val="${value.align === "justify" ? "both" : value.align}"/>${value.list && value.runs[0] ? runProperties(value.runs[0].style) : ""}</w:pPr>`;
  if (frame)
    // Adjacent native paragraphs form the frame; inline controls preserve field identity.
    return `<w:p>${props}${control(value.id, drawingRuns + (value.runs.map(run).join("") || "<w:r/>"))}</w:p>`;
  return control(
    value.id,
    `<w:p>${props}${drawingRuns}${value.runs.map(run).join("") || "<w:r/>"}</w:p>`,
  );
}
export function emptyParagraphWithRuns(runs = "", keepNext?: boolean) {
  return `<w:p><w:pPr>${keepNext === undefined ? "" : `<w:keepNext w:val="${keepNext ? 1 : 0}"/>`}<w:spacing w:after="0" w:line="20" w:lineRule="exact"/></w:pPr>${runs}</w:p>`;
}
export const emptyParagraph = emptyParagraphWithRuns();
export const pageBreak = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
