import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { validateDecoration, type DecorationRasterizer } from "../src/lib/docx-next/decoration";
import { buildDossierDocModel } from "../src/lib/docx-next/build-model";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import { pictureOwnershipFixture } from "../tests/fixtures/docx-next/picture-ownership";

const [directory, pngFile] = process.argv.slice(2);
if (!directory || !pngFile || process.argv.length !== 4)
  throw new Error(
    "Usage: bun scripts/docx-next-sidebar-word-layout-packet.ts OUTPUT FULL_PHOTO.png",
  );
const bytes = new Uint8Array(await readFile(pngFile));
if (![137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value))
  throw new Error("A complete PNG source is required");
const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
const widthPx = view.getUint32(16),
  heightPx = view.getUint32(20);
// Explicit offline adapter for this packet's solid placeholder paint only.
// Production continues to use the browser rasterizer. Unsupported paint fails closed.
const sharp = createRequire(
  path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES ?? process.cwd(), "package.json"),
)("sharp");
const rasterizeDecoration: DecorationRasterizer = async (shape) => {
  validateDecoration(shape);
  if (
    !["rect", "circle"].includes(shape.shape) ||
    shape.layers ||
    shape.viewport ||
    shape.fill?.endColor ||
    shape.fill?.stops ||
    shape.fill?.radialFade
  )
    throw new Error("Packet adapter supports solid rectangle/circle paint only");
  const { widthMm: w, heightMm: h } = shape;
  const inset = shape.stroke.widthMm / 2;
  const geometry =
    shape.shape === "circle"
      ? `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2 - inset}" ry="${h / 2 - inset}"/>`
      : `<rect x="${inset}" y="${inset}" width="${w - 2 * inset}" height="${h - 2 * inset}" rx="${shape.radiusMm}"/>`;
  const scale = Math.min(8, 1600 / Math.max(w, h));
  const paintWidth = Math.round(w * scale),
    paintHeight = Math.round(h * scale);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${paintWidth}" height="${paintHeight}" viewBox="0 0 ${w} ${h}"><g opacity="${shape.opacity}" fill="${shape.fill ? "#" + shape.fill.color : "none"}" stroke="#${shape.stroke.color}" stroke-width="${shape.stroke.widthMm}">${geometry}</g></svg>`;
  const paint = await sharp(Buffer.from(svg)).png().toBuffer();
  return {
    bytes: new Uint8Array(paint),
    widthPx: paintWidth,
    heightPx: paintHeight,
    contentType: "image/png",
    extension: "png",
  };
};
await mkdir(directory, { recursive: true });
const cases = [
  ["left", "01-Links-ohne-Foto"],
  ["photo-right", "02-Foto-rechts"],
  ["photo-left", "03-Foto-links"],
  ["photo-free-portrait", "04-Foto-Portrait"],
  ["photo-free-mirrored-side", "05-Freies-Foto-rechts"],
  ["both-long-right", "06-Langer-CV-rechts"],
] as const;
const manifest = [];
for (const [kind, filename] of cases) {
  const { input } = pictureOwnershipFixture(kind, "full-source-png");
  const model = buildDossierDocModel(input, {
    cvSidebarComposition: "body-stories",
    chromeFirstPageIdentity: "distinct-stories",
    coverComposition: "authored-frames",
  });
  const blob = await renderDossierDocx(model, {
    allowUnacceptedModelIssues: true,
    rasterizeDecoration,
    onDecorationFailure: (id, error) => {
      throw new Error(`Packet paint failed: ${id}`, { cause: error });
    },
    normalizeImage: async () => ({
      bytes,
      widthPx,
      heightPx,
      contentType: "image/png",
      extension: "png",
    }),
  });
  const docx = new Uint8Array(await blob.arrayBuffer());
  await writeFile(path.join(directory, filename + ".docx"), docx);
  manifest.push({
    fixture: kind,
    filename: filename + ".docx",
    photo: kind.startsWith("photo"),
    docxSha256: createHash("sha256").update(docx).digest("hex"),
  });
}
await writeFile(
  path.join(directory, "packet-manifest.json"),
  JSON.stringify(
    {
      sourceBase: "bc26a9472cf802828b5cd7e92d885954d82cec3c",
      coverComposition: "authored-frames",
      imageAdapter: "Explicit complete PNG; not browser-normalized acceptance fixtures",
      photoSha256: createHash("sha256").update(bytes).digest("hex"),
      widthPx,
      heightPx,
      fixtures: manifest,
    },
    null,
    2,
  ) + "\n",
);
console.log(`${manifest.length} fresh dossier sources generated with the current authored cover.`);
