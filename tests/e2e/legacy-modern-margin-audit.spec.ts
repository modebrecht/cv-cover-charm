import { test, expect } from "@playwright/test";
import { BASE_URL, seedCanonicalDossier, applyGalleryCase } from "./support/dossier-gallery-shared";
import { DOSSIER_PAGE_MARGINS_STORAGE_KEY } from "../../src/lib/dossier-page-margins";
test("47mm margin Legacy DOCX audit", async ({ page }) => {
  test.setTimeout(180000);
  const baseline = await seedCanonicalDossier(page);
  await applyGalleryCase(page, baseline, {
    id: "modern",
    label: "Modern",
    coverTemplate: "modern",
    letterTemplate: "modern",
    cvTemplate: "modern",
  });
  await page.evaluate(
    (key) =>
      localStorage.setItem(
        key,
        JSON.stringify({ cv: { top: 24, right: 20, bottom: 47, left: 10 } }),
      ),
    DOSSIER_PAGE_MARGINS_STORAGE_KEY,
  );
  await page.goto(BASE_URL + "/", { waitUntil: "networkidle" });
  const card = page.getByRole("button", { name: /Gesamtdossier herunterladen/ });
  await expect(card).toContainText("Format wählen", { timeout: 20000 });
  await card.click();
  const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("radio", { name: "Bearbeitbares Dossier (DOCX)" }).click();
  const b = dialog.getByRole("button", { name: "DOCX herunterladen", exact: true });
  await expect(b).toBeEnabled({ timeout: 25000 });
  const event = page.waitForEvent("download", { timeout: 90000 });
  await b.click();
  await (await event).saveAs("artifacts/legacy-modern-sidebar/modern-margin47--docx.docx");
});
