import { expect, type Page } from "@playwright/test";
import approvedProject from "../../fixtures/import/modern-sidebar-from-23okt.json" with { type: "json" };

/** Use the reviewed native profile through the real project importer. */
export async function importNativeDossier(
  page: Page,
  configure?: (project: typeof approvedProject) => void,
) {
  const project = structuredClone(approvedProject);
  configure?.(project);
  await page.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
  // Initial IndexedDB recovery and lazy route hydration complete before import.
  await expect(page.getByRole("button", { name: "Dossier laden", exact: true })).toBeVisible({
    timeout: 20_000,
  });
  page.once("dialog", (dialog) => void dialog.accept());
  const reloaded = page.waitForEvent("domcontentloaded", { timeout: 20_000 });
  await page.locator('input[type="file"][accept*="json"]').setInputFiles({
    name: "native-reviewed.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await reloaded;
  await expect(page.getByRole("button", { name: /Gesamtdossier herunterladen/ })).toBeEnabled();
  return project;
}

export async function expectUnreviewedDocxBlocked(page: Page) {
  await expect(page.getByRole("radio", { name: /Bearbeitbares Dossier \(DOCX\)/ })).toBeDisabled();
  await expect(page.locator("[data-dossier-export-check]")).toContainText(
    "Der Word-Download unterstützt momentan die Vorlage «Modern» mit seitlicher Spalte im Lebenslauf.",
  );
  // An unsupported Word profile must not prevent PDF or lossless project backup.
  await expect(page.getByRole("radio", { name: /Projektdatei \(JSON\)/ })).toBeEnabled();
  await expect(page.getByRole("radio", { name: /Fertiges Dossier \(PDF\)/ })).toBeEnabled();
}

/** Export isolation starts after the editor has persisted its load migrations. */
export async function waitForNativeEditorSaved(page: Page) {
  await expect(
    page.getByRole("status").filter({ hasText: "Automatisch gespeichert" }),
  ).toBeVisible();
}
