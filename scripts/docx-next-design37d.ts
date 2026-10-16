/** Saved-project app audit. No DOM rectangles enter canonical construction. */
import type { TemplateId } from "../src/components/cover/types";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { briefProjectFixture } from "../tests/fixtures/docx-next/brief-project";
const require = createRequire(import.meta.url);
const { chromium } = require(
  path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES!, "playwright"),
);
const out = path.resolve(process.argv[2] ?? "/tmp/design37d");
await mkdir(out, { recursive: true });
const server = Bun.spawn({
  cwd: process.env.DOCX_NEXT_AUDIT_CHECKOUT,
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
const base = "http://127.0.0.1:4173";
async function captureDeadline<T>(operation: Promise<T>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(Error("Saved-state audit capture exceeded 60 seconds")),
          60000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
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
  assert(ready, "Vite startup failed");
  browser = await chromium.launch({
    executablePath: process.env.DOCX_NEXT_CHROMIUM_PATH,
    headless: true,
    args: ["--no-sandbox"],
  });
  const results = [];
  for (const template of (
    process.env.DESIGN37D_TEMPLATES ?? "modern,verlauf,neon,freundlich,brief"
  ).split(",")) {
    const folder = path.join(out, template);
    await mkdir(folder, { recursive: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1200 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    page.on("dialog", (d: { accept: () => Promise<void> }) => void d.accept());
    const errors: string[] = [];
    page.on("pageerror", (e: Error) => errors.push(e.message));
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
    project.letter!.design.template = template as TemplateId;
    project.cv!.design.template = template as TemplateId;
    project.cover!.data.lehrbeginn = "August 2028";
    project.cover!.colors = {};
    project.cover!.layout = {};
    await writeFile(path.join(folder, "project.json"), JSON.stringify(project, null, 2));
    await Promise.all([
      page.waitForEvent("load"),
      page.locator('input[type="file"][accept="application/json,.json"]').setInputFiles({
        name: "design-project.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(project)),
      }),
    ]);
    await page.waitForLoadState("networkidle");
    await page.goto(base + "/titelblatt", { waitUntil: "networkidle" });
    const cover = page.locator('[data-dossier-document="cover"]:visible').first();
    await cover.waitFor();
    await page.evaluate(() => document.fonts.ready);
    const captured = await captureDeadline(
      page.evaluate(async (webOnly) => {
        const project = await import("/src/lib/dossier-project.ts");
        const docs = await import("/src/lib/dossier-pdf-document.ts");
        const { captureDossierDocxNextSnapshot } = await import("/src/lib/docx-next/snapshot.ts");
        const { buildDossierDocModel } = await import("/src/lib/docx-next/build-model.ts");
        const { renderDossierDocx } = await import("/src/lib/docx-next/renderer.ts");
        const snapshot = captureDossierDocxNextSnapshot(
          docs.coverPdfDocumentFromSaved(project.readStoredDossierPart(project.COVER_STORAGE_KEY)),
          docs.letterPdfDocumentFromSaved(
            project.readStoredDossierPart(project.LETTER_STORAGE_KEY),
          ),
          docs.cvPdfDocumentFromSaved(project.readStoredDossierPart(project.CV_STORAGE_KEY)),
        );
        const model = buildDossierDocModel(snapshot);
        return {
          snapshot,
          model,
          bytes: webOnly
            ? []
            : Array.from(new Uint8Array(await (await renderDossierDocx(model)).arrayBuffer())),
        };
      }, process.env.DOCX_NEXT_WEB_ONLY === "1"),
    );
    await writeFile(path.join(folder, "snapshot.json"), JSON.stringify(captured.snapshot, null, 2));
    await writeFile(path.join(folder, "model.json"), JSON.stringify(captured.model, null, 2));
    if (captured.bytes.length)
      await writeFile(path.join(folder, "baseline.docx"), Uint8Array.from(captured.bytes));
    const web = await cover.evaluate((root: HTMLElement) => {
      const rr = root.getBoundingClientRect();
      const rect = (el: Element) => {
        const r = el.getBoundingClientRect();
        return {
          x: ((r.x - rr.x) / rr.width) * 210,
          y: ((r.y - rr.y) / rr.height) * 297,
          w: (r.width / rr.width) * 210,
          h: (r.height / rr.height) * 297,
        };
      };
      const style = (el: Element) => {
        const s = getComputedStyle(el);
        return Object.fromEntries(
          [
            "display",
            "color",
            "backgroundColor",
            "fontFamily",
            "fontWeight",
            "fontSize",
            "fontStyle",
            "lineHeight",
            "letterSpacing",
            "textTransform",
            "textAlign",
            "opacity",
            "paddingLeft",
            "paddingRight",
            "paddingTop",
            "paddingBottom",
            "borderRadius",
            "borderWidth",
            "transform",
            "textShadow",
          ].map((k) => [k, s[k as keyof CSSStyleDeclaration]]),
        );
      };
      return Array.from(root.querySelectorAll<HTMLElement>("[data-block-id]")).map((el) => ({
        id: el.dataset.blockId,
        text: el.innerText,
        rect: rect(el),
        style: style(el),
        inner: el.firstElementChild
          ? { rect: rect(el.firstElementChild), style: style(el.firstElementChild) }
          : null,
        badge: el.querySelector("span")
          ? { rect: rect(el.querySelector("span")!), style: style(el.querySelector("span")!) }
          : null,
      }));
    });
    await cover.screenshot({ path: path.join(folder, "web.png"), animations: "disabled" });
    await writeFile(path.join(folder, "web.json"), JSON.stringify(web, null, 2));
    assert.deepEqual(errors, []);
    results.push({
      template,
      sourceEquivalent: true,
      baselineFromSavedAppState: captured.bytes.length > 0,
      web,
    });
    console.log(template + " saved-state audit captured");
    await context.close();
  }
  await writeFile(path.join(out, "audit.json"), JSON.stringify(results, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill();
}
