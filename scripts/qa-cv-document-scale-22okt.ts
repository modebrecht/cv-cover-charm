/** Restore a saved project and verify fresh guarded app exports at display variants. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
const require = createRequire(import.meta.url),
  { chromium } = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + "/playwright");
const out = path.resolve(process.argv[2]),
  projectFile = process.env.DOCX_NEXT_SAVED_PROJECT;
if (!projectFile) throw Error("DOCX_NEXT_SAVED_PROJECT is required");
await mkdir(out, { recursive: true });
const source = await readFile(projectFile),
  base = process.env.DOCX_NEXT_APP_URL!,
  query = "?docx-next-design-qa=1&docx-next-interior-qa=1&docx-next-reading-rows-qa=1";
const browser = await chromium.launch({
  executablePath: process.env.DOCX_NEXT_CHROMIUM_PATH,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});
const results = [];
let baseline: any;
try {
  for (const item of [
    { id: "baseline", width: 1440, dpr: 1, preview: 1 },
    { id: "dpr2", width: 1440, dpr: 2, preview: 1 },
    { id: "narrow-preview", width: 980, dpr: 1, preview: 0.7 },
  ]) {
    const context = await browser.newContext({
      viewport: { width: item.width, height: 1200 },
      deviceScaleFactor: item.dpr,
    });
    try {
      const page = await context.newPage(),
        errors: string[] = [];
      page.on("dialog", (d: any) => void d.accept());
      page.on("pageerror", (e: Error) => errors.push(e.message));
      await page.route("**/*", (r: any) =>
        r.request().url().startsWith(base) ? r.continue() : r.abort(),
      );
      await page.goto(base + "/" + query, { waitUntil: "networkidle" });
      await Promise.all([
        page.waitForEvent("load"),
        page
          .locator('input[type="file"][accept="application/json,.json"]')
          .setInputFiles({ name: "saved.json", mimeType: "application/json", buffer: source }),
      ]);
      await page.goto(base + "/lebenslauf" + query, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      const view = await page.evaluate(async (preview: number) => {
        const { cvReadingFlowZoom } = await import("/src/lib/docx-next-cv-zoom.browser.ts");
        const root = document.querySelector<HTMLElement>('main [data-dossier-document="cv"]')!;
        if (preview !== 1) root.parentElement!.style.zoom = String(preview);
        return {
          cvPages: root.querySelectorAll("[data-cv-page]").length,
          flowScale: cvReadingFlowZoom(root),
          dpr: devicePixelRatio,
          viewport: innerWidth,
        };
      }, item.preview);
      const storage = () =>
        page.evaluate(() =>
          Object.fromEntries(
            Object.keys(localStorage)
              .sort()
              .map((k) => [k, localStorage.getItem(k)]),
          ),
        );
      const before = await storage();
      await page.goto(base + "/" + query, { waitUntil: "networkidle" });
      const generated = await page.evaluate(async () => {
        const { createSavedDesignDocxNext } = await import("/src/lib/design-docx-next-export.ts");
        const r = await createSavedDesignDocxNext();
        return {
          snapshot: r.snapshot,
          model: r.model,
          metrics: r.metrics,
          interiorMetrics: r.interiorMetrics,
          cvPersonalHeaderMetrics: r.cvPersonalHeaderMetrics,
          bytes: Array.from(new Uint8Array(await r.blob.arrayBuffer())),
        };
      });
      assert.equal(view.flowScale, 0.9);
      assert.equal(generated.interiorMetrics.cvFlowScale, 0.9);
      assert.deepEqual(generated.model.issues, []);
      assert.deepEqual(before, await storage());
      await page.getByRole("button").filter({ hasText: "Gesamtdossier herunterladen" }).click();
      const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
      const event = page.waitForEvent("download");
      await dialog.getByRole("button", { name: "Modern CV-Zeilen testen", exact: true }).click();
      const download = await event;
      await download.saveAs(path.join(out, item.id + ".docx"));
      const bytes = await readFile(path.join(out, item.id + ".docx"));
      assert.deepEqual(bytes, Buffer.from(generated.bytes));
      const { bytes: _, ...proof } = generated;
      if (!baseline) baseline = { bytes, proof };
      else {
        assert.deepEqual(bytes, baseline.bytes);
        assert.deepEqual(proof, baseline.proof);
      }
      await writeFile(path.join(out, item.id + "-proof.json"), JSON.stringify(proof, null, 2));
      if (item.id === "baseline") {
        if (!(await dialog.isVisible()))
          await page.getByRole("button").filter({ hasText: "Gesamtdossier herunterladen" }).click();
        await dialog.getByRole("radio", { name: "Fertiges Dossier (PDF)" }).click();
        const pdf = page.waitForEvent("download", { timeout: 60000 });
        await dialog.getByRole("button", { name: "PDF herunterladen", exact: true }).click();
        await (await pdf).saveAs(path.join(out, "Web-PDF.pdf"));
      }
      assert.deepEqual(before, await storage());
      assert.deepEqual(errors, []);
      const result = {
        ...item,
        view,
        docxSha256: createHash("sha256").update(bytes).digest("hex"),
        docxIdenticalToBaseline: true,
        modelAndMetricsIdentical: true,
        savedInputsUnchanged: true,
        guardedUiDownloadMatches: true,
      };
      results.push(result);
      console.log(JSON.stringify(result));
      await writeFile(
        path.join(out, "results.json"),
        JSON.stringify(
          {
            sourceProject: projectFile,
            scope:
              "Real restored project, temporary QA SPA; DPR/preview only, browser menu zoom unverified",
            results,
          },
          null,
          2,
        ),
      );
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
