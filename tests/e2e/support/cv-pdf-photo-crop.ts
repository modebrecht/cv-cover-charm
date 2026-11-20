import { expect, type Locator } from "@playwright/test";
import { createCanvas, loadImage, type Canvas } from "@napi-rs/canvas";
import { readFile } from "node:fs/promises";
import type { CvData } from "../../../src/components/cv/types";

const crop = { shape: "circle", zoom: 1.8, x: 90, y: 10, borderWidth: 0.3 };
const framePoints = [
  [0.3, 0.3],
  [0.7, 0.3],
  [0.3, 0.7],
  [0.7, 0.7],
];

function tileColor(column: number, row: number) {
  return [32 + 64 * column, 32 + 64 * row, 112];
}

// The source image and the circular frame are square. Red encodes horizontal
// position and green encodes vertical position independently.
function croppedColors(zoom: number, x: number, y: number) {
  return framePoints.map(([u, v]) =>
    tileColor(
      Math.floor((4 * (u + ((zoom - 1) * x) / 100)) / zoom),
      Math.floor((4 * (v + ((zoom - 1) * y) / 100)) / zoom),
    ),
  );
}

const expectedColors = croppedColors(crop.zoom, crop.x, crop.y);

export function usePhotoCropFixture(storage: Record<string, string>) {
  const tileSize = 40;
  const canvas = createCanvas(4 * tileSize, 4 * tileSize);
  const context = canvas.getContext("2d");
  for (let row = 0; row < 4; row++) {
    for (let column = 0; column < 4; column++) {
      context.fillStyle = `rgb(${tileColor(column, row).join(",")})`;
      context.fillRect(column * tileSize, row * tileSize, tileSize, tileSize);
    }
  }
  const stored: { data: CvData } = JSON.parse(storage["lebenslauf:v1"]);
  stored.data.person.foto = canvas.toDataURL("image/png");
  storage["lebenslauf:v1"] = JSON.stringify(stored);
  storage["lebenslauf:photo:v2"] = JSON.stringify(crop);
}

function expectPhotoColors(canvas: Canvas, points: number[][], label: string) {
  // Allow JPEG rounding on flat tiles. Neighbouring source tiles differ by 64 levels.
  const maxChannelDelta = 8;
  const context = canvas.getContext("2d");
  for (const [index, [x, y]] of points.entries()) {
    const pixel = context.getImageData(
      Math.floor(x * canvas.width),
      Math.floor(y * canvas.height),
      1,
      1,
    ).data;
    for (const [channel, color] of expectedColors[index].entries()) {
      expect(
        Math.abs(pixel[channel] - color),
        `${label} sample ${index + 1}, RGB channel ${channel + 1}`,
      ).toBeLessThanOrEqual(maxChannelDelta);
    }
  }
}

export async function expectPreviewPhotoCrop(sheet: Locator) {
  const photo = sheet.locator("[data-cv-photo]");
  await photo.locator("img").evaluate((img: HTMLImageElement) => img.decode());
  const points = await sheet.evaluate((page, framePoints) => {
    const sheet = page.getBoundingClientRect();
    const frame = page.querySelector("[data-cv-photo]")!.getBoundingClientRect();
    return framePoints.map(([x, y]) => [
      (frame.left - sheet.left + x * frame.width) / sheet.width,
      (frame.top - sheet.top + y * frame.height) / sheet.height,
    ]);
  }, framePoints);
  const image = await loadImage(await sheet.screenshot({ animations: "disabled", scale: "css" }));
  const canvas = createCanvas(image.width, image.height);
  canvas.getContext("2d").drawImage(image, 0, 0);
  expectPhotoColors(canvas, points, "CV preview photo");
  return points;
}

export async function expectPdfPhotoCrop(path: string, pageNumber: number, points: number[][]) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({ data: new Uint8Array(await readFile(path)), disableFontFace: true });
  try {
    const pdf = await task.promise;
    const firstCv = await pdf.getPage(pageNumber);
    const viewport = firstCv.getViewport({ scale: 96 / 72 });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    await firstCv.render({ canvas: canvas as never, viewport }).promise;
    expectPhotoColors(canvas, points, `PDF page ${pageNumber} photo`);
  } finally {
    await task.destroy();
  }
}
