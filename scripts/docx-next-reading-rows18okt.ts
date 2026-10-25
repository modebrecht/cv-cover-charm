/** Saved project -> visible CV -> pure model / guarded app export. No XML repairs. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(
  path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES!, "playwright"),
);
const out = path.resolve(process.argv[2]!);
const projectFile = path.resolve(process.argv[3]!);
const base = "http://127.0.0.1:4173";
await mkdir(out, { recursive: true });
const server = Bun.spawn({
  cmd: [
    process.env.CODEX_PRIMARY_RUNTIME_NODE!,
    "node_modules/vite/bin/vite.js",
    "dev",
    "--host",
    "127.0.0.1",
    "--port",
    "4173",
  ],
  stdout: Bun.file(path.join(out, "server.log")),
  stderr: Bun.file(path.join(out, "server-errors.log")),
});
let browser;
try {
  let ready = false;
  for (let n = 0; n < 300; n++) {
    try {
      if ((await fetch(base)).ok) {
        ready = true;
        break;
      }
    } catch {
      /* startup */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert(ready, "App startup failed");
  browser = await chromium.launch({
    executablePath: process.env.DOCX_NEXT_CHROMIUM_PATH,
    headless: true,
    args: ["--no-sandbox"],
  });
  const results = [];
  for (const template of ["brief", "modern", "freundlich", "verlauf", "neon"]) {
    const folder = path.join(out, template);
    await mkdir(folder, { recursive: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error: Error) => errors.push(error.message));
    page.on("dialog", (dialog: { accept: () => Promise<void> }) => void dialog.accept());
    await page.route(
      "**/*",
      (route: {
        request: () => { url: () => string };
        continue: () => Promise<void>;
        abort: () => Promise<void>;
      }) => (route.request().url().startsWith(base) ? route.continue() : route.abort()),
    );
    await page.goto(base, { waitUntil: "networkidle" });
    const project = JSON.parse(await readFile(projectFile, "utf8"));
    for (const part of ["cover", "letter", "cv"]) {
      if (part === "cover") {
        project.cover.template = template;
        if (template !== "modern") {
          project.cover.colors = {};
          project.cover.layout = {};
        }
      } else {
        project[part].design.template = template;
        if (template !== "modern") project[part].design.colors = {};
      }
    }
    project.cv.design.font = "sans";
    project.letter.design.fontOverride = "sans";
    await writeFile(path.join(folder, "project.json"), JSON.stringify(project, null, 2));
    await Promise.all([
      page.waitForEvent("load"),
      page
        .locator('input[type="file"][accept="application/json,.json"]')
        .setInputFiles({
          name: "reading-rows.json",
          mimeType: "application/json",
          buffer: Buffer.from(JSON.stringify(project)),
        }),
    ]);
    await page.goto(base + "/lebenslauf", { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const cv = page.locator('main [data-dossier-document="cv"]').first();
    await cv.locator('[data-cv-page="0"]').waitFor();
    await cv.locator('[data-cv-page="0"]').screenshot({ path: path.join(folder, "web-cv.png") });
    const generated = await page.evaluate(async (template) => {
      const project = await import("/src/lib/dossier-project.ts");
      const docs = await import("/src/lib/dossier-pdf-document.ts");
      const { captureDossierDocxNextSnapshot } = await import("/src/lib/docx-next/snapshot.ts");
      const { buildDossierDocModel } = await import("/src/lib/docx-next/build-model.ts");
      const { renderDossierDocx } = await import("/src/lib/docx-next/renderer.ts");
      const { walkBlocks } = await import("/src/lib/docx-next/model.ts");
      const saved = () =>
        [project.COVER_STORAGE_KEY, project.LETTER_STORAGE_KEY, project.CV_STORAGE_KEY].map((key) =>
          localStorage.getItem(key),
        );
      const original = JSON.stringify(saved());
      const snapshot = captureDossierDocxNextSnapshot(
        docs.coverPdfDocumentFromSaved(project.readStoredDossierPart(project.COVER_STORAGE_KEY))!,
        docs.letterPdfDocumentFromSaved(project.readStoredDossierPart(project.LETTER_STORAGE_KEY))!,
        docs.cvPdfDocumentFromSaved(project.readStoredDossierPart(project.CV_STORAGE_KEY))!,
      );
      const before = JSON.stringify(snapshot);
      const baseline = buildDossierDocModel(snapshot);
      const model = buildDossierDocModel(snapshot, { cvContentComposition: "reading-rows" });
      const fields = (value: typeof model) =>
        walkBlocks(value.cv.blocks)
          .filter((b) => b.kind === "paragraph")
          .flatMap((b) =>
            b.runs
              .filter((r) => r.fieldId && r.fieldId !== "cv.section.person.heading")
              .map((r) => [r.fieldId, r.text]),
          )
          .sort(([a], [b]) => a!.localeCompare(b!));
      if (JSON.stringify(fields(model)) !== JSON.stringify(fields(baseline)))
        throw Error("Changed native fields");
      if (
        JSON.stringify(model.cover) !== JSON.stringify(baseline.cover) ||
        JSON.stringify(model.letter) !== JSON.stringify(baseline.letter)
      )
        throw Error("Changed adjacent documents");
      if (JSON.stringify(snapshot) !== before) throw Error("Mutated snapshot");
      const bytes = Array.from(
        new Uint8Array(await (await renderDossierDocx(model)).arrayBuffer()),
      );
      let app;
      if (template === "modern") {
        const { createSavedAuthoredCoverDocxNext } =
          await import("/src/lib/brief-docx-next-export.ts");
        const candidate = {
          inspectNativeInteriors: true,
          cvRubricSpacing: "previous-block",
        } as const;
        const old = await createSavedAuthoredCoverDocxNext("modern", true, candidate);
        const next = await createSavedAuthoredCoverDocxNext("modern", true, {
          ...candidate,
          cvContentComposition: "reading-rows",
        });
        if (
          JSON.stringify(old.model.cover) !== JSON.stringify(next.model.cover) ||
          JSON.stringify(old.model.letter) !== JSON.stringify(next.model.letter)
        )
          throw Error("App neighbors changed");
        app = {
          snapshot: next.snapshot,
          model: next.model,
          interiorMetrics: next.interiorMetrics,
          bytes: Array.from(new Uint8Array(await next.blob.arrayBuffer())),
          baseline: Array.from(new Uint8Array(await old.blob.arrayBuffer())),
        };
      }
      if (JSON.stringify(saved()) !== original) throw Error("Export modified saved state");
      return {
        snapshot,
        model,
        bytes,
        app,
        webPages: document.querySelectorAll("main [data-cv-page]").length,
      };
    }, template);
    await writeFile(path.join(folder, "candidate.docx"), new Uint8Array(generated.bytes));
    await writeFile(
      path.join(folder, "snapshot.json"),
      JSON.stringify(generated.snapshot, null, 2),
    );
    await writeFile(path.join(folder, "model.json"), JSON.stringify(generated.model, null, 2));
    if (generated.app) {
      const { bytes, baseline, ...proof } = generated.app;
      await writeFile(path.join(out, "09-Modern-CV-Zeilen-und-Listen.docx"), new Uint8Array(bytes));
      await writeFile(path.join(out, "08-reproduced.docx"), new Uint8Array(baseline));
      await writeFile(path.join(out, "app-proof.json"), JSON.stringify(proof, null, 2));
    }
    assert.deepEqual(errors, []);
    results.push({
      template,
      webPages: generated.webPages,
      unchangedFields: true,
      unchangedSource: true,
      unchangedCoverLetter: true,
      appExport: !!generated.app,
    });
    await context.close();
    console.log(JSON.stringify(results.at(-1)));
  }
  await writeFile(path.join(out, "results.json"), JSON.stringify(results, null, 2));
} finally {
  await browser?.close();
  server.kill();
}
