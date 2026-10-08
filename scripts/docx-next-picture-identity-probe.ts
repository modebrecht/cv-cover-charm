import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import { pictureGeometry } from "../src/lib/docx-next/picture-geometry";
import {
  PICTURE_IDENTITY_CASES,
  PICTURE_FRAME_CASES,
  PICTURE_PRECISION_CASES,
  PICTURE_WINDOW_CASES,
  PICTURE_SIZE_CASES,
  PICTURE_SIZED_SHAPE_CASES,
  pictureIdentityFixture,
} from "../tests/fixtures/docx-next/sidebar-picture-identity";

const directory = process.argv[2];
const frames = process.argv[3] === "--frames";
const precision = process.argv[3] === "--precision-controls";
const windows = process.argv[3] === "--window-controls";
const sizes = process.argv[3] === "--size-controls";
const sizedShapes = process.argv[3] === "--sized-shape-controls";
const variedPhotos = sizes || sizedShapes;
if (
  !directory ||
  (process.argv.length !== 3 &&
    !((frames || precision || windows || variedPhotos) && process.argv.length === 4))
)
  throw Error(
    "Usage: bun scripts/docx-next-picture-identity-probe.ts QA_DIRECTORY [--frames|--precision-controls|--window-controls|--size-controls|--sized-shape-controls]",
  );
await mkdir(directory, { recursive: true });
const sources = JSON.parse(await readFile(path.join(directory, "images.json"), "utf8"));
const cases = sizedShapes
  ? PICTURE_SIZED_SHAPE_CASES
  : sizes
    ? PICTURE_SIZE_CASES
    : windows
      ? PICTURE_WINDOW_CASES
      : precision
        ? PICTURE_PRECISION_CASES
        : frames
          ? PICTURE_FRAME_CASES
          : PICTURE_IDENTITY_CASES;
const sourceKeys = [
  ...new Set(cases.map((value) => ("sourceKey" in value ? value.sourceKey : "icc-jpeg"))),
];
assert(sourceKeys.every((key) => typeof sources[key] === "string"));
const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
    ? path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, "playwright")
    : "playwright",
);
const build = await Bun.build({
  entrypoints: ["src/lib/docx-next/images.ts"],
  target: "browser",
  format: "esm",
});
assert(build.success);
const moduleCode = await build.outputs[0].text();
const browser = await chromium.launch({
  ...(process.env.DOCX_NEXT_CHROMIUM_PATH
    ? { executablePath: process.env.DOCX_NEXT_CHROMIUM_PATH }
    : {}),
  args: ["--no-sandbox"],
});
const assets = new Map<
  string,
  {
    bytes: Uint8Array;
    widthPx: number;
    heightPx: number;
    contentType: "image/png";
    extension: "png";
  }
