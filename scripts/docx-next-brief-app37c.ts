/** Real app restore -> opt-in button -> downloaded native DOCX. No candidate XML edits. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  BRIEF_PROJECT_CASES,
  briefProjectFixture,
} from "../tests/fixtures/docx-next/brief-project";
import {
  modernProjectFixture,
  MODERN_PROJECT_CASES,
} from "../tests/fixtures/docx-next/modern-project";
import {
  modernInteriorProjectFixture,
  MODERN_INTERIOR_CANDIDATE_CASES,
} from "../tests/fixtures/docx-next/modern-interior-project";

const modern = process.env.DOCX_NEXT_QA_TEMPLATE === "modern";
const nativeBadge = modern && process.env.DOCX_NEXT_NATIVE_BADGE === "1";
assert(
  !nativeBadge,
  "Native badge trial withdrawn after Word failure; run rejected-native-badge negatives instead.",
);
const interiorAudit = modern && process.env.DOCX_NEXT_INTERIOR_AUDIT === "1";
const rubricSpacing = interiorAudit && process.env.DOCX_NEXT_RUBRIC_SPACING === "1";
const cases = rubricSpacing
  ? ["cv-pills"]
  : interiorAudit
    ? MODERN_INTERIOR_CANDIDATE_CASES
    : modern
      ? MODERN_PROJECT_CASES
      : BRIEF_PROJECT_CASES;
const fixture = interiorAudit
  ? modernInteriorProjectFixture
  : modern
    ? modernProjectFixture
    : briefProjectFixture;
const query = modern
  ? "docx-next-design-qa=1" +
    (nativeBadge ? "&docx-next-badge-qa=1" : "") +
    (interiorAudit ? "&docx-next-interior-qa=1" : "") +
    (rubricSpacing ? "&docx-next-rubric-spacing-qa=1" : "")
  : "docx-next-brief-qa=1";
const label = nativeBadge
  ? "Modern Pille gemeinsam testen"
  : rubricSpacing
    ? "Modern CV-Pills Abstand testen"
    : interiorAudit
      ? "Modern Header und Rubriken prüfen"
      : modern
        ? "Modern DOCX Next testen"
        : "Brief DOCX Next testen";
const qaSelector = modern ? "[data-design-docx-next-qa]" : "[data-brief-docx-next-qa]";

const require = createRequire(import.meta.url);
const { chromium } = require(
  path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES!, "playwright"),
);
const out = path.resolve(process.argv[2] ?? "/tmp/brief37c-app");
const base = process.env.DOCX_NEXT_APP_URL ?? "http://127.0.0.1:4173";
await mkdir(out, { recursive: true });
// Own the server in the same network namespace as the test browser.
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
      stdout: Bun.file(path.join(out, "dev-server.log")),
      stderr: Bun.file(path.join(out, "dev-server-errors.log")),
    });
let baselineServer: ReturnType<typeof Bun.spawn> | undefined;
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
assert(ready, "Local app server did not become ready; inspect dev-server logs");
const browser = await chromium.launch({
  executablePath: process.env.DOCX_NEXT_CHROMIUM_PATH,
  headless: true,
  args: ["--no-sandbox"],
});
const results: unknown[] = [];
const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
try {
  for (const name of process.env.DOCX_NEXT_ONLY_NEGATIVES
    ? []
    : (process.env.DOCX_NEXT_COVER_CASES?.split(",") ?? cases)) {
    const folder = path.join(out, name);
    await mkdir(folder, { recursive: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1200 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e: Error) => errors.push(e.message));
    page.on("dialog", (dialog: { accept: () => Promise<void> }) => void dialog.accept());
    await page.route(
      "**/*",
      (route: {
        request: () => { url: () => string };
        continue: () => Promise<void>;
        abort: () => Promise<void>;
      }) => (route.request().url().startsWith(base) ? route.continue() : route.abort()),
    );
    await page.goto(base + "/?" + query, { waitUntil: "networkidle" });
    const photo = await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = 120;
      c.height = 180;
      const x = c.getContext("2d")!;
      x.fillStyle = "#ff2418";
      x.fillRect(0, 0, 60, 180);
      x.fillStyle = "#1854d8";
      x.fillRect(60, 0, 60, 180);
      x.fillStyle = "#f6dd32";
      x.fillRect(10, 10, 20, 20);
      return c.toDataURL("image/png");
    });
    const project = fixture(name as (typeof BRIEF_PROJECT_CASES)[number], photo);
    await writeFile(path.join(folder, "project.json"), JSON.stringify(project, null, 2));
    await Promise.all([
      page.waitForEvent("load"),
      page.locator('input[type="file"][accept="application/json,.json"]').setInputFiles({
        name: "brief-project.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(project)),
      }),
    ]);
    await page.waitForLoadState("networkidle");
    const storedBefore = await page.evaluate(() =>
      ["titelblatt:v3", "anschreiben:v1", "lebenslauf:v1"].map((key) => localStorage.getItem(key)),
    );
    await page.getByRole("button").filter({ hasText: "Gesamtdossier herunterladen" }).click();
    const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
    assert.equal(
      await dialog
        .getByRole("radio", { name: "Fertiges Dossier (PDF)" })
        .getAttribute("aria-checked"),
      "true",
    );
    const downloadEvent = page.waitForEvent("download", { timeout: 30000 });
    await dialog.getByRole("button", { name: label, exact: true }).click();
    const download = await Promise.race([
      downloadEvent,
      dialog
        .locator(qaSelector + ' [role="alert"]')
        .waitFor()
        .then(async () => {
          await dialog.screenshot({ path: path.join(folder, "export-error.png") });
          throw new Error(await dialog.locator(qaSelector + ' [role="alert"]').innerText());
        }),
    ]);
    await download.saveAs(path.join(folder, "candidate.docx"));
    assert.deepEqual(
      await page.evaluate(() =>
        ["titelblatt:v3", "anschreiben:v1", "lebenslauf:v1"].map((key) =>
          localStorage.getItem(key),
        ),
      ),
      storedBefore,
    );
    const captured = await page.evaluate(async (modern) => {
      // This is the same app entry called by the button, inspected separately
      // for source/metric/model evidence and byte equality with its UI download.
      const { createSavedBriefDocxNext } = await import("/src/lib/brief-docx-next-export.ts");
      const { buildDossierDocModel } = await import("/src/lib/docx-next/build-model.ts");
      const { renderDossierDocx } = await import("/src/lib/docx-next/renderer.ts");
      const result = modern
        ? await (await import("/src/lib/design-docx-next-export.ts")).createSavedDesignDocxNext()
        : await createSavedBriefDocxNext();
      const baseline = buildDossierDocModel(result.snapshot);
      const bytes = Array.from(new Uint8Array(await result.blob.arrayBuffer()));
      const baselineBytes = Array.from(
        new Uint8Array(await (await renderDossierDocx(baseline)).arrayBuffer()),
      );
      const withoutContact = (blocks: typeof baseline.cv.blocks) =>
        blocks.map((b) =>
          b.kind === "section" && b.id === "cv.section.person" ? { ...b, blocks: [] } : b,
        );
      return {
        snapshot: result.snapshot,
        metrics: result.metrics,
        interiorMetrics: result.interiorMetrics,
        model: result.model,
        neighborsIdentical:
          JSON.stringify(result.model.letter) === JSON.stringify(baseline.letter) &&
          JSON.stringify(result.model.cv) === JSON.stringify(baseline.cv),
        neighborBodiesIdentical: (["letter", "cv"] as const).every(
          (part) =>
            JSON.stringify(result.model[part].blocks) === JSON.stringify(baseline[part].blocks) &&
            JSON.stringify(result.model[part].page) === JSON.stringify(baseline[part].page),
        ),
        neighborBodiesExceptContactIdentical:
          JSON.stringify(result.model.letter.blocks) === JSON.stringify(baseline.letter.blocks) &&
          JSON.stringify(result.model.letter.page) === JSON.stringify(baseline.letter.page) &&
          JSON.stringify(withoutContact(result.model.cv.blocks)) ===
            JSON.stringify(withoutContact(baseline.cv.blocks)) &&
          JSON.stringify(result.model.cv.page) === JSON.stringify(baseline.cv.page),
        measuredHeaderNeighborBodiesPreserved:
          !!result.model.letter.headerFrames &&
          !!result.model.cv.headerFrames &&
          JSON.stringify(result.model.letter.blocks) === JSON.stringify(baseline.letter.blocks) &&
          JSON.stringify(
            withoutContact(result.model.cv.blocks).filter((b) => b.id !== "cv.firstPageLead"),
          ) ===
            JSON.stringify(
              withoutContact(baseline.cv.blocks).filter((b) => b.id !== "cv.firstPageLead"),
            ),
        measuredRubricNonHeadingBodiesPreserved:
          !!result.interiorMetrics?.rubrics &&
          JSON.stringify(result.model.letter.blocks) === JSON.stringify(baseline.letter.blocks) &&
          JSON.stringify(
            withoutContact(result.model.cv.blocks).map((b) =>
              b.kind === "section" ? { ...b, heading: undefined } : b,
            ),
          ) ===
            JSON.stringify(
              withoutContact(baseline.cv.blocks).map((b) =>
                b.kind === "section" ? { ...b, heading: undefined } : b,
              ),
            ),
        rubricSpacingChangesOnlyGaps:
          JSON.stringify(result.model.letter.blocks) === JSON.stringify(baseline.letter.blocks) &&
          JSON.stringify(result.model.letter.page) === JSON.stringify(baseline.letter.page) &&
          JSON.stringify(
            withoutContact(result.model.cv.blocks).map((b) =>
              b.kind === "section" ? { ...b, heading: undefined } : b,
            ),
            (k, v) => (k === "afterMm" ? undefined : v),
          ) ===
            JSON.stringify(
              withoutContact(baseline.cv.blocks).map((b) =>
                b.kind === "section" ? { ...b, heading: undefined } : b,
              ),
              (k, v) => (k === "afterMm" ? undefined : v),
            ),
        bytes,
        baselineBytes,
      };
    }, modern);
    assert(
      modern
        ? captured.neighborBodiesExceptContactIdentical ||
            (interiorAudit &&
              (captured.measuredHeaderNeighborBodiesPreserved ||
                captured.measuredRubricNonHeadingBodiesPreserved ||
                (rubricSpacing && captured.rubricSpacingChangesOnlyGaps)))
        : captured.neighborsIdentical,
    );
    assert.deepEqual(captured.snapshot.cover.data, project.cover!.data);
    const candidate = new Uint8Array(await readFile(path.join(folder, "candidate.docx")));
    assert.deepEqual(candidate, Uint8Array.from(captured.bytes));
    for (const key of ["snapshot", "metrics", "model"] as const)
      await writeFile(path.join(folder, key + ".json"), JSON.stringify(captured[key], null, 2));
    if (captured.interiorMetrics)
      await writeFile(
        path.join(folder, "interior-metrics.json"),
        JSON.stringify(captured.interiorMetrics, null, 2),
      );
    await writeFile(path.join(folder, "baseline.docx"), Uint8Array.from(captured.baselineBytes));
    // Capture the real visible editor after restore, not a synthetic mounted canvas.
    await page.goto(base + "/titelblatt?" + query, { waitUntil: "networkidle" });
    const cover = page.locator('[data-dossier-document="cover"]:visible').first();
    await cover.waitFor();
    await page.evaluate(() => document.fonts.ready);
    const webSource = await page.evaluate(async (modern) => {
      const { captureSavedAuthoredSnapshot } = await import("/src/lib/brief-docx-next-export.ts");
      return captureSavedAuthoredSnapshot(modern ? "modern" : "brief").cover;
    }, modern);
    assert.deepEqual(webSource, captured.snapshot.cover);
    const cdp = await context.newCDPSession(page);
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    const dom = await cdp.send("DOM.getDocument");
    const node = await cdp.send("DOM.querySelector", {
      nodeId: dom.root.nodeId,
      selector: '[data-dossier-document="cover"] [data-block-id="beruf"]',
    });
    const platformFonts = await cdp.send("CSS.getPlatformFontsForNode", { nodeId: node.nodeId });
    assert(
      platformFonts.fonts.every((f: { familyName: string }) =>
        ["Arial", "Liberation Sans"].includes(f.familyName),
      ),
    );
    await cover.screenshot({ path: path.join(folder, "web.png"), animations: "disabled" });
    const web = await cover.evaluate((element: HTMLElement) => {
      const root = element.getBoundingClientRect();
      return Array.from(element.querySelectorAll<HTMLElement>("[data-block-id]")).map((b) => {
        const r = b.getBoundingClientRect(),
          s = getComputedStyle(b);
        return {
          id: b.dataset.blockId,
          text: b.innerText,
          xMm: ((r.x - root.x) / root.width) * 210,
          yMm: ((r.y - root.y) / root.height) * 297,
          widthMm: (r.width / root.width) * 210,
          heightMm: (r.height / root.height) * 297,
          font: s.fontFamily,
          sizePx: s.fontSize,
        };
      });
    });
    if (modern)
      for (const [part, route, selector] of [
        ["letter", "anschreiben", "[data-letter-page]"],
        ["cv", "lebenslauf", "[data-cv-page]"],
      ]) {
        await page.goto(base + "/" + route + "/?" + query, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        const sheet = page.locator(selector + ":visible").first();
        await sheet.screenshot({ path: path.join(folder, `web-${part}.png`) });
        const chrome = await sheet.evaluate((root: HTMLElement) => {
          const r = root.getBoundingClientRect();
          return Array.from(
            root.querySelectorAll<HTMLElement>(
              "[data-dossier-footer], [data-dossier-compact-header]",
            ),
          ).map((el) => {
            const b = el.getBoundingClientRect(),
              s = getComputedStyle(el);
            return {
              text: el.innerText,
              yMm: ((b.y - r.y) / r.height) * 297,
              heightMm: (b.height / r.height) * 297,
              background: s.backgroundColor,
              opacity: s.opacity,
              borderTop: s.borderTop,
              borderBottom: s.borderBottom,
            };
          });
        });
        await writeFile(
          path.join(folder, `web-${part}-chrome.json`),
          JSON.stringify(chrome, null, 2),
        );
        if (interiorAudit) {
          const pages = page.locator(selector + ":visible");
          const geometry = [];
          // Offscreen export canvases also satisfy Playwright :visible. Keep
          // real editor pages, including those below the viewport vertically.
          const visibleIndexes = await pages.evaluateAll((elements) =>
            elements.flatMap((el, index) => {
              const r = el.getBoundingClientRect();
              return r.right > 0 && r.left < innerWidth ? [index] : [];
            }),
          );
          for (let i = 0; i < visibleIndexes.length; i++) {
            const sheet = pages.nth(visibleIndexes[i]);
            await sheet.screenshot({ path: path.join(folder, `web-${part}-page-${i + 1}.png`) });
            const measured = captured.interiorMetrics?.headers[part as "letter" | "cv"];
            if (measured) {
              const expected = i === 0 ? measured.first : measured.continuation;
              const actual = await sheet.evaluate((root: HTMLElement) => {
                const header = root.querySelector<HTMLElement>(
                  "[data-dossier-contact-header-background], [data-dossier-continuation-contact-header]",
                )!;
                const footer = root.querySelector<HTMLElement>('[data-dossier-footer="compact"]')!;
                const hex = (rgb: string) =>
                  rgb
                    .match(/[\d.]+/g)!
                    .slice(0, 3)
                    .map((n) => Number(n).toString(16).padStart(2, "0"))
                    .join("")
                    .toUpperCase();
                return {
                  header: hex(getComputedStyle(header).backgroundColor),
                  footer: hex(getComputedStyle(footer).backgroundColor),
                  opacity: Number(getComputedStyle(footer).opacity),
                  icons: root.querySelectorAll(
                    "[data-dossier-integrated-contact] svg, [data-dossier-continuation-contact] svg",
                  ).length,
                };
              });
              assert.deepEqual(
                actual,
                {
                  header: expected.background,
                  footer: expected.footer.background,
                  opacity: expected.footer.opacity,
                  icons: 0,
                },
                "Live editor chrome must match the fresh export capture without icons",
              );
              assert.equal(actual.opacity, 1, "Modern contact footer must be opaque");
              await writeFile(
                path.join(folder, `web-${part}-contact-colors-${i + 1}.json`),
                JSON.stringify(actual, null, 2),
              );
            }
            geometry.push(
              await sheet.evaluate((root: HTMLElement) => {
                const r = root.getBoundingClientRect();
                return Array.from(
                  root.querySelectorAll<HTMLElement>(
                    "[data-dossier-integrated-contact], [data-dossier-continuation-contact], [data-cv-section-title], [data-dossier-contact-header-background], [data-dossier-continuation-contact-header]",
                  ),
                ).map((el) => {
                  const b = el.getBoundingClientRect(),
                    s = getComputedStyle(el);
                  return {
                    tag: el.tagName,
                    attributes: Array.from(el.attributes)
                      .filter((a) => a.name.startsWith("data-"))
                      .map((a) => [a.name, a.value]),
                    text: el.innerText,
                    xMm: ((b.x - r.x) * 210) / r.width,
                    yMm: ((b.y - r.y) * 297) / r.height,
                    widthMm: (b.width * 210) / r.width,
                    heightMm: (b.height * 297) / r.height,
                    font: s.fontFamily,
                    sizePx: s.fontSize,
                    lineHeight: s.lineHeight,
                    align: s.textAlign,
                    padding: s.padding,
                    radius: s.borderRadius,
                    background: s.backgroundColor,
                    shadow: s.boxShadow,
                  };
                });
              }),
            );
          }
          await writeFile(
            path.join(folder, `web-${part}-interior-geometry.json`),
            JSON.stringify(geometry, null, 2),
          );
        }
      }
    assert.deepEqual(errors, []);
    const evidence = {
      name,
      restoredThroughAppFileInput: true,
      clickedAppExport: true,
      defaultFormatStillPdf: true,
      savedDocumentsUnchangedByExport: true,
      webSourceEqualsExportSource: true,
      platformFonts,
      uiDownloadEqualsAppEntry: true,
      neighborModelsIdentical: captured.neighborsIdentical,
      neighborBodiesIdentical: captured.neighborBodiesIdentical,
      neighborBodiesExceptContactIdentical: captured.neighborBodiesExceptContactIdentical,
      measuredHeaderNeighborBodiesPreserved: captured.measuredHeaderNeighborBodiesPreserved,
      measuredRubricNonHeadingBodiesPreserved: captured.measuredRubricNonHeadingBodiesPreserved,
      rubricSpacingChangesOnlyGaps: captured.rubricSpacingChangesOnlyGaps,
      candidateSha256: sha(candidate),
      measuredProfile: captured.metrics.profile,
      web,
      pageErrors: errors,
    };
    await writeFile(path.join(folder, "app-evidence.json"), JSON.stringify(evidence, null, 2));
    results.push(evidence);
    console.log(JSON.stringify({ case: name, sha256: sha(candidate), result: "app export PASS" }));
    await context.close();
  }
  if (!process.env.DOCX_NEXT_COVER_CASES) {
    const rejected: unknown[] = [];
    for (const scenario of [
      "unsupported-font",
      "substituted-font",
      "missing-measurements",
      "stale-before-capture",
      "stale-after-render",
      "overflow",
      "non-brief",
      ...(modern
        ? [
            "badge-overflow",
            "badge-multiline",
            "badge-artwork",
            "placeholder-opacity",
            "css-hidden-decoration",
            "non-cohort",
            "chrome-content",
            "chrome-mode",
            "contact-layout",
            "rubric-pills",
            "mixed-layout-trials",
            "rejected-native-badge",
            "rejected-rubric-anchor",
            ...(interiorAudit
              ? [
                  "interior-cv-font",
                  "interior-header-font",
                  "interior-header-overflow",
                  "interior-rubric-multiline",
                  "interior-mixed-modes",
                  "interior-rubric-script",
                  "interior-reduced-overflow",
                  "interior-contact-source",
                ]
              : []),
          ]
        : []),
    ].filter(
      (scenario) =>
        !(interiorAudit && scenario === "rubric-pills") &&
        (!process.env.DOCX_NEXT_NEGATIVE_CASES ||
          process.env.DOCX_NEXT_NEGATIVE_CASES.split(",").includes(scenario)),
    )) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(base + "/?" + query, { waitUntil: "networkidle" });
      await page.evaluate(
        async (project) => {
          const { replaceDossierProject } = await import("/src/lib/dossier-project.ts");
          replaceDossierProject(project);
        },
        scenario === "rejected-rubric-anchor"
          ? modernInteriorProjectFixture("cv-pills")
          : fixture("normal"),
      );
      await page.reload({ waitUntil: "networkidle" });
      await page.getByRole("button").filter({ hasText: "Gesamtdossier herunterladen" }).click();
      await page.evaluate(async (scenario) => {
        if (scenario.startsWith("interior-")) {
          const { DEFAULT_DOSSIER_CHROME_STATE, DOSSIER_CHROME_STORAGE_KEY } =
            await import("/src/lib/dossier-chrome.ts");
          const state = structuredClone(DEFAULT_DOSSIER_CHROME_STATE);
          Object.assign(state.shared, {
            headerMode: "contact",
            headerTextLayout: "inline",
            headerDifferentFirstPage: false,
            textFont: "sans",
          });
          const cv = JSON.parse(localStorage.getItem("lebenslauf:v1")!);
          if (scenario === "interior-contact-source") cv.data.person.email = "cv-only@example.ch";
          if (scenario === "interior-cv-font") delete cv.design.font;
          if (scenario === "interior-header-font") state.shared.textFont = "serif";
          if (scenario === "interior-header-overflow") state.shared.headerContentOffsetYMm = 20;
          if (scenario === "interior-reduced-overflow")
            state.shared.headerDifferentFirstPage = true;
          if (scenario === "interior-rubric-script") {
            state.shared.headerMode = "compact";
            cv.design.sectionTitlePill = true;
            cv.data.labels.schule = "学校";
          }
          if (scenario === "interior-rubric-multiline") {
            state.shared.headerMode = "compact";
            cv.design.sectionTitlePill = true;
            cv.data.labels.schule =
              "Eine sehr lange Rubrik mit mehreren Zeilen und sehr vielen zusätzlichen Wörtern ".repeat(
                8,
              );
          }
          if (scenario === "interior-mixed-modes") {
            state.sync = false;
            state.letter.headerMode = "compact";
            state.cv = { ...state.shared };
          }
          localStorage.setItem("lebenslauf:v1", JSON.stringify(cv));
          localStorage.setItem(DOSSIER_CHROME_STORAGE_KEY, JSON.stringify(state));
        }
        if (scenario === "rubric-pills") {
          const c = JSON.parse(localStorage.getItem("lebenslauf:v1")!);
          c.design.sectionTitlePill = true;
          localStorage.setItem("lebenslauf:v1", JSON.stringify(c));
        }
        if (scenario === "mixed-layout-trials" || scenario === "rejected-native-badge")
          history.replaceState(
            null,
            "",
            "/?docx-next-design-qa=1&docx-next-badge-qa=1" +
              (scenario === "mixed-layout-trials" ? "&docx-next-interior-qa=1" : ""),
          );
        if (scenario === "contact-layout") {
          const c = JSON.parse(localStorage.getItem("lebenslauf:v1")!);
          c.data.sectionLayouts = { ...c.data.sectionLayouts, person: { width: "half" } };
          localStorage.setItem("lebenslauf:v1", JSON.stringify(c));
        }
        if (scenario === "chrome-content") {
          const l = JSON.parse(localStorage.getItem("anschreiben:v1")!);
          l.design.chromeContent = { footerTextEnabled: true, footerText: "Keep this footer" };
          localStorage.setItem("anschreiben:v1", JSON.stringify(l));
        }
        if (scenario === "chrome-mode") {
          const { DEFAULT_DOSSIER_CHROME_STATE, DOSSIER_CHROME_STORAGE_KEY } =
            await import("/src/lib/dossier-chrome.ts");
          const state = structuredClone(DEFAULT_DOSSIER_CHROME_STATE);
          state.shared.footerMode = "details";
          localStorage.setItem(DOSSIER_CHROME_STORAGE_KEY, JSON.stringify(state));
          // The saved store owns its cache; reload below before capturing it.
        }
        const mutate = () => {
          const c = JSON.parse(localStorage.getItem("titelblatt:v3")!);
          c.data.vorname += " changed";
          localStorage.setItem("titelblatt:v3", JSON.stringify(c));
        };
        if (scenario === "unsupported-font" || scenario === "overflow") {
          const c = JSON.parse(localStorage.getItem("titelblatt:v3")!);
          if (scenario === "unsupported-font") c.font = "maschine";
          else c.data.email = "x".repeat(250) + "@example.ch";
          localStorage.setItem("titelblatt:v3", JSON.stringify(c));
        }
        if (scenario === "non-brief") {
          const l = JSON.parse(localStorage.getItem("anschreiben:v1")!);
          l.design.template = "freundlich";
          localStorage.setItem("anschreiben:v1", JSON.stringify(l));
        }
        if (
          scenario.startsWith("badge-") ||
          scenario === "placeholder-opacity" ||
          scenario === "non-cohort" ||
          scenario === "css-hidden-decoration"
        ) {
          const c = JSON.parse(localStorage.getItem("titelblatt:v3")!);
          if (scenario === "badge-overflow") c.data.lehrbeginn = "verylong ".repeat(100);
          if (scenario === "badge-multiline") c.data.lehrbeginn = "August\n2028";
          if (scenario === "badge-artwork")
            c.layout.modern.lehrbeginn = { x: 110, y: 37, w: 85, follows: null };
          if (scenario === "placeholder-opacity") c.layout.modern.foto = { opacity: 0.5 };
          if (scenario === "css-hidden-decoration") c.layout.modern.trenner = { hidden: false };
          if (scenario === "non-cohort") {
            c.template = "neon";
            for (const key of ["anschreiben:v1", "lebenslauf:v1"]) {
              const part = JSON.parse(localStorage.getItem(key)!);
              part.design.template = "neon";
              localStorage.setItem(key, JSON.stringify(part));
            }
          }
          localStorage.setItem("titelblatt:v3", JSON.stringify(c));
        }
        if (scenario === "substituted-font") {
          for (const weight of [400, 700]) {
            const f = new FontFace(
              "Helvetica Neue",
              `local("DejaVu Sans${weight === 700 ? " Bold" : ""}")`,
              { weight: String(weight) },
            );
            document.fonts.add(await f.load());
          }
        }
        if (scenario === "missing-measurements") {
          HTMLCanvasElement.prototype.getContext = () => null;
        }
        if (scenario === "stale-before-capture") {
          const original = FontFace.prototype.load;
          let changed = false;
          FontFace.prototype.load = function () {
            if (!changed) {
              changed = true;
              mutate();
            }
            return original.call(this);
          };
        }
        if (scenario === "stale-after-render") {
          const original = HTMLCanvasElement.prototype.toDataURL;
          let changed = false;
          HTMLCanvasElement.prototype.toDataURL = function (...args) {
            if (!changed) {
              changed = true;
              mutate();
            }
            return original.apply(this, args);
          };
        }
      }, scenario);
      if (scenario === "chrome-mode" || scenario.startsWith("interior-")) {
        await page.reload({ waitUntil: "networkidle" });
        await page.getByRole("button").filter({ hasText: "Gesamtdossier herunterladen" }).click();
      }
      if (scenario === "non-cohort") {
        await page.reload({ waitUntil: "networkidle" });
        await page.getByRole("button").filter({ hasText: "Gesamtdossier herunterladen" }).click();
        assert.equal(await page.getByRole("button", { name: label, exact: true }).count(), 0);
        const message = await page.evaluate(async () => {
          try {
            await (await import("/src/lib/design-docx-next-export.ts")).createSavedDesignDocxNext();
          } catch (e) {
            return String(e);
          }
          return "unexpected success";
        });
        assert(message.includes("Vorlage Modern"));
        rejected.push({ scenario, message, downloads: 0, result: "PASS hidden and rejected" });
        console.log(JSON.stringify({ scenario, result: "rejection PASS" }));
        await context.close();
        continue;
      }
      let downloads = 0;
      page.on("download", () => downloads++);
      if (scenario === "rejected-native-badge" || scenario === "mixed-layout-trials") {
        await page.reload({ waitUntil: "networkidle" });
        await page.getByRole("button").filter({ hasText: "Gesamtdossier herunterladen" }).click();
        const storedBefore = await page.evaluate(() =>
          ["titelblatt:v3", "anschreiben:v1", "lebenslauf:v1"].map((key) =>
            localStorage.getItem(key),
          ),
        );
        assert(
          await page
            .getByRole("button", { name: "Pillenversuch gesperrt", exact: true })
            .isDisabled(),
        );
        const helper = await page.locator("#design-docx-next-help").innerText();
        assert(helper.includes("Microsoft Word zeigt den Text unvollständig"));
        const messages = await page.evaluate(async () => {
          const entry = await import("/src/lib/design-docx-next-export.ts");
          const direct = await import("/src/lib/brief-docx-next-export.ts");
          const messages: string[] = [];
          for (const call of [
            () => entry.createSavedDesignDocxNext(),
            () =>
              direct.createSavedAuthoredCoverDocxNext("modern", true, {
                coverBadgeComposition: "native-shape",
              }),
          ]) {
            try {
              await call();
              messages.push("unexpected success");
            } catch (error) {
              messages.push(String(error));
            }
          }
          return messages;
        });
        assert(
          messages.every((message) =>
            message.includes("Microsoft Word zeigt den Text unvollständig"),
          ),
        );
        assert.equal(downloads, 0);
        assert.deepEqual(
          await page.evaluate(() =>
            ["titelblatt:v3", "anschreiben:v1", "lebenslauf:v1"].map((key) =>
              localStorage.getItem(key),
            ),
          ),
          storedBefore,
        );
        await page
          .getByRole("dialog", { name: "Dossier herunterladen" })
          .screenshot({ path: path.join(out, scenario + ".png") });
        rejected.push({
          scenario,
          messages,
          disabledButton: true,
          downloads,
          savedDocumentsUnchanged: true,
          result: "PASS Word-rejected trial blocked",
        });
        console.log(JSON.stringify({ scenario, result: "rejection PASS" }));
        await context.close();
        continue;
      }
      await page.getByRole("button", { name: label, exact: true }).click();
      const alert = page.locator(qaSelector + ' [role="alert"]');
      await alert.waitFor({ state: "visible" });
      const message = await alert.innerText();
      const expected =
        scenario === "rejected-rubric-anchor"
          ? "Rubrik-Pills sind in diesem Test gesperrt"
          : scenario === "interior-cv-font"
            ? "ausdrücklich gespeichertes Sans"
            : scenario === "interior-contact-source"
              ? "Abweichende CV-Kontaktdaten"
              : scenario === "interior-header-font"
                ? "Header-Schrift"
                : scenario === "interior-header-overflow" ||
                    scenario === "interior-reduced-overflow"
                  ? "Headertext überschreitet"
                  : scenario === "interior-rubric-multiline"
                    ? "Mehrzeilige Rubrik"
                    : scenario === "interior-rubric-script"
                      ? "Nicht unterstützte Schriftzeichen"
                      : scenario === "interior-mixed-modes"
                        ? "gemischte Modi"
                        : scenario === "rubric-pills"
                          ? "Rubrik-Pills"
                          : scenario === "contact-layout"
                            ? "ganze Breite"
                            : scenario.startsWith("chrome-")
                              ? "compact chrome"
                              : scenario === "css-hidden-decoration"
                                ? "CSS-hidden decoration"
                                : scenario.startsWith("badge-")
                                  ? scenario === "badge-artwork"
                                    ? "over artwork"
                                    : "Badges unterstützen"
                                  : scenario === "placeholder-opacity"
                                    ? "placeholder opacity"
                                    : scenario === "non-cohort"
                                      ? "Vorlage Modern"
                                      : scenario === "unsupported-font"
                                        ? "Nicht unterstützte Schrift"
                                        : scenario === "substituted-font"
                                          ? "Browser-Ersatzschrift"
                                          : scenario === "missing-measurements"
                                            ? "nicht verfügbar"
                                            : scenario.startsWith("stale")
                                              ? "Daten haben sich"
                                              : scenario === "overflow"
                                                ? "Feldbreite"
                                                : modern
                                                  ? "Vorlage Modern"
                                                  : "Vorlage Brief";
      assert(message.includes(expected), `${scenario}: unexpected diagnostic ${message}`);
      assert.equal(downloads, 0);
      rejected.push({ scenario, message, downloads, result: "PASS explicit rejection" });
      console.log(JSON.stringify({ scenario, result: "rejection PASS" }));
      await context.close();
    }
    // Default route has no test control and direct entry also requires the flag.
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(base, { waitUntil: "networkidle" });
    await page.evaluate(async (project) => {
      const { replaceDossierProject } = await import("/src/lib/dossier-project.ts");
      replaceDossierProject(project);
    }, fixture("normal"));
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("button").filter({ hasText: "Gesamtdossier herunterladen" }).click();
    assert.equal(await page.getByRole("button", { name: label }).count(), 0);
    const offMessage = await page.evaluate(async (modern) => {
      try {
        const { createSavedBriefDocxNext } = await import("/src/lib/brief-docx-next-export.ts");
        if (modern)
          await (await import("/src/lib/design-docx-next-export.ts")).createSavedDesignDocxNext();
        else await createSavedBriefDocxNext();
      } catch (e) {
        return String(e);
      }
      return "unexpected success";
    }, modern);
    assert(offMessage.includes("nicht aktiviert"));
    rejected.push({
      scenario: "opt-in-off",
      message: offMessage,
      result: "PASS hidden and rejected",
    });
    await context.close();
    await writeFile(path.join(out, "rejections.json"), JSON.stringify(rejected, null, 2));
  }
  if (process.env.DOCX_NEXT_DEV_CHECKOUT) {
    server?.kill();
    const baseline = "http://127.0.0.1:4174";
    baselineServer = Bun.spawn({
      cmd: [
        process.env.CODEX_PRIMARY_RUNTIME_NODE!,
        "node_modules/vite/bin/vite.js",
        "dev",
        "--host",
        "127.0.0.1",
        "--port",
        "4174",
      ],
      cwd: path.resolve(process.env.DOCX_NEXT_DEV_CHECKOUT),
      stdout: Bun.file(path.join(out, "dev-baseline.log")),
      stderr: Bun.file(path.join(out, "dev-baseline-errors.log")),
    });
    let baselineReady = false;
    for (let n = 0; n < 300; n++) {
      try {
        if ((await fetch(baseline)).ok) {
          baselineReady = true;
          break;
        }
      } catch {
        /* startup */
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert(baselineReady);
    for (const name of process.env.DOCX_NEXT_COVER_CASES?.split(",") ?? cases) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1200 },
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", (e: Error) => errors.push(e.message));
      page.on("dialog", (d: { accept: () => Promise<void> }) => void d.accept());
      await page.goto(baseline, { waitUntil: "networkidle" });
      await Promise.all([
        page.waitForEvent("load"),
        page.locator('input[type="file"][accept="application/json,.json"]').setInputFiles({
          name: "brief-project.json",
          mimeType: "application/json",
          buffer: await readFile(path.join(out, name, "project.json")),
        }),
      ]);
      await page.waitForLoadState("networkidle");
      await page.goto(baseline + "/titelblatt?docx-next-brief-qa=1", { waitUntil: "networkidle" });
      const cover = page.locator('[data-dossier-document="cover"]:visible').first();
      await cover.waitFor();
      await page.evaluate(() => document.fonts.ready);
      await cover.screenshot({ path: path.join(out, name, "web-dev.png"), animations: "disabled" });
      const devBaseline = await page.evaluate(
        async (snapshot) => {
          const { buildDossierDocModel } = await import("/src/lib/docx-next/build-model.ts");
          const { renderDossierDocx } = await import("/src/lib/docx-next/renderer.ts");
          return Array.from(
            new Uint8Array(
              await (await renderDossierDocx(buildDossierDocModel(snapshot))).arrayBuffer(),
            ),
          );
        },
        JSON.parse(await readFile(path.join(out, name, "snapshot.json"), "utf8")),
      );
      assert.deepEqual(
        Uint8Array.from(devBaseline),
        new Uint8Array(await readFile(path.join(out, name, "baseline.docx"))),
      );
      await writeFile(
        path.join(out, name, "dev-default-evidence.json"),
        JSON.stringify(
          { defaultNextPackageByteIdenticalToDev: true, sha256: sha(Uint8Array.from(devBaseline)) },
          null,
          2,
        ),
      );
      assert.deepEqual(errors, []);
      console.log(JSON.stringify({ case: name, baseline: "actual dev editor captured" }));
      await context.close();
    }
  }
} finally {
  await browser.close();
  server?.kill();
  baselineServer?.kill();
}
if (results.length)
  await writeFile(path.join(out, "app-results.json"), JSON.stringify(results, null, 2));
