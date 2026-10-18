/** Exercise the real page-fit buttons, reload, then the guarded native app boundary. */
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
const query = "?docx-next-design-qa=1&docx-next-interior-qa=1&docx-next-reading-rows-qa=1";
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
  for (let i = 0; i < 300; i++) {
    try {
      if ((await fetch(base)).ok) {
        ready = true;
        break;
      }
    } catch {
      /* startup */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  assert(ready);
  browser = await chromium.launch({
    executablePath: process.env.DOCX_NEXT_CHROMIUM_PATH,
    headless: true,
    args: ["--no-sandbox"],
  });
  for (const mode of (process.env.PAGE_FIT_CASES ?? "one,two").split(",")) {
    const folder = path.join(out, mode);
    await mkdir(folder, { recursive: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
    const page = await context.newPage();
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
    await Promise.all([
      page.waitForEvent("load"),
      page.locator('input[type="file"][accept="application/json,.json"]').setInputFiles({
        name: "page-fit.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(project)),
      }),
    ]);
    await page.goto(base + "/lebenslauf" + query, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    for (const action of mode === "default"
      ? []
      : mode === "toggle"
        ? ["two", "one", "one"]
        : [mode]) {
      const expected = await page.evaluate(async (action) => {
        const cv = JSON.parse(localStorage.getItem("lebenslauf:v1")!);
        const fit = await import("/src/components/cv/page-fit.ts");
        return fit.buildCvPageFitPlan(cv.data, action);
      }, action);
      if (!(await page.locator("[data-editor-action-menu]").isVisible()))
        await page.locator("button[data-editor-ready]").click();
      await page.locator(`[data-cv-page-fit-mode-control="${action}"]`).click();
      await page.waitForFunction((plan) => {
        const cv = JSON.parse(localStorage.getItem("lebenslauf:v1") ?? "{}");
        if (!cv.data) return false;
        return (
          cv.design?.bodyScale === plan.bodyScaleFactor &&
          Object.entries(plan.pageBySection).every(
            ([key, value]) =>
              cv.data.sectionLayouts?.[key]?.page === value &&
              cv.data.sectionLayouts?.[key]?.width === plan.widthBySection[key] &&
              cv.data.sectionLayouts?.[key]?.packing === plan.packingBySection[key],
          )
        );
      }, expected);
    }
    const saved = await page.evaluate(() =>
      ["titelblatt:v3", "anschreiben:v1", "lebenslauf:v1"].map((k) => localStorage.getItem(k)),
    );
    await page.reload({ waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.locator('main [data-cv-page="0"]').first().waitFor();
    const restored = await page.evaluate(() =>
      ["titelblatt:v3", "anschreiben:v1", "lebenslauf:v1"].map((k) => localStorage.getItem(k)),
    );
    assert.deepEqual(restored, saved, "Page-fit result must survive reload");
    const web = await page
      .locator('main [data-dossier-document="cv"]')
      .first()
      .evaluate((root: HTMLElement) => ({
        pages: root.querySelectorAll("[data-cv-page]").length,
        columns: Array.from(root.querySelectorAll("[data-cv-page] [data-cv-masonry-column]")).map(
          (el) => ({
            column: el.getAttribute("data-cv-masonry-column"),
            sections: Array.from(el.querySelectorAll("[data-cv-rubric]")).map((s) =>
              s.getAttribute("data-cv-rubric"),
            ),
          }),
        ),
      }));
    const generated = await page.evaluate(async () => {
      const { captureSavedAuthoredSnapshot, createSavedAuthoredCoverDocxNext } =
        await import("/src/lib/brief-docx-next-export.ts");
      const { buildDossierDocModel } = await import("/src/lib/docx-next/build-model.ts");
      const snapshot = captureSavedAuthoredSnapshot("modern");
      const model = buildDossierDocModel(snapshot, { cvContentComposition: "reading-rows" });
      try {
        const result = await createSavedAuthoredCoverDocxNext("modern", true, {
          inspectNativeInteriors: true,
          cvRubricSpacing: "previous-block",
          cvContentComposition: "reading-rows",
        });
        return {
          snapshot,
          issues: model.issues,
          model: result.model,
          interiorMetrics: result.interiorMetrics,
          bytes: Array.from(new Uint8Array(await result.blob.arrayBuffer())),
          error: null,
        };
      } catch (error) {
        return {
          snapshot,
          issues: model.issues,
          model,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });
    assert.equal(generated.error, null, generated.error ?? "Native export failed");
    if (mode !== "default") {
      assert.notEqual(
        generated.snapshot.cv.design.bodyScale,
        undefined,
        "Fitted typography must be saved",
      );
      assert.equal(
        web.pages,
        mode === "two" ? 2 : 1,
        "Visible page count must match the clicked preset",
      );
    }
    for (let i = 0; i < web.pages; i++)
      await page
        .locator("main [data-cv-page]")
        .nth(i)
        .screenshot({ path: path.join(folder, `web-cv-${i + 1}.png`) });
    // Native QA downloads live at the existing whole-dossier cover entry.
    await page.goto(base + "/" + query, { waitUntil: "networkidle" });
    await page.getByRole("button").filter({ hasText: "Gesamtdossier herunterladen" }).click();
    const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
    await dialog.getByRole("button", { name: "Modern CV-Zeilen testen", exact: true }).waitFor();
    const downloadEvent = page.waitForEvent("download", { timeout: 30000 });
    await dialog.getByRole("button", { name: "Modern CV-Zeilen testen", exact: true }).click();
    const download = await downloadEvent;
    await download.saveAs(path.join(folder, "ui-download.docx"));
    assert.deepEqual(
      await readFile(path.join(folder, "ui-download.docx")),
      Buffer.from(generated.bytes!),
    );
    if (process.env.PAGE_FIT_PDF === "1" && ["one", "two"].includes(mode)) {
      if (!(await dialog.isVisible())) {
        await page.getByRole("button").filter({ hasText: "Gesamtdossier herunterladen" }).click();
      }
      await dialog.getByRole("radio", { name: "Fertiges Dossier (PDF)" }).click();
      const pdfEvent = page.waitForEvent("download", { timeout: 30000 });
      await dialog.getByRole("button", { name: "PDF herunterladen", exact: true }).click();
      try {
        await (await pdfEvent).saveAs(path.join(folder, "primary.pdf"));
      } catch (error) {
        await page.screenshot({ path: path.join(folder, "pdf-failure.png"), fullPage: true });
        await writeFile(path.join(folder, "pdf-failure.html"), await dialog.innerHTML());
        throw error;
      }
    }
    await writeFile(
      path.join(folder, "proof.json"),
      JSON.stringify(
        {
          mode,
          web,
          restored: true,
          uiDownloadByteIdentical: true,
          snapshot: generated.snapshot,
          model: generated.model,
          issues: generated.issues,
          error: generated.error,
          interiorMetrics: generated.interiorMetrics,
        },
        null,
        2,
      ),
    );
    if (generated.bytes)
      await writeFile(path.join(folder, "candidate.docx"), new Uint8Array(generated.bytes));
    console.log(
      JSON.stringify({
        mode,
        web,
        restored: true,
        error: generated.error,
        issues: generated.issues,
      }),
    );
    await context.close();
  }
} finally {
  await browser?.close();
  server.kill();
}