>();
try {
  const page = await browser.newPage();
  for (const key of sourceKeys) {
    const asset = await page.evaluate(
      async ({ source, moduleCode }: { source: string; moduleCode: string }) => {
        const mod = await import(`data:text/javascript;base64,${btoa(moduleCode)}`);
        const image = await mod.normalizeBrowserImage(source);
        return { ...image, bytes: Array.from(image.bytes) };
      },
      { source: sources[key], moduleCode },
    );
    assets.set(key, { ...asset, bytes: Uint8Array.from(asset.bytes) });
    const file =
      key === "icc-jpeg"
        ? "canonical-photo.png"
        : `canonical-photo-${key.slice("icc-jpeg-".length)}.png`;
    await writeFile(path.join(directory, file), assets.get(key)!.bytes);
  }
} finally {
  await browser.close();
}
const manifest = [];
let referenceImage;
let referenceFields;
let sizedRectangle;
for (const value of cases) {
  const sourceKey = "sourceKey" in value ? value.sourceKey : "icc-jpeg";
  const source: string = sources[sourceKey];
  const normalized = assets.get(sourceKey)!;
  const originalPixels =
    "originalPixels" in value ? value.originalPixels : { width: 120, height: 180 };
  if (variedPhotos)
    assert.deepEqual({ width: normalized.widthPx, height: normalized.heightPx }, originalPixels);
  const { model, image, fixture } = pictureIdentityFixture(value, source);
  referenceImage ??= image;
  referenceFields ??= fixture.fields;
  if (!frames && !precision && !windows && !variedPhotos) assert.deepEqual(image, referenceImage);
  else {
    assert.equal(image.id, referenceImage.id);
    if (sizes) assert.deepEqual({ ...image, source: referenceImage.source }, referenceImage);
    else if (!sizedShapes) assert.equal(image.source, referenceImage.source);
    if (sizedShapes && "sourceKey" in value) {
      if (!value.ellipse) sizedRectangle = image;
      else assert.deepEqual({ ...image, frame: { ...image.frame, radiusMm: 0 } }, sizedRectangle);
    }
    assert.equal(normalized.heightPx / normalized.widthPx, 1.5);
    const geometry = pictureGeometry(image, normalized, fixture.cellWidthMm);
    if ("crop" in value && !value.crop)
      assert.deepEqual(geometry.crop, { left: 0, top: 0, right: 0, bottom: 0 });
    if ("precision" in value)
      assert.deepEqual(geometry.crop, { left: 8378, top: 24396, right: 11622, bottom: 22255 });
    if ("declaredCrop" in value) assert.deepEqual(geometry.crop, value.declaredCrop);
  }
  assert.deepEqual(
    [...fixture.fields].sort((a, b) => a.fieldId.localeCompare(b.fieldId)),
    [...referenceFields].sort((a, b) => a.fieldId.localeCompare(b.fieldId)),
  );
  const before = structuredClone(model);
  const restored = JSON.parse(JSON.stringify(model));
  const restoredBefore = structuredClone(restored);
  await assert.rejects(renderDossierDocx(model), /diagnostic-picture-identity/);
  await assert.rejects(renderDossierDocx(restored), /diagnostic-picture-identity/);
  const options = {
    allowUnacceptedModelIssues: true,
    normalizeImage: async (value: string) => {
      assert.equal(value, source);
      return normalized;
    },
  };
  const bytes = new Uint8Array(await (await renderDossierDocx(model, options)).arrayBuffer());
  const restoredBytes = new Uint8Array(
    await (await renderDossierDocx(restored, options)).arrayBuffer(),
  );
  assert.deepEqual(bytes, restoredBytes);
  assert.deepEqual(model, before);
  assert.deepEqual(restored, restoredBefore);
  const record = {
    ...fixture,
    ...(variedPhotos
      ? {
          originalPixels,
          canonicalPhotoFile:
            sourceKey === "icc-jpeg"
              ? "canonical-photo.png"
              : `canonical-photo-${sourceKey.slice("icc-jpeg-".length)}.png`,
        }
      : {}),
    pictureId: image.id,
    pictureGeometry: pictureGeometry(image, normalized, fixture.cellWidthMm),
    normalizedSha256: createHash("sha256").update(normalized.bytes).digest("hex"),
    docxSha256: createHash("sha256").update(bytes).digest("hex"),
  };
  manifest.push(record);
  if (precision && manifest.length === 1)
    assert.equal(
      record.docxSha256,
      "8dfabf25a4097cc4ce6065e5a8998713bbd37bc4dfe15bd3e317d22850ac92df",
    );
  if ((windows || variedPhotos) && manifest.length === 1)
    assert.equal(
      record.docxSha256,
      "8792017431b1a913da220b55a4fc7e5d83db749a55eee085741935bbc0856222",
    );
  await writeFile(path.join(directory, value.name + ".docx"), bytes);
  await writeFile(
    path.join(directory, value.name + ".json"),
    JSON.stringify(record, null, 2) + "\n",
  );
}
await writeFile(
  path.join(directory, "picture-identity-manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  `${manifest.length} guarded native picture controls; canonical browser image, complete fields, immutable JSON and restored package identity verified.`,
);
