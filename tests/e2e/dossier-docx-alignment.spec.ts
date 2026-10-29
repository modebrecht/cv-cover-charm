import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { importNativeDossier } from "./support/native-docx-fixture";

function paragraphContaining(xml: string, marker: string) {
  const index = xml.indexOf(marker);
  expect(index, `${marker} must exist in document.xml`).toBeGreaterThanOrEqual(0);

  let start = xml.lastIndexOf("<w:p", index);
  while (start >= 0) {
    const openEnd = xml.indexOf(">", start);
    if (openEnd >= 0 && /^<w:p(?:\s[^>]*)?>$/.test(xml.slice(start, openEnd + 1))) break;
    start = xml.lastIndexOf("<w:p", start - 1);
  }
  const end = xml.indexOf("</w:p>", index);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThanOrEqual(0);
  return xml.slice(start, end + 6);
}

async function seedAlignedDossier(page: Page) {
  await importNativeDossier(page, (project) => {
    project.letter.data.empfaengerFirma = "LETTER-LEFT-DOCX";
    project.letter.data.text = "LETTER-JUSTIFY-DOCX";
    project.letter.data.richTextHtml = "";
    project.cv.data.schule[0].beschreibung = "CV-JUSTIFY-DOCX";
    project.cv.portableState.textAlign = "justify";
  });
}

test.describe("real DOCX body alignment parity", () => {
  test.setTimeout(120_000);

  test("recipient left, plain letter justify and CV justify survive the native DOCX pipeline", async ({
    page,
  }) => {
    await seedAlignedDossier(page);

    const exportCard = page.getByRole("button", { name: /Gesamtdossier herunterladen/ });
    await expect(exportCard).toBeEnabled();
    await exportCard.click();

    const option = page.getByRole("radio", { name: /Bearbeitbares Dossier \(DOCX\)/ });
    await expect(option).toBeEnabled();
    await option.click();

    const button = page.getByRole("button", { name: "DOCX herunterladen" });
    const [download] = await Promise.all([page.waitForEvent("download"), button.click()]);
    const path = await download.path();
    expect(path).not.toBeNull();

    const bytes = new Uint8Array(await readFile(path!));
    const entries = readZipEntries(bytes, "Alignment-E2E");
    const documentXmlEntry = entries.find((entry) => entry.name === "word/document.xml");
    expect(documentXmlEntry).toBeTruthy();
    const xml = new TextDecoder().decode(documentXmlEntry!.bytes);

    expect(paragraphContaining(xml, "LETTER-LEFT-DOCX")).toContain('<w:jc w:val="left"/>');
    expect(paragraphContaining(xml, "LETTER-JUSTIFY-DOCX")).toContain('<w:jc w:val="both"/>');
    expect(paragraphContaining(xml, "CV-JUSTIFY-DOCX")).toContain('<w:jc w:val="both"/>');
  });
});

test("formatted letter keeps PDF available and explains why Word is unavailable", async ({
  page,
}) => {
  const project = await importNativeDossier(page, (project) => {
    project.letter.data.richTextHtml = '<div data-align="left">LETTER-FORMATTED-DOCX</div>';
    project.letter.data.text = "LETTER-FORMATTED-DOCX";
  });
  await page.getByRole("button", { name: /Gesamtdossier herunterladen/ }).click();
  await expect(page.getByRole("radio", { name: /Bearbeitbares Dossier/ })).toBeDisabled();
  await expect(page.getByRole("radio", { name: /Fertiges Dossier/ })).toBeEnabled();
  await expect(page.locator("[data-dossier-export-check]")).toContainText(
    "formatierten Brieftext noch nicht",
  );
  const pdfButton = page.getByRole("button", { name: "PDF herunterladen", exact: true });
  await expect(pdfButton).toBeEnabled({ timeout: 20_000 });
  const downloading = page.waitForEvent("download");
  await pdfButton.click();
  const pdf = await downloading;
  expect(pdf.suggestedFilename()).toMatch(/\.pdf$/i);
  const bytes = await readFile((await pdf.path())!);
  expect(bytes.subarray(0, 4).toString()).toBe("%PDF");
  expect(bytes.length).toBeGreaterThan(2_000);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("anschreiben:v1")!).data.richTextHtml,
    ),
  ).toBe(project.letter.data.richTextHtml);
});
