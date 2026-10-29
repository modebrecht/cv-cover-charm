import { expect, test } from "@playwright/test";
import { expectUnreviewedDocxBlocked } from "./support/native-docx-fixture";
import { FRESH_TEMPLATE_REGISTRY } from "../../src/components/cover/fresh-template-registry";

const BASE_URL = "http://127.0.0.1:4173";

const CASES = FRESH_TEMPLATE_REGISTRY.map(({ id, name, slots }) => ({
  id,
  label: name,
  colors: Object.fromEntries(slots.map(({ key, default: value }) => [key, value])),
}));

async function seedCompleteDossier(page: import("@playwright/test").Page) {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem(
      "titelblatt:v3",
      JSON.stringify({
        version: 3,
        template: "modern",
        data: {
          vorname: "Lea",
          nachname: "Müller",
          beruf: "Informatikerin EFZ",
          lehrbeginn: "August 2027",
          adresse: "Dorfstrasse 12",
          plzOrt: "4535 Hubersdorf",
          telefon: "+41 79 123 45 67",
          email: "lea@example.ch",
          lehrbetrieb: "Beispiel AG",
          ansprechperson: "Herr Thomas Weber",
          betriebAdresse: "Industriestrasse 8",
          ort: "Hubersdorf",
          datum: "15.11.2026",
          showBeilagenOnCover: true,
          beilagen: ["Motivationsschreiben", "Lebenslauf", "Zeugnis"],
        },
        colors: {},
      }),
    );
    localStorage.setItem(
      "anschreiben:v1",
      JSON.stringify({
        version: 1,
        data: {
          absenderName: "Lea Müller",
          absenderAdresse: "Dorfstrasse 12",
          absenderPlzOrt: "4535 Hubersdorf",
          absenderTelefon: "+41 79 123 45 67",
          absenderEmail: "lea@example.ch",
          empfaengerFirma: "Beispiel AG",
          empfaengerName: "Herr Thomas Weber",
          empfaengerAdresse: "Industriestrasse 8",
          empfaengerPlzOrt: "4535 Hubersdorf",
          ort: "Hubersdorf",
          datum: "15.11.2026",
          betreff: "Bewerbung um eine Lehrstelle als Informatikerin EFZ",
          anrede: "Guten Tag Herr Weber",
          text: "Die Informatik begeistert mich.\n\nIch freue mich auf Ihre Rückmeldung.",
          gruss: "Freundliche Grüsse",
          unterschrift: "Lea Müller",
          showBeilagen: true,
          beilagen: ["Lebenslauf", "Zeugnis"],
        },
        design: { template: "modern", font: "freundlich", colors: {} },
      }),
    );
    localStorage.setItem(
      "lebenslauf:v1",
      JSON.stringify({
        version: 6,
        data: {
          titel: "Lebenslauf",
          person: {
            vorname: "Lea",
            nachname: "Müller",
            adresse: "Dorfstrasse 12",
            plzOrt: "4535 Hubersdorf",
            telefon: "+41 79 123 45 67",
            email: "lea@example.ch",
            geburtsdatum: "14.03.2010",
            nationalitaet: "Schweiz",
            untertitel: "Schülerin, 3. Sek B",
            foto: null,
          },
          schule: [
            {
              id: "schule-1",
              zeit: "2023 – heute",
              titel: "Sekundarschule",
              ort: "Hubersdorf",
              beschreibung: "Sek B",
            },
          ],
          erfahrung: [],
          sprachen: [{ id: "sprache-1", name: "Deutsch", niveau: "Muttersprache" }],
          hobbys: ["Programmieren"],
          staerken: ["Zuverlässig"],
          referenzen: [],
          labels: {},
          hidden: {},
        },
        design: { template: "modern", colors: {}, bgOpacity: 0.25, useElements: false },
      }),
    );
  });
}

test("every Fresh template keeps the unreviewed Word profile blocked", async ({ page }) => {
  // Exercise the actual Word gate and PDF/JSON alternatives for all 21 Fresh
  // templates. Serial reloads need more than the default 30 seconds in CI.
  test.setTimeout(90_000);

  await seedCompleteDossier(page);

  expect(CASES).toHaveLength(21);

  for (const item of CASES) {
    await page.evaluate(({ id, colors }) => {
      const cover = JSON.parse(localStorage.getItem("titelblatt:v3") ?? "null");
      const letter = JSON.parse(localStorage.getItem("anschreiben:v1") ?? "null");
      const cv = JSON.parse(localStorage.getItem("lebenslauf:v1") ?? "null");
      cover.template = id;
      cover.colors = colors;
      letter.design.template = id;
      letter.design.colors = colors;
      cv.design.template = id;
      cv.design.colors = colors;
      localStorage.setItem("titelblatt:v3", JSON.stringify(cover));
      localStorage.setItem("anschreiben:v1", JSON.stringify(letter));
      localStorage.setItem("lebenslauf:v1", JSON.stringify(cv));
    }, item);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    const exportCard = page.getByRole("button", { name: /Gesamtdossier herunterladen/ });
    await expect(exportCard).toBeEnabled();
    await exportCard.click();

    await expectUnreviewedDocxBlocked(page);
  }
});
