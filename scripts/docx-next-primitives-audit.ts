/** Read-only Item 13 evidence: existing primitives, real canvas paint and portable packages.
 * Run with Bun: ROOT OUTPUT_JSON. ROOT may be a detached authoritative-base worktree.
 * No native application, Sidebar diagnostic, export toggle or deployment is invoked.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { TemplateMotif } from "../src/lib/docx-next/templates";
import type { DecorationPaint } from "../src/lib/docx-next/decoration";
import type { NormalizedImage } from "../src/lib/docx-next/images";

const root = resolve(process.argv[2] ?? ".");
const output = resolve(process.argv[3] ?? "/tmp/docx-next-primitives.json");
const { NEXT_TEMPLATES } = await import(`${root}/src/lib/docx-next/templates.ts`);
const { buildDossierDocModel } = await import(`${root}/src/lib/docx-next/build-model.ts`);
const { renderDossierDocx } = await import(`${root}/src/lib/docx-next/renderer.ts`);
const { validateDossierDocModel } = await import(`${root}/src/lib/docx-next/validation.ts`);
const { graphicCandidateFixture } = await import(
  `${root}/tests/fixtures/docx-next/graphic-candidate.ts`
);
const { decorationAssetKey } = await import(`${root}/src/lib/docx-next/decoration.ts`);
const { paintPng } = await import(`${root}/src/lib/docx-next/artwork.ts`);
const { chromium } = await import(`${root}/node_modules/playwright/index.mjs`);
const hash = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
const freeze = (value: unknown): void => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return;
  Object.values(value).forEach(freeze);
  Object.freeze(value);
};
const bundle = await Bun.build({
  entrypoints: [`${root}/src/lib/docx-next/decoration.ts`],
  target: "browser",
  format: "esm",
});
assert(bundle.success, "Actual decoration adapter must bundle successfully");
const code = await bundle.outputs[0].text();
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.evaluate(async (source: string) => {
    const world = globalThis as typeof globalThis & {
      __docxPaint: typeof import("../src/lib/docx-next/decoration");
    };
    world.__docxPaint = await import(`data:text/javascript;base64,${btoa(source)}`);
  }, code);
  const assets = new Map<string, NormalizedImage>();
  const rasterizeDecoration = async (shape: DecorationPaint) => {
    const key = decorationAssetKey(shape);
    if (!assets.has(key)) {
      const result = await page.evaluate(async (paint: DecorationPaint) => {
        const world = globalThis as typeof globalThis & {
          __docxPaint: typeof import("../src/lib/docx-next/decoration");
        };
        const asset = await world.__docxPaint.rasterizeDecoration(paint);
        return { ...asset, bytes: Array.from(asset.bytes) };
      }, shape);
      assets.set(key, { ...result, bytes: Uint8Array.from(result.bytes) });
    }
    return assets.get(key)!;
  };
  // Explicit deterministic semantic-image service; image decoding/Word photo acceptance
  // remains covered separately and is not inferred from this package ownership probe.
  const image = {
    bytes: paintPng({ color: "123456", endColor: "FEDCBA" }),
    widthPx: 1,
    heightPx: 256,
    extension: "png" as const,
    contentType: "image/png" as const,
  };
  const options = { normalizeImage: async () => image, rasterizeDecoration };
  const templates = Object.keys(NEXT_TEMPLATES);
  assert.equal(templates.length, 39);
  assert(!templates.some((id) => ["warm4", "warm5"].includes(id)));
  const inventory = templates.map((id) => {
    const template = NEXT_TEMPLATES[id];
    const motifs = [
      ...(template.cover.motifs ?? []),
      ...(template.chrome.band?.motifs ?? []),
      ...(template.chrome.band?.noneMotifs ?? []),
      ...Object.values(template.pageMotifs ?? {}).flat(),
    ] as TemplateMotif[];
    return {
      id,
      archetype: template.archetype,
      motifCount: motifs.length,
      shapes: [...new Set(motifs.map((motif) => motif.shape))].sort(),
      independentCorners: motifs.some((motif) => motif.cornerRadiiMm),
      linearGradient: motifs.some((motif) => motif.endSlot),
      gradientStops: motifs.some((motif) => motif.gradientStops),
      radialFade: motifs.some((motif) => motif.radialFade),
      outline: motifs.some((motif) => motif.stroke),
      explicitLayers: motifs.some((motif) => motif.paintLayer !== undefined),
      pagePaintComposition: template.pagePaintComposition ?? null,
      coverRows: template.cover.rows?.length ?? 0,
      chromeBand: !!template.chrome.band,
      compactMasthead: !!template.letter.compactMasthead,
      semanticPalette: !!template.cover.fieldColorSlots,
      flowingRules: Object.keys(template.cover.flowingRules ?? {}),
      fieldLeads: Object.keys(template.cover.fieldSpaceBeforeMm ?? {}),
    };
  });
  const packages = [];
  for (const template of templates) {
    // Orthogonal existing supported layouts only; frozen Sidebar investigation stays closed.
    for (const layout of ["classic", "minimal", "timeline", "editorial"]) {
      const input = graphicCandidateFixture(template, "images", "item13-owned-image");
      input.settings.cvLayout = layout;
      const source = JSON.stringify(input);
      freeze(input);
      const model = buildDossierDocModel(input);
      assert.deepEqual(model, buildDossierDocModel(structuredClone(input)));
      assert.deepEqual(model, buildDossierDocModel(JSON.parse(source)));
      assert.equal(JSON.stringify(input), source);
      assert.deepEqual(model.issues, []);
      validateDossierDocModel(model);
      const modelCopy = structuredClone(model);
      freeze(model);
      const portable = JSON.parse(JSON.stringify(model));
      freeze(portable);
      const bytes = new Uint8Array(await (await renderDossierDocx(model, options)).arrayBuffer());
      const restored = new Uint8Array(
        await (await renderDossierDocx(portable, options)).arrayBuffer(),
      );
      assert.equal(hash(bytes), hash(restored));
      assert.deepEqual(model, modelCopy);
      // JSON legitimately omits optional keys whose values are undefined. Compare
      // its defined values, while the package-byte check above remains exact.
      assert.equal(JSON.stringify(model), JSON.stringify(portable));
      packages.push({
        template,
        layout,
        modelSha256: hash(JSON.stringify(model)),
        docxSha256: hash(bytes),
      });
    }
  }
  const paintAssets = [...assets]
    .map(([key, asset]) => ({
      geometrySha256: hash(key),
      pngSha256: hash(asset.bytes),
      widthPx: asset.widthPx,
      heightPx: asset.heightPx,
    }))
    .sort((a, b) => a.geometrySha256.localeCompare(b.geometrySha256));
  await mkdir(dirname(output), { recursive: true });
  await writeFile(
    output,
    JSON.stringify(
      {
        templateCount: templates.length,
        layouts: ["classic", "minimal", "timeline", "editorial"],
        cases: packages.length,
        packagesRendered: packages.length * 2,
        semanticImageAdapter: "deterministic explicit PNG; not a photo fidelity test",
        decorationAdapter: "actual production rasterizeDecoration in Chromium canvas",
        inventory,
        packages,
        paintAssets,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({
      output,
      templates: templates.length,
      cases: packages.length,
      packages: packages.length * 2,
      paintAssets: paintAssets.length,
    }),
  );
} finally {
  await browser.close();
}
