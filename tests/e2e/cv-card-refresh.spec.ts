import { createHash } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:4173";

const TEMPLATES = [
  {
    id: "neon",
    colors: { bg: "#0d0b2b", primary: "#e11d8f", secondary: "#7c3aed", ink: "#f8fafc" },
    minSurfaceMm: 41,
  },
  {
    id: "verlauf",
    colors: { primary: "#7f5af0", secondary: "#2cb67d", ink: "#ffffff", bg: "#ffffff" },
    minSurfaceMm: 44,
  },
  {
    id: "citrus",
    colors: { primary: "#fb7185", secondary: "#fbbf24", bg: "#fffdf9", ink: "#3f1d2b" },
    minSurfaceMm: 37,
  },
] as const;

function data() {
  return {
    titel: "Lebenslauf",
    person: {
      vorname: "Lea",
      nachname: "Müller",
      adresse: "Bahnhofstrasse 42",
      plzOrt: "8000 Zürich",
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
        titel: "Sekundarschule, Niveau A",
        ort: "Schulhaus Feld, Zürich",
        beschreibung: "Schwerpunkt Mathematik und Informatik",
      },
    ],
    erfahrung: [
      {
        id: "work-1",
        zeit: "Sept. 2026",
        titel: "Schnupperlehre Informatik",
        ort: "Beispiel AG, Zürich",
        beschreibung: "Support, kleine Automatisierungen mit Python",
      },
    ],
    sprachen: [
      { id: "de", name: "Deutsch", niveau: "Muttersprache" },
      { id: "en", name: "Englisch", niveau: "Gute Schulkenntnisse (B1)" },
    ],
    hobbys: ["Volleyball", "Programmieren"],
    staerken: ["Zuverlässig", "Teamfähig"],
    referenzen: [],
    labels: {},
    hidden: {},
  };
}

async function seed(page: Page, template: (typeof TEMPLATES)[number]) {
  await page.goto(`${BASE_URL}/lebenslauf`, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ payload }) => {
      localStorage.clear();
      localStorage.setItem("lebenslauf:v1", JSON.stringify(payload));
      localStorage.setItem("lebenslauf:layout:v1", "classic");
      localStorage.setItem("lebenslauf:layout-mirror:v1", "false");
    },
    {
      payload: {
        version: 2,
        data: data(),
        design: {
          template: template.id,
          colors: template.colors,
          bgOpacity: 0.06,
          useElements: false,
        },
        elements: [],
      },
    },
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    (expected) => document.documentElement.dataset.dossierTemplate === expected,
    template.id,
  );
  const sheet = page
    .locator('[data-dossier-document="cv"][data-export-mode="false"] [data-cv-page="0"]')
    .first();
  await sheet.waitFor({ state: "visible" });
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
  return sheet;
}

const hash = (buffer: Buffer) => createHash("sha256").update(buffer).digest("hex");

test.describe("Neon / Verlauf / Citrus CV refresh", () => {
  test.setTimeout(120_000);

  test("all three use an expressive hero and a readable document title", async ({ page }) => {
    await page.setViewportSize({ width: 1137, height: 913 });
    const screenshots = new Set<string>();

    for (const template of TEMPLATES) {
      const sheet = await seed(page, template);
      const pageBox = await sheet.boundingBox();
      expect(pageBox).not.toBeNull();
      if (!pageBox) continue;

      const title = sheet.locator("[data-cv-doc-title]").first();
      await expect(title).toHaveText("Lebenslauf");
      const titleMetrics = await title.evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          fontSize: Number.parseFloat(style.fontSize),
          zoom: Number.parseFloat(style.zoom || "1") || 1,
        };
      });
      expect(
        titleMetrics.fontSize * titleMetrics.zoom,
        `${template.id} document title should be clearly readable`,
      ).toBeGreaterThanOrEqual(15);

      const surface = sheet.locator("[data-cv-surface]").first();
      const surfaceBox = await surface.boundingBox();
      expect(surfaceBox).not.toBeNull();
      if (!surfaceBox) continue;
      const surfaceTopMm = ((surfaceBox.y - pageBox.y) / pageBox.width) * 210;
      expect(surfaceTopMm, `${template.id} needs a real hero zone`).toBeGreaterThanOrEqual(
        template.minSurfaceMm,
      );

      const nameBox = await sheet.locator("[data-cv-name]").first().boundingBox();
      expect(nameBox).not.toBeNull();
      if (nameBox)
        expect(nameBox.y, `${template.id} name belongs in the hero`).toBeLessThan(surfaceBox.y);

      const oldRule = sheet.locator('[data-cv-accent="section"]').first();
      if ((await oldRule.count()) > 0) await expect(oldRule).toBeHidden();

      const shot = await sheet.screenshot({ animations: "disabled" });
      expect(shot.length, `${template.id} should render substantial output`).toBeGreaterThan(8_000);
      screenshots.add(hash(shot));
    }

    expect(screenshots.size).toBe(TEMPLATES.length);
  });
});
