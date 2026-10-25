/** Real restored projects -> guarded app downloads -> one numbered acceptance batch. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { briefProjectFixture } from "../tests/fixtures/docx-next/brief-project";
import { modernProjectFixture } from "../tests/fixtures/docx-next/modern-project";
import { DEFAULT_DOSSIER_CHROME_STATE } from "../src/lib/dossier-chrome";

const require = createRequire(import.meta.url);
const { chromium } = require(
  path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES!, "playwright"),
);
const headerStandards = process.env.WORD_HEADER_STANDARD === "1";
const out = path.resolve(process.argv[2]!);
const base = process.env.DOCX_NEXT_APP_URL ?? "http://127.0.0.1:4173";
const modernQuery = "?docx-next-design-qa=1&docx-next-interior-qa=1&docx-next-reading-rows-qa=1";
const savedDemo = JSON.parse(
  await readFile("docs/qa/docx-next-modern-defaults-footer-18okt/project.json", "utf8"),
);
const cases = [
  {
    id: "01-Modern-Eine-CV-Seite",
    template: "modern",
    mode: "one",
    purpose: "Eine CV-Seite, kompakte Sprachen/Listen, Referenz, August 2028",
  },
  {
    id: "02-Modern-Zwei-CV-Seiten",
    template: "modern",
    mode: "two",
    purpose: "Zwei CV-Seiten, Folgeseitenrand, Rubriken an Seitenanfängen",
  },
  {
    id: "03-Modern-Kontakt-waagrecht",
    template: "modern",
    purpose: "Kontakt-Header waagrecht, synchronisierte Farben; erster/Folgerand 47/30 mm",
  },
  {
    id: "04-Modern-Kontakt-senkrecht",
    template: "modern",
    purpose:
      "Kontakt-Header senkrecht; Referenzen auf Seite 2, Folgerand 40 mm (8 mm unter Header)",
  },
  {
    id: "05-Modern-Eigene-Werte-Referenzen",
    template: "modern",
    purpose: "Eigene Ränder, 18-px-Rubriken; zweite Referenz mit Name/E-Mail ohne Telefon",
  },
  {
    id: "06-Modern-Foto-Standard",
    template: "modern",
    purpose: "Standard-Pille links; zentriertes Kreisfoto mit Zoom und Bildausschnitt",
  },
  {
    id: "07-Modern-Lang-115-Prozent",
    template: "modern",
    purpose: "Langer Name/Beruf, Cover 115 Prozent, lange Beschreibung",
  },
  {
    id: "08-Brief-Standard",
    template: "brief",
    purpose: "Zweite Coverfamilie, native Texte, Letter und CV mit Sans",
  },
  {
    id: "09-Brief-Lang-115-Prozent",
    template: "brief",
    purpose: "Langer Name/Beruf und Cover 115 Prozent im Brief-Design",
  },
  {
    id: "10-Brief-Foto-Hochformat",
    template: "brief",
    purpose: "Hochformat-Foto, Zoom und Bildposition, Originalbild erhalten",
  },
  {
    id: "11-Brief-Eine-CV-Seite",
    template: "brief",
    mode: "one",
    purpose: "Brief mit echter Einseitenaktion, schmalen Datums-/Sprachspalten und Referenzen",
  },
  {
    id: "12-Brief-Zwei-CV-Seiten",
    template: "brief",
    mode: "two",
    purpose: "Brief mit echter Zweiseitenaktion, Rubriken und unveränderten Benutzerwerten",
  },
] as const;
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
  assert(ready, "Local app did not start");
  browser = await chromium.launch({
    executablePath: process.env.DOCX_NEXT_CHROMIUM_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const results = [];
  const edgeCases = cases.map(c => ["03", "05", "07"].includes(c.id.slice(0, 2)) ? {...c, mode: "two" as const} : c);
  for (const item of edgeCases.filter(
    (c) =>
      !process.env.WORD_BATCH_CASES ||
      process.env.WORD_BATCH_CASES.split(",").some((id) => c.id.startsWith(id)),
  )) {
    const folder = path.join(out, item.id);
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
      (route: {
        request: () => { url: () => string };
        continue: () => Promise<void>;
        abort: () => Promise<void>;
      }) => (route.request().url().startsWith(base) ? route.continue() : route.abort()),
    );
    const query = item.template === "modern" ? modernQuery : "?docx-next-brief-qa=1";
    await page.goto(base + "/" + query, { waitUntil: "networkidle" });
    const photo = await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = 240;
      c.height = 360;
      const x = c.getContext("2d")!;
      for (const [color, px, py] of [
        ["#d83d32", 0, 0],
        ["#2766bb", 120, 0],
        ["#deba35", 0, 180],
        ["#269c76", 120, 180],
      ] as const) {
        x.fillStyle = color;
        x.fillRect(px, py, 120, 180);
      }
      x.strokeStyle = "white";
      x.lineWidth = 5;
      x.strokeRect(15, 15, 210, 330);
      x.beginPath();
      x.arc(120, 180, 52, 0, 2 * Math.PI);
      x.stroke();
      x.fillStyle = "white";
      x.font = "24px sans-serif";
      x.fillText("OBEN", 80, 55);
      x.fillText("UNTEN", 76, 320);
      return c.toDataURL("image/png");
    });
    const kind =
      item.id.startsWith("07") || item.id.startsWith("09")
        ? "long"
        : item.id.startsWith("10")
          ? "photo-portrait"
          : "normal";
    const project =
      item.template === "modern"
        ? modernProjectFixture(kind, photo)
        : briefProjectFixture(kind as "normal" | "long" | "photo-portrait", photo);
    // Reuse the saved, previously restored demo CV rather than a hand-built model.
    project.cv = structuredClone(savedDemo.cv);
    project.cv!.design.template = item.template;
    project.cv!.design.font = "sans";
    project.cv!.design.sectionTitlePill = item.template === "modern";
    project.letter!.design.fontOverride = "sans";
    project.cover!.data.lehrbeginn = "August 2028";
    if (item.id.startsWith("06")) {
      project.cover!.data.foto = photo;
      project.cover!.layout!.modern!.foto = {
        w: 52,
        ratio: 1,
        radius: 999,
        imgZoom: 1.3,
        imgX: 30,
        imgY: 65,
        borderWidth: 0.6,
        borderColor: "ink",
      };
    }
    if (item.id.startsWith("07") || item.id.startsWith("09")) project.cover!.fontScale = 1.15;
    if (item.id.startsWith("07"))
      project.cv!.data.erfahrung[0].beschreibung +=
        " Ich habe Kundinnen und Kunden unterstützt, Abläufe dokumentiert und im Team ein kleines digitales Projekt selbstständig umgesetzt. Dabei habe ich sorgfältig gearbeitet und Rückmeldungen direkt eingearbeitet.";
    if (item.id.startsWith("03") || item.id.startsWith("04")) {
      project.chrome = structuredClone(DEFAULT_DOSSIER_CHROME_STATE);
      Object.assign(project.chrome.shared, {
        headerMode: "contact",
        headerTextLayout: item.id.startsWith("04") ? "stacked" : "inline",
        headerInlineSeparator: "pipe",
        textFont: "sans",
        headerBackgroundColor: "#183447",
        footerBackgroundColor: "#315665",
        borderEnabled: true,
        borderColor: "#e8bf75",
      });
      if (item.id.startsWith("04")) {
        project.cv!.portableState = {
          ...project.cv!.portableState,
          ...(headerStandards ? {} : { continuationTopMarginMm: 40 }),
        };
        project.cv!.data.sectionLayouts = {
          ...project.cv!.data.sectionLayouts,
          referenzen: { ...project.cv!.data.sectionLayouts?.referenzen, page: 2 },
        };
      }
    }
    if (item.id.startsWith("05")) {
      project.pageMargins = {
        cv: { top: 28, right: 24, bottom: 1, left: 24 },
        letter: { top: 28, right: 24, bottom: 22, left: 24 },
      };
      Object.assign(project.cv!.design, {
        sectionTitleFontSizePx: 18,
        sectionTitleOffsetMm: 4,
        sectionContentIndentMm: 6,
        sectionTitleMarginBottomPx: 9,
      });
      project.cv!.data.referenzen.push({
        id: "batch-email",
        name: "Frau Anna Keller",
        funktion: "Berufsberatung",
        kontakt: "",
        email: "referenz@example.ch",
        zusatz: "",
      });
    }
    if (headerStandards && item.id.startsWith("04")) {
      delete project.cv!.portableState!.continuationTopMarginMm;
      delete project.letter!.design.continuationTopMarginMm;
      project.letter!.data.text = Array(5).fill(project.letter!.data.text).join("\n\n");
      project.letter!.data.richTextHtml = "";
    }
    await writeFile(path.join(folder, "project.json"), JSON.stringify(project, null, 2));
    await Promise.all([
      page.waitForEvent("load"),
      page.locator('input[type="file"][accept="application/json,.json"]').setInputFiles({
        name: "batch-project.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(project)),
      }),
    ]);
    await page.goto(base + "/lebenslauf" + query, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    let expectedCvPages = item.mode === "one" ? 1 : 2;
    if ("mode" in item) {
      const requestedMode =
        process.env.WORD_BATCH_SMART_FIT === "1" && item.mode === "two" ? "auto" : item.mode;
      const { plan, resolvedMode } = await page.evaluate(async (mode) => {
        const {
          buildCvPageFitPlan,
          measureCvPageFitSectionHeights,
          measureCvPageFitCapacityPx,
          chooseCvSmartPageFitMode,
        } = await import("/src/components/cv/page-fit.ts");
        const sheet =
          document.querySelector<HTMLElement>('main [data-dossier-document="cv"]')?.parentElement ??
          null;
        const original = JSON.parse(localStorage.getItem("lebenslauf:v1")!);
        const data = original.data;
        const measuredSectionHeightsPx = measureCvPageFitSectionHeights(sheet);
        const resolvedMode =
          mode === "auto"
            ? chooseCvSmartPageFitMode(
                data,
                measuredSectionHeightsPx,
                measureCvPageFitCapacityPx(sheet),
                sheet?.querySelectorAll("[data-cv-page]").length === 1,
              )
            : mode;
        return {
          resolvedMode,
          plan: {
            ...buildCvPageFitPlan(data, resolvedMode, {
              measuredSectionHeightsPx: measuredSectionHeightsPx ?? undefined,
              allowHalfWidth: mode === "auto" && resolvedMode === "one" ? false : undefined,
            }),
            checkScale: mode !== "auto",
            originalBodyScale: original.design?.bodyScale ?? null,
          },
        };
      }, requestedMode);
      expectedCvPages = resolvedMode === "one" ? 1 : 2;
      if (!(await page.locator("[data-editor-action-menu]").isVisible()))
        await page.locator("button[data-editor-ready]").click();
      await page.locator(`[data-cv-page-fit-mode-control="${requestedMode}"]`).click();
      await page.waitForFunction((expected) => {
        const cv = JSON.parse(localStorage.getItem("lebenslauf:v1") ?? "{}");
        return (
          (cv.design?.bodyScale ?? null) ===
            (expected.checkScale ? expected.bodyScaleFactor : expected.originalBodyScale) &&
          Object.entries(expected.pageBySection).every(
            ([k, v]) =>
              cv.data?.sectionLayouts?.[k]?.page === v &&
              cv.data.sectionLayouts[k]?.width === expected.widthBySection[k] &&
              cv.data.sectionLayouts[k]?.packing === expected.packingBySection[k],
          )
        );
      }, plan);
    }
    const storage = () =>
      page.evaluate(() =>
        Object.fromEntries(
          Object.entries(localStorage).filter(([k]) =>
            /titelblatt:v3|anschreiben:v1|lebenslauf:|bewerbungsdossier:/.test(k),
          ),
        ),
      );
    const beforeReload = await storage();
    if ("mode" in item) {
      // Keep an importable project of the actual fitted state, not only the
      // untouched source fixture from before clicking the two-page preset.
      const fittedCv = JSON.parse(beforeReload["lebenslauf:v1"] ?? "{}");
      assert.ok(fittedCv.data?.sectionLayouts && fittedCv.design);
      const fittedProject = structuredClone(project);
      fittedProject.cv!.data = fittedCv.data;
      fittedProject.cv!.design = fittedCv.design;
      await writeFile(
        path.join(folder, "fitted-project.json"),
        JSON.stringify(fittedProject, null, 2),
      );
    }
    await page.reload({ waitUntil: "networkidle" });
    assert.deepEqual(await storage(), beforeReload, "Saved settings changed on reload");
    let webCvPages = 0;
    const captures = [];
    const webPageGeometry: unknown[] = [];
    for (const [route, selector, label] of [
      ["/lebenslauf", "[data-cv-page]", "CV"],
      ["/anschreiben", "[data-letter-page]", "Letter"],
      ["/titelblatt", '[data-dossier-document="cover"]', "Cover"],
    ]) {
      await page.goto(base + route + query, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      if (label === "CV" && "mode" in item) {
        // The live paginator uses measured React rows and may settle after
        // network idle / font readiness. Do not capture an interim one-page DOM.
        await page.waitForFunction(
          (expected: number) =>
            document.querySelectorAll("main [data-cv-page]").length === expected,
          expectedCvPages,
          { timeout: 15000 },
        );
      }
      const root = page
        .locator(
          `main [data-dossier-document="${label === "CV" ? "cv" : label === "Letter" ? "letter" : "cover"}"]`,
        )
        .first();
      let sheets = root.locator(selector);
      if (label === "Cover")
        sheets = page.locator('[data-dossier-document="cover"]:visible').first();
      if (!(await sheets.count())) {
        if (label === "Cover") sheets = page.locator('[data-testid="cover-canvas"]');
        if (!(await sheets.count())) throw Error(`No ${label} pages found`);
      }
      if (label === "Letter")
        await page
          .locator('main [data-letter-document-root][data-letter-pagination-ready="true"]')
          .waitFor();
      if (label === "CV") webCvPages = await sheets.count();
      if (headerStandards && label !== "Cover") {
        const geometry = await sheets.evaluateAll(
          (nodes, scope) =>
            nodes.map((node, pageIndex) => {
              const body = node.querySelector<HTMLElement>(
                scope === "CV" ? "[data-cv-main]" : "[data-letter-text-layer]",
              )!;
              const header = node.querySelector<HTMLElement>("[data-dossier-header-height-mm]");
              const topMm = (parseFloat(getComputedStyle(body).top) * 25.4) / 96;
              const heightMm = Number(header?.getAttribute("data-dossier-header-height-mm") ?? 0);
              return { scope, pageIndex, topMm, heightMm, gapMm: topMm - heightMm };
            }),
          label,
        );
        if (!item.id.startsWith("05"))
          for (const g of geometry) assert(Math.abs(g.gapMm - 20) < 0.02, JSON.stringify(g));
        if (item.id.startsWith("04") && label === "Letter") assert(geometry.length >= 2);
        webPageGeometry.push(...geometry);
      }
      for (let i = 0; i < (await sheets.count()); i++) {
        const file = `Web-${label}-${String(i + 1).padStart(2, "0")}.png`;
        await sheets.nth(i).screenshot({ path: path.join(folder, file) });
        captures.push(file);
      }
      if (item.id.startsWith("05") && label === "CV") {
        const text = await root.innerText();
        assert(
          text.includes("referenz@example.ch") && text.includes("Frau Anna Keller"),
          "Partial references missing in visible CV",
        );
      }
    }
    if ("mode" in item) assert.equal(webCvPages, expectedCvPages);
    if (item.id.startsWith("04")) assert.equal(webCvPages, 2);
    await page.goto(base + "/" + query, { waitUntil: "networkidle" });
    console.log(`${item.id}: restored and Web references captured`);
    const savedBeforeExport = await storage();
    const generated = await page.evaluate(async (template) => {
      const { createSavedBriefDocxNext } = await import("/src/lib/brief-docx-next-export.ts");
      const { createSavedDesignDocxNext } = await import("/src/lib/design-docx-next-export.ts");
      const {
        createDossierProject,
        readStoredDossierPart,
        COVER_STORAGE_KEY,
        LETTER_STORAGE_KEY,
        CV_STORAGE_KEY,
      } = await import("/src/lib/dossier-project.ts");
      const result =
        template === "modern"
          ? await createSavedDesignDocxNext()
          : await createSavedBriefDocxNext();
      return {
        snapshot: result.snapshot,
        model: result.model,
        metrics: result.metrics,
        interiorMetrics: result.interiorMetrics,
        cvPersonalHeaderMetrics: result.cvPersonalHeaderMetrics,
        bytes: Array.from(new Uint8Array(await result.blob.arrayBuffer())),
        restoredProject: createDossierProject({
          cover: readStoredDossierPart(COVER_STORAGE_KEY),
          letter: readStoredDossierPart(LETTER_STORAGE_KEY),
          cv: readStoredDossierPart(CV_STORAGE_KEY),
        }),
      };
    }, item.template);
    console.log(`${item.id}: fresh native model generated`);
    await page.getByRole("button").filter({ hasText: "Gesamtdossier herunterladen" }).click();
    const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
    const downloadEvent = page.waitForEvent("download", { timeout: 30000 });
    await dialog
      .getByRole("button", {
        name: item.template === "modern" ? "Modern CV-Zeilen testen" : "Brief DOCX Next testen",
        exact: true,
      })
      .click();
    const file = item.id + ".docx";
    await (await downloadEvent).saveAs(path.join(out, file));
    assert.deepEqual(await readFile(path.join(out, file)), Buffer.from(generated.bytes));
    assert.deepEqual(await storage(), savedBeforeExport, "Export changed saved inputs");
    assert.deepEqual(generated.model.issues, []);
    const { bytes, ...proof } = generated;
    await writeFile(path.join(folder, "proof.json"), JSON.stringify(proof, null, 2));
    // The existing PDF download is the same-source Web reference, not a Word rendering.
    if (!(await dialog.isVisible()))
      await page.getByRole("button").filter({ hasText: "Gesamtdossier herunterladen" }).click();
    await dialog.getByRole("radio", { name: "Fertiges Dossier (PDF)" }).click();
    const pdfEvent = page.waitForEvent("download", { timeout: 60000 });
    await dialog.getByRole("button", { name: "PDF herunterladen", exact: true }).click();
    await (await pdfEvent).saveAs(path.join(folder, "Web-PDF.pdf"));
    assert.deepEqual(await storage(), savedBeforeExport);
    assert.deepEqual(errors, []);
    const result = {
      ...item,
      ...(headerStandards && item.id.startsWith("04")
        ? {
            purpose:
              "Gleicher 20-mm-Headerabstand auf je zwei Letter-/CV-Seiten ohne Rand-Override",
          }
        : {}),
      file,
      webCvPages,
      ...(headerStandards
        ? { webPageGeometry, headerPolicy: "20 mm visible; authored overrides win" }
        : {}),
      captures,
      restoredThroughApp: true,
      reloadPreservedState: true,
      uiDownloadByteIdentical: true,
      exportPreservedState: true,
      primaryPdfDownload: true,
      issues: [],
      sha256: createHash("sha256").update(Buffer.from(bytes)).digest("hex"),
      fontProfile: generated.metrics.profile,
      wordAcceptance: "UNVERIFIED",
    };
    results.push(result);
    await writeFile(path.join(out, "results.json"), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(result));
    await context.close();
  }
} finally {
  await browser?.close();
  server?.kill();
}
