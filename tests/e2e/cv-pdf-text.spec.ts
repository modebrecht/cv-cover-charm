import { expect, test } from "@playwright/test";
import { readFile, stat } from "node:fs/promises";

const BASE_URL = "http://127.0.0.1:4173";

function cvPayload() {
  return {
    version: 6,
    data: {
      titel: "Lebenslauf",
      person: {
        vorname: "Lea",
        nachname: "Müller",
        adresse: "Dorfstrasse 12",
        plzOrt: "4535 Hubersdorf",
        telefon: "+41 79 123 45 67",
        email: "lea.mueller@example.ch",
        geburtsdatum: "14.03.2010",
        nationalitaet: "Schweiz",
        untertitel: "Schülerin, 3. Sekundarklasse",
        foto: null,
      },
      schule: [
        {
          id: "school-1",
          zeit: "2023 – heute",
          titel: "Sekundarschule",
          ort: "Schulhaus Beispiel, Hubersdorf",
          beschreibung: "Schwerpunkt Informatik und selbstständiges Arbeiten.",
        },
      ],
      erfahrung: [
        {
          id: "work-1",
          zeit: "2026",
          titel: "Schnupperlehre Informatik",
          ort: "Beispielbetrieb Solothurn",
          beschreibung: "Mitarbeit im Team und Dokumentation kleiner Aufgaben.",
        },
      ],
      sprachen: [
        { id: "de", name: "Deutsch", niveau: "Muttersprache" },
        { id: "en", name: "Englisch", niveau: "B1" },
      ],
      hobbys: ["Volleyball", "Programmieren"],
      staerken: ["Zuverlässig", "Teamfähig"],
      referenzen: [],
      labels: {},
      hidden: {},
    },
    design: {
      template: "modern",
      colors: { primary: "#24364b", accent: "#d6a47d", bg: "#ffffff" },
      bgOpacity: 0.25,
      useElements: false,
    },
    elements: [],
    elementStyles: {},
  };
}

test.describe("CV PDF real text layer", () => {
  test.setTimeout(120_000);

  test("standalone CV keeps design raster but exports searchable/selectable text", async ({ page }) => {
    await page.goto(`${BASE_URL}/lebenslauf`, { waitUntil: "domcontentloaded" });
    await page.evaluate((payload) => {
      localStorage.clear();
      localStorage.setItem("lebenslauf:v1", JSON.stringify(payload));
      localStorage.setItem("lebenslauf:layout:v1", "classic");
    }, cvPayload());
    await page.reload({ waitUntil: "domcontentloaded" });

    const preview = page.locator(
      '[data-dossier-document="cv"][data-export-mode="false"] [data-cv-page]',
    );
    await preview.first().waitFor({ state: "visible" });
    await expect(preview.first()).toContainText("Lea");
    await expect(preview.first()).toContainText("Beispielbetrieb Solothurn");

    // The hidden export copy must not burn readable text into the JPEG layer.
    // Its text is restored only while the PDF vector text layer is measured.
    const exportText = page
      .locator('[data-dossier-document="cv"][data-export-mode="true"] [data-cv-page]')
      .first()
      .getByText("Lea", { exact: false })
      .first();
    await expect
      .poll(async () => exportText.evaluate((element) => getComputedStyle(element).color))
      .toMatch(/rgba\([^)]*,\s*0\)|transparent/i);

    await page.getByRole("button", { name: "Download" }).click();
    const downloadPromise = page.waitForEvent("download", { timeout: 90_000 });
    await page.getByRole("button", { name: /Nur Lebenslauf als PDF/i }).click();
    const download = await downloadPromise;
    const path = await download.path();

    expect(path).not.toBeNull();
    expect((await stat(path ?? "")).size).toBeGreaterThan(8_000);

    const pdfSource = (await readFile(path ?? "")).toString("latin1");
    expect(pdfSource).toContain("Lea");
    expect(pdfSource).toContain("Sekundarschule");
    expect(pdfSource).toContain("Beispielbetrieb");
    expect(pdfSource).toContain("Volleyball");
  });
});
