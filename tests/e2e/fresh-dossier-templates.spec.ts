import { createHash } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:4173";

const FRESH = [
  {
    id: "edge",
    name: "Edge",
    colors: {
      bg: "#f7f7f4",
      primary: "#182433",
      secondary: "#4da3ff",
      accent: "#2f7de1",
      ink: "#18202a",
    },
  },
  {
    id: "glow",
    name: "Glow",
    colors: {
      bg: "#f7f9ff",
      primary: "#6d5dfb",
      secondary: "#7dd3fc",
      accent: "#14b8a6",
      ink: "#172033",
    },
  },
  {
    id: "frame",
    name: "Frame",
    colors: {
      bg: "#f6f3ed",
      primary: "#26352f",
      secondary: "#d8894a",
      accent: "#b96b32",
      ink: "#1e2722",
    },
  },
  {
    id: "monoLuxe",
    name: "Mono Luxe",
    colors: {
      bg: "#f8f6f1",
      primary: "#171717",
      secondary: "#b08d57",
      accent: "#8e6f42",
      ink: "#171717",
    },
  },
] as const;

const coverData = {
  meta: { title: "", author: "", subject: "", keywords: "" },
  kicker: "Bewerbung um eine Lehrstelle als",
  eyebrow: "Bewerbungsdossier",
  beruf: "Informatiker/in EFZ",
  lehrbeginn: "August 2027",
  vorname: "Lea",
  nachname: "Müller",
  adresse: "Bahnhofstrasse 42",
  plzOrt: "8000 Zürich",
  telefon: "+41 79 123 45 67",
  email: "lea.mueller@example.ch",
  geburtsdatum: "14.03.2010",
  lehrbetrieb: "Beispiel AG",
  ansprechperson: "Frau Beispiel",
  betriebAdresse: "Musterweg 8, 8000 Zürich",
  ort: "Zürich",
  datum: "22.08.2026",
  labelKontakt: "",
  labelEmpfaenger: "",
  foto: null,
};

function coverPayload(template: (typeof FRESH)[number]) {
  return {
    version: 6,
    template: template.id,
    colors: { [template.id]: template.colors },
    layout: { [template.id]: {} },
    customs: [],
    fontScale: 1,
    data: coverData,
  };
}

function cvPayload(template: (typeof FRESH)[number]) {
  return {
    version: 2,
    data: {
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
      hobbys: ["Volleyball im Verein", "Programmieren kleiner Spiele"],
      staerken: ["Zuverlässig", "Teamfähig"],
      referenzen: [],
      labels: {},
      hidden: {},
    },
    design: {
      template: template.id,
      colors: template.colors,
      bgOpacity: 0.06,
      useElements: false,
    },
    elements: [],
  };
}

async function settle(page: Page, template: string) {
  await page.waitForFunction(
    (expected) => document.documentElement.dataset.dossierTemplate === expected,
    template,
  );
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

const hash = (buffer: Buffer) => createHash("sha256").update(buffer).digest("hex");

test.describe("Fresh dossier templates", () => {
  test.setTimeout(120_000);

  test("all four templates are selectable", async ({ page }) => {
    await page.goto(`${BASE_URL}/titelblatt`, { waitUntil: "domcontentloaded" });

    for (const template of FRESH) {
      await expect(page.getByRole("button", { name: template.name, exact: true })).toBeVisible();
    }

    await expect(page.getByText(/Alle 22 stehen immer zur Wahl/)).toBeVisible();
  });

  test("all four title pages render as distinct full dossiers", async ({ page }) => {
    await page.setViewportSize({ width: 1137, height: 913 });
    const hashes = new Set<string>();

    for (const template of FRESH) {
      await page.goto(`${BASE_URL}/titelblatt`, { waitUntil: "domcontentloaded" });
      await page.evaluate(
        ({ payload }) => {
          localStorage.clear();
          localStorage.setItem("titelblatt:v3", JSON.stringify(payload));
        },
        { payload: coverPayload(template) },
      );
      await page.reload({ waitUntil: "domcontentloaded" });
      await settle(page, template.id);

      const sheet = page.locator('[data-dossier-document="cover"]').first();
      await sheet.waitFor({ state: "visible" });
      const shot = await sheet.screenshot({ animations: "disabled" });
      expect(shot.length, `${template.name} title page should not be blank`).toBeGreaterThan(8_000);
      hashes.add(hash(shot));
    }

    expect(hashes.size).toBe(FRESH.length);
  });

  test("all four CVs render and stay visually paired with their template", async ({ page }) => {
    await page.setViewportSize({ width: 1137, height: 913 });
    const hashes = new Set<string>();

    for (const template of FRESH) {
      await page.goto(`${BASE_URL}/lebenslauf`, { waitUntil: "domcontentloaded" });
      await page.evaluate(
        ({ payload }) => {
          localStorage.clear();
          localStorage.setItem("lebenslauf:v1", JSON.stringify(payload));
          localStorage.setItem("lebenslauf:layout:v1", "classic");
          localStorage.setItem("lebenslauf:layout-mirror:v1", "false");
        },
        { payload: cvPayload(template) },
      );
      await page.reload({ waitUntil: "domcontentloaded" });
      await settle(page, template.id);

      const sheet = page
        .locator('[data-dossier-document="cv"][data-export-mode="false"] [data-cv-page]')
        .first();
      await sheet.waitFor({ state: "visible" });
      const shot = await sheet.screenshot({ animations: "disabled" });
      expect(shot.length, `${template.name} CV should not be blank`).toBeGreaterThan(8_000);
      hashes.add(hash(shot));
    }

    expect(hashes.size).toBe(FRESH.length);
  });
});
