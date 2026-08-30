import { expect, test, type Page } from "@playwright/test";
import { mkdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const BASE_URL = "http://127.0.0.1:4173";
const GALLERY_DIR = process.env.DOSSIER_GALLERY_DIR;

type StoredPart = { data?: Record<string, unknown>; design?: Record<string, unknown> };

async function extractPdfText(path: string): Promise<string> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(await readFile(path));
  const document = await getDocument({ data, disableFontFace: true }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const pdfPage = await document.getPage(pageNumber);
    const content = await pdfPage.getTextContent();
    pages.push(
      content.items
        .map((item) => ("str" in item ? item.str : ""))
        .filter(Boolean)
        .join(" "),
    );
  }
  return pages.join("\n").replace(/\s+/g, " ").trim();
}

async function applyExampleData(
  page: Page,
  route: "/titelblatt" | "/anschreiben" | "/lebenslauf",
  storageKey: string,
  ready: (saved: StoredPart) => boolean,
) {
  await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });

  const downloadMenuButton = page.getByRole("button", { name: "Download", exact: true });
  await expect(downloadMenuButton).toHaveAttribute("data-editor-ready", "true");
  await downloadMenuButton.click();

  const menu = page.locator("[data-editor-action-menu]");
  await expect(menu).toBeVisible();
  await menu
    .getByRole("button")
    .filter({ hasText: "Beispieldaten übernehmen" })
    .click();
  await expect(menu.getByText("Beispieldaten übernehmen?", { exact: true })).toBeVisible();
  await menu.getByRole("button", { name: "Ja", exact: true }).click();

  await expect
    .poll(async () => {
      const saved = await page.evaluate(
        ({ key }) => {
          const raw = localStorage.getItem(key);
          return raw ? JSON.parse(raw) : null;
        },
        { key: storageKey },
      );
      return !!saved && ready(saved as StoredPart);
    })
    .toBe(true);
}

async function downloadCompleteDossier(page: Page) {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });

  const dossierCard = page
    .getByRole("button")
    .filter({ hasText: "Gesamtdossier herunterladen" });
  await expect(dossierCard).toBeVisible();
  await expect(dossierCard).toContainText("Dossier prüfen & herunterladen", { timeout: 15_000 });
  await dossierCard.click();

  const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
  await expect(dialog).toBeVisible();
  const downloadButton = dialog.getByRole("button", { name: "Dossier herunterladen", exact: true });
  await expect(downloadButton).toBeEnabled({ timeout: 15_000 });

  const [download] = await Promise.all([page.waitForEvent("download"), downloadButton.click()]);
  const path = await download.path();
  expect(path).not.toBeNull();
  expect((await stat(path ?? "")).size).toBeGreaterThan(15_000);

  const pdfText = await extractPdfText(path ?? "");
  expect(pdfText).toContain("Bewerbung um eine Lehrstelle als Informatiker/in EFZ");
  expect(pdfText).toContain("Guten Tag Herr Weber");

  if (GALLERY_DIR) {
    await mkdir(GALLERY_DIR, { recursive: true });
    await download.saveAs(join(GALLERY_DIR, "00-beispieldaten-gesamt.pdf"));
  }
}

test.describe("complete dossier end-to-end", () => {
  test.setTimeout(180_000);

  test("Beispieldaten in allen drei Bereichen erzeugen ein echtes Gesamtdossier-PDF", async ({
    page,
  }) => {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.clear());

    await applyExampleData(page, "/titelblatt", "titelblatt:v3", (saved) => {
      const data = saved.data;
      return data?.vorname === "Lea" && data?.nachname === "Müller";
    });
    await applyExampleData(page, "/anschreiben", "anschreiben:v1", (saved) => {
      const data = saved.data;
      return (
        data?.betreff === "Bewerbung um eine Lehrstelle als Informatiker/in EFZ" &&
        data?.absenderName === "Lea Müller"
      );
    });
    await applyExampleData(page, "/lebenslauf", "lebenslauf:v1", (saved) => {
      const person = saved.data?.person as Record<string, unknown> | undefined;
      return person?.vorname === "Lea" && person?.nachname === "Müller";
    });

    await downloadCompleteDossier(page);
  });

  test("alle 38 Motivationsschreiben-Vorlagen sind auswählbar und Fresh-Designs bleiben gespeichert", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/anschreiben`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      localStorage.removeItem("anschreiben:v1");
      localStorage.removeItem("anschreiben:history");
    });
    await page.reload({ waitUntil: "domcontentloaded" });

    const downloadMenuButton = page.getByRole("button", { name: "Download", exact: true });
    await expect(downloadMenuButton).toHaveAttribute("data-editor-ready", "true");

    const header = page.getByRole("button", { name: /^Vorlage/ });
    if ((await header.getAttribute("aria-expanded")) !== "true") await header.click();
    const panelId = await header.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    const panel = page.locator(`[id="${panelId}"]`);
    const buttons = panel.getByRole("button");

    await expect(buttons).toHaveCount(38);
    const labels = (await buttons.allTextContents()).map((value) => value.trim()).filter(Boolean);
    expect(new Set(labels).size).toBe(38);
    for (const required of ["Brief", "Colorful", "Edge", "Glow", "Mono Luxe", "Cove"]) {
      expect(labels).toContain(required);
    }

    const preview = page.getByLabel("Vorschau Motivationsschreiben");
    await expect(preview).toBeVisible();
    for (let index = 0; index < 38; index += 1) {
      const button = buttons.nth(index);
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
      await expect(preview).toBeVisible();
    }

    await panel.getByRole("button", { name: "Edge", exact: true }).click();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const raw = localStorage.getItem("anschreiben:v1");
          return raw ? JSON.parse(raw)?.design?.template : null;
        }),
      )
      .toBe("edge");

    await page.reload({ waitUntil: "domcontentloaded" });
    const freshDownloadMenuButton = page.getByRole("button", { name: "Download", exact: true });
    await expect(freshDownloadMenuButton).toHaveAttribute("data-editor-ready", "true");
    const headerAfterReload = page.getByRole("button", { name: /^Vorlage/ });
    if ((await headerAfterReload.getAttribute("aria-expanded")) !== "true") {
      await headerAfterReload.click();
    }
    const panelIdAfterReload = await headerAfterReload.getAttribute("aria-controls");
    expect(panelIdAfterReload).toBeTruthy();
    const panelAfterReload = page.locator(`[id="${panelIdAfterReload}"]`);
    await expect(panelAfterReload.getByRole("button", { name: "Edge", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
