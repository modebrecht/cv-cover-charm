import { expect, test, type Page } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:4173";

const coverSnapshot = {
  version: 8,
  template: "modern",
  data: {
    vorname: "Lea",
    nachname: "Müller",
    beruf: "Informatikerin EFZ",
    foto: null,
  },
};

const cvSnapshot = {
  version: 6,
  data: {
    person: {
      vorname: "Lea",
      nachname: "Müller",
      adresse: "Dorfstrasse 12",
      plzOrt: "4535 Hubersdorf",
      telefon: "+41 79 123 45 67",
      email: "lea@example.ch",
      geburtsdatum: "",
      nationalitaet: "",
      untertitel: "Schülerin",
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
    colors: { primary: "#123456", accent: "#abcdef" },
    font: "freundlich",
    bgOpacity: 0.25,
    useElements: false,
  },
  elements: [],
};

const letterSnapshot = {
  version: 1,
  data: {
    absenderName: "Lea Müller",
    absenderAdresse: "Dorfstrasse 12",
    absenderPlzOrt: "4535 Hubersdorf",
    absenderTelefon: "+41 79 123 45 67",
    absenderEmail: "lea@example.ch",
    empfaengerFirma: "State Integrity AG",
    empfaengerName: "Frau Test",
    empfaengerAdresse: "Prüfweg 1",
    empfaengerPlzOrt: "4500 Solothurn",
    ort: "Hubersdorf",
    datum: "02.09.2026",
    betreff: "M7 unverwechselbarer Betreff",
    anrede: "Guten Tag Frau Test",
    text: "Dieser einzigartige Brieftext muss einen Vorlagenwechsel unverändert überstehen.",
    richTextHtml: "",
    gruss: "Freundliche Grüsse",
    unterschrift: "Lea Müller",
    images: [],
    showBeilagen: true,
    beilagen: ["Lebenslauf"],
  },
  design: {
    template: "brief",
    colors: {
      bg: "#ffffff",
      ink: "#172033",
      primary: "#24364b",
      secondary: "#dbeafe",
      accent: "#2563eb",
      cvInk: "#172033",
      cvMuted: "#526072",
      cvHeading: "#172033",
    },
    font: "freundlich",
    fontOverride: null,
    senderAlign: "left",
    recipientAlign: "left",
    dateAlign: "left",
    ruleAfterSender: false,
    ruleAfterRecipient: false,
    ruleAfterSubject: false,
    headerMode: "compact",
    headerShowName: true,
    headerShowAddress: true,
    headerShowPhone: true,
    headerShowEmail: true,
    footerMode: "compact",
  },
};

async function seedDossier(page: Page) {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ cover, letter, cv }) => {
      localStorage.clear();
      localStorage.setItem("titelblatt:v3", JSON.stringify(cover));
      localStorage.setItem("anschreiben:v1", JSON.stringify(letter));
      localStorage.setItem("lebenslauf:v1", JSON.stringify(cv));
    },
    { cover: coverSnapshot, letter: letterSnapshot, cv: cvSnapshot },
  );
}

async function openLetter(page: Page) {
  await page.goto(`${BASE_URL}/anschreiben`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Download", exact: true })).toHaveAttribute(
    "data-editor-ready",
    "true",
  );
}

test.describe("M7 dossier state isolation", () => {
  test("resetting the letter does not modify title page or CV storage", async ({ page }) => {
    await seedDossier(page);
    const siblingsBefore = await page.evaluate(() => ({
      cover: localStorage.getItem("titelblatt:v3"),
      cv: localStorage.getItem("lebenslauf:v1"),
    }));

    await openLetter(page);
    await page.getByRole("button", { name: "Download", exact: true }).click();
    const menu = page.locator("[data-editor-action-menu]");
    await menu.getByRole("button", { name: /Motivationsschreiben zurücksetzen/ }).click();
    await expect(
      menu.getByText("Motivationsschreiben wirklich zurücksetzen?", { exact: true }),
    ).toBeVisible();
    await menu.getByRole("button", { name: "Ja", exact: true }).click();

    await expect
      .poll(() =>
        page.evaluate(() => {
          const raw = localStorage.getItem("anschreiben:v1");
          return raw ? JSON.parse(raw)?.data?.betreff : null;
        }),
      )
      .toBe("");

    const siblingsAfter = await page.evaluate(() => ({
      cover: localStorage.getItem("titelblatt:v3"),
      cv: localStorage.getItem("lebenslauf:v1"),
    }));
    expect(siblingsAfter).toEqual(siblingsBefore);
  });

  test("switching letter template changes design only and preserves user data", async ({ page }) => {
    await seedDossier(page);
    await openLetter(page);

    const before = await page.evaluate(() => {
      const raw = localStorage.getItem("anschreiben:v1");
      return raw ? JSON.parse(raw)?.data : null;
    });
    expect(before?.betreff).toBe("M7 unverwechselbarer Betreff");

    const header = page.getByRole("button", { name: /^Vorlage/ });
    if ((await header.getAttribute("aria-expanded")) !== "true") await header.click();
    const panelId = await header.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    const panel = page.locator(`[id="${panelId}"]`);
    await panel.getByRole("button", { name: "Edge", exact: true }).click();

    await expect
      .poll(() =>
        page.evaluate(() => {
          const raw = localStorage.getItem("anschreiben:v1");
          return raw ? JSON.parse(raw)?.design?.template : null;
        }),
      )
      .toBe("edge");

    const after = await page.evaluate(() => {
      const raw = localStorage.getItem("anschreiben:v1");
      return raw ? JSON.parse(raw)?.data : null;
    });
    expect(after).toEqual(before);
  });
});
