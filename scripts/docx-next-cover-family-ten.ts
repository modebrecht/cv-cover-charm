/** Ten real restored-project Web/PDF references for the three still-gated cover families.
 * Deliberately does NOT impersonate application-exported native DOCX files.
 * This script must run inside the existing Bun/Playwright/Vite app QA environment.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import cases from "../tests/fixtures/docx-next/cover-family-ten-cases.json";
import type { DossierProject } from "../src/lib/dossier-project";

const out = path.resolve(process.argv[2] ?? "/tmp/docx-next-cover-family-ten");
const appBase = process.env.DOCX_NEXT_APP_URL ?? "http://127.0.0.1:4173";
const require = createRequire(import.meta.url);
const { chromium } = require(
  path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES!, "playwright"),
);
const sha256 = (data: Uint8Array | string) =>
  createHash("sha256").update(data).digest("hex");
const expected = ["verlauf", "neon", "freundlich"];
assert.equal(cases.length, 10);
assert.deepEqual(
  cases.reduce<Record<string, number>>((totals, item) => {
    totals[item.family] = (totals[item.family] ?? 0) + 1;
    return totals;
  }, {}),
  { verlauf: 4, neon: 3, freundlich: 3 },
);
assert(cases.every((item) => expected.includes(item.family)));
assert.equal(new Set(cases.map((item) => item.id)).size, 10);
await mkdir(out, { recursive: true });
const server = process.env.DOCX_NEXT_APP_URL
  ? undefined
  : Bun.spawn({
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
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
const results: unknown[] = [];
try {
  let ready = false;
  for (let n = 0; n < 300; n++) {
    try {
      if ((await fetch(appBase)).ok) {
        ready = true;
        break;
      }
    } catch {
      // App has not finished starting.
    }
    await Bun.sleep(100);
  }
  assert(ready, "Vite application did not become ready");
  browser = await chromium.launch({
    executablePath: process.env.DOCX_NEXT_CHROMIUM_PATH,
    headless: true,
    args: ["--no-sandbox"],
  });
  for (const item of cases) {
    const folder = path.join(out, item.id);
    await mkdir(folder, { recursive: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1200 },
      deviceScaleFactor: 1,
      acceptDownloads: true,
    });
    const page = await context.newPage();
    const pageErrors: string[] = [];
    page.on("pageerror", (error: Error) => pageErrors.push(error.message));
    page.on("dialog", (dialog: { accept: () => Promise<void> }) => void dialog.accept());
    await page.route("**/*", (route: {
      request: () => { url: () => string };
      continue: () => Promise<void>;
      abort: () => Promise<void>;
    }) =>
      route.request().url().startsWith(appBase) ? route.continue() : route.abort(),
    );
    try {
      await page.goto(appBase, { waitUntil: "networkidle" });
      const baselineFile = path.resolve(
        "docs/qa/docx-next-design-fidelity-16okt/audit",
        item.family,
        "project.json",
      );
      const project = JSON.parse(await readFile(baselineFile, "utf8")) as DossierProject;
      assert.equal(project.cover?.template, item.family);
      assert.equal(project.letter?.design.template, item.family);
      assert.equal(project.cv?.design.template, item.family);
      // Browser-created photo is an explicitly labelled QA input asset, NOT
      // a fake DOCX/app PDF. The app still owns all later export operations.
      if (item.variant === "photo") {
        const photo = await page.evaluate(() => {
          const canvas = document.createElement("canvas");
          canvas.width = 120;
          canvas.height = 180;
          const ctx = canvas.getContext("2d")!;
          ctx.fillStyle = "#ab3129";
          ctx.fillRect(0, 0, 60, 180);
          ctx.fillStyle = "#1b73a1";
          ctx.fillRect(60, 0, 60, 180);
          ctx.fillStyle = "#efcb43";
          ctx.fillRect(20, 20, 30, 30);
          return canvas.toDataURL("image/png");
        });
        project.cover!.data.foto = photo;
        // The case adds a crop while preserving every previously authored override.
        project.cover!.layout = {
          ...project.cover!.layout,
          [item.family]: {
            ...project.cover!.layout?.[item.family],
            foto: {
              ...project.cover!.layout?.[item.family]?.foto,
              imgZoom: 1.3,
              imgX: 30,
              imgY: 65,
            },
          },
        };
        await writeFile(path.join(folder, "synthetic-input-photo.txt"),
          "The patterned image in this saved project is a QA fixture, not a photographed person.\n");
      }
      if (item.variant === "scale115") project.cover!.fontScale = 1.15;
      if (item.variant === "long-date") {
        project.cover!.data.lehrbeginn = "August 2028 – September 2029";
        project.cover!.data.beruf = "Informatiker/in EFZ Applikationsentwicklung";
      }
      if (item.variant === "hidden-rule")
        project.cover!.layout = {
          ...project.cover!.layout,
          [item.family]: {
            ...project.cover!.layout?.[item.family],
            trenner: {
              ...project.cover!.layout?.[item.family]?.trenner,
              hidden: true,
            },
          },
        };
      if (item.variant === "long-name") {
        project.cover!.data.vorname = "Lea Sophie";
        project.cover!.data.nachname = "Müller-Meier";
      }
      if (item.variant === "contact-long") {
        project.cover!.data.adresse = "Längere Beispielstrasse 123";
        project.cover!.data.plzOrt = "8000 Zürich";
        project.cover!.data.beilagen = [
          "Motivationsschreiben",
          "Lebenslauf",
          "Zeugnis",
          "Bestätigung Schnuppertage",
        ];
      }
      const projectJson = JSON.stringify(project, null, 2);
      await writeFile(path.join(folder, "saved-project.json"), projectJson);
      await Promise.all([
        page.waitForEvent("load"),
        page.locator('input[type="file"][accept="application/json,.json"]').setInputFiles({
          name: item.id + "-saved-project.json",
          mimeType: "application/json",
          buffer: Buffer.from(projectJson),
        }),
      ]);
      await page.waitForLoadState("networkidle");
      // Mount CV and Letter first so existing app-side font synchronization settles.
      for (const documentPath of ["/lebenslauf", "/anschreiben", "/titelblatt"])
        await page.goto(appBase + documentPath, { waitUntil: "networkidle" });
      const root = page.locator('[data-dossier-document="cover"]:visible').first();
      await root.waitFor();
      await page.evaluate(() => document.fonts.ready);
      const captured = await page.evaluate(async () => {
        const project = await import("/src/lib/dossier-project.ts");
        const docs = await import("/src/lib/dossier-pdf-document.ts");
        const { captureDossierDocxNextSnapshot } =
          await import("/src/lib/docx-next/snapshot.ts");
        const { buildDossierDocModel } = await import("/src/lib/docx-next/build-model.ts");
        const snapshot = captureDossierDocxNextSnapshot(
          docs.coverPdfDocumentFromSaved(project.readStoredDossierPart(project.COVER_STORAGE_KEY)),
          docs.letterPdfDocumentFromSaved(project.readStoredDossierPart(project.LETTER_STORAGE_KEY)),
          docs.cvPdfDocumentFromSaved(project.readStoredDossierPart(project.CV_STORAGE_KEY)),
        );
        return { snapshot, model: buildDossierDocModel(snapshot) };
      });
      assert.equal(captured.snapshot.cover.template, item.family);
      assert.deepEqual(captured.snapshot.cover.data, project.cover!.data);
      if (item.variant === "photo") {
        const photo = captured.snapshot.cover.blocks.find((block: { id: string }) => block.id === "foto");
        assert(photo, "Saved photo block is missing");
        assert.equal(photo.style.imgZoom, 1.3, "Saved zoom ignored by export snapshot");
        assert.equal(photo.style.imgX, 30, "Saved x crop ignored by export snapshot");
        assert.equal(photo.style.imgY, 65, "Saved y crop ignored by export snapshot");
        assert.equal(captured.snapshot.cover.data.foto, project.cover!.data.foto);
      }
      if (item.variant === "hidden-rule") {
        const separator = captured.snapshot.cover.blocks.find(
          (block: { id: string }) => block.id === "trenner",
        );
        assert(separator?.style.hidden, "Explicit saved separator visibility was lost");
      }
      await writeFile(path.join(folder, "snapshot.json"), JSON.stringify(captured.snapshot, null, 2));
      await writeFile(path.join(folder, "default-native-model.json"),
        JSON.stringify(captured.model, null, 2));
      const web = await root.evaluate((element: HTMLElement) => {
        const sheet = element.getBoundingClientRect();
        const mm = (target: DOMRect) => ({
          x: ((target.x - sheet.x) * 210) / sheet.width,
          y: ((target.y - sheet.y) * 297) / sheet.height,
          w: (target.width * 210) / sheet.width,
          h: (target.height * 297) / sheet.height,
        });
        return [...element.querySelectorAll<HTMLElement>("[data-block-id]")].map((node) => {
          const style = getComputedStyle(node);
          const span = node.querySelector("span");
          const parent = node.firstElementChild;
          const img = node.querySelector("img");
          const photo = img ? getComputedStyle(img) : null;
          const inner = parent ? getComputedStyle(parent) : null;
          const badge = span ? getComputedStyle(span) : null;
          return {
            id: node.dataset.blockId,
            text: node.innerText,
            rect: mm(node.getBoundingClientRect()),
            childRect: parent ? mm(parent.getBoundingClientRect()) : null,
            badgeRect: span ? mm(span.getBoundingClientRect()) : null,
            opacity: style.opacity,
            font: style.fontFamily,
            fontSize: style.fontSize,
            effectiveInk: style.color,
            effectiveWeight: style.fontWeight,
            effectiveTracking: style.letterSpacing,
            effectiveLineHeight: style.lineHeight,
            innerPaint: inner
              ? {
                  background: inner.backgroundColor,
                  gradient: inner.backgroundImage,
                  radius: inner.borderRadius,
                  opacity: inner.opacity,
                  strokeColor: inner.borderColor,
                  strokeWidth: inner.borderWidth,
                }
              : null,
            badgePaint: badge
              ? {
                  background: badge.backgroundColor,
                  gradient: badge.backgroundImage,
                  radius: badge.borderRadius,
                  paddingX: badge.paddingLeft,
                  paddingY: badge.paddingTop,
                }
              : null,
            imageCrop: photo
              ? {
                  width: photo.width,
                  height: photo.height,
                  left: photo.left,
                  top: photo.top,
                  objectFit: photo.objectFit,
                  objectPosition: photo.objectPosition,
                  renderedRect: mm(img!.getBoundingClientRect()),
                  frameRadius: inner?.borderRadius ?? null,
                }
              : null,
          };
        });
      });
      await root.screenshot({ path: path.join(folder, "web-cover.png"), animations: "disabled" });
      await writeFile(path.join(folder, "web-cover.json"), JSON.stringify(web, null, 2));
      // Compare with the archived *real* Web baseline, without silently treating
      // differences as Word results or imposing equality on intentionally changed cases.
      if (item.variant === "baseline") {
        const original = JSON.parse(await readFile(path.resolve(
          "docs/qa/docx-next-design-fidelity-16okt/audit",
          item.family,
          "web.json",
        ), "utf8")) as Array<{ id: string; rect: { x: number; y: number; w: number; h: number } }>;
        const previous = new Map(original.map((block) => [block.id, block.rect]));
        const delta = web.map((block) => {
          const was = previous.get(block.id);
          return {
            id: block.id,
            missingHistoricalReference: !was,
            ...(was ? {
              dxMm: block.rect.x - was.x,
              dyMm: block.rect.y - was.y,
              dwMm: block.rect.w - was.w,
              dhMm: block.rect.h - was.h,
            } : {}),
          };
        });
        await writeFile(path.join(folder, "historical-web-drift.json"), JSON.stringify({
          disclaimer: "Comparison to archived 16 October Web only, not Word acceptance",
          delta,
        }, null, 2));
      }
      // Both neighboring documents must be captured in the same restored app
      // session; otherwise the cover alone can conceal Letter/CV regressions.
      for (const [part, route, selector] of [
        ["letter", "anschreiben", "[data-letter-page]"],
        ["cv", "lebenslauf", "[data-cv-page]"],
      ] as const) {
        await page.goto(appBase + "/" + route, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        const sheets = page.locator(selector + ":visible");
        const n = await sheets.count();
        assert(n > 0, part + " has no visible app pages");
        for (let i = 0; i < Math.min(n, 4); i++)
          await sheets.nth(i).screenshot({
            path: path.join(folder, `web-${part}-page-${i + 1}.png`),
            animations: "disabled",
          });
        await writeFile(path.join(folder, `web-${part}-pages.json`),
          JSON.stringify({ observedPages: n, screenshots: Math.min(n, 4) }, null, 2));
      }
      await page.goto(appBase + "/titelblatt", { waitUntil: "networkidle" });
      const beforePdf = await page.evaluate(() =>
        ["titelblatt:v3", "anschreiben:v1", "lebenslauf:v1"]
          .map((key) => localStorage.getItem(key)),
      );
      await page.getByRole("button").filter({ hasText: "Gesamtdossier herunterladen" }).click();
      const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
      const pdfButton = dialog.getByRole("button", { name: "PDF herunterladen", exact: true });
      let pdf: { status: string; sha256?: string; reason?: string } = {
        status: "NOT_EXPORTED",
      };
      try {
        await pdfButton.waitFor({ state: "visible", timeout: 30000 });
        if (!await pdfButton.isEnabled()) {
          pdf = { status: "BLOCKED_BY_APP_PREFLIGHT", reason: "PDF button disabled" };
          await dialog.screenshot({ path: path.join(folder, "pdf-preflight.png") });
        } else {
          const downloadEvent = page.waitForEvent("download", { timeout: 120000 });
          await pdfButton.click();
          const download = await downloadEvent;
          const output = path.join(folder, "app.pdf");
          await download.saveAs(output);
          pdf = { status: "ACTUAL_APP_EXPORT", sha256: sha256(new Uint8Array(await readFile(output))) };
        }
      } catch (error) {
        pdf = { status: "NOT_EXPORTED", reason: String(error) };
      }
      assert.deepEqual(
        await page.evaluate(() =>
          ["titelblatt:v3", "anschreiben:v1", "lebenslauf:v1"]
            .map((key) => localStorage.getItem(key))),
        beforePdf,
        "PDF export mutated stored source",
      );
      assert.deepEqual(pageErrors, []);
      const result = {
        ...item,
        status: "WEB_REFERENCE_CAPTURED",
        projectSha256: sha256(projectJson),
        snapshotSha256: sha256(JSON.stringify(captured.snapshot)),
        pdf,
        nativeDocx: {
          status: "GATED_UNAVAILABLE",
          reason: "Current application allows native authored DOCX only for Brief/Modern",
        },
        wordAcceptance: "UNVERIFIED",
      };
      await writeFile(path.join(folder, "manifest.json"), JSON.stringify(result, null, 2));
      results.push(result);
    } finally {
      await context.close();
    }
  }
  await writeFile(path.join(out, "manifest.json"), JSON.stringify({
    type: "cover-family-reference-only",
    count: results.length,
    realNativeApplicationDocxFiles: 0,
    notAnAcceptancePackage: true,
    results,
  }, null, 2));
} finally {
  if (browser) await browser.close();
  server?.kill();
}
