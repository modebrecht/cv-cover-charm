import { test, expect, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { BASE_URL, seedCanonicalDossier, applyGalleryCase } from "./support/dossier-gallery-shared";
const OUT = "artifacts/legacy-modern-sidebar";
const ITEM = {
  id: "modern",
  label: "Modern",
  coverTemplate: "modern" as const,
  letterTemplate: "modern" as const,
  cvTemplate: "modern" as const,
};
const PHOTO =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="120"><rect width="96" height="120" fill="#d4ab8a"/><circle cx="48" cy="36" r="22" fill="#815d4c"/><rect x="22" y="66" width="52" height="54" rx="14" fill="#3e4f63"/></svg>',
  );
async function exportDossier(source: Page, type: "pdf" | "docx", dest: string) {
  const page = await source.context().newPage();
  try {
    await page.goto(BASE_URL + "/", { waitUntil: "networkidle" });
    const card = page.getByRole("button", { name: /Gesamtdossier herunterladen/ });
    await expect(card).toContainText("Format wählen", { timeout: 25000 });
    await card.click();
    const d = page.getByRole("dialog", { name: "Dossier herunterladen" });
    await expect(d).toBeVisible();
    if (type === "docx")
      await d.getByRole("radio", { name: "Bearbeitbares Dossier (DOCX)" }).click();
    const button = d.getByRole("button", {
      name: type === "pdf" ? "PDF herunterladen" : "DOCX herunterladen",
      exact: true,
    });
    if (!(await button.isEnabled())) {
      try {
        await expect(button).toBeEnabled({ timeout: 8000 });
      } catch (err) {
        if (type === "pdf") {
          const issues = await page.locator("[data-dossier-pdf-canvas]").evaluate(async (root) => {
            const { inspectPdfPreflight } = await import("/src/lib/pdf-preflight.ts");
            return inspectPdfPreflight(root, "dossier").issues.map((i) => ({
              code: i.code,
              severity: i.severity,
              kind: i.documentKind,
              page: i.pageIndex,
              message: i.message,
            }));
          });
          return JSON.stringify({ blocked: issues });
        }
        throw err;
      }
    }
    const wait = page.waitForEvent("download", { timeout: 120000 });
    await button.click();
    const file = await wait;
    await file.saveAs(dest);
    return "exported";
  } catch (e) {
    return "blocked-or-error:" + String(e).slice(0, 250);
  } finally {
    await page.close();
  }
}
test("modern sidebar: eight actual Legacy DOCX vs Web/PDF cases", async ({ page }) => {
  test.setTimeout(18 * 60_000);
  await mkdir(OUT, { recursive: true });
  const stored = await seedCanonicalDossier(page);
  const results: any[] = [];
  for (const long of [false, true])
    for (const side of ["left", "right"])
      for (const photo of [false, true]) {
        const id = `${long ? "long" : "short"}-${side}-${photo ? "photo" : "no-photo"}`;
        if (process.env.LEGACY_CASE_FILTER && id !== process.env.LEGACY_CASE_FILTER) continue;
        console.log("CASE START", id);
        let obj: any = { id, long, side, photo, source: "production-export", status: "started" };
        try {
          await applyGalleryCase(page, stored, ITEM);
          await page.evaluate(
            ({ long, side, photo, svg }) => {
              const cv = JSON.parse(localStorage.getItem("lebenslauf:v1")!);
              cv.data.person.foto = photo ? svg : "";
              if (long)
                cv.data.erfahrung = Array.from({ length: 17 }, (_, i) => ({
                  id: `modern-qa-${i}`,
                  zeit: "2025–2026",
                  titel: `Praxisstation ${String(i + 1).padStart(2, "0")}`,
                  ort: "Hubersdorf",
                  beschreibung:
                    "Support und Automatisierungen mit Python, sorgfältige Dokumentation und eigenständiges Planen. Praktische Teamarbeit und Präsentationen.",
                }));
              localStorage.setItem("lebenslauf:v1", JSON.stringify(cv));
              localStorage.setItem("lebenslauf:layout:v1", "modern");
              localStorage.setItem(
                "lebenslauf:info-position:v1",
                side === "right" ? "mirrored" : "standard",
              );
              localStorage.setItem(
                "lebenslauf:placement:v1",
                JSON.stringify({
                  kontakt: "side",
                  schule: "main",
                  erfahrung: "main",
                  sprachen: "side",
                  hobbys: "side",
                  staerken: "side",
                  referenzen: "main",
                }),
              );
            },
            { long, side, photo, svg: PHOTO },
          );
          await page.goto(BASE_URL + "/lebenslauf", { waitUntil: "networkidle" });
          const previews = page.locator('[data-dossier-document="cv"][data-export-mode="false"]');
          await expect(previews.first()).toBeVisible({ timeout: 30000 });
          await page.evaluate(() => document.fonts.ready);
          obj.webPages = await previews.count();
          const canvasBox = await previews.first().boundingBox();
          if (!canvasBox) throw new Error("Missing physical Web CV page geometry");
          obj.webPhysicalPages = Math.round(canvasBox.height / canvasBox.width / (1123 / 794));
          obj.geometry = await previews.first().evaluate((el) => {
            const pageRect = el.getBoundingClientRect();
            const sb = el.querySelector("[data-cv-sidebar]")?.getBoundingClientRect();
            const p = el.querySelector("[data-cv-photo]")?.getBoundingClientRect();
            const mm = 25.4 / 96;
            return {
              pageWidthPx: pageRect.width,
              sidebar: sb
                ? { leftMm: (sb.left - pageRect.left) * mm, widthMm: sb.width * mm }
                : null,
              photo: p
                ? {
                    leftMm: (p.left - pageRect.left) * mm,
                    topMm: (p.top - pageRect.top) * mm,
                    widthMm: p.width * mm,
                    heightMm: p.height * mm,
                  }
                : null,
              actualPhotoCount: el.querySelectorAll("[data-cv-photo] img").length,
            };
          });
          for (let i = 0; i < obj.webPages; i++)
            await previews.nth(i).screenshot({ path: join(OUT, `${id}--web-${i + 1}.png`) });
          obj.docxState = await exportDossier(page, "docx", join(OUT, id + "--docx.docx"));
          console.log("DOCX", id, obj.docxState);
          obj.pdfState = await exportDossier(page, "pdf", join(OUT, id + "--pdf.pdf"));
          console.log("PDF", id, obj.pdfState);
          obj.status = "captured";
        } catch (e) {
          obj.status = "error";
          obj.error = String(e).slice(0, 600);
        }
        results.push(obj);
        await writeFile(
          join(OUT, process.env.LEGACY_CASE_FILTER ? "results-" + id + ".json" : "results.json"),
          JSON.stringify(results, null, 2),
        );
        console.log("CASE END", id, obj.status);
      }
  if (!process.env.LEGACY_CASE_FILTER) {
    expect(results).toHaveLength(8);
    for (const r of results) {
      expect(r.status, `${r.id}: complete capture`).toBe("captured");
      expect(r.docxState, `${r.id}: production Legacy DOCX`).toBe("exported");
      expect(r.webPhysicalPages, `${r.id}: actual CV Web A4 sheets`).toBe(r.long ? 2 : 1);
      if (r.side === "right" && r.photo) {
        expect(r.pdfState, `${r.id}: physical overflow must remain blocked`).toContain(
          "physical-overflow",
        );
      } else expect(r.pdfState, `${r.id}: safely allowed automatic PDF`).toBe("exported");
    }
  }
});
