/** Supplemental geometry fixture: gallery demo intentionally has no CV photo. */
import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  BASE_URL,
  GALLERY_CASES,
  assertGalleryCatalog,
  waitEditorReady,
} from "./support/dossier-gallery-shared";
import { parityStorage } from "./support/cv-parity-fixture";

test("all 39 native CVs retain live photo and sidebar geometry", async ({ browser }) => {
  const output = process.env.NATIVE_PRINT_BENCHMARK_DIR;
  test.skip(!output, "Supplemental opt-in benchmark geometry guard");
  test.setTimeout(15 * 60000);
  assertGalleryCatalog();
  const sourceSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const rows = [];
  for (const item of GALLERY_CASES) {
    const context = await browser.newContext({
      viewport: { width: 1800, height: 1600 },
      deviceScaleFactor: 1,
    });
    await context.addInitScript(
      (storage) => {
        localStorage.clear();
        for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, value);
        window.print = () => window.dispatchEvent(new Event("beforeprint"));
      },
      parityStorage(item.id, false, true),
    );
    const page = await context.newPage();
    const read = async (selector: string) =>
      page
        .locator(selector)
        .first()
        .evaluate((sheet) => {
          const p = sheet.getBoundingClientRect();
          return Array.from(
            sheet.querySelectorAll<HTMLElement>(
              "[data-cv-main], [data-cv-header], [data-cv-section], [data-cv-entry-title], [data-cv-sidebar], [data-cv-photo]",
            ),
          ).map((node) => {
            const r = node.getBoundingClientRect(),
              s = getComputedStyle(node);
            return {
              role: node.hasAttribute("data-cv-photo")
                ? "photo"
                : node.hasAttribute("data-cv-sidebar")
                  ? "sidebar"
                  : "content",
              text: node.textContent,
              box: [
                ((r.x - p.x) / p.width) * 210,
                ((r.y - p.y) / p.height) * 297,
                (r.width / p.width) * 210,
                (r.height / p.height) * 297,
              ],
              font: [s.fontFamily, s.fontSize, s.fontWeight, s.lineHeight, s.letterSpacing],
              radius: s.borderRadius,
            };
          });
        });
    await page.goto(BASE_URL + "/lebenslauf", { waitUntil: "networkidle" });
    await waitEditorReady(page);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
    });
    const live = await read(
      '[data-dossier-document="cv"][data-export-mode="false"] [data-cv-page="0"]',
    );
    expect(live.filter((n) => n.role === "photo").length, item.label).toBeGreaterThan(0);
    expect(live.filter((n) => n.role === "sidebar").length, item.label).toBeGreaterThan(0);
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Gesamtdossier herunterladen/ }).click();
    const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
    await expect(
      dialog.getByRole("button", { name: "PDF herunterladen", exact: true }),
    ).toBeEnabled({ timeout: 30000 });
    await page.evaluate(async () => {
      const { prepareDossierNativePrint } = await import(
        String("/src/lib/dossier-native-print.ts")
      );
      const prepared = await prepareDossierNativePrint(
        document.querySelector("[data-dossier-pdf-canvas]")!,
      );
      prepared.release();
    });
    const canonical = await read('[data-dossier-pdf-canvas] [data-cv-page="0"]');
    await dialog.getByRole("button", { name: "Drucken / als PDF speichern", exact: true }).click();
    await expect(page.locator("body")).toHaveAttribute("data-dossier-native-print", "true");
    await page.emulateMedia({ media: "print" });
    const printed = await read('[data-dossier-pdf-canvas] [data-cv-page="0"]');
    let liveMaximum = 0;
    let printMaximum = 0;
    const differences = [];
    for (const [phase, expected, actual] of [
      ["live_to_canonical", live, canonical],
      ["canonical_to_print", canonical, printed],
    ] as const) {
      expect(actual.length, item.label).toBe(expected.length);
      actual.forEach((node, i) => {
        expect(node.text, item.label).toBe(expected[i].text);
        expect(node.font, item.label).toEqual(expected[i].font);
        expect(node.radius, item.label).toBe(expected[i].radius);
        node.box.forEach((axis, j) => {
          const delta = Math.abs(axis - expected[i].box[j]);
          if (phase === "canonical_to_print") {
            printMaximum = Math.max(printMaximum, delta);
            expect(delta, `${item.label}: canonical print geometry`).toBeLessThanOrEqual(0.02);
          } else {
            // Audit the existing shared-canvas preview difference separately.
            // Never label a failed .02mm live guard as structural parity.
            liveMaximum = Math.max(liveMaximum, delta);
            if (delta > 0.02)
              differences.push({
                role: node.role,
                axis: j,
                live_mm: expected[i].box[j],
                canonical_mm: axis,
                delta_mm: delta,
              });
          }
        });
      });
    }
    rows.push({
      template: item.label,
      source_sha: sourceSha,
      live_to_canonical_mm: liveMaximum,
      canonical_to_print_mm: printMaximum,
      live_guard_pass: liveMaximum <= 0.02,
      print_guard_pass: printMaximum <= 0.02,
      differences,
      photo_nodes: live.filter((n) => n.role === "photo").length,
      sidebar_nodes: live.filter((n) => n.role === "sidebar").length,
    });
    expect
      .soft(liveMaximum, `${item.label}: live/shared-canvas .02mm guard`)
      .toBeLessThanOrEqual(0.02);
    await page.emulateMedia({ media: "screen" });
    await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
    await context.close();
  }
  await writeFile(
    join(output!, "photo-sidebar-geometry.json"),
    JSON.stringify({ source_sha: sourceSha, rows }, null, 2),
  );
});
