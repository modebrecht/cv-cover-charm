/** Live editor -> portable JSON -> explicit snapshot -> independent registered candidate. */
import { createRequire } from "node:module";
import { Buffer } from "node:buffer";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { graphicCandidateFixture } from "../tests/fixtures/docx-next/graphic-candidate";
import type { TemplateId } from "../src/components/cover/types";
import { dossierDefaultFontKey } from "../src/lib/dossier-theme";
import { nextTemplate } from "../src/lib/docx-next/templates";
const template = process.env.DOCX_NEXT_EDITOR_TEMPLATE ?? "cove";
const layout = process.env.DOCX_NEXT_EDITOR_LAYOUT ?? "classic";
const headerMode = process.env.DOCX_NEXT_EDITOR_HEADER_MODE ?? "contact";
if (!["none", "contact"].includes(headerMode))
  throw new Error("Unsupported candidate editor header mode");
if (!["classic", "modern"].includes(layout)) throw new Error("Unsupported candidate editor layout");
nextTemplate(template);
import { DEFAULT_DOSSIER_CHROME_STATE } from "../src/lib/dossier-chrome";
const out = path.resolve(process.argv[2] ?? "/tmp/docx-next-candidate-editor");
await mkdir(out, { recursive: true });
const require = createRequire(import.meta.url),
  { chromium } = require(
    process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
      ? path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, "playwright")
      : "playwright",
  );
const server = Bun.spawn(
  [
    "node",
    "node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    "--port",
    "4173",
    "--strictPort",
  ],
  { stdout: "pipe", stderr: "pipe" },
);
const output = new Response(server.stdout).text(),
  error = new Response(server.stderr).text();
