export type NormalizedImage = {
  bytes: Uint8Array;
  widthPx: number;
  heightPx: number;
  contentType: "image/png";
  extension: "png";
};
export type ImageNormalizer = (source: string) => Promise<NormalizedImage>;
/** Re-decode every input: browser applies EXIF orientation and converts ICC to canvas sRGB. */
export const normalizeBrowserImage: ImageNormalizer = async (source) => {
  if (!/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(source))
    throw new Error("DOCX Next supports uploaded PNG/JPEG/WebP/GIF image data URLs.");
  if (typeof document === "undefined" || typeof Image === "undefined")
    throw new Error("DOCX Next image normalization requires a browser or explicit image adapter.");
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const value = new Image();
    value.onload = () => resolve(value);
    value.onerror = () => reject(new Error("DOCX Next could not decode an image."));
    value.src = source;
  });
  if (!image.naturalWidth || !image.naturalHeight)
    throw new Error("DOCX Next image has no dimensions.");
  const ratio = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const context = canvas.getContext("2d", { colorSpace: "srgb" });
  if (!context) throw new Error("DOCX Next image normalization could not allocate a canvas.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const data = atob(canvas.toDataURL("image/png").split(",")[1]);
  return {
    bytes: Uint8Array.from(data, (char) => char.charCodeAt(0)),
    widthPx: canvas.width,
    heightPx: canvas.height,
    extension: "png",
    contentType: "image/png",
  };
};
export function imageCache(normalize: ImageNormalizer) {
  const cached = new Map<string, Promise<NormalizedImage>>();
  return (source: string) => {
    if (!cached.has(source))
      cached.set(
        source,
        normalize(source).then((asset) => {
          if (
            !asset.bytes.length ||
            !Number.isFinite(asset.widthPx) ||
            !Number.isFinite(asset.heightPx) ||
            asset.widthPx <= 0 ||
            asset.heightPx <= 0
          )
            throw new Error("DOCX Next image adapter returned an invalid image.");
          return asset;
        }),
      );
    return cached.get(source)!;
  };
}
