import { expect, test, type Page } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:4173";

const FAMILY_CASES = [
  { family: "editorial", template: "klassisch", expected: "Georgia" },
  { family: "executive", template: "pastell", expected: "Palatino" },
  { family: "modern", template: "modern", expected: "Helvetica" },
  { family: "classic", template: "serioes", expected: "Helvetica" },
] as const;

function coverPayload(template: string, font?: string) {
  return {
    version: 8,
    template,
    colors: {
      [template]: {
        bg: "#f7f3eb",
        ink: "#171717",
        primary: "#24364b",
        secondary: "#c9895d",
        tertiary: "#d8c3aa",
        accent: "#a06f36",
      },
    },
    layout: { [template]: {} },
    customs: [],
    fontScale: 1.2,
    ...(font ? { font } : {}),
    data: {
      meta: { title: "", author: "", subject: "", keywords: "" },
      kicker: "Bewerbung um eine Lehrstelle als",
      eyebrow: "Bewerbung",
      beruf: "Informatiker/in EFZ",
      lehrbeginn: "August 2027",
      vorname: "Lea",
      nachname: "Müller",
      adresse: "Dorfstrasse 12",
      plzOrt: "4535 Hubersdorf",
      telefon: "+41 79 123 45 67",
      email: "lea.mueller@example.ch",
      geburtsdatum: "14.03.2010",
      lehrbetrieb: "Beispiel AG",
      ansprechperson: "Herr Thomas Weber",
      betriebAdresse: "Industriestrasse 8, 4500 Solothurn",
      showBetriebOnCover: false,
      showBeilagenOnCover: true,
      beilagen: ["Motivationsschreiben", "Lebenslauf", "Zeugnis"],
      ort: "Hubersdorf",
      datum: "27.08.2026",
      labelKontakt: "",
      labelEmpfaenger: "",
      foto: null,
    },
  };
}

async function seedCover(page: Page, template: string, font?: string) {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    (cover) => {
      localStorage.clear();
      localStorage.setItem("titelblatt:v3", JSON.stringify(cover));
    },
    coverPayload(template, font),
  );
}

async function computedFont(page: Page, selector: string) {
  const node = page.locator(selector).first();
  await expect(node).toBeVisible();
  return node.evaluate((element) => getComputedStyle(element).fontFamily);
}

async function dossierFonts(page: Page, template: string, font?: string) {
  await seedCover(page, template, font);

  await page.goto(`${BASE_URL}/titelblatt`, { waitUntil: "domcontentloaded" });
  const coverRoot = page.locator('[data-dossier-document="cover"]').first();
  await expect(coverRoot).toBeVisible();
  const cover = await computedFont(
    page,
    '[data-dossier-document="cover"] [data-block-id="kontakt"] > div',
  );

  // No letter is seeded: this deliberately exercises cover -> letter design transfer.
  await page.goto(`${BASE_URL}/anschreiben`, { waitUntil: "domcontentloaded" });
  const letterRoot = page.getByLabel("Vorschau Motivationsschreiben");
  await expect(letterRoot).toBeVisible();
  await expect(letterRoot).toHaveAttribute("data-letter-template", template);
  const letter = await computedFont(page, '[data-letter-page] [data-letter-text-layer]');

  // No CV is seeded either: first visit must inherit the same dossier design from the cover.
  await page.goto(`${BASE_URL}/lebenslauf`, { waitUntil: "domcontentloaded" });
  const cvRoot = page.locator('[data-dossier-document="cv"][data-export-mode="false"]').first();
  await expect(cvRoot).toBeVisible();
  const cv = await computedFont(
    page,
    '[data-dossier-document="cv"][data-export-mode="false"] [data-cv-page="0"] [data-cv-main]',
  );

  return { cover, letter, cv };
}

test.describe("dossier typography regression", () => {
  test.setTimeout(120_000);

  for (const item of FAMILY_CASES) {
    test(`${item.family}: cover, motivation letter and CV use one family font`, async ({ page }) => {
      const fonts = await dossierFonts(page, item.template);
      expect(fonts.cover).toBe(fonts.letter);
      expect(fonts.letter).toBe(fonts.cv);
      expect(fonts.cover).toContain(item.expected);
    });
  }

  test("an explicit title-page font becomes one dossier-wide override", async ({ page }) => {
    const fonts = await dossierFonts(page, "klassisch", "maschine");
    expect(fonts.cover).toBe(fonts.letter);
    expect(fonts.letter).toBe(fonts.cv);
    expect(fonts.cover).toContain("Courier New");
  });
});
