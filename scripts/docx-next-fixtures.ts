/** Bun runner, outputs are temporary QA evidence, never production templates. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { buildDossierDocModel } from "../src/lib/docx-next/build-model";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import { walkBlocks } from "../src/lib/docx-next/model";
import { DEFAULT_DOSSIER_CHROME_STATE } from "../src/lib/dossier-chrome";
import { BRIEF_FIXTURES, briefFixture } from "../tests/fixtures/docx-next/brief";

const out = path.resolve(process.argv[2] ?? "/tmp/cv-docx-next-qa");
await mkdir(out, { recursive: true });
const images: Record<string, string> = JSON.parse(
  await readFile(path.join(out, "images.json"), "utf8"),
);
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
if (!build.success) throw new Error("Image normalizer browser bundle failed");
const moduleCode = await build.outputs[0].text();
const browser = await chromium.launch({
  headless: true,
  ...(process.env.DOCX_NEXT_CHROMIUM_PATH
    ? { executablePath: process.env.DOCX_NEXT_CHROMIUM_PATH }
    : {}),
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.goto("about:blank");
const normalized = new Map();
try {
  for (const [key, source] of Object.entries(images)) {
    const asset = await page.evaluate(
      async ({ source, moduleCode }: { source: string; moduleCode: string }) => {
        const mod = await import(`data:text/javascript;base64,${btoa(moduleCode)}`);
        const image = await mod.normalizeBrowserImage(source);
        return { ...image, bytes: Array.from(image.bytes) };
      },
      { source, moduleCode },
    );
    if (key === "exif-jpeg" && asset.widthPx <= asset.heightPx)
      throw new Error("EXIF orientation was not normalized");
    if (key === "large-jpeg" && Math.max(asset.widthPx, asset.heightPx) > 1600)
      throw new Error("Image size budget failed");
    normalized.set(source, { ...asset, bytes: Uint8Array.from(asset.bytes) });
    await writeFile(path.join(out, `normalized-${key}.png`), Uint8Array.from(asset.bytes));
  }
  // Exercise failures through the real browser decoder.
  const invalid = await page.evaluate(async (code: string) => {
    const mod = await import(`data:text/javascript;base64,${btoa(code)}`);
    try {
      await mod.normalizeBrowserImage("data:image/jpeg;base64,aW52YWxpZA==");
      return false;
    } catch {
      return true;
    }
  }, moduleCode);
  if (!invalid) throw new Error("Corrupt image did not fail visibly");
} finally {
  await browser.close();
}
const fixtureNames = [
  ...BRIEF_FIXTURES,
  ...Object.keys(images),
  "chrome",
  "half-sections",
  "rich-letter",
  "positioned-images",
];
const manifest = [];
for (const fixture of fixtureNames) {
  const input = briefFixture(
    (BRIEF_FIXTURES as readonly string[]).includes(fixture)
      ? (fixture as (typeof BRIEF_FIXTURES)[number])
      : "normal",
  );
  if (images[fixture]) {
    input.cover.data.foto = images[fixture];
    input.cv.data.person.foto = images[fixture];
    const photo = input.cover.blocks.find((block) => block.kind === "photo");
    if (!photo)
      input.cover.blocks.unshift({
        id: "foto",
        label: "Portrait",
        kind: "photo",
        lines: [],
        style: { ...input.cover.blocks[0].style, w: 40 },
      });
  }
  if (fixture === "chrome") {
    input.settings.chrome = structuredClone(DEFAULT_DOSSIER_CHROME_STATE);
    input.settings.chrome.shared.headerMode = "contact";
    input.settings.chrome.shared.headerFontSizePt = 9;
    input.settings.chrome.shared.headerDifferentFirstPage = true;
    input.settings.chrome.shared.headerContinuationMode = "compact";
    input.settings.chrome.shared.headerBackgroundColor = "#e9eff4";
    input.settings.chrome.shared.footerMode = "details";
  }
  if (fixture === "half-sections")
    input.cv.data.sectionLayouts = { sprachen: { width: "half" }, hobbys: { width: "half" } };
  if (fixture === "rich-letter")
    input.letter.data.richTextHtml =
      '<div data-align="right"><strong>Fett ä ö ü</strong> und <u>unterstrichen é è à</u></div><div data-align="justify">Ein normaler Absatz mit <em>Kursiv</em> und <span data-letter-text-color="#123456">Farbe</span>.</div><div data-list="bullet">Native Aufzählung</div><table><tbody><tr><td>Linke Zelle</td><td>Rechte Zelle</td></tr></tbody></table>';
  if (fixture === "positioned-images")
    input.letter.data.images = [
      { id: "left", src: images.png, side: "left", topMm: 0, widthMm: 20, gapMm: 3 },
      { id: "right", src: images.jpeg, side: "right", topMm: 0, widthMm: 20, gapMm: 3 },
      {
        id: "free",
        src: images["icc-jpeg"],
        side: "right",
        xMm: 65,
        topMm: 40,
        widthMm: 18,
        gapMm: 2,
      },
    ];
  const model = buildDossierDocModel(input);
  const started = performance.now();
  const blob = await renderDossierDocx(model, {
    normalizeImage: async (source) => {
      const asset = normalized.get(source);
      if (!asset) throw new Error("Unknown QA image source");
      return asset;
    },
  });
  await writeFile(path.join(out, `${fixture}.docx`), new Uint8Array(await blob.arrayBuffer()));
  const semanticText = [model.cover, model.letter, model.cv]
    .flatMap((part) =>
      walkBlocks([...part.blocks, ...part.header, ...(part.firstHeader ?? []), ...part.footer]),
    )
    .filter((block) => block.kind === "paragraph")
    .flatMap((block) => (block.kind === "paragraph" ? block.runs.map((run) => run.text) : []));
  manifest.push({
    fixture,
    expectedImages: [model.cover, model.letter, model.cv]
      .flatMap((part) => walkBlocks(part.blocks))
      .filter((block) => block.kind === "image").length,
    expectedPages:
      fixture === "minimal" || fixture === "empty-optional"
        ? 3
        : fixture === "long-letter" || fixture === "long-cv"
          ? 11
          : fixture === "custom-sections"
            ? 5
            : 4,
    bytes: blob.size,
    durationMs: Math.round(performance.now() - started),
    semanticText,
    modelIssues: model.issues,
  });
}
await writeFile(path.join(out, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(
  `Generated ${manifest.length} independent Brief dossiers; canonical browser image normalization passed ${normalized.size} inputs.`,
);
