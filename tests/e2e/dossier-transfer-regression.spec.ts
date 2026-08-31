import { expect, test, type Page } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:4173";
const PHOTO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='160'%3E%3Crect width='120' height='160' fill='%2394a3b8'/%3E%3C/svg%3E";

function cvPayload() {
  return {
    version: 6,
    data: {
      person: {
        vorname: "Mia",
        nachname: "Keller",
        adresse: "Dorfweg 7",
        plzOrt: "4535 Hubersdorf",
        telefon: "+41 79 555 44 33",
        email: "mia.keller@example.ch",
        geburtsdatum: "12.04.2010",
        nationalitaet: "Schweiz",
        untertitel: "Schülerin",
        foto: PHOTO,
      },
      schule: [
        {
          id: "school-existing",
          zeit: "2024 – heute",
          titel: "Bestehende Schule bleibt erhalten",
          ort: "Hubersdorf",
          beschreibung: "Bestehender CV-Inhalt",
        },
      ],
      erfahrung: [],
      sprachen: [],
      hobbys: [],
      staerken: [],
      referenzen: [],
      customSections: [],
      labels: {},
      hidden: {},
    },
    design: {
      template: "modern",
      colors: { bg: "#ffffff", primary: "#172554", accent: "#38bdf8" },
      font: "serif",
      bgOpacity: 0.25,
      useElements: false,
    },
    elements: [],
    elementStyles: {},
    coverFingerprint: null,
  };
}

function coverPayload() {
  return {
    version: 8,
    template: "pastell",
    colors: {
      pastell: { bg: "#fff7ed", primary: "#7c2d12", accent: "#fb923c" },
    },
    layout: { pastell: {} },
    customs: [],
    fontScale: 1.15,
    font: "sans",
    data: {
      meta: { title: "", author: "", subject: "", keywords: "" },
      kicker: "Bewerbung um eine Lehrstelle als",
      eyebrow: "Bewerbung",
      beruf: "Informatiker/in EFZ",
      lehrbeginn: "August 2027",
      vorname: "Lea",
      nachname: "Müller",
      adresse: "Titelweg 4",
      plzOrt: "4500 Solothurn",
      telefon: "+41 79 111 22 33",
      email: "lea.mueller@example.ch",
      geburtsdatum: "14.03.2010",
      lehrbetrieb: "Beispiel AG",
      ansprechperson: "Frau Anna Muster",
      betriebAdresse: "Industriestrasse 8, 4500 Solothurn",
      showBetriebOnCover: true,
      showBeilagenOnCover: true,
      beilagen: ["Motivationsschreiben", "Lebenslauf", "Zeugnisse"],
      ort: "Hubersdorf",
      datum: "31.08.2026",
      labelKontakt: "",
      labelEmpfaenger: "",
      foto: null,
    },
  };
}

async function openSection(page: Page, name: RegExp) {
  const header = page.getByRole("button", { name });
  if ((await header.getAttribute("aria-expanded")) !== "true") await header.click();
  const panelId = await header.getAttribute("aria-controls");
  if (!panelId) throw new Error(`Section ${name} has no aria-controls`);
  return page.locator(`[id="${panelId}"]`);
}

