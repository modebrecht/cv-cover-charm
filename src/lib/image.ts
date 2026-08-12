import { PHOTO } from "@/default-config";

/**
 * Skaliert ein hochgeladenes Foto herunter und gibt eine JPEG-Data-URL zurück.
 * Ohne das landet ein 8-MB-Handyfoto unkomprimiert im State, im JSON-Export
 * und im PDF-Rendering.
 */
export function readPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Datei konnte nicht gelesen werden"));
    reader.onload = () => {
      const src = String(reader.result);
      const img = new Image();
      img.onerror = () => reject(new Error("Bildformat wird nicht unterstützt"));
      img.onload = () => {
        const scale = Math.min(1, PHOTO.MAX_EDGE / Math.max(img.width, img.height));
        if (scale === 1 && src.length < 600_000) {
          resolve(src);
          return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(src);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", PHOTO.QUALITY));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}
