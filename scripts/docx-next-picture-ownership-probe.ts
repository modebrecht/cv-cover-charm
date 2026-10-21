import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import {
  PICTURE_OWNERSHIP_CASES,
  pictureOwnershipFixture,
} from "../tests/fixtures/docx-next/picture-ownership";

const [directory, pngFile] = process.argv.slice(2);
if (!directory || !pngFile || process.argv.length !== 4)
  throw new Error("Usage: bun scripts/docx-next-picture-ownership-probe.ts OUTPUT FULL_PHOTO.png");
const bytes = new Uint8Array(await readFile(pngFile));
const signature = [137, 80, 78, 71, 13, 10, 26, 10];
if (bytes.length < 33 || !signature.every((byte, index) => bytes[index] === byte))
  throw new Error("Ownership probe requires a complete PNG source");
const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
const widthPx = view.getUint32(16),
  heightPx = view.getUint32(20);
if (!widthPx || !heightPx) throw new Error("Ownership probe requires nonzero source dimensions");
await mkdir(directory, { recursive: true });
const manifest = [];
for (const kind of PICTURE_OWNERSHIP_CASES) {
  const { model } = pictureOwnershipFixture(kind, "ownership-probe-source");
  const data = new Uint8Array(
    await (
      await renderDossierDocx(model, {
        allowUnacceptedModelIssues: true,
        normalizeImage: async () => ({
          bytes,
          widthPx,
          heightPx,
          contentType: "image/png",
          extension: "png",
        }),
      })
    ).arrayBuffer(),
  );
  await writeFile(path.join(directory, kind + ".docx"), data);
  manifest.push({
    fixture: kind,
    photo: kind.startsWith("photo"),
    docxSha256: createHash("sha256").update(data).digest("hex"),
  });
}
await writeFile(
  path.join(directory, "ownership-manifest.json"),
  JSON.stringify(
    {
      imageAdapter: "Explicit full PNG; not a browser-normalized official fixture replay",
      photoSha256: createHash("sha256").update(bytes).digest("hex"),
      widthPx,
      heightPx,
      fixtures: manifest,
    },
    null,
    2,
  ) + "\n",
);
console.log(`${manifest.length} guarded picture ownership sources generated.`);
