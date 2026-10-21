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
// Explicitly diagnostic; never switches the actual application export path.
const exportAvatarTrials = process.env.DOCX_NEXT_AVATAR_EXPERIMENT === "1";
// A real full three-part DOCX downloaded by clicking the app's QA UI button.
const exportFullAppDocx = process.env.DOCX_NEXT_FULL_APP_QA === "1";
const avatarFormat = process.env.DOCX_NEXT_AVATAR_FORMAT ?? "single-owner";
assert(["single-owner", "writer-vml"].includes(avatarFormat),
  "Unknown diagnostic avatar format; use single-owner or writer-vml");
const require = createRequire(import.meta.url);
// The project intentionally does not declare Playwright as a dependency.
// Use the runtime-loaded module shape so TypeScript does not require its types.
let chromium: ReturnType<typeof require>["chromium"];
try {
  // Existing Codex runtime takes precedence; ordinary QA can use a local
  // Playwright installation without CODEX_PRIMARY_* environment variables.
  const moduleName = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
    ? path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, "playwright")
    : "playwright";
  ({ chromium } = require(moduleName));
} catch (error) {
  throw Error(
    "DOCX Next browser QA requires Playwright. Install it in the test runtime " +
      "or set CODEX_PRIMARY_RUNTIME_NODE_MODULES. Cause: " + String(error),
  );
}
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
        process.env.CODEX_PRIMARY_RUNTIME_NODE ?? "node",
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
      let avatarTrial: {
        status: "DIAGNOSTIC_DOCX_GENERATED" | "NOT_REQUESTED";
        sha256?: string;
        sizeBytes?: number;
        mode?: "single-owner" | "writer-vml" | "photo-flow";
        nativeTextShape?: boolean;
        file?: string;
      } = { status: "NOT_REQUESTED" };
      if (exportAvatarTrials) {
        const result = await page.evaluate(async (arg: {
          snapshot: typeof captured.snapshot;
          avatarFormat: string;
        }) => {
          const { snapshot, avatarFormat } = arg;
          const { buildDossierDocModel } = await import("/src/lib/docx-next/build-model.ts");
          const { renderDossierDocx } = await import("/src/lib/docx-next/renderer.ts");
          const { readZipEntries } = await import("/src/lib/docx-next/zip.ts");
          const candidate = !snapshot.cover.data.foto;
          const model = buildDossierDocModel(snapshot,
            candidate ? { nativeAvatarComposition: avatarFormat as "single-owner" | "writer-vml" } : {});
          const bytes = new Uint8Array(await (await renderDossierDocx(model, {
            // Explicitly allow the isolated Word shape candidate; NO production gate change.
            allowUnacceptedModelIssues: true,
          })).arrayBuffer());
          const part = readZipEntries(bytes).find((entry) => entry.name === "word/document.xml");
          if (!part) throw Error("Diagnostic DOCX missing the actual Word document part");
          const xml = new TextDecoder().decode(part.bytes);
          const avatarCount = xml.split('name="cover.photo.native-avatar"').length - 1;
          const vmlAvatar = xml.includes('id="cover.photo.native-avatar-');
          const hasAvatar = avatarCount > 0 || vmlAvatar;
          if (candidate && avatarFormat === "writer-vml") {
            if (!vmlAvatar || avatarCount !== 0 ||
                !xml.includes('<w:txbxContent><w:tbl>') ||
                !xml.includes('<w:vAlign w:val="center"/>') ||
                !xml.includes("cover.photo.initials"))
              throw Error("Writer VML DOCX must contain exactly one editable centered avatar");
          } else if (candidate) {
            if (avatarCount !== 1 || !xml.includes("<wps:txbx><w:txbxContent>") ||
                !xml.includes("cover.photo.initials") || !xml.includes("<a:arcTo"))
              throw Error("Single-owner DOCX must have exactly one editable circular avatar");
            if (xml.includes('name="cover.photo.placeholder-paint"'))
              throw Error("Diagnostic Word avatar still has two independent painted owners");
          } else {
            if (!xml.includes('name="cover.photo"') || hasAvatar)
              throw Error("Saved uploaded cover photo was lost or acquired a placeholder");
            const photoStart = xml.indexOf('name="cover.photo"');
            const photoXml = xml.slice(photoStart, photoStart + 1900);
            const crop = photoXml.match(/<a:srcRect l="(\d+)" t="(\d+)" r="(\d+)" b="(\d+)"/);
            if (!crop || crop.slice(1).every((value) => Number(value) === 0))
              throw Error("Uploaded photo lost its explicit saved cover crop");
          }
          // Browser returns actual native DOCX bytes, not a screenshot or stub.
          // Encode in bounded chunks: avoids BlobPart<ArrayBufferLike> TypeScript
          // ambiguity and call-stack overflow with larger DOCX packages.
          const fragments: string[] = [];
          for (let offset = 0; offset < bytes.length; offset += 8192)
            fragments.push(String.fromCharCode(...bytes.subarray(offset, offset + 8192)));
          const base64 = btoa(fragments.join(""));
          return { base64, mode: candidate ? avatarFormat : "photo-flow",
            nativeTextShape: hasAvatar };
        }, { snapshot: captured.snapshot, avatarFormat });
        const bytes = Buffer.from(result.base64, "base64");
        assert(bytes.length > 2000 && bytes.subarray(0, 2).toString() === "PK",
          "Diagnostic DOCX is not a real ZIP package");
        const name = "diagnostic-avatar.docx";
        await writeFile(path.join(folder, name), bytes);
        avatarTrial = {
          status: "DIAGNOSTIC_DOCX_GENERATED",
          sha256: sha256(bytes), sizeBytes: bytes.length,
          mode: result.mode as "single-owner" | "writer-vml" | "photo-flow",
          nativeTextShape: result.nativeTextShape, file: name,
        };
        await writeFile(path.join(folder, "diagnostic-avatar.json"),
          JSON.stringify({ ...avatarTrial, warning:
            "Experimental DOCX. Native Microsoft Word edit/save/reopen not accepted." }, null, 2));
      }
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
      // Diagnose the default native model only; this is NOT a newly exported DOCX.
      // Its semantic fields and container widths are compared with the actual
      // restored Web state to make the family gates measurable, not to bypass them.
      const nativeNodes = (function walk(value: unknown): Array<{
        id?: string;
        kind?: string;
        widthMm?: number;
        heightMm?: number;
        xMm?: number;
        yMm?: number;
        shape?: string;
        decoration?: { borderWidthMm?: number; fillColor?: string };
      }> {
        if (Array.isArray(value)) return value.flatMap(walk);
        if (!value || typeof value !== "object") return [];
        const node = value as Record<string, unknown>;
        return [
          ...(typeof node.kind === "string" ? [node as {
            id?: string;
            kind?: string;
            widthMm?: number;
            heightMm?: number;
            xMm?: number;
            yMm?: number;
            shape?: string;
            decoration?: { borderWidthMm?: number; fillColor?: string };
          }] : []),
          ...walk(node.blocks),
          ...walk(node.rows),
          ...walk(node.cells),
        ];
      })([
        captured.model.cover.blocks,
        captured.model.cover.header,
        captured.model.cover.firstHeader,
        captured.model.cover.headerFrames,
        captured.model.cover.headerImages,
        captured.model.cover.headerShapes,
      ]);
      const dateBox = nativeNodes.find((node) => node.id === "cover.lehrbeginn.flow-box");
      const webDate = web.find((block) => block.id === "lehrbeginn");
      const nativePortrait = nativeNodes.filter(
        (node) => /^cover\.(photo|foto)(\.|$)/.test(node.id ?? ""),
      );
      const webPortrait = web.find((block) => block.id === "foto");
      const editableInitials = nativeNodes.find(
        (node) => node.id === "cover.photo.initials" && node.kind === "paragraph",
      );
      const nativePhoto = nativeNodes.find(
        (node) => node.id === "cover.photo" && node.kind === "image",
      );
      const nativePlaceholderPaint = nativeNodes.find(
        (node) => node.id === "cover.photo.placeholder-paint" &&
          node.kind === "decorative-shape",
      );
      const nativeInitialsTable = nativeNodes.find(
        (node) => node.id === "cover.photo" && node.kind === "table",
      );
      const authoredPhoto = captured.snapshot.cover.blocks.find(
        (block: { id: string }) => block.id === "foto",
      );
      const expectedCircle = !!authoredPhoto &&
        !authoredPhoto.style.hidden &&
        (authoredPhoto.style.radius ?? 0) >= 999 &&
        !authoredPhoto.style.follows &&
        !authoredPhoto.style.above &&
        !authoredPhoto.style.anchorBottom;
      if (item.variant === "photo") {
        assert(nativePhoto, "Actual uploaded cover photo is missing from native diagnostic model");
        assert(!editableInitials, "The native model duplicates initials behind a real photo");
        assert(!nativePlaceholderPaint, "The real photo still has a placeholder circle");
      } else if (!project.cover!.data.foto) {
        assert(editableInitials, "Editable initials missing from the native diagnostic model");
        assert(!nativePhoto, "Native model manufactured a photo for an initials-only cover");
        assert(nativeInitialsTable, "The editable initials do not own a native flow table");
        if (expectedCircle) {
          assert(nativePlaceholderPaint?.shape === "circle",
            "The native no-photo fallback has lost its circular outline");
          assert(nativeInitialsTable?.decoration?.borderWidthMm === 0,
            "The circle is backed by a duplicate rectangular table border");
          assert(!nativeInitialsTable?.decoration?.fillColor,
            "The circle is blocked by a rectangular table background");
          assert(Math.abs((nativePlaceholderPaint.xMm ?? NaN) - authoredPhoto.style.x) < 0.01,
            "Native circular photo frame X no longer follows saved cover geometry");
          assert(Math.abs((nativePlaceholderPaint.yMm ?? NaN) - authoredPhoto.style.y) < 0.01,
            "Native circular photo frame Y no longer follows saved cover geometry");
        }
      }
      const nativePillWidth = dateBox?.widthMm ?? null;
      const webPillWidth = webDate?.badgeRect?.w ?? null;
      const gaps = {
        analysisKind: "saved Web versus default native diagnostic model; NOT a DOCX render",
        family: item.family,
        caseId: item.id,
        webDateBadgeWidthMm: webPillWidth,
        nativeDateContainerWidthMm: nativePillWidth,
        differenceMm:
          webPillWidth !== null && nativePillWidth !== null
            ? nativePillWidth - webPillWidth
            : null,
        webInitials: webPortrait?.text?.trim() ?? null,
        nativePhotoOrInitialsNodes: nativePortrait.map((node) => node.id),
        nativeEditableInitialsPresent: !!editableInitials,
        actualNativePhotoNodePresent: !!nativePhoto,
        expectedCircularAvatarPaint: expectedCircle && !project.cover!.data.foto,
        nativeCircularAvatarPaintPresent: nativePlaceholderPaint?.shape === "circle",
        nativeAvatarPaintGeometry: nativePlaceholderPaint
          ? { xMm: nativePlaceholderPaint.xMm, yMm: nativePlaceholderPaint.yMm,
              widthMm: nativePlaceholderPaint.widthMm,
              heightMm: nativePlaceholderPaint.heightMm }
          : null,
        webBadgeCount: web.filter((node) => node.badgeRect).length,
        modelIssues: captured.model.issues,
        nativeEditableExportActuallyPerformed: avatarTrial.status === "DIAGNOSTIC_DOCX_GENERATED",
        avatarTrial,
      };
      await writeFile(path.join(folder, "fidelity-gaps.json"), JSON.stringify(gaps, null, 2));
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
      const coverUrl = appBase + "/titelblatt" +
        (exportFullAppDocx ? "?docx-next-cover-family-qa=1" : "");
      await page.goto(coverUrl, { waitUntil: "networkidle" });
      let nativeDocx: {
        status: "GATED_UNAVAILABLE" | "ACTUAL_APP_QA_DOWNLOAD";
        file?: string; sha256?: string; sizeBytes?: number; reason?: string;
      } = {
        status: "GATED_UNAVAILABLE",
        reason: "Opt-in full application QA download not requested",
      };
      if (exportFullAppDocx) {
        const savedBeforeDocx = await page.evaluate(() =>
          ["titelblatt:v3", "anschreiben:v1", "lebenslauf:v1"]
            .map((key) => localStorage.getItem(key)),
        );
        await page.getByRole("button").filter({ hasText: "Gesamtdossier herunterladen" }).click();
        const exportDialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
        const qaButton = exportDialog.locator(
          "[data-cover-family-docx-next-qa] button",
        );
        await qaButton.waitFor({ state: "visible", timeout: 30000 });
        assert(await qaButton.isEnabled(),
          "Actual full DOCX QA download blocked by application preflight");
        const dlEvent = page.waitForEvent("download", { timeout: 120000 });
        await qaButton.click();
        const download = await dlEvent;
        const file = "full-app-native.docx";
        await download.saveAs(path.join(folder, file));
        const bytes = new Uint8Array(await readFile(path.join(folder, file)));
        const { readZipEntries } = await import("../src/lib/docx-next/zip");
        const zipEntries = readZipEntries(bytes, item.id + " app download");
        const documentXml = zipEntries.find((entry) =>
          entry.name === "word/document.xml");
        assert(documentXml && zipEntries.some((entry) => entry.name === "word/styles.xml"),
          "UI download does not contain a real DOCX document and styles part");
        const xml = new TextDecoder().decode(documentXml.bytes);
        for (const identity of ["cover.fullName", "letter.", "cv."])
          assert(xml.includes(identity), "UI DOCX missing entire document identity: " + identity);
        if (!project.cover!.data.foto) {
          assert(xml.includes('id="cover.photo.native-avatar-'),
            "Full application DOCX does not contain editable VML avatar");
          assert(xml.includes('cover.photo.initials'),
            "Full application DOCX avatar initials are not editable");
          assert(xml.includes('<w:vAlign w:val="center"/>'),
            "Full application DOCX avatar lost vertical centering");
        } else {
          const marker = xml.indexOf('name="cover.photo"');
          assert(marker >= 0, "Full application DOCX lost uploaded source photo");
          const begin = xml.lastIndexOf("<wp:anchor", marker);
          const end = xml.indexOf("</wp:anchor>", marker);
          assert(begin >= 0 && end > marker,
            "Full application cover photo is not anchored to the Word page");
          const anchored = xml.slice(begin, end + "</wp:anchor>".length);
          const photo = captured.snapshot.cover.blocks.find((block) => block.id === "foto");
          assert(photo, "Saved cover photo block is missing");
          const emu = (mm: number) => Math.round(mm * 36000);
          assert(anchored.includes('<wp:positionH relativeFrom="page"><wp:posOffset>' +
            emu(photo.style.x) + "</wp:posOffset>"),
            "Saved photo X was lost in actual application Word export");
          assert(anchored.includes('<wp:positionV relativeFrom="page"><wp:posOffset>' +
            emu(photo.style.y) + "</wp:posOffset>"),
            "Saved photo Y was lost in actual application Word export");
          assert(anchored.includes('behindDoc="1"') &&
            anchored.includes("<wp:wrapNone/>"),
            "Full app photo still modifies the cover text flow");
          assert(anchored.includes("<a:srcRect "),
            "Full app photo crop representation is missing");
        }
        assert.deepEqual(await page.evaluate(() =>
          ["titelblatt:v3", "anschreiben:v1", "lebenslauf:v1"]
            .map((key) => localStorage.getItem(key))),
          savedBeforeDocx,
          "Full application DOCX download mutated saved dossier source");
        nativeDocx = {
          status: "ACTUAL_APP_QA_DOWNLOAD", file,
          sha256: sha256(bytes), sizeBytes: bytes.length,
        };
        // The normal PDF download below opens its own fresh dialog.
        await page.goto(coverUrl, { waitUntil: "networkidle" });
      }
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
        fidelityGaps: gaps,
        pdf,
        diagnosticDocx: avatarTrial,
        nativeDocx,
        wordAcceptance: "UNVERIFIED",
      };
      await writeFile(path.join(folder, "manifest.json"), JSON.stringify(result, null, 2));
      results.push(result);
    } catch (error) {
      // Continue other independent family cases. Preserve a machine-readable
      // failure and still exit nonzero after writing the complete manifest.
      const failure = { ...item, status: "FAILED", error: String(error),
        wordAcceptance: "UNVERIFIED" };
      results.push(failure);
      await writeFile(path.join(folder, "failure.json"),
        JSON.stringify(failure, null, 2));
    } finally {
      await context.close();
    }
  }
  const passed = results.filter((result) =>
    (result as { status?: string }).status === "WEB_REFERENCE_CAPTURED");
  const generated = results.filter((result) =>
    (result as { diagnosticDocx?: { status?: string } }).diagnosticDocx?.status ===
      "DIAGNOSTIC_DOCX_GENERATED");
  const fullAppDownloads = results.filter((result) =>
    (result as { nativeDocx?: { status?: string } }).nativeDocx?.status ===
      "ACTUAL_APP_QA_DOWNLOAD");
  await writeFile(path.join(out, "manifest.json"), JSON.stringify({
    type: exportFullAppDocx
      ? "cover-family-full-application-docx-qa"
      : exportAvatarTrials
        ? "cover-family-experimental-diagnostic-docx"
        : "cover-family-reference-only",
    count: results.length,
    passed: passed.length,
    failed: results.length - passed.length,
    diagnosticDocxGenerated: generated.length,
    experimentalAvatarMode: exportAvatarTrials,
    realNativeApplicationDocxFiles: fullAppDownloads.length,
    desktopWordAccepted: 0,
    notAnAcceptancePackage: true,
    results,
  }, null, 2));
  if (passed.length !== cases.length)
    throw Error(`DOCX Next cover ten-case runner: ${passed.length}/${cases.length} passed; consult manifest.json`);
} finally {
  if (browser) await browser.close();
  server?.kill();
}
