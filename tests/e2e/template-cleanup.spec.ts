import { expect, test, type Page } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:4173";

function cvPayload(template: "blockig" | "colorful") {
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
        email: "lea@example.ch",
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
      sprachen: [{ id: "de", name: "Deutsch", niveau: "Muttersprache" }],
      hobbys: ["Volleyball", "Programmieren"],
      staerken: ["Zuverlässig"],
      referenzen: [],
      labels: {},
      hidden: {},
    },
    design: {
      template,
      colors: {
        bg: "#f4f4f2",
        primary: "#1f2937",
        accent: "#f97316",
        ink: "#111111",
      },
      bgOpacity: 0.06,
      useElements: false,
    },
    elements: [],
  };
}

async function seedCv(page: Page, template: "blockig" | "colorful") {
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
  await page
    .locator('[data-dossier-document="cv"][data-export-mode="false"] [data-cv-page]')
    .first()
    .waitFor({ state: "visible" });
  await page.waitForFunction(() => document.documentElement.dataset.cvVariant !== undefined);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

test.describe("template cleanup", () => {
  test("Colorful is retired and old drafts migrate to Blockig", async ({ page }) => {
    await seedCv(page, "colorful");

    await expect(page.getByRole("button", { name: "Colorful", exact: true })).toHaveCount(0);
    await expect(page.getByText(/Alle 30 stehen immer zur Wahl/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Blockig", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("Blockig CV left rail is grey to the bottom with orange on top", async ({ page }) => {
    await seedCv(page, "blockig");

    const geometry = await page
      .locator('[data-dossier-document="cv"][data-export-mode="false"] [data-cv-page]')
      .first()
      .evaluate((pageEl) => {
        const pageRect = pageEl.getBoundingClientRect();
        const motif = pageEl.querySelector<HTMLElement>('[data-cv-background="motif"]');
        const root = motif?.firstElementChild as HTMLElement | null;
        const grey = root?.children[0] as HTMLElement | undefined;
        const orange = root?.children[1] as HTMLElement | undefined;
        if (!root || !grey || !orange) return null;
        const greyRect = grey.getBoundingClientRect();
        const orangeRect = orange.getBoundingClientRect();
        return {
          pageWidth: pageRect.width,
          pageHeight: pageRect.height,
          greyWidth: greyRect.width,
          greyHeight: greyRect.height,
          greyBottom: greyRect.bottom,
          pageBottom: pageRect.bottom,
          orangeWidth: orangeRect.width,
          greyColor: getComputedStyle(grey).backgroundColor,
          orangeColor: getComputedStyle(orange).backgroundColor,
        };
      });

    expect(geometry).not.toBeNull();
    if (!geometry) return;

    expect(geometry.greyWidth / geometry.pageWidth).toBeCloseTo(66 / 210, 2);
    expect(geometry.orangeWidth / geometry.pageWidth).toBeCloseTo(66 / 210, 2);
    expect(geometry.greyHeight / geometry.pageHeight).toBeCloseTo(1, 2);
    expect(Math.abs(geometry.greyBottom - geometry.pageBottom)).toBeLessThanOrEqual(2);
    expect(geometry.greyColor).toBe("rgb(31, 41, 55)");
    expect(geometry.orangeColor).toBe("rgb(249, 115, 22)");
  });
});
