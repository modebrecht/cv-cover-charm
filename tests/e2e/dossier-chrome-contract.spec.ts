import { expect, test } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:4173";
const CHROME_KEY = "bewerbungsdossier:chrome:v1";

const contactOptions = {
  headerMode: "contact",
  headerShowName: true,
  headerShowAddress: true,
  headerShowPhone: true,
  headerShowEmail: true,
  footerMode: "compact",
} as const;

const compactOptions = {
  ...contactOptions,
  headerMode: "compact",
} as const;

const noneOptions = {
  ...contactOptions,
  headerMode: "none",
  footerMode: "none",
} as const;

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
      schule: [],
      erfahrung: [],
      sprachen: [],
      hobbys: [],
      staerken: [],
      referenzen: [],
      labels: {},
      hidden: {},
    },
    design: {
      template: "modern",
      colors: { bg: "#ffffff", primary: "#24364b", accent: "#d6a47d" },
      font: "freundlich",
      bgOpacity: 0.25,
      useElements: false,
    },
    elements: [],
  };
}

function letterPayload(staleChrome?: unknown) {
  return {
    version: 1,
    data: {
      absenderName: "Lea Müller",
      absenderAdresse: "Dorfstrasse 12",
      absenderPlzOrt: "4535 Hubersdorf",
      absenderTelefon: "+41 79 123 45 67",
      absenderEmail: "lea.mueller@example.ch",
      empfaengerFirma: "Beispiel AG",
      empfaengerName: "Herr Thomas Weber",
      empfaengerAdresse: "Industriestrasse 8",
      empfaengerPlzOrt: "4500 Solothurn",
      ort: "Hubersdorf",
      datum: "25.08.2026",
      betreff: "Bewerbung um eine Lehrstelle",
      anrede: "Guten Tag Herr Weber",
      text: "Ich bewerbe mich um die Lehrstelle.",
      gruss: "Freundliche Grüsse",
      unterschrift: "Lea Müller",
    },
    design: {
      template: "modern",
      colors: { bg: "#ffffff", primary: "#24364b", accent: "#d6a47d" },
      font: "freundlich",
      headerMode: "contact",
      headerShowName: true,
      headerShowAddress: true,
      headerShowPhone: true,
      headerShowEmail: true,
      footerMode: "compact",
    },
    ...(staleChrome ? { chrome: staleChrome } : {}),
  };
}

test.describe("shared CV / motivation-letter chrome contract", () => {
  test("CV exposes the shared controls and integrated contact data is rendered only once", async ({
    page,
  }) => {
    await page.addInitScript(
      ({ cv, chromeKey, compact }) => {
        localStorage.clear();
        localStorage.setItem("lebenslauf:v1", JSON.stringify(cv));
        localStorage.setItem(
          chromeKey,
          JSON.stringify({
            version: 1,
            sync: true,
            shared: compact,
            cv: compact,
            letter: compact,
          }),
        );
      },
      { cv: cvPayload(), chromeKey: CHROME_KEY, compact: compactOptions },
    );

    await page.goto(`${BASE_URL}/lebenslauf`, { waitUntil: "domcontentloaded" });

    const controls = page.locator('[data-dossier-chrome-controls="cv"]');
    await expect(controls).toBeVisible();
    await expect(controls.locator('[data-dossier-chrome-sync]')).toBeChecked();

    const headerSelect = controls.locator('[data-cv-header-mode-control]');
    await expect(headerSelect).toHaveValue("compact");
    await headerSelect.selectOption("contact");

    const preview = page.locator('[data-dossier-document="cv"][data-export-mode="false"]').first();
    const firstPage = preview.locator("[data-cv-page]").first();
    const integrated = firstPage.locator('[data-dossier-integrated-contact]');
    await expect(integrated).toContainText("Lea Müller");
    await expect(integrated).toContainText("Dorfstrasse 12");
    await expect(integrated).toContainText("+41 79 123 45 67");
    await expect(integrated).toContainText("lea.mueller@example.ch");

    const bodyText = await firstPage.locator("[data-cv-main]").innerText();
    expect(bodyText).not.toContain("Lea Müller");
    expect(bodyText).not.toContain("Dorfstrasse 12");
    expect(bodyText).not.toContain("+41 79 123 45 67");
    expect(bodyText).not.toContain("lea.mueller@example.ch");
    expect(bodyText).toContain("14.03.2010");
    expect(bodyText).toContain("Schweiz");

    await expect
      .poll(() =>
        page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null")?.shared?.headerMode, CHROME_KEY),
      )
      .toBe("contact");
  });

  test("canonical dossier chrome wins over a stale chrome copy embedded in the letter", async ({
    page,
  }) => {
    const canonical = {
      version: 1,
      sync: true,
      shared: noneOptions,
      cv: noneOptions,
      letter: noneOptions,
    };
    const stale = {
      version: 1,
      sync: true,
      shared: contactOptions,
      cv: contactOptions,
      letter: contactOptions,
    };

    await page.addInitScript(
      ({ chromeKey, canonicalState, letter }) => {
        localStorage.clear();
        localStorage.setItem(chromeKey, JSON.stringify(canonicalState));
        localStorage.setItem("anschreiben:v1", JSON.stringify(letter));
      },
      { chromeKey: CHROME_KEY, canonicalState: canonical, letter: letterPayload(stale) },
    );

    await page.goto(`${BASE_URL}/anschreiben`, { waitUntil: "domcontentloaded" });

    await expect
      .poll(() =>
        page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null")?.shared?.headerMode, CHROME_KEY),
      )
      .toBe("none");

    const letterChrome = page.locator('[data-dossier-document="letter"] [data-dossier-chrome="letter"]').first();
    await expect(letterChrome).toHaveAttribute("data-dossier-header-mode", "none");
    await expect(letterChrome).toHaveAttribute("data-dossier-footer-mode", "none");
  });
});
