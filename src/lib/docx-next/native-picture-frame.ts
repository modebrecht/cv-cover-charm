import type { ImageBlock } from "./model";
import { emu, xml } from "./xml";

/** Native wrapping container; the picture remains inline in its own typed SDT. */
export function nativePictureFrameRun(
  image: ImageBlock,
  heightMm: number,
  picture: string,
  instanceId: number,
): string {
  // The inline picture owns its stroke reserve through wp:effectExtent. The
  // container encloses that box without applying the same padding a second time.
  const outset = image.frame?.borderWidthMm ?? 0;
  const cx = emu(image.widthMm + outset * 2);
  // Leave room for the inline picture's paragraph baseline as well as its border.
  const cy = emu(heightMm + outset * 2 + 1);
  const ns = "http://schemas.microsoft.com/office/word/2010/wordprocessingShape";
  const shape = `<a:graphic><a:graphicData uri="${ns}"><wps:wsp xmlns:wps="${ns}"><wps:cNvSpPr txBox="1"/><wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></wps:spPr><wps:txbx><w:txbxContent><w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:rPr><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr></w:pPr>${picture}</w:p></w:txbxContent></wps:txbx><wps:bodyPr lIns="0" rIns="0" tIns="0" bIns="0" anchor="t" anchorCtr="0" wrap="none" vertOverflow="overflow" horzOverflow="overflow"><a:noAutofit/></wps:bodyPr></wps:wsp></a:graphicData></a:graphic>`;
  const gap = emu(image.gapMm);
  const pageOwned = image.nativeOwner === "page-frame";
  return `<w:r><w:drawing><wp:anchor distT="${gap}" distB="${gap}" distL="${gap}" distR="${gap}" simplePos="0" relativeHeight="${instanceId}" behindDoc="0" locked="0" layoutInCell="${pageOwned ? 0 : 1}" allowOverlap="0"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="${pageOwned ? "page" : "column"}"><wp:posOffset>${emu(image.xMm - outset)}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="${pageOwned ? "page" : "paragraph"}"><wp:posOffset>${emu(image.yMm - outset)}</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapSquare wrapText="bothSides"/><wp:docPr id="${instanceId}" name="${xml(image.id)}.frame" descr="${xml(image.alt)}"/><wp:cNvGraphicFramePr/>${shape}</wp:anchor></w:drawing></w:r>`;
}
