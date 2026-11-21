import { emu, xml } from "./xml";
import type { pictureGeometry } from "./picture-geometry";

type Geometry = ReturnType<typeof pictureGeometry>;
type TileAlignment = 0 | 1 | 2;
type TileOrigin = readonly [horizontal: TileAlignment, vertical: TileAlignment];
const tileAlignments = [
  ["tl", "t", "tr"],
  ["l", "ctr", "r"],
  ["bl", "b", "br"],
] as const;

function tileOffset(before: number, after: number, alignment: TileAlignment) {
  return ((alignment / 2) * (before + after) - before) / 100000;
}

function cropAxisAlignment(before: number, after: number, frameMm: number) {
  const fullMm = (frameMm * 100000) / (100000 - before - after);
  if (!Number.isFinite(fullMm) || fullMm <= 0) return undefined;
  // Writer stores tile offsets in whole percents of the bitmap. Pick the
  // origin with least visible displacement that keeps the window on one tile.
  let best: TileAlignment | undefined;
  let errorMm = 2; // The dossier's photo parity tolerance in millimetres.
  for (const origin of [1, 0, 2] as const) {
    const offset = tileOffset(before, after, origin);
    const rounded = (Math.sign(offset) * Math.round(Math.abs(offset) * 100)) / 100;
    const drift = rounded - offset;
    const error = Math.abs(drift) * fullMm;
    if (error < errorMm && drift <= before / 100000 && -drift <= after / 100000) {
      best = origin;
      errorMm = error;
    }
  }
  return best;
}

export function roundedCropFallbackOrigin(geometry: Geometry): TileOrigin | undefined {
  const { left, right, top, bottom } = geometry.crop;
  if (geometry.shape === "rect" || !(left || right || top || bottom)) return undefined;
  const horizontal = cropAxisAlignment(left, right, geometry.widthMm);
  const vertical = cropAxisAlignment(top, bottom, geometry.heightMm);
  return horizontal === undefined || vertical === undefined ? undefined : [horizontal, vertical];
}

/** Diagnostic only: a hidden leading character gives Writer a nonempty image range.
 * It deliberately changes photo-field text and does not satisfy the typed-picture contract.
 */
export const PICTURE_RANGE_MARKER =
  '<w:r><w:rPr><w:vanish/></w:rPr><w:t xml:space="preserve">\u200b</w:t></w:r>';

/** The bitmap extent is explicitly 96 DPI; crop becomes tile scale and translation. */
export function pictureTileTransform(
  geometry: Geometry,
  source: { widthPx: number; heightPx: number },
  horizontal: TileAlignment = 0,
  vertical: TileAlignment = 0,
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
  const offsetX = tileOffset(left, right, horizontal);
  const offsetY = tileOffset(top, bottom, vertical);
  const result = {
    tx: Math.round((offsetX / width) * cx),
    ty: Math.round((offsetY / height) * cy),
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
  [x, y]: TileOrigin = [0, 0],
) {
  const tile = pictureTileTransform(geometry, source, x, y);
  const ns = "http://schemas.microsoft.com/office/word/2010/wordprocessingShape";
  const corners =
    geometry.shape === "roundRect"
      ? `<a:gd name="adj" fmla="val ${geometry.cornerAdjustment}"/>`
      : "";
  const outline = geometry.borderWidthMm
    ? `<a:ln w="${emu(geometry.borderWidthMm)}"><a:solidFill><a:srgbClr val="${xml(geometry.borderColor)}"/></a:solidFill></a:ln>`
    : "";
  return `<a:graphic><a:graphicData uri="${ns}"><wps:wsp xmlns:wps="${ns}"><wps:cNvSpPr/><wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${emu(geometry.widthMm)}" cy="${emu(geometry.heightMm)}"/></a:xfrm><a:prstGeom prst="${geometry.shape}"><a:avLst>${corners}</a:avLst></a:prstGeom><a:blipFill dpi="96"><a:blip r:embed="${xml(rid)}"/><a:tile tx="${tile.tx}" ty="${tile.ty}" sx="${tile.sx}" sy="${tile.sy}" flip="none" algn="${tileAlignments[y][x]}"/></a:blipFill>${outline}</wps:spPr><wps:bodyPr/></wps:wsp></a:graphicData></a:graphic>`;
}

/** Use the same image part and drawing anchor for the picture and its shape-fill fallback. */
export function pictureWithCropFallback(
  picture: string,
  geometry: Geometry,
  source: { widthPx: number; heightPx: number },
  rid: string,
  origin: TileOrigin,
) {
  const fallback = nativePictureTileGraphic(geometry, source, rid, origin);
  return `<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main"><mc:Choice Requires="a14">${picture}</mc:Choice><mc:Fallback>${fallback}</mc:Fallback></mc:AlternateContent>`;
}
