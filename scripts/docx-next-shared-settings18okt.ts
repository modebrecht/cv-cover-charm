/** Five-template saved-project/settings gate. No export promotion or fixture XML edits. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { briefProjectFixture } from "../tests/fixtures/docx-next/brief-project";
import { DEFAULT_DOSSIER_CHROME_STATE } from "../src/lib/dossier-chrome";
import type { TemplateId } from "../src/components/cover/types";

const require = createRequire(import.meta.url);
const { chromium } = require(
  path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES!, "playwright"),
);
const out = path.resolve(process.argv[2] ?? "/tmp/shared18-settings");
await mkdir(out, { recursive: true });
const base = "http://127.0.0.1:4173";
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
const captureSavedState = async () => {
  const project = await import("/src/lib/dossier-project.ts");
  const docs = await import("/src/lib/dossier-pdf-document.ts");
  const { captureDossierDocxNextSnapshot } = await import("/src/lib/docx-next/snapshot.ts");
  const { buildDossierDocModel } = await import("/src/lib/docx-next/build-model.ts");
  const cover = docs.coverPdfDocumentFromSaved(
    project.readStoredDossierPart(project.COVER_STORAGE_KEY),
  )!;
  const letter = docs.letterPdfDocumentFromSaved(
    project.readStoredDossierPart(project.LETTER_STORAGE_KEY),
  )!;
  const cv = docs.cvPdfDocumentFromSaved(project.readStoredDossierPart(project.CV_STORAGE_KEY))!;
  const snapshot = captureDossierDocxNextSnapshot(cover, letter, cv);
  const before = JSON.stringify(snapshot);
  const model = buildDossierDocModel(snapshot);
  return { snapshot, model, immutable: before === JSON.stringify(snapshot) };
};

let browser;
let captureFailure: (() => Promise<void>) | undefined;
const results: unknown[] = [];
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
    await new Promise((r) => setTimeout(r, 100));
  }
  assert(ready, "Local app did not start");
  browser = await chromium.launch({
    executablePath: process.env.DOCX_NEXT_CHROMIUM_PATH,
    headless: true,
    args: ["--no-sandbox"],
  });
  for (const template of (
    process.env.SHARED18_TEMPLATES ?? "brief,modern,freundlich,verlauf,neon"
  ).split(",")) {
    for (const kind of (process.env.SHARED18_KINDS ?? "default,saved").split(",")) {
      const folder = path.join(out, `${template}-${kind}`);
      await mkdir(folder, { recursive: true });
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1200 },
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();
      captureFailure = async () => {
        await page.screenshot({ path: path.join(folder, "failure.png"), fullPage: true });
        await writeFile(
          path.join(folder, "failure.json"),
          JSON.stringify(
            await page.evaluate(() => ({
              url: location.href,
              layout: document.querySelector('[data-editor-section-title="Layout"]')?.outerHTML,
              sliders: Array.from(
                document.querySelectorAll("[data-dossier-continuation-top-margin-control]"),
              ).map((el) => el.outerHTML),
              saved: Object.fromEntries(
                [
                  "titelblatt:v3",
                  "anschreiben:v1",
                  "lebenslauf:v1",
                  "lebenslauf:continuation-top-margin:v1",
                ].map((k) => [k, localStorage.getItem(k)]),
              ),
            })),
            null,
            2,
          ),
        );
      };
      const errors: string[] = [];
      page.on("pageerror", (e: Error) => errors.push(e.message));
      page.on("dialog", (d: { accept: () => Promise<void> }) => void d.accept());
      await page.route(
        "**/*",
        (r: {
          request: () => { url: () => string };
          continue: () => Promise<void>;
          abort: () => Promise<void>;
        }) => (r.request().url().startsWith(base) ? r.continue() : r.abort()),
      );
      await page.goto(base, { waitUntil: "networkidle" });
      const project = briefProjectFixture("normal");
      project.cover!.template = template as TemplateId;
      project.cover!.colors = {};
      project.cover!.layout = {};
      project.letter!.design.template = template;
      project.cv!.design.template = template;
      // This gate explicitly uses the supported Sans profile, not an inferred substitution.
      project.cv!.design.font = "sans";
      // Explicit page-2 placement proves the same authored setting across template densities.
      project.cv!.data.sectionLayouts = {
        ...project.cv!.data.sectionLayouts,
        hobbys: { page: 2, width: "full" },
      };
      project.letter!.design.fontOverride = "sans";
      project.chrome = structuredClone(DEFAULT_DOSSIER_CHROME_STATE);
      project.letter!.data.text = Array(3).fill(project.letter!.data.text).join("\n\n");
      const sample = project.cv!.data.erfahrung[0];
      project.cv!.data.erfahrung.push(
        ...Array.from({ length: 3 }, (_, n) => ({
          ...structuredClone(sample),
          id: `shared-${n}`,
          ort: `Fortsetzung ${n + 1}`,
        })),
      );
      if (kind === "saved") {
        project.cv!.design.sectionTitleFontSizePx = 18;
        project.cv!.portableState = { continuationTopMarginMm: 12 };
        project.letter!.design.continuationTopMarginMm = 12;
      }
      await writeFile(path.join(folder, "project.json"), JSON.stringify(project, null, 2));
      await Promise.all([
        page.waitForEvent("load"),
        page.locator('input[type="file"][accept="application/json,.json"]').setInputFiles({
          name: "shared-settings.json",
          mimeType: "application/json",
          buffer: Buffer.from(JSON.stringify(project)),
        }),
      ]);
      await page.waitForLoadState("networkidle");
      for (const [scope, route, selector] of [
        ["cv", "lebenslauf", "[data-cv-page]"],
        ["letter", "anschreiben", "[data-letter-page]"],
      ] as const) {
        await page.goto(`${base}/${route}`, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        // Source-to-DOM first and continuation page geometry, not just existence.
        const preview = page.locator(`main [data-dossier-document="${scope}"]`).first();
        if (scope === "letter") await preview.locator("[data-letter-document-pages]").waitFor();
        if (scope === "letter")
          await page.waitForFunction(
            () =>
              document
                .querySelector("main [data-letter-document-root]")
                ?.getAttribute("data-letter-pagination-ready") === "true",
          );
        await preview.locator(selector).nth(1).waitFor();
        const geometry = await preview.locator(selector).evaluateAll(
          (nodes: HTMLElement[], scope: string) =>
            nodes.map((node) => {
              const root = node.getBoundingClientRect();
              const content =
                scope === "cv"
                  ? node.querySelector<HTMLElement>("[data-cv-main]")!
                  : node.querySelector<HTMLElement>("[data-letter-text-layer]");
              const main = content?.getBoundingClientRect();
              return {
                pageIndex: Number(node.dataset.cvPage ?? node.dataset.letterPageIndex),
                heightMm: 297,
                topMm: main ? ((main.top - root.top) / root.height) * 297 : null,
                cssTop: content ? getComputedStyle(content).top : null,
                rubricSizes: Array.from(
                  node.querySelectorAll<HTMLElement>("[data-cv-section-title]"),
                ).map((el) => getComputedStyle(el).fontSize),
              };
            }),
          scope,
        );
        assert(geometry.length >= 2, `${template}/${scope}: expected multipage fixture`);
        await preview
          .locator(selector)
          .first()
          .screenshot({ path: path.join(folder, `web-${scope}-first.png`) });
        await preview
          .locator(selector)
          .nth(1)
          .screenshot({ path: path.join(folder, `web-${scope}-continuation.png`) });
        const beforeReset = await page.evaluate(captureSavedState);
        const expectedTops = beforeReset.snapshot.settings.flowPageTops![scope]!;
        for (const actual of geometry) {
          const expected =
            actual.pageIndex === 0 ? expectedTops.firstMm : expectedTops.continuationMm;
          assert(
            actual.topMm !== null && Math.abs(actual.topMm - expected) < 0.05,
            `${template}/${scope}: DOM top ${actual.topMm}, source ${expected}`,
          );
        }
        const layout = page.locator('[data-editor-section-title="Layout"]');
        await layout.waitFor();
        const slider = page.locator(`[data-dossier-continuation-top-margin-control="${scope}"]`);
        // Existing SSR open-state attributes can lag hydration. Use the real
        // mounted control, rather than toggling an already open section shut.
        if (!(await slider.count())) await layout.locator("[data-editor-section-toggle]").click();
        await slider.evaluate((input: HTMLInputElement) => {
          for (const p of Array.from(document.querySelectorAll("details")))
            if (p.contains(input)) p.open = true;
        });
        assert.equal(Number(await slider.inputValue()), kind === "saved" ? 12 : 20);
        if (kind === "saved") {
          await slider
            .locator("..")
            .getByRole("button", { name: "Standardrand (20 mm)", exact: true })
            .click();
          assert.equal(Number(await slider.inputValue()), 20);
          // The Letter editor deliberately autosaves after 250 ms. Observe the
          // saved value instead of racing its effect with a reload.
          await page.waitForFunction(
            (scope: string) =>
              scope === "cv"
                ? localStorage.getItem("lebenslauf:continuation-top-margin:v1") === null
                : JSON.parse(localStorage.getItem("anschreiben:v1") ?? "{}").design
                    ?.continuationTopMarginMm === null,
            scope,
          );
          await page.reload({ waitUntil: "networkidle" });
          const reopenedLayout = page.locator('[data-editor-section-title="Layout"]');
          await reopenedLayout.waitFor();
          if (
            !(await page
              .locator(`[data-dossier-continuation-top-margin-control="${scope}"]`)
              .count())
          )
            await reopenedLayout.locator("[data-editor-section-toggle]").click();
          assert.equal(
            Number(
              await page
                .locator(`[data-dossier-continuation-top-margin-control="${scope}"]`)
                .inputValue(),
            ),
            20,
          );
        }
        await writeFile(
          path.join(folder, `web-${scope}-geometry.json`),
          JSON.stringify(geometry, null, 2),
        );
      }
      const capture = await page.evaluate(captureSavedState);
      assert(capture.immutable);
      assert.deepEqual(capture.snapshot.cv.data.erfahrung, project.cv!.data.erfahrung);
      assert.equal(capture.snapshot.letter.data.text, project.letter!.data.text);
      assert.equal(capture.snapshot.settings.cvContinuationTopMarginMm, 20);
      assert.equal(capture.snapshot.cv.design.sectionTitleFontSizePx, kind === "saved" ? 18 : 14);
      for (const scope of ["letter", "cv"] as const)
        assert.equal(
          capture.model[scope].page.margins.top,
          capture.snapshot.settings.flowPageTops![scope]!.continuationMm,
        );
      assert.deepEqual(errors, []);
      await writeFile(path.join(folder, "capture.json"), JSON.stringify(capture, null, 2));
      results.push({
        template,
        kind,
        result: "PASS",
        nativeVisualAcceptance: "UNVERIFIED",
        savedMarginAndReset: kind === "saved",
        rubricPx: capture.snapshot.cv.design.sectionTitleFontSizePx,
        tops: capture.snapshot.settings.flowPageTops,
      });
      console.log(`${template}/${kind} shared settings PASS`);
      await context.close();
    }
  }
} catch (error) {
  if (captureFailure) await captureFailure();
  throw error;
} finally {
  await writeFile(path.join(out, "results.json"), JSON.stringify(results, null, 2));
  if (browser) await browser.close();
  server.kill();
}
