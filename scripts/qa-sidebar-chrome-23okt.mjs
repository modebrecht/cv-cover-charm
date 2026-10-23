/** Actual saved-App chrome audit. Uses the checked synthetic photo only. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + "/playwright");
const output = path.resolve(process.argv[2]),
  base = process.env.DOCX_NEXT_APP_URL;
const source = JSON.parse(
  await readFile(
    "tests/fixtures/docx-next/sidebar-saved-app-22okt/08-left-automatic-photo.json",
    "utf8",
  ),
);
const browser = await chromium.launch({
  executablePath: process.env.DOCX_NEXT_CHROMIUM_PATH,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});
const results = [];
try {
  for (const side of ["left", "right"])
    for (const mode of [
      "compact",
      "contact-inline",
      "contact-stacked",
      ...(side === "right" ? ["contact-long", "contact-reduced"] : []),
    ]) {
      const id = side + "-" + mode,
        folder = path.join(output, id);
      await mkdir(folder, { recursive: true });
      if (
        process.env.DOCX_NEXT_CHROME_CASE &&
        !process.env.DOCX_NEXT_CHROME_CASE.split(",").includes(id)
      )
        continue;
      const input = structuredClone(source),
        contact = mode.startsWith("contact");
      input.cv.portableState.infoPosition = side === "right" ? "mirrored" : "standard";
      input.cv.portableState.mirrored = side === "right";
      const options = {
        headerMode: contact ? "contact" : "compact",
        headerHeightMm: contact ? (mode.endsWith("inline") ? 26 : 32) : null,
        headerTextLayout: mode.endsWith("inline") ? "inline" : "stacked",
        headerDifferentFirstPage: mode === "contact-reduced",
      };
      if (mode === "contact-long" || mode === "contact-reduced")
        input.cv.data.schule = JSON.parse(
          await readFile(
            "tests/fixtures/docx-next/sidebar-saved-app-22okt/03-right-continuation.json",
            "utf8",
          ),
        ).cv.data.schule;
      for (const key of ["shared", "cv", "letter"]) Object.assign(input.chrome[key], options);
      Object.assign(input.cv.design, options);
      Object.assign(input.letter.design, options);
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1200 },
        deviceScaleFactor: Number(process.env.DOCX_NEXT_DEVICE_SCALE_FACTOR ?? 1),
      });
      try {
        const page = await context.newPage(),
          errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        page.on("dialog", (d) => void d.accept());
        await page.route("**/*", (r) =>
          r.request().url().startsWith(base) ? r.continue() : r.abort(),
        );
        await page.goto(base + "/?docx-next-design-qa=1", { waitUntil: "networkidle" });
        await Promise.all([
          page.waitForEvent("load"),
          page.locator('input[type="file"][accept="application/json,.json"]').setInputFiles({
            name: "source.json",
            mimeType: "application/json",
            buffer: Buffer.from(JSON.stringify(input)),
          }),
        ]);
        for (const route of ["/titelblatt", "/anschreiben", "/lebenslauf"]) {
          await page.goto(base + route + "?docx-next-design-qa=1", { waitUntil: "networkidle" });
          await page.evaluate(() => document.fonts.ready);
        }
        const sheets = page
          .locator('main [data-dossier-document="cv"]')
          .first()
          .locator("[data-cv-page]");
        const pageStarts = await sheets.evaluateAll((sheets) =>
          sheets.map((sheet) => {
            const box = sheet.getBoundingClientRect(),
              mm = 210 / box.width;
            const header = sheet
              .querySelector(
                "[data-dossier-contact-header-background], [data-dossier-continuation-contact-header], [data-dossier-compact-header]",
              )
              .getBoundingClientRect();
            const main = sheet.querySelector("[data-cv-main]").getBoundingClientRect();
            return {
              headerMm: header.height * mm,
              mainTopMm: (main.top - box.top) * mm,
              clearanceMm: (main.top - header.bottom) * mm,
            };
          }),
        );
        const geometry = await sheets.first().evaluate((sheet) => {
          const box = sheet.getBoundingClientRect(),
            mm = 210 / box.width;
          const rect = (el) => {
            const r = el.getBoundingClientRect();
            return {
              x: (r.left - box.left) * mm,
              y: (r.top - box.top) * mm,
              width: r.width * mm,
              height: r.height * mm,
              bottom: (r.bottom - box.top) * mm,
            };
          };
          const rail = sheet.querySelector("[data-cv-sidebar]"),
            photo = rail.querySelector("[data-cv-photo]"),
            header = sheet.querySelector(
              "[data-dossier-contact-header-background], [data-dossier-compact-header]",
            );
          return {
            header: rect(header),
            photo: rect(photo),
            rail: rect(rail),
            main: rect(sheet.querySelector("[data-cv-main]")),
            railText: Array.from(rail.querySelectorAll("[data-dossier-field-id]"))
              .filter((e) => getComputedStyle(e).display !== "none")
              .map((e) => ({ id: e.dataset.dossierFieldId, ...rect(e) })),
          };
        });
        await sheets.first().screenshot({ path: path.join(folder, "Web-CV.png") });
        await page.goto(base + "/?docx-next-design-qa=1", { waitUntil: "networkidle" });
        const state = await page.evaluate(() =>
          JSON.stringify(
            Object.fromEntries(
              Object.keys(localStorage)
                .sort()
                .map((k) => [k, localStorage.getItem(k)]),
            ),
          ),
        );
        if (process.env.DOCX_NEXT_OUTER_ZOOM)
          await page.evaluate((zoom) => {
            document.body.style.zoom = zoom;
          }, process.env.DOCX_NEXT_OUTER_ZOOM);
        const generated = await page.evaluate(async (photo) => {
          const { captureSharedSidebarQaCandidate } =
            await import("/scripts/qa-sidebar-candidate.browser.ts");
          return captureSharedSidebarQaCandidate("shared-body-stories", photo);
        }, source.cv.data.person.foto);
        const { bytes, ...proof } = generated;
        await writeFile(path.join(folder, "Candidate.docx"), Buffer.from(bytes));
        await writeFile(path.join(folder, "proof.json"), JSON.stringify(proof, null, 2));
        assert.deepEqual(generated.picture.source, generated.picture.normalized);
        assert(
          geometry.photo.y >= geometry.main.y - 0.1,
          "Sidebar picture ignores shared header clearance",
        );
        assert(
          pageStarts.every((p) => p.clearanceMm >= 19.9),
          "A continuation ignored the shared header clearance",
        );
        assert.equal(
          generated.snapshot.settings.cvContinuationTopMarginMm,
          undefined,
          "Export invented a continuation override",
        );
        await page.getByRole("button").filter({ hasText: "Gesamtdossier herunterladen" }).click();
        const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
        await dialog.getByRole("radio", { name: "Fertiges Dossier (PDF)" }).click();
        const pdfButton = dialog.getByRole("button", { name: "PDF herunterladen", exact: true });
        let enabled = false;
        for (let i = 0; i < 30; i++) {
          if (await pdfButton.isEnabled()) {
            enabled = true;
            break;
          }
          await page.waitForTimeout(200);
        }
        const preflight = await dialog.textContent();
        if (enabled) {
          const event = page.waitForEvent("download", { timeout: 60000 });
          await pdfButton.click();
          await (await event).saveAs(path.join(folder, "App.pdf"));
        }
        assert.equal(
          await page.evaluate(() =>
            JSON.stringify(
              Object.fromEntries(
                Object.keys(localStorage)
                  .sort()
                  .map((k) => [k, localStorage.getItem(k)]),
              ),
            ),
          ),
          state,
        );
        assert.deepEqual(errors, []);
        assert(enabled, "Normal App PDF preflight rejected the configuration");
        const result = {
          id,
          geometry,
          pageStarts,
          photoClearanceMm: geometry.photo.y - geometry.header.bottom,
          pdfDownloaded: enabled,
          preflight,
          jsErrors: errors,
          nativeContactFrames: generated.model.cv.headerFrames?.length ?? 0,
          productGuardPreserved: true,
          pixelsPreserved: true,
        };
        results.push(result);
        await writeFile(path.join(output, "results.json"), JSON.stringify(results, null, 2));
        console.log(
          JSON.stringify({
            id,
            photoClearanceMm: result.photoClearanceMm,
            pdfDownloaded: enabled,
            nativeContactFrames: result.nativeContactFrames,
            pageStarts,
          }),
        );
      } finally {
        await context.close();
      }
    }
} finally {
  await browser.close();
}
