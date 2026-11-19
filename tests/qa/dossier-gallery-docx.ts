import { expect, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { BASE_URL, type CanonicalDossier } from "../e2e/support/dossier-gallery-shared";
import { expectUnreviewedDocxBlocked } from "../e2e/support/native-docx-fixture";

export function galleryFixtureForDocx(stored: CanonicalDossier, template: string) {
  if (template !== "modern" && template !== "brief") return stored;
  const fixture = structuredClone(stored);
  fixture.cover.font = "sans";
  fixture.letter.design.font = "sans";
  fixture.letter.design.fontOverride = "sans";
  fixture.cv.design.font = "sans";
  return fixture;
}

export async function galleryInputHash(page: Page) {
  const input = await page.evaluate(() =>
    [
      "titelblatt:v3",
      "anschreiben:v1",
      "lebenslauf:v1",
      "bewerbungsdossier:chrome:v1",
      "lebenslauf:layout:v1",
      "lebenslauf:photo:v2",
      "lebenslauf:photo-place:v1",
    ].map((key) => localStorage.getItem(key)),
  );
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

async function documentRecord(directory: string, file: string) {
  const bytes = await readFile(join(directory, file));
  expect(bytes.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  return {
    status: "exported" as const,
    file,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

export async function captureGalleryDocx(
  page: Page,
  directory: string,
  base: string,
  template: string,
) {
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Gesamtdossier herunterladen/ }).click();
  const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
  const docx = dialog.getByRole("radio", { name: "Bearbeitbares Dossier (DOCX)" });
  const designIssue = dialog.locator("[data-dossier-docx-design-issue]");
  if (template === "modern") {
    await expect(docx, (await designIssue.allTextContents()).join(" ")).toBeEnabled();
    await docx.click();
    const button = dialog.getByRole("button", { name: "DOCX herunterladen", exact: true });
    await expect(button).toBeEnabled();
    const download = page.waitForEvent("download");
    await button.click();
    const file = `${base}--regular.docx`;
    await (await download).saveAs(join(directory, file));
    return {
      regular: await documentRecord(directory, file),
      preview: { status: "not-configured" },
    };
  }

  await expectUnreviewedDocxBlocked(page);
  const reason = (await designIssue.textContent())?.trim();
  expect(reason).toBeTruthy();
  const regular = { status: "blocked", reason };
  if (template !== "brief") return { regular, preview: { status: "not-configured" } };

  await page.goto(`${BASE_URL}/?docx-next-brief-qa=1`, { waitUntil: "networkidle" });
  const bytes = await page.evaluate(async () => {
    const path = "/src/lib/brief-docx-next-export.ts";
    const { createSavedBriefDocxNext } = await import(path);
    const { blob, model } = await createSavedBriefDocxNext();
    if (model.templateId !== "brief" || model.issues.length)
      throw Error("Unexpected Brief document model.");
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  const file = `${base}--preview.docx`;
  await writeFile(join(directory, file), Buffer.from(bytes));
  return { regular, preview: await documentRecord(directory, file) };
}
