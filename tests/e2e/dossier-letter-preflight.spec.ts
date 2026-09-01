import { expect, test, type Page } from "@playwright/test";
import { stat } from "node:fs/promises";

const BASE_URL = "http://127.0.0.1:4173";
const LETTER_KEY = "anschreiben:v1";

const LONG_FITTING_BODY = [
  "Seit mehreren Jahren interessiere ich mich für Computer, digitale Werkzeuge und die Frage, wie technische Probleme Schritt für Schritt gelöst werden können. Besonders gefällt mir, dass in der Informatik sorgfältiges Denken und kreatives Ausprobieren zusammengehören.",
  "In der Schule übernehme ich Aufgaben zuverlässig und bleibe auch dann dran, wenn eine Lösung nicht sofort funktioniert. Bei Gruppenarbeiten kann ich meine Ideen erklären, höre anderen zu und unterstütze das Team dort, wo Hilfe gebraucht wird.",
  "Während einer Schnupperlehre möchte ich den Berufsalltag genauer kennenlernen und zeigen, dass ich motiviert bin, Neues zu lernen. Ich freue mich darauf, Fragen zu stellen, praktische Aufgaben zu übernehmen und einen realistischen Einblick in Ihr Unternehmen zu erhalten.",
  "Die ausgeschriebene Lehrstelle spricht mich deshalb besonders an. Über die Gelegenheit, mich persönlich vorzustellen und mehr über die Ausbildung in Ihrem Betrieb zu erfahren, würde ich mich sehr freuen.",
].join("\n\n");

const HUGE_BODY = Array.from(
  { length: 55 },
  (_, index) =>
    `Absatz ${index + 1}: Ich interessiere mich sehr für diesen Beruf und möchte meine Motivation, Zuverlässigkeit und Lernbereitschaft mit einem ausführlichen Beispiel aus Schule und Alltag zeigen.`,
).join("\n\n");

function letterPayload(text: string, patch: Record<string, unknown> = {}) {
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
      datum: "02.09.2026",
      betreff: "Bewerbung um eine Lehrstelle als Informatikerin EFZ",
      anrede: "Guten Tag Herr Weber",
      text,
      richTextHtml: "",
      gruss: "Freundliche Grüsse",
      unterschrift: "Lea Müller",
      images: [],
      showBeilagen: true,
      beilagen: ["Lebenslauf", "Zeugnis"],
      ...patch,
    },
    design: {
      template: "brief",
      colors: {
        bg: "#ffffff",
        ink: "#111111",
        primary: "#111111",
        secondary: "#4b5563",
        accent: "#111111",
        cvInk: "#111111",
        cvMuted: "#4b5563",
        cvHeading: "#111111",
      },
      font: "freundlich",
      fontOverride: null,
      headerMode: "compact",
      footerMode: "compact",
    },
  };
}

async function seedDossier(page: Page, letter: ReturnType<typeof letterPayload>) {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ letterValue, letterKey }) => {
      localStorage.clear();
      localStorage.setItem(
        "titelblatt:v3",
        JSON.stringify({
          version: 7,
          template: "modern",
          data: {
            vorname: "Lea",
            nachname: "Müller",
            beruf: "Informatikerin EFZ",
            lehrbetrieb: "Beispiel AG",
          },
        }),
      );
      localStorage.setItem(letterKey, JSON.stringify(letterValue));
      localStorage.setItem(
        "lebenslauf:v1",
        JSON.stringify({
          version: 6,
          data: {
            person: {
              vorname: "Lea",
              nachname: "Müller",
              adresse: "Dorfstrasse 12",
              plzOrt: "4535 Hubersdorf",
              telefon: "+41 79 123 45 67",
              email: "lea.mueller@example.ch",
            },
            schule: [
              {
                id: "schule-1",
                zeit: "2023 – heute",
                titel: "Sekundarschule",
                ort: "Solothurn",
                beschreibung: "",
              },
            ],
          },
        }),
      );
    },
    { letterValue: letter, letterKey: LETTER_KEY },
  );
  await page.reload({ waitUntil: "domcontentloaded" });
}

async function openReview(page: Page) {
  const card = page.getByRole("button").filter({ hasText: "Gesamtdossier herunterladen" });
  await expect(card).toBeVisible();
  await card.click();
  const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe("M1 dossier sending truth", () => {
  test.setTimeout(240_000);

  test("missing fields, overflow and fitting content share one safe dossier preflight", async ({
    page,
  }) => {
    await seedDossier(page, letterPayload(LONG_FITTING_BODY, { betreff: "" }));

    let dialog = await openReview(page);
    const readiness = dialog.locator("[data-dossier-letter-readiness]");
    await expect(readiness).toContainText("noch nicht versandbereit");
    await expect(readiness).toContainText("Betreff");
    let downloadButton = dialog.getByRole("button", {
      name: "Dossier herunterladen",
      exact: true,
    });
    await expect(downloadButton).toBeDisabled();
    await dialog.getByRole("button", { name: "Zurück zum Bearbeiten" }).click();

    await page.evaluate(
      ({ hugeBody, letterKey }) => {
        const saved = JSON.parse(localStorage.getItem(letterKey) ?? "{}");
        saved.data.betreff = "Bewerbung um eine Lehrstelle als Informatikerin EFZ";
        saved.data.text = hugeBody;
        saved.data.richTextHtml = "";
        localStorage.setItem(letterKey, JSON.stringify(saved));
      },
      { hugeBody: HUGE_BODY, letterKey: LETTER_KEY },
    );
    await page.reload({ waitUntil: "domcontentloaded" });

    dialog = await openReview(page);
    const overflow = dialog.locator("[data-dossier-letter-overflow]");
    await expect(overflow).toContainText("Motivationsschreiben ist zu lang", { timeout: 15_000 });
    await expect(overflow).toContainText("abgeschnittenes Dossier-PDF wird nicht erstellt");
    downloadButton = dialog.getByRole("button", { name: "Dossier herunterladen", exact: true });
    await expect(downloadButton).toBeDisabled();

    // Defense in depth: selbst wenn jemand das disabled-Attribut im DOM entfernt,
    // muss der PDF-Layer denselben Overflow erneut erkennen und den Export ablehnen.
    await downloadButton.evaluate((button) => {
      (button as HTMLButtonElement).disabled = false;
    });
    await downloadButton.click();
    await expect(page.locator("main [role='status']")).toContainText(
      "Motivationsschreiben passt nicht auf eine Seite",
      { timeout: 15_000 },
    );
    await dialog.getByRole("button", { name: "Zurück zum Bearbeiten" }).click();

    await page.evaluate(
      ({ fittingBody, letterKey }) => {
        const saved = JSON.parse(localStorage.getItem(letterKey) ?? "{}");
        saved.data.text = fittingBody;
        saved.data.richTextHtml = "";
        localStorage.setItem(letterKey, JSON.stringify(saved));
      },
      { fittingBody: LONG_FITTING_BODY, letterKey: LETTER_KEY },
    );
    await page.reload({ waitUntil: "domcontentloaded" });

    dialog = await openReview(page);
    await expect(dialog.locator("[data-dossier-letter-overflow]")).toHaveCount(0);
    downloadButton = dialog.getByRole("button", { name: "Dossier herunterladen", exact: true });
    await expect(downloadButton).toBeEnabled({ timeout: 15_000 });

    const [download] = await Promise.all([page.waitForEvent("download"), downloadButton.click()]);
    const path = await download.path();
    expect(path).not.toBeNull();
    expect((await stat(path ?? "")).size).toBeGreaterThan(10_000);
  });
});
