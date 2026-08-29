import type { jsPDF as JsPdf } from "jspdf";

type PdfFontStyle = "normal" | "bold" | "italic" | "bolditalic";

const CABIN_FILES: Array<{ file: string; style: PdfFontStyle }> = [
  { file: "Cabin-Regular.ttf", style: "normal" },
  { file: "Cabin-Bold.ttf", style: "bold" },
  { file: "Cabin-Italic.ttf", style: "italic" },
  { file: "Cabin-BoldItalic.ttf", style: "bolditalic" },
];

const fontData = new Map<string, Promise<string>>();

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

async function loadFont(file: string): Promise<string> {
  let pending = fontData.get(file);
  if (!pending) {
    pending = fetch(`/fonts/${file}`).then(async (response) => {
      if (!response.ok) throw new Error(`Cabin font could not be loaded: ${file}`);
      return arrayBufferToBase64(await response.arrayBuffer());
    });
    fontData.set(file, pending);
  }
  return pending;
}

/** Register the locally bundled Cabin family on one jsPDF instance. */
export async function registerCabinPdfFonts(pdf: JsPdf): Promise<void> {
  const fonts = await Promise.all(
    CABIN_FILES.map(async ({ file, style }) => ({ file, style, data: await loadFont(file) })),
  );
  for (const { file, style, data } of fonts) {
    pdf.addFileToVFS(file, data);
    pdf.addFont(file, "Cabin", style);
  }
}
