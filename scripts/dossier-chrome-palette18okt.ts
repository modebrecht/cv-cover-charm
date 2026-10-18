/** Saved project -> both visible editors -> canonical snapshot -> primary PDF.
 * Native models for all five families are diagnostic, not Word acceptance.
 */
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
const out = path.resolve(process.argv[2]);
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
const results: unknown[] = [];
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
    await new Promise((r) => setTimeout(r, 100));
  }
  assert(ready);
  browser = await chromium.launch({
    executablePath: process.env.DOCX_NEXT_CHROMIUM_PATH,
    headless: true,
    args: ["--no-sandbox"],
  });
  for (const template of (
    process.env.PALETTE_TEMPLATES ?? "brief,modern,freundlich,verlauf,neon"
  ).split(",")) {
    for (const kind of (
      process.env.PALETTE_CASES ?? "compact,inline,stacked,reduced,explicit,separate"
    ).split(",")) {
      const folder = path.join(out, `${template}-${kind}`);
      await mkdir(folder, { recursive: true });
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1200 },
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();
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
      project.cv!.design.font = "sans";
      project.letter!.design.fontOverride = "sans";
      project.cv!.data.sectionLayouts = {
        ...project.cv!.data.sectionLayouts,
        hobbys: { page: 2, width: "full" },
      };
      project.letter!.data.text = Array(3).fill(project.letter!.data.text).join("\n\n");
      project.chrome = structuredClone(DEFAULT_DOSSIER_CHROME_STATE);
      const chrome = project.chrome.shared;
      Object.assign(chrome, {
        headerDifferentFirstPage: false,
        headerMode: ["inline", "stacked", "reduced"].includes(kind) ? "contact" : "compact",
        headerTextLayout: kind === "inline" ? "inline" : "stacked",
      });
      if (kind === "reduced")
        Object.assign(chrome, {
          headerDifferentFirstPage: true,
          headerContinuationMode: "contact",
        });
      if (kind === "explicit")
        Object.assign(chrome, {
          headerBackgroundColor: "#15384c",
          footerBackgroundColor: "#653f2a",
          headerGradientColor: "#426d85",
          footerGradientColor: "#a16945",
          headerTextColor: "#ffffff",
          footerTextColor: "#ffffff",
          borderColor: "#c59c59",
        });
      if (kind === "separate") {
        project.chrome.sync = false;
        project.chrome.cv = {
          ...chrome,
          headerBackgroundColor: "#234c35",
          footerBackgroundColor: "#234c35",
        };
        project.chrome.letter = {
          ...chrome,
          headerBackgroundColor: "#492753",
          footerBackgroundColor: "#492753",
        };
      }
      await writeFile(path.join(folder, "project.json"), JSON.stringify(project, null, 2));
      await Promise.all([
        page.waitForEvent("load"),
        page.locator('input[type="file"][accept="application/json,.json"]').setInputFiles({
          name: "palette.json",
          mimeType: "application/json",
          buffer: Buffer.from(JSON.stringify(project)),
        }),
      ]);
      await page.waitForLoadState("networkidle");
      type Paint = {
        background: string;
        image: string;
        opacity: number;
        border: string;
        borderBottom: string;
      };
      const paints: Record<
        string,
        {
          mode: string | undefined;
          header: Paint | null;
          footer: Paint | null;
          border: string | undefined;
          primary: string;
        }[]
      > = {};
      for (const [scope, route, selector] of [
        ["letter", "anschreiben", "[data-letter-page]"],
        ["cv", "lebenslauf", "[data-cv-page]"],
      ] as const) {
        await page.goto(`${base}/${route}`, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        const preview = page.locator(`main [data-dossier-document="${scope}"]`).first();
        await preview.locator(selector).nth(1).waitFor();
        if (scope === "letter")
          await page.waitForFunction(
            () =>
              document
                .querySelector("main [data-letter-document-root]")
                ?.getAttribute("data-letter-pagination-ready") === "true",
          );
        paints[scope] = await preview.locator(selector).evaluateAll((nodes: HTMLElement[]) =>
          nodes.map((node) => {
            const chrome = node.querySelector<HTMLElement>("[data-dossier-chrome]")!;
            const header = chrome.querySelector<HTMLElement>(
              "[data-dossier-compact-header], [data-dossier-contact-header-background], [data-dossier-continuation-contact-header]",
            );
            const footer = chrome.querySelector<HTMLElement>("[data-dossier-footer]");
            const paint = (el: HTMLElement | null) => {
              if (!el) return null;
              const s = getComputedStyle(el);
              return {
                background: s.backgroundColor,
                image: s.backgroundImage,
                opacity: Number(s.opacity),
                border:
                  parseFloat(s.borderTopWidth) > 0
                    ? `${s.borderTopWidth} ${s.borderTopStyle} ${s.borderTopColor}`
                    : "none",
                borderBottom:
                  parseFloat(s.borderBottomWidth) > 0
                    ? `${s.borderBottomWidth} ${s.borderBottomStyle} ${s.borderBottomColor}`
                    : "none",
              };
            };
            return {
              mode: chrome.dataset.dossierEffectiveHeaderMode,
              header: paint(header),
              footer: paint(footer),
              border: chrome.dataset.dossierBorderColor,
              primary: chrome.style.getPropertyValue("--chrome-primary"),
            };
          }),
        );
        for (const paint of paints[scope])
          assert.equal(
            paint.footer.opacity,
            1,
            `${template}/${kind}/${scope}: footer must be opaque`,
          );
        await preview
          .locator(selector)
          .first()
          .screenshot({ path: path.join(folder, `${scope}-first.png`) });
        await preview
          .locator(selector)
          .nth(1)
          .screenshot({ path: path.join(folder, `${scope}-continuation.png`) });
      }
      await writeFile(path.join(folder, "paints.json"), JSON.stringify(paints, null, 2));
      for (const n of [0, 1]) {
        const l = paints.letter[n],
          c = paints.cv[n];
        if (kind === "separate") {
          if (!(template === "freundlich" && n === 0)) assert.notDeepEqual(l.header, c.header);
          assert.notDeepEqual(l.footer, c.footer);
        } else {
          if (
            !(template === "freundlich" && kind === "compact" && n === 0) &&
            !(template === "freundlich" && kind === "explicit" && n === 0)
          )
            assert.deepEqual(l.header, c.header, `${template}/${kind}: header sync`);
          assert.deepEqual(l.footer, c.footer, `${template}/${kind}: footer sync`);
          assert.equal(l.border, c.border);
          assert.equal(l.primary, c.primary);
        }
      }
      if (kind === "explicit")
        for (const scope of ["letter", "cv"]) {
          assert(paints[scope][1].header.image.includes("rgb(21, 56, 76)"));
          assert(paints[scope][1].footer.image.includes("rgb(101, 63, 42)"));
        }
      await page.reload({ waitUntil: "networkidle" });
      const captured = await page.evaluate(async (diagnostic) => {
        const p = await import("/src/lib/dossier-project.ts");
        const d = await import("/src/lib/dossier-pdf-document.ts");
        const { captureDossierDocxNextSnapshot } = await import("/src/lib/docx-next/snapshot.ts");
        const { resolveDossierChromeSnapshot } =
          await import("/src/lib/dossier-resolved-chrome.ts");
        const { buildDossierDocModel } = await import("/src/lib/docx-next/build-model.ts");
        const { renderDossierDocx } = await import("/src/lib/docx-next/renderer.ts");
        const snapshot = captureDossierDocxNextSnapshot(
          d.coverPdfDocumentFromSaved(p.readStoredDossierPart(p.COVER_STORAGE_KEY)),
          d.letterPdfDocumentFromSaved(p.readStoredDossierPart(p.LETTER_STORAGE_KEY)),
          d.cvPdfDocumentFromSaved(p.readStoredDossierPart(p.CV_STORAGE_KEY)),
        );
        const stored = [
          p.COVER_STORAGE_KEY,
          p.LETTER_STORAGE_KEY,
          p.CV_STORAGE_KEY,
          "bewerbungsdossier:chrome:v1",
        ].map((key) => localStorage.getItem(key));
        const before = JSON.stringify(snapshot);
        const resolved = resolveDossierChromeSnapshot(snapshot, snapshot.settings.chrome!);
        const model = buildDossierDocModel(snapshot);
        const bytes = diagnostic
          ? Array.from(new Uint8Array(await (await renderDossierDocx(model)).arrayBuffer()))
          : [];
        return {
          snapshot,
          resolved,
          model,
          bytes,
          immutable: before === JSON.stringify(snapshot),
          unchangedStorage:
            JSON.stringify(stored) ===
            JSON.stringify(
              [
                p.COVER_STORAGE_KEY,
                p.LETTER_STORAGE_KEY,
                p.CV_STORAGE_KEY,
                "bewerbungsdossier:chrome:v1",
              ].map((key) => localStorage.getItem(key)),
            ),
        };
      }, kind === "compact");
      assert(captured.immutable && captured.unchangedStorage);
      if (kind !== "separate")
        assert.deepEqual(
          captured.resolved.cv.options.resolvedPalette,
          captured.resolved.letter.options.resolvedPalette,
        );
      assert.equal(captured.snapshot.settings.chrome!.sync, kind !== "separate");
      assert.deepEqual(errors, []);
      await writeFile(
        path.join(folder, "capture.json"),
        JSON.stringify({ ...captured, bytes: undefined, paints }, null, 2),
      );
      if (kind === "compact") {
        await writeFile(path.join(folder, "diagnostic.docx"), Uint8Array.from(captured.bytes));
        await page.goto(base, { waitUntil: "networkidle" });
        await page.getByRole("button").filter({ hasText: "Gesamtdossier herunterladen" }).click();
        const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
        const event = page.waitForEvent("download", { timeout: 120000 });
        await dialog.getByRole("button", { name: "PDF herunterladen", exact: true }).click();
        await (await event).saveAs(path.join(folder, "primary.pdf"));
      }
      results.push({
        template,
        kind,
        status: "PASS",
        visibleEditorPages: paints.letter.length + paints.cv.length,
        nativeDiagnostic: kind === "compact",
        actualPrimaryPdf: kind === "compact",
        wordAcceptance: "UNVERIFIED",
      });
      await writeFile(path.join(out, "results.json"), JSON.stringify(results, null, 2));
      console.log(`${template}/${kind} palette PASS`);
      await context.close();
    }
  }
} finally {
  await writeFile(path.join(out, "results.json"), JSON.stringify(results, null, 2));
  if (browser) await browser.close();
  server.kill();
}
