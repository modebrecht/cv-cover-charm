import { expect, test, type Page } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:4173";

const FAMILY_CASES = [
  { family: "editorial", template: "klassisch", expected: "Georgia" },
  { family: "executive", template: "pastell", expected: "Palatino" },
  { family: "modern", template: "modern", expected: "Helvetica" },
  { family: "classic", template: "serioes", expected: "Helvetica" },
  { family: "executive Fresh", template: "frame", expected: "Palatino" },
  { family: "executive Fresh", template: "forestFlow", expected: "Palatino" },
  { family: "editorial Fresh", template: "monoLuxe", expected: "Georgia" },
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

  // The route intentionally paints its empty default once before the first-use
  // title-page takeover runs in an effect. Wait for transferred applicant data
  // so the font assertion observes the settled dossier state, not that transient frame.
  await expect(
    page
      .locator(
        '[data-dossier-document="cv"][data-export-mode="false"] [data-cv-page="0"] [data-cv-name]',
      )
      .first(),
  ).toContainText("Lea Müller");

  const cv = await computedFont(
    page,
    '[data-dossier-document="cv"][data-export-mode="false"] [data-cv-page="0"] [data-cv-main]',
  );

  return { cover, letter, cv };
}

async function coverTextStyle(page: Page, blockId: string) {
  const node = page.locator(`[data-dossier-document="cover"] [data-block-id="${blockId}"] > div`).first();
  await expect(node).toBeVisible();
  return node.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      fontFamily: style.fontFamily,
      fontStyle: style.fontStyle,
      fontWeight: style.fontWeight,
      textTransform: style.textTransform,
      letterSpacing: style.letterSpacing,
    };
  });
}

test.describe("dossier typography regression", () => {
  test.setTimeout(120_000);

  for (const item of FAMILY_CASES) {
    test(`${item.family} ${item.template}: cover, motivation letter and CV use one family font`, async ({
      page,
    }) => {
      const fonts = await dossierFonts(page, item.template);
      expect(fonts.cover).toBe(fonts.letter);
      expect(fonts.letter).toBe(fonts.cv);
      expect(fonts.cover).toContain(item.expected);
    });
  }

  test("02 Editorial renders as one restrained serif hierarchy", async ({ page }) => {
    await seedCover(page, "klassisch");
    await page.goto(`${BASE_URL}/titelblatt`, { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-dossier-document="cover"]').first()).toBeVisible();

    const ids = [
      "eyebrow",
      "ortDatum",
      "kicker",
      "beruf",
      "name",
      "lehrbeginn",
      "kontaktTitel",
      "kontakt",
      "beilagenTitel",
      "beilagen",
    ];
    const styles = Object.fromEntries(
      await Promise.all(ids.map(async (id) => [id, await coverTextStyle(page, id)] as const)),
    );

    expect(new Set(ids.map((id) => styles[id].fontFamily))).toEqual(
      new Set([styles.name.fontFamily]),
    );
    expect(styles.name.fontFamily).toContain("Georgia");

    // One intentional display accent: the profession. Metadata and secondary
    // labels stay roman instead of alternating between several type treatments.
    expect(styles.beruf.fontStyle).toBe("italic");
    expect(styles.ortDatum.fontStyle).toBe("normal");
    expect(styles.lehrbeginn.fontStyle).toBe("normal");
    expect(styles.name.fontStyle).toBe("normal");

    for (const id of ["eyebrow", "kicker", "kontaktTitel", "beilagenTitel"]) {
      expect(styles[id].textTransform).toBe("none");
      expect(Number(styles[id].fontWeight)).toBeGreaterThanOrEqual(600);
    }

    expect(Number(styles.name.fontWeight)).toBeGreaterThanOrEqual(700);
  });

  test("Fresh Executive applicant initials use the resolved Palatino dossier font", async ({ page }) => {
    await seedCover(page, "frame");
    await page.goto(`${BASE_URL}/titelblatt`, { waitUntil: "domcontentloaded" });
    const initials = page.locator(
      '[data-dossier-document="cover"] [data-dossier-photo="applicant"] > div',
    );
    await expect(initials).toBeVisible();
    const font = await initials.evaluate((element) => getComputedStyle(element).fontFamily);
    expect(font).toContain("Palatino");
  });

  test("an explicit title-page font becomes one dossier-wide override", async ({ page }) => {
    const fonts = await dossierFonts(page, "klassisch", "maschine");
    expect(fonts.cover).toBe(fonts.letter);
    expect(fonts.letter).toBe(fonts.cv);
    expect(fonts.cover).toContain("Courier New");
  });
});
