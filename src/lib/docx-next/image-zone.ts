import type { ImageBlock, ImageZoneBlock, TableBlock } from "./model";
import { pictureGeometry } from "./picture-geometry";

/** Declared frame dimensions; an unknown aspect ratio must not silently resize a zone. */
export function imageZoneExtent(image: ImageBlock) {
  if (!image.frame) throw new Error(`DOCX Next image zone requires a declared frame ${image.id}`);
  const geometry = pictureGeometry(image, { widthPx: 1, heightPx: 1 }, image.widthMm);
  if (Math.abs(geometry.widthMm - image.widthMm) > 0.001)
    throw new Error(`DOCX Next image zone cannot shrink its authored frame ${image.id}`);
  // Word's picture outline extends one stroke beyond the image fill on each edge.
  return { heightMm: geometry.heightMm, borderOutsetMm: geometry.borderWidthMm };
}

/** Project authored coordinates into one flow track. Above-body Y becomes body-start. */
export function imageZoneFromPage(
  image: ImageBlock,
  track: { leftMm: number; topMm: number; widthMm: number; heightMm: number },
  physicalXmm = image.xMm,
): ImageZoneBlock {
  const { heightMm, borderOutsetMm } = imageZoneExtent(image);
  if (image.placement !== "free" || image.coordinateOrigin !== "page")
    throw new Error(`DOCX Next page image zone requires page coordinates ${image.id}`);
  const topInsetMm = Math.max(0, image.yMm - track.topMm - borderOutsetMm);
  if (
    ![physicalXmm, image.yMm, ...Object.values(track)].every(Number.isFinite) ||
    track.widthMm <= 0 ||
    track.heightMm <= 0 ||
    topInsetMm + heightMm + borderOutsetMm * 2 + 3 > track.heightMm + 0.001
  )
    throw new Error(`DOCX Next image zone exceeds its first-page body ${image.id}`);
  const zone: ImageZoneBlock = {
    kind: "image-zone",
    id: `${image.id}.zone`,
    image: {
      ...image,
      placement: "inline",
      align: "left",
      xMm: 0,
      yMm: 0,
      coordinateOrigin: "content",
    },
    leftInsetMm: physicalXmm - track.leftMm - borderOutsetMm,
    topInsetMm,
    sourceLayout: {
      xMm: image.xMm,
      yMm: image.yMm,
      widthMm: image.widthMm,
      minimumHeightMm: heightMm,
    },
  };
  imageZoneTable(zone, track.widthMm);
  return zone;
}

/** One flowing native cell owns its picture and insets. No XML or page reconstruction. */
export function imageZoneTable(zone: ImageZoneBlock, availableWidthMm: number): TableBlock {
  const image = zone.image;
  const { borderOutsetMm } = imageZoneExtent(image);
  const widthMm = image.widthMm + borderOutsetMm * 2;
  if (
    image.placement !== "inline" ||
    ![zone.leftInsetMm, zone.topInsetMm, availableWidthMm].every(Number.isFinite) ||
    Math.min(zone.leftInsetMm, zone.topInsetMm) < 0 ||
    widthMm + zone.leftInsetMm > availableWidthMm + 0.001
  )
    throw new Error(`DOCX Next image zone exceeds its native track ${zone.id}`);
  return {
    kind: "table",
    id: zone.id,
    widthMm,
    indentMm: zone.leftInsetMm,
    widths: [1],
    rows: [
      {
        cells: [[image]],
        keepTogether: false,
        cellDecorations: [
          {
            // The inline drawing's effect extent already reserves its outline.
            paddingXMm: 0,
            paddingYMm: 0,
            paddingTopMm: zone.topInsetMm,
            paddingBottomMm: 0,
          },
        ],
      },
    ],
  };
}

/** Preserve a free picture's coordinates while letting its track's text wrap around it. */
export function imageZoneAnchor(zone: ImageZoneBlock, availableWidthMm: number): ImageBlock {
  imageZoneTable(zone, availableWidthMm);
  const { borderOutsetMm } = imageZoneExtent(zone.image);
  return {
    ...zone.image,
    placement: "free",
    coordinateOrigin: "content",
    xMm: zone.leftInsetMm + borderOutsetMm,
    yMm: zone.topInsetMm + borderOutsetMm,
    sourceLayout: zone.sourceLayout,
  };
}
