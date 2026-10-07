import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import { pictureGeometry } from "../src/lib/docx-next/picture-geometry";
import {
  PICTURE_IDENTITY_CASES,
  pictureIdentityFixture,
} from "../tests/fixtures/docx-next/sidebar-picture-identity";

const directory = process.argv[2];
if (!directory || process.argv.length !== 3)
  throw Error("Usage: bun scripts/docx-next-picture-identity-probe.ts QA_DIRECTORY");
await mkdir(directory, { recursive: true });
const sources = JSON.parse(await readFile(path.join(directory, "images.json"), "utf8"));
const source: string = sources["icc-jpeg"];
assert(source);
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
let asset;
try {
  const page = await browser.newPage();
  asset = await page.evaluate(
    async ({ source, moduleCode }: { source: string; moduleCode: string }) => {
      const mod = await import(`data:text/javascript;base64,${btoa(moduleCode)}`);
      const image = await mod.normalizeBrowserImage(source);
      return { ...image, bytes: Array.from(image.bytes) };
    },
    { source, moduleCode },
  );
} finally {
  await browser.close();
}
const normalized = { ...asset, bytes: Uint8Array.from(asset.bytes) };
await writeFile(path.join(directory, "canonical-photo.png"), normalized.bytes);
const manifest = [];
let referenceImage;
let referenceFields;
for (const value of PICTURE_IDENTITY_CASES) {
  const { model, image, fixture } = pictureIdentityFixture(value, source);
  referenceImage ??= image;
  referenceFields ??= fixture.fields;
  assert.deepEqual(image, referenceImage);
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
    pictureId: image.id,
    pictureGeometry: pictureGeometry(image, normalized, fixture.cellWidthMm),
    normalizedSha256: createHash("sha256").update(normalized.bytes).digest("hex"),
    docxSha256: createHash("sha256").update(bytes).digest("hex"),
  };
  manifest.push(record);
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
  "Eight guarded native picture/context controls; canonical browser image, complete fields, immutable JSON and restored package identity verified.",
);
