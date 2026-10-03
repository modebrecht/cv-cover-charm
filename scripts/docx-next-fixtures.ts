/** Bun runner, outputs are temporary QA evidence, never production templates. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { buildDossierDocModel } from "../src/lib/docx-next/build-model";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import { walkBlocks } from "../src/lib/docx-next/model";
import { planPartSections } from "../src/lib/docx-next/section-plan";
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
  "photo-left",
  "photo-right",
  "photo-free",
  "photo-circle",
  "photo-zoom",
  "photo-long-name",
  "photo-long-cv",
  "rich-table-lists",
  "columns-two",
  "columns-three",
  "columns-long",
  "columns-chrome",
  "columns-long-chrome",
];
const manifest = [];
for (const fixture of fixtureNames) {
  const input = briefFixture(
    fixture === "photo-long-name"
      ? "long-values"
      : fixture === "photo-long-cv"
        ? "long-cv"
        : (BRIEF_FIXTURES as readonly string[]).includes(fixture)
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
  if (fixture.startsWith("columns-")) {
    const sentence =
      "Native Spalten bleiben editierbar. Ä ö ü é è à – — ·. Ich plane Aufgaben sorgfältig, arbeite zuverlässig und lerne gerne Neues. ";
    input.letter.data.richTextHtml = `<div data-align="left">Vor dem Spaltenabschnitt fliesst dieser Absatz über die volle Textbreite der Seite.</div><div data-columns="${fixture === "columns-three" ? 3 : 2}">${sentence.repeat(fixture.startsWith("columns-long") ? 90 : 6)}</div><div>Nach dem Spaltenabschnitt fliesst dieser Absatz wieder über die volle Textbreite der Seite.</div>`;
    if (fixture.endsWith("chrome")) {
      input.settings.chrome = structuredClone(DEFAULT_DOSSIER_CHROME_STATE);
      input.settings.chrome.shared.headerMode = "contact";
      input.settings.chrome.shared.headerDifferentFirstPage = true;
      input.settings.chrome.shared.headerContinuationMode = "compact";
      input.settings.chrome.shared.headerTextLayout = "inline";
      input.letter.design.chromeContent = {
        headerTitleEnabled: true,
        headerTitle: "Letter header",
      };
      input.cv.design.chromeContent = { headerTitleEnabled: true, headerTitle: "CV header" };
    }
  }
  if (fixture.startsWith("photo-")) {
    input.cover.data.foto = images.jpeg;
    input.cv.data.person.foto = images.jpeg;
    const photo = input.cover.blocks.find((block) => block.kind === "photo");
    if (!photo) throw new Error("Brief photo definition missing");
    photo.style = {
      ...photo.style,
      hidden: false,
      w: 35,
      ratio: 1.25,
      radius: 1.5,
      borderWidth: 0.6,
      borderColor: "#244a61",
    };
    input.settings.cvPhotoPlacement = {
      mode:
        fixture === "photo-left" || fixture === "photo-long-name"
          ? "left"
          : fixture === "photo-free"
            ? "frei"
            : "right",
      widthMm: 35,
      xMm: 155,
      yMm: 25,
      frameColor: "#244a61",
    };
    input.settings.cvPhotoStyle = {
      shape: fixture === "photo-circle" ? "circle" : "portrait",
      zoom: fixture === "photo-zoom" ? 2 : 1,
      x: 25,
      y: 70,
      borderWidth: 0.6,
    };
    if (fixture === "photo-circle") {
      photo.style.ratio = 1;
      photo.style.radius = 999;
    }
    if (fixture === "photo-zoom") {
      photo.style.imgZoom = 2;
      photo.style.imgX = 25;
      photo.style.imgY = 70;
    }
  }
  if (fixture === "half-sections")
    input.cv.data.sectionLayouts = { sprachen: { width: "half" }, hobbys: { width: "half" } };
  if (fixture === "rich-letter")
    input.letter.data.richTextHtml =
      '<div data-align="right"><strong>Fett ä ö ü</strong> und <u>unterstrichen é è à</u></div><div data-align="justify">Ein normaler Absatz mit <em>Kursiv</em> und <span data-letter-text-color="#123456">Farbe</span>.</div><div data-list="bullet">Native Aufzählung</div><table><tbody><tr><td>Linke Zelle</td><td>Rechte Zelle</td></tr></tbody></table>';
  if (fixture === "rich-table-lists")
    input.letter.data.richTextHtml =
      ["bullet", "dash", "plus", "dot"]
        .map((kind) => `<div data-list="${kind}">Liste ${kind}</div>`)
        .join("") +
      "<table><tbody><tr><td><div>Erster Zellabsatz</div><div><strong>Zweiter Zellabsatz</strong></div><table><tbody><tr><td>Verschachtelte Zelle</td></tr></tbody></table></td><td>Rechte Zelle</td></tr><tr><td>Kurze Tabellenzeile</td></tr></tbody></table>";
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
  const cvPages =
    fixture === "minimal" || fixture === "empty-optional"
      ? 1
      : fixture === "long-cv" || fixture === "photo-long-cv"
        ? 9
        : fixture === "custom-sections"
          ? 3
          : 2;
  const letterPages =
    fixture === "long-letter"
      ? 8
      : fixture === "columns-long-chrome"
        ? 4
        : fixture === "columns-long"
          ? 3
          : 1;
  const parts = [model.cover, model.letter, model.cv].map((part, index) => ({
    id: part.id,
    expectedPages: [1, letterPages, cvPages][index],
    contentBoxMm: part.page.margins,
    semanticText: walkBlocks(part.blocks).flatMap((block) =>
      block.kind === "paragraph" ? block.runs.map((run) => run.text) : [],
    ),
  }));
  manifest.push({
    fixture,
    expectedSections: [model.cover, model.letter, model.cv].reduce(
      (sum, part) => sum + planPartSections(part).length,
      0,
    ),
    expectedImages: [model.cover, model.letter, model.cv]
      .flatMap((part) => walkBlocks(part.blocks))
      .filter((block) => block.kind === "image").length,
    expectedPages: 1 + letterPages + cvPages,
    parts,
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