let browser;
let stage = "server startup";
try {
  const base = "http://127.0.0.1:4173";
  let ready = false;
  for (let n = 0; n < 100; n++) {
    try {
      ready = (await fetch(base)).ok;
      if (ready) break;
    } catch {
      /* starting */
    }
    await Bun.sleep(100);
  }
  if (!ready) throw new Error("Candidate QA server did not start");
  browser = await chromium.launch({
    headless: true,
    ...(process.env.DOCX_NEXT_CHROMIUM_PATH
      ? { executablePath: process.env.DOCX_NEXT_CHROMIUM_PATH }
      : {}),
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
    errors: string[] = [];
  page.on("pageerror", (e: Error) => errors.push(e.message));
  await page.goto(base, { waitUntil: "networkidle" });
  const photo = process.argv[3]
    ? JSON.parse(await readFile(process.argv[3], "utf8")).png
    : undefined;
  const fixture = graphicCandidateFixture(template, photo ? "images" : "normal", photo);
  const freePhoto = Boolean(photo && layout === "modern");
  if (freePhoto) fixture.cv.data.person.foto = null;
  const chrome = structuredClone(DEFAULT_DOSSIER_CHROME_STATE);
  Object.assign(chrome.shared, { headerMode, headerHeightMm: 44, headerGapMm: 4 });
  await page.evaluate(
    ({ fixture, chrome, template, font, layout, freePhoto }) => {
      localStorage.clear();
      localStorage.setItem(
        "titelblatt:v3",
        JSON.stringify({
          template,
          data: fixture.cover.data,
          font,
          fontScale: 1,
          colors: { [template]: fixture.cover.colors },
          layout: {},
          customs: [],
        }),
      );
      localStorage.setItem("lebenslauf:v1", JSON.stringify(fixture.cv));
      localStorage.setItem("anschreiben:v1", JSON.stringify(fixture.letter));
      localStorage.setItem("bewerbungsdossier:chrome:v1", JSON.stringify(chrome));
      localStorage.setItem("lebenslauf:layout:v1", layout);
      if (layout === "modern" && !freePhoto)
        localStorage.setItem(
          "lebenslauf:photo-place:v1",
          JSON.stringify({ mode: "auto", widthMm: 34, xMm: 150, yMm: 20 }),
        );
    },
    {
      fixture,
      chrome,
      template,
      layout,
      freePhoto,
      font: dossierDefaultFontKey(template as TemplateId),
    },
  );
  await page.goto(base + "/lebenslauf", { waitUntil: "networkidle" });
  await page
    .locator(`[data-dossier-document="cv"][data-cv-template="${template}"]`)
    .first()
    .waitFor();
  if (freePhoto) {
    stage = "upload and edit free Sidebar photo";
    await page
      .locator("label")
      .filter({ hasText: /^Foto hochladen$/ })
      .locator('input[type="file"]')
      .setInputFiles({
        name: "candidate-photo.png",
        mimeType: "image/png",
        buffer: Buffer.from(photo!.split(",")[1], "base64"),
      });
    const picture = page.locator("[data-cv-photo-free]").first();
    await picture.waitFor();
    await page.getByRole("button", { name: "Kreis", exact: true }).click();
    const reset = page.getByRole("button", { name: "Reset", exact: true });
    if (await reset.count()) await reset.click();
    await page.getByRole("button", { name: "Mit", exact: true }).click();
    const zoom = page
      .locator("label")
      .filter({ hasText: /^Foto zuschneiden/ })
      .locator('input[type="range"]');
    await zoom.press("Home");
    for (let index = 0; index < 10; index++) await zoom.press("ArrowRight");
    await page.getByRole("button", { name: "Ausschnitt nach links", exact: true }).click();
    await page.getByRole("button", { name: "Ausschnitt nach links", exact: true }).click();
    await page.getByRole("button", { name: "Ausschnitt nach unten", exact: true }).click();
    await picture.press("ArrowRight");
    await picture.press("ArrowDown");
    await page.waitForFunction(() => {
      const place = JSON.parse(localStorage.getItem("lebenslauf:photo-place:v1") ?? "null");
      const style = JSON.parse(localStorage.getItem("lebenslauf:photo:v2") ?? "null");
      return (
        place?.mode === "frei" &&
        place.xMm === 152 &&
        place.yMm === 22 &&
        place.widthMm === 34 &&
        style?.shape === "circle" &&
        Math.abs(style.zoom - 1.5) < 0.001 &&
        style.x === 40 &&
        style.y === 55 &&
        style.borderWidth > 0
      );
    });
  }
  await page
    .locator('[data-dossier-document="cv"]')
    .first()
    .screenshot({ path: path.join(out, `${template}-browser-cv.png`) });
  await page.goto(base + "/titelblatt", { waitUntil: "networkidle" });
  await page.locator('[data-dossier-document="cover"]').first().waitFor();
  await page
    .locator('[data-dossier-document="cover"]')
    .first()
    .screenshot({ path: path.join(out, `${template}-browser-cover.png`) });
  await page.goto(base + "/lebenslauf", { waitUntil: "networkidle" });
  const name = page.locator('input[data-dossier-field-id="cv.person.firstName"]');
  stage = "persist edited name";
  await name.fill("Candidate Editor");
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("lebenslauf:v1")!).data.person.vorname === "Candidate Editor",
  );
  await page.reload({ waitUntil: "networkidle" });
  stage = "reload edited name";
  await page.waitForFunction(
    () =>
      (
        document.querySelector(
          'input[data-dossier-field-id="cv.person.firstName"]',
        ) as HTMLInputElement
      )?.value === "Candidate Editor",
  );
  if ((await name.inputValue()) !== "Candidate Editor")
    throw new Error("Candidate edit/reload lost name");
  if (freePhoto) {
    stage = "portable JSON clear and restore";
    await page.evaluate(async () => {
      const project = await import("/src/lib/dossier-project.ts");
      const saved = project.createDossierProject({
        cover: project.readStoredDossierPart(project.COVER_STORAGE_KEY),
        cv: project.readStoredDossierPart(project.CV_STORAGE_KEY),
        letter: project.readStoredDossierPart(project.LETTER_STORAGE_KEY),
      });
      const loaded = project.parseDossierProject(JSON.parse(JSON.stringify(saved)));
      localStorage.clear();
      const restored = project.storeDossierProject(loaded);
      if (!restored.cover || !restored.cv || !restored.letter)
        throw new Error("Portable JSON failed to restore the complete dossier");
    });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(
      () =>
        (
          document.querySelector(
            'input[data-dossier-field-id="cv.person.firstName"]',
          ) as HTMLInputElement
        )?.value === "Candidate Editor",
    );
  }
  stage = "portable snapshot and independent export";
  const result = await page.evaluate(
    async ({ template, layout, freePhoto }) => {
      const project = await import("/src/lib/dossier-project.ts"),
        docs = await import("/src/lib/dossier-pdf-document.ts"),
        snapshot = await import("/src/lib/docx-next/snapshot.ts"),
        model = await import("/src/lib/docx-next/build-model.ts"),
        renderer = await import("/src/lib/docx-next/renderer.ts"),
        blocks = await import("/src/lib/docx-next/model.ts");
      const saved = project.createDossierProject({
        cover: project.readStoredDossierPart(project.COVER_STORAGE_KEY),
        cv: project.readStoredDossierPart(project.CV_STORAGE_KEY),
        letter: project.readStoredDossierPart(project.LETTER_STORAGE_KEY),
      });
      const loaded = project.parseDossierProject(JSON.parse(JSON.stringify(saved)));
      const captured = snapshot.captureDossierDocxNextSnapshot(
        docs.coverPdfDocumentFromSaved(loaded.cover),
        docs.letterPdfDocumentFromSaved(loaded.letter),
        docs.cvPdfDocumentFromSaved(loaded.cv),
      );
      const m = model.buildDossierDocModel(captured);
      const zone = blocks.walkBlocks(m.cv.blocks).find((block) => block.kind === "image-zone");
      if (
        freePhoto &&
        (!zone ||
          zone.kind !== "image-zone" ||
          zone.sourceLayout.xMm !== 152 ||
          zone.sourceLayout.yMm !== 22 ||
          zone.image.widthMm !== 34 ||
          zone.image.placement !== "inline" ||
          zone.image.frame?.zoom !== 1.5 ||
          zone.image.frame.xPct !== 40 ||
          zone.image.frame.yPct !== 55)
      )
        throw new Error(
          "Portable photo edit/reload lost the native zone, authored geometry or crop",
        );
      if (
        m.templateId !== template ||
        (layout === "modern" && !m.cv.blocks.some((b) => b.kind === "parallel-flow")) ||
        m.issues.length ||
        !blocks
          .walkBlocks(m.cv.blocks)
          .some(
            (b) =>
              b.kind === "paragraph" && b.runs.some((r) => r.text.includes("Candidate Editor")),
          )
      )
        throw new Error("Candidate portable snapshot lost content or has blocking issues");
      return {
        project: loaded,
        photoZone:
          zone?.kind === "image-zone"
            ? { id: zone.id, sourceLayout: zone.sourceLayout, frame: zone.image.frame }
            : null,
        bytes: Array.from(
          new Uint8Array(await (await renderer.renderDossierDocx(m)).arrayBuffer()),
        ),
      };
    },
    { template, layout, freePhoto },
  );
  await writeFile(path.join(out, `${template}-editor.docx`), Uint8Array.from(result.bytes));
  await writeFile(
    path.join(out, `${template}-editor-evidence.json`),
    JSON.stringify(
      { template, layout, headerMode, freePhoto, photoZone: result.photoZone },
      null,
      2,
    ),
  );
  await writeFile(
    path.join(out, `${template}-project.json`),
    JSON.stringify(result.project, null, 2),
  );
  await page.screenshot({ path: path.join(out, `${template}-editor.png`) });
  if (errors.length) throw new Error(errors.join("; "));
  console.log(
    "Candidate editor rename/reload, portable JSON, explicit snapshot and independent native candidate passed.",
  );
  stage = "combined production PDF";
  await page.getByRole("button", { name: "Download", exact: true }).click();
  await page
    .locator(
      'button[title="Titelblatt, Motivationsschreiben und alle CV-Seiten gemeinsam herunterladen"]',
    )
    .click();
  const download = page.waitForEvent("download", { timeout: 120000 });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Dossier herunterladen", exact: true })
    .click();
  await (await download).saveAs(path.join(out, `${template}-production-dossier.pdf`));
  if (errors.length) throw new Error(errors.join("; "));
  console.log("Candidate production combined PDF download passed.");
} catch (failure) {
  const page = browser?.contexts()[0]?.pages()[0];
  if (page) {
    await page.screenshot({ path: path.join(out, `${template}-failure.png`) }).catch(() => {});
    const state = await page
      .evaluate(() => ({
        url: location.href,
        input: (
          document.querySelector(
            'input[data-dossier-field-id="cv.person.firstName"]',
          ) as HTMLInputElement | null
        )?.value,
        savedName: JSON.parse(localStorage.getItem("lebenslauf:v1") ?? "null")?.data?.person
          ?.vorname,
      }))
      .catch(() => null);
    await writeFile(
      path.join(out, `${template}-failure.json`),
      JSON.stringify({ stage, state, error: String(failure) }, null, 2),
    );
  }
  throw new Error(`Candidate editor QA failed during ${stage}`, { cause: failure });
} finally {
  if (browser) await browser.close();
  server.kill();
  await server.exited;
  await writeFile(path.join(out, "server.log"), (await output) + (await error));
}
