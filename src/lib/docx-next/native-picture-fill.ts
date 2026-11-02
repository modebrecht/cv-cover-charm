import { emu, xml } from "./xml";
import type { pictureGeometry } from "./picture-geometry";

type Geometry = ReturnType<typeof pictureGeometry>;

/** Diagnostic only: a hidden leading character gives Writer a nonempty image range.
 * It deliberately changes photo-field text and does not satisfy the typed-picture contract.
 */
export const PICTURE_RANGE_MARKER =
  '<w:r><w:rPr><w:vanish/></w:rPr><w:t xml:space="preserve">\u200b</w:t></w:r>';

/** The bitmap extent is explicitly 96 DPI; crop becomes tile scale and translation. */
export function pictureTileTransform(
  geometry: Geometry,
  source: { widthPx: number; heightPx: number },
) {
  const { left, right, top, bottom } = geometry.crop;
  const width = (100000 - left - right) / 100000;
  const height = (100000 - top - bottom) / 100000;
  if (
    [left, right, top, bottom].some(
      (value) => !Number.isSafeInteger(value) || value < 0 || value >= 100000,
    ) ||
    !Number.isSafeInteger(source.widthPx) ||
    !Number.isSafeInteger(source.heightPx) ||
    source.widthPx <= 0 ||
    source.heightPx <= 0 ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0 ||
    !Number.isFinite(geometry.widthMm) ||
    !Number.isFinite(geometry.heightMm) ||
    geometry.widthMm <= 0 ||
    geometry.heightMm <= 0
  )
    throw Error("DOCX Next invalid diagnostic picture tile geometry");
  const cx = emu(geometry.widthMm),
    cy = emu(geometry.heightMm);
  const result = {
    tx: Math.round((-left / 100000 / width) * cx),
    ty: Math.round((-top / 100000 / height) * cy),
    sx: Math.round((cx / (source.widthPx * 9525 * width)) * 100000),
    sy: Math.round((cy / (source.heightPx * 9525 * height)) * 100000),
  };
  if (
    Object.values(result).some((value) => !Number.isSafeInteger(value)) ||
    result.sx <= 0 ||
    result.sy <= 0 ||
    result.sx > 2147483647 ||
    result.sy > 2147483647
  )
    throw Error("DOCX Next invalid diagnostic picture tile transform");
  return result;
}

/** Native shape fill, without pre-cropping or rasterizing the original bitmap. */
export function nativePictureTileGraphic(
  geometry: Geometry,
  source: { widthPx: number; heightPx: number },
  rid: string,
) {
  const tile = pictureTileTransform(geometry, source);
  const ns = "http://schemas.microsoft.com/office/word/2010/wordprocessingShape";
  const corners =
    geometry.shape === "roundRect"
      ? `<a:gd name="adj" fmla="val ${geometry.cornerAdjustment}"/>`
      : "";
  const outline = geometry.borderWidthMm
    ? `<a:ln w="${emu(geometry.borderWidthMm)}"><a:solidFill><a:srgbClr val="${xml(geometry.borderColor)}"/></a:solidFill></a:ln>`
    : "";
  return `<a:graphic><a:graphicData uri="${ns}"><wps:wsp xmlns:wps="${ns}"><wps:cNvSpPr/><wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${emu(geometry.widthMm)}" cy="${emu(geometry.heightMm)}"/></a:xfrm><a:prstGeom prst="${geometry.shape}"><a:avLst>${corners}</a:avLst></a:prstGeom><a:blipFill dpi="96"><a:blip r:embed="${xml(rid)}"/><a:tile tx="${tile.tx}" ty="${tile.ty}" sx="${tile.sx}" sy="${tile.sy}" flip="none" algn="tl"/></a:blipFill>${outline}</wps:spPr><wps:bodyPr/></wps:wsp></a:graphicData></a:graphic>`;
}
