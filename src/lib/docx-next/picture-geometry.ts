import type { ImageBlock } from "./model";

/** Pure picture geometry, shared by every cover/CV/letter picture. No package/XML work. */
export function pictureGeometry(
  image: ImageBlock,
  source: { widthPx: number; heightPx: number },
  availableWidthMm: number,
) {
  const dimensions = [
    source.widthPx,
    source.heightPx,
    image.widthMm,
    image.maxHeightMm,
    availableWidthMm,
  ];
  if (dimensions.some((value) => !Number.isFinite(value) || value <= 0))
    throw new Error(`Invalid picture dimensions: ${image.id}`);
  const frame = image.frame;
  if (
    frame &&
    (!Number.isFinite(frame.heightRatio) ||
      frame.heightRatio <= 0 ||
      !Number.isFinite(frame.radiusMm) ||
      frame.radiusMm < 0 ||
      !Number.isFinite(frame.zoom) ||
      frame.zoom < 1 ||
      frame.zoom > 3 ||
      !Number.isFinite(frame.xPct) ||
      frame.xPct < 0 ||
      frame.xPct > 100 ||
      !Number.isFinite(frame.yPct) ||
      frame.yPct < 0 ||
      frame.yPct > 100 ||
      !Number.isFinite(frame.borderWidthMm) ||
      frame.borderWidthMm < 0 ||
      frame.borderWidthMm > 6 ||
      !/^[0-9A-F]{6}$/i.test(frame.borderColor))
  )
    throw new Error(`Invalid picture frame: ${image.id}`);
  const heightRatio = frame?.heightRatio ?? source.heightPx / source.widthPx;
  const widthMm = Math.min(image.widthMm, availableWidthMm, image.maxHeightMm / heightRatio);
  const heightMm = widthMm * heightRatio;
  const zoom = frame?.zoom ?? 1;
  const scale = Math.max(widthMm / source.widthPx, heightMm / source.heightPx) * zoom;
  const drawnWidth = source.widthPx * scale,
    drawnHeight = source.heightPx * scale;
  // CSS object-fit:cover centers inside the enlarged image element. Pan positions
  // that element; convert its visible window to native picture crop percentages.
  const left =
    (drawnWidth - widthMm * zoom) / 2 + ((zoom - 1) * widthMm * (frame?.xPct ?? 50)) / 100;
  const top =
    (drawnHeight - heightMm * zoom) / 2 + ((zoom - 1) * heightMm * (frame?.yPct ?? 50)) / 100;
  const percent = (value: number) => Math.max(0, Math.min(99999, Math.round(value * 100000)));
  return {
    widthMm,
    heightMm,
    crop: {
      left: percent(left / drawnWidth),
      top: percent(top / drawnHeight),
      right: percent((drawnWidth - widthMm - left) / drawnWidth),
      bottom: percent((drawnHeight - heightMm - top) / drawnHeight),
    },
    shape: frame && frame.radiusMm >= 999 ? "ellipse" : frame?.radiusMm ? "roundRect" : "rect",
    cornerAdjustment: frame
      ? Math.min(50000, Math.round((frame.radiusMm / Math.min(widthMm, heightMm)) * 100000))
      : 0,
    borderWidthMm: frame?.borderWidthMm ?? 0,
    borderColor: frame?.borderColor ?? "000000",
  };
}
