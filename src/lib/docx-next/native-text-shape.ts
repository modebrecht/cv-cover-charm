import type { Paragraph, ParagraphFrameBlock } from "./model";
import { emu, xml } from "./xml";

/** One DrawingML object owns both native text and paint. No bitmap text/fallback.
 * Word 2010+ candidate; interactive editing and Save/Reopen require Word proof.
 */
export function nativeTextShapeRun(
  frame: ParagraphFrameBlock,
  id: number,
  renderParagraph: (p: Paragraph) => string,
): string {
  const surface = frame.surface;
  if (!surface) throw Error("DOCX Next missing native text-shape surface");
  const cx = emu(frame.widthMm),
    cy = emu(surface.heightMm);
  const radius = Math.min(emu(surface.radiusMm), Math.floor(Math.min(cx, cy) / 2));
  const content = frame.paragraphs.map((p) => renderParagraph(p)).join("");
  const ns = "http://schemas.microsoft.com/office/word/2010/wordprocessingShape";
  // A preset roundRect adds its own inscribed text rectangle before bodyPr
  // padding. CSS border-radius does not. Declare the full text rectangle and
  // a native circular-arc contour, so authored padding has exactly one owner.
  const line = (x: number, y: number) => `<a:lnTo><a:pt x="${x}" y="${y}"/></a:lnTo>`;
  const arc = (start: number) =>
    `<a:arcTo wR="${radius}" hR="${radius}" stAng="${start}" swAng="5400000"/>`;
  const path = radius
    ? `<a:moveTo><a:pt x="${radius}" y="0"/></a:moveTo>${line(cx - radius, 0)}${arc(16200000)}${line(cx, cy - radius)}${arc(0)}${line(radius, cy)}${arc(5400000)}${line(0, radius)}${arc(10800000)}<a:close/>`
    : `<a:moveTo><a:pt x="0" y="0"/></a:moveTo>${line(cx, 0)}${line(cx, cy)}${line(0, cy)}<a:close/>`;
  const geometry = `<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="0" t="0" r="${cx}" b="${cy}"/><a:pathLst><a:path w="${cx}" h="${cy}">${path}</a:path></a:pathLst></a:custGeom>`;
  const shape = `<a:graphic><a:graphicData uri="${ns}"><wps:wsp xmlns:wps="${ns}"><wps:cNvSpPr txBox="1"/><wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>${geometry}<a:solidFill><a:srgbClr val="${xml(surface.fillColor)}"/></a:solidFill><a:ln><a:noFill/></a:ln></wps:spPr><wps:txbx><w:txbxContent>${content}</w:txbxContent></wps:txbx><wps:bodyPr lIns="${emu(surface.paddingXMm)}" rIns="${emu(surface.paddingXMm)}" tIns="${emu(surface.paddingYMm)}" bIns="${emu(surface.paddingYMm)}" anchor="t" anchorCtr="0" wrap="none" vertOverflow="overflow" horzOverflow="overflow"><a:noAutofit/></wps:bodyPr></wps:wsp></a:graphicData></a:graphic>`;
  return `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="${id}" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>${emu(frame.xMm)}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>${emu(frame.yMm)}</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${id}" name="${xml(frame.id)}"/><wp:cNvGraphicFramePr/>${shape}</wp:anchor></w:drawing></w:r>`;
}