test.describe("M7 dossier transfer regression", () => {
  test("Titelblatt can reuse personal details from the Lebenslauf", async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await page.evaluate((cv) => {
      localStorage.clear();
      localStorage.setItem("lebenslauf:v1", JSON.stringify(cv));
    }, cvPayload());

    await page.goto(`${BASE_URL}/titelblatt`, { waitUntil: "domcontentloaded" });
    const person = await openSection(page, /^Persönliche Angaben/);
    await expect(person.getByText("Quelle: Lebenslauf", { exact: true })).toBeVisible();
    await person.getByRole("button", { name: "Übernehmen", exact: true }).click();

    await expect(person.getByLabel("Vorname", { exact: true })).toHaveValue("Mia");
    await expect(person.getByLabel("Nachname", { exact: true })).toHaveValue("Keller");
    await expect(person.getByLabel("Adresse", { exact: true })).toHaveValue("Dorfweg 7");
    await expect(person.getByLabel("PLZ / Ort", { exact: true })).toHaveValue("4535 Hubersdorf");
    await expect(person.getByLabel("E-Mail", { exact: true })).toHaveValue(
      "mia.keller@example.ch",
    );

    await expect
      .poll(() =>
        page.evaluate(() => {
          const saved = JSON.parse(localStorage.getItem("titelblatt:v3") ?? "{}");
          return {
            vorname: saved.data?.vorname,
            nachname: saved.data?.nachname,
            geburtsdatum: saved.data?.geburtsdatum,
            hasPhoto: typeof saved.data?.foto === "string" && saved.data.foto.startsWith("data:"),
          };
        }),
      )
      .toEqual({
        vorname: "Mia",
        nachname: "Keller",
        geburtsdatum: "12.04.2010",
        hasPhoto: true,
      });
  });

  test("Lebenslauf uses one dossier takeover and preserves CV-only content", async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await page.evaluate(
      ({ cover, cv }) => {
        localStorage.clear();
        localStorage.setItem("titelblatt:v3", JSON.stringify(cover));
        localStorage.setItem("lebenslauf:v1", JSON.stringify(cv));
      },
      { cover: coverPayload(), cv: cvPayload() },
    );

    await page.goto(`${BASE_URL}/lebenslauf`, { waitUntil: "domcontentloaded" });
    const takeover = await openSection(page, /^Vom Dossier übernehmen/);
    await expect(
      takeover.getByRole("button", { name: "Alles übernehmen", exact: true }),
    ).toBeVisible();
    await expect(takeover.getByText("Auswahl anpassen", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Angaben vom Titelblatt holen" })).toHaveCount(0);

    await takeover.getByRole("button", { name: "Alles übernehmen", exact: true }).click();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const saved = JSON.parse(localStorage.getItem("lebenslauf:v1") ?? "{}");
          return {
            template: saved.design?.template,
            font: saved.design?.font,
            vorname: saved.data?.person?.vorname,
            school: saved.data?.schule?.[0]?.titel,
          };
        }),
      )
      .toEqual({
        template: "pastell",
        font: "sans",
        vorname: "Lea",
        school: "Bestehende Schule bleibt erhalten",
      });
  });

  test("Motivationsschreiben falls back to CV data and keeps its own brief text", async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await page.evaluate((cv) => {
      localStorage.clear();
      localStorage.setItem("lebenslauf:v1", JSON.stringify(cv));
      localStorage.setItem(
        "anschreiben:v1",
        JSON.stringify({
          version: 1,
          data: {
            absenderName: "Alter Name",
            text: "Mein eigener Brieftext bleibt erhalten.",
            anrede: "Guten Tag",
            gruss: "Freundliche Grüsse",
          },
          design: {
            template: "brief",
            colors: { bg: "#ffffff", primary: "#111111", accent: "#111111" },
            font: "sans",
          },
        }),
      );
    }, cvPayload());

    await page.goto(`${BASE_URL}/anschreiben`, { waitUntil: "domcontentloaded" });
    const takeover = await openSection(page, /^Vom Dossier übernehmen/);
    await expect(
      takeover.getByText("Persönliche Angaben: Lebenslauf", { exact: true }),
    ).toBeVisible();
    await expect(
      takeover.getByText("Betrieb und Bewerbung: noch nicht verfügbar", { exact: true }),
    ).toBeVisible();
    await expect(takeover.getByText("Design: Lebenslauf", { exact: true })).toBeVisible();

    const body = page.getByLabel("Brieftext");
    await expect(body).toHaveText("Mein eigener Brieftext bleibt erhalten.");
    await takeover.getByRole("button", { name: "Alles übernehmen", exact: true }).click();

    await expect(page.getByLabel("Vorname und Nachname")).toHaveValue("Mia Keller");
    await expect(body).toHaveText("Mein eigener Brieftext bleibt erhalten.");
    await expect(page.getByLabel("Vorschau Motivationsschreiben")).toHaveAttribute(
      "data-letter-template",
      "modern",
    );
    await expect
      .poll(() =>
        page.evaluate(() => {
          const saved = JSON.parse(localStorage.getItem("anschreiben:v1") ?? "{}");
          return {
            name: saved.data?.absenderName,
            text: saved.data?.text,
            template: saved.design?.template,
            font: saved.design?.font,
          };
        }),
      )
      .toEqual({
        name: "Mia Keller",
        text: "Mein eigener Brieftext bleibt erhalten.",
        template: "modern",
        font: "serif",
      });
  });
});
