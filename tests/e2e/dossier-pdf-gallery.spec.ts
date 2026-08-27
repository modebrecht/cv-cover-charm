import { expect, test, type Page } from "@playwright/test";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const BASE_URL = "http://127.0.0.1:4173";
const OUT_DIR = process.env.DOSSIER_GALLERY_DIR ?? "artifacts/dossier-pdf-gallery";

const DESIGN_TEMPLATES = [
  "klassisch",
  "modern",
  "freundlich",
  "edel",
  "colorful",
  "blockig",
  "edelBlockig",
  "serioes",
  "human",
  "sonnig",
  "welle",
  "terracotta",
  "pastell",
  "sonne",
  "studio",
  "neon",
  "aurora",
  "verlauf",
  "citrus",
] as const;

const CV_LAYOUTS = ["classic", "modern", "minimal", "timeline", "editorial"] as const;

const COLORS = {
  bg: "#fffaf5",
  primary: "#24364b",
  secondary: "#d6a47d",
  tertiary: "#f5c2c7",
  accent: "#c9895d",
  ink: "#1f2937",
  cvInk: "#1f2937",
  cvMuted: "#6b7280",
  cvHeading: "#24364b",
};

function coverPayload(template: string) {
  return {
    version: 8,
    template,
    colors: { [template]: COLORS },
    layout: { [template]: {} },
    customs: [],
    fontScale: 1,
    font: "sans",
    data: {
      meta: { title: "", author: "", subject: "", keywords: "" },
      kicker: "Bewerbung um eine Lehrstelle als",
      eyebrow: "Bewerbung",
      beruf: "Informatiker/in EFZ",
      lehrbeginn: "Lehrbeginn August 2027",
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
      datum: "15.11.2026",
      labelKontakt: "",
      labelEmpfaenger: "",
      foto: null,
    },
  };
}

function letterPayload(template: string) {
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
      datum: "15.11.2026",
      betreff: "Bewerbung um eine Lehrstelle als Informatiker/in EFZ",
      anrede: "Guten Tag Herr Weber",
      text: "Die Informatik begeistert mich, weil ich gerne logisch denke, Probleme löse und Neues ausprobiere. Deshalb bewerbe ich mich mit grossem Interesse um die Lehrstelle als Informatikerin EFZ bei der Beispiel AG.\n\nIn der Schule arbeite ich besonders gerne an Aufgaben, bei denen ich selbstständig Lösungen entwickeln kann. Ich bin zuverlässig, lerne schnell und arbeite gerne im Team.\n\nGerne möchte ich Ihr Unternehmen und den Beruf bei einem persönlichen Gespräch oder einer Schnupperlehre näher kennenlernen. Ich freue mich über Ihre Rückmeldung.",
      richTextHtml: "",
      gruss: "Freundliche Grüsse",
      unterschrift: "Lea Müller",
      showBeilagen: true,
      beilagen: ["Lebenslauf", "Zeugnis"],
    },
    design: {
      template,
      colors: COLORS,
      font: "sans",
      senderAlign: "left",
      recipientAlign: "left",
      dateAlign: "left",
      ruleAfterSender: false,
      ruleAfterRecipient: false,
      ruleAfterSubject: false,
    },
  };
}

function cvPayload(template: string) {
  return {
    version: 6,
    data: {
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
      titel: "Lebenslauf",
      schule: [
        {
          id: "schule-1",
          zeit: "2024 – heute",
          titel: "Sekundarschule",
          ort: "Sekundarschule Beispiel, Solothurn",
          beschreibung: "3. Sekundarklasse",
        },
      ],
      erfahrung: [
        {
          id: "praxis-1",
          zeit: "Oktober 2026",
          titel: "Schnupperlehre Informatik",
          ort: "Beispiel AG, Solothurn",
          beschreibung: "Einblick in Support, Programmierung und Teamarbeit.",
        },
      ],
      sprachen: [
        { id: "de", name: "Deutsch", niveau: "Muttersprache" },
        { id: "en", name: "Englisch", niveau: "B1" },
      ],
      hobbys: ["Volleyball", "Programmieren", "Fotografie"],
      staerken: ["Zuverlässig", "Teamfähig", "Lernbereit"],
      referenzen: [
        {
          id: "ref-1",
          name: "Herr Thomas Weber",
          funktion: "Klassenlehrer",
          kontakt: "+41 32 123 45 67",
        },
      ],
      customSections: [],
      labels: {},
      hidden: {},
      sectionLayouts: {},
    },
    design: {
      template,
      colors: COLORS,
      font: "sans",
      bgOpacity: 0.25,
      useElements: false,
      headingRule: "short",
      titleScale: 1,
      headingScale: 1,
      bodyScale: 1,
      sidebarPct: 0.3,
    },
    elements: [],
    elementStyles: {},
    coverFingerprint: null,
  };
}

async function seedDossier(
  page: Page,
  designTemplate: string,
  letterTemplate: string,
  cvLayout: string,
) {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ cover, letter, cv, layout }) => {
      localStorage.clear();
      localStorage.setItem("titelblatt:v3", JSON.stringify(cover));
      localStorage.setItem("anschreiben:v1", JSON.stringify(letter));
      localStorage.setItem("lebenslauf:v1", JSON.stringify(cv));
      localStorage.setItem("lebenslauf:layout:v1", layout);
      localStorage.setItem("lebenslauf:layout-mirror:v1", "false");
      localStorage.setItem(
        "lebenslauf:placement:v1",
        JSON.stringify({
          kontakt: "side",
          schule: "main",
          erfahrung: "main",
          sprachen: "side",
          hobbys: "side",
          staerken: "side",
          referenzen: "main",
        }),
      );
    },
    {
      cover: coverPayload(designTemplate),
      letter: letterPayload(letterTemplate),
      cv: cvPayload(designTemplate),
      layout: cvLayout,
    },
  );
  await page.reload({ waitUntil: "domcontentloaded" });
}

async function saveCombinedPdf(page: Page, fileName: string) {
  const card = page.getByRole("button").filter({ hasText: "Gesamtdossier herunterladen" });
  await expect(card).toBeVisible();
  await card.click();

  const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
  const button = dialog.getByRole("button", { name: "Dossier herunterladen", exact: true });
  await expect(button).toBeEnabled({ timeout: 15_000 });

  const [download] = await Promise.all([page.waitForEvent("download"), button.click()]);
  const path = await download.path();
  expect(path).not.toBeNull();
  expect((await stat(path ?? "")).size).toBeGreaterThan(15_000);
  const pdfSource = (await readFile(path ?? "")).toString("latin1");
  expect(pdfSource).toContain("Bewerbung um eine Lehrstelle als Informatiker/in EFZ");
  expect(pdfSource).toContain("Guten Tag Herr Weber");

  await download.saveAs(join(OUT_DIR, fileName));
}

test("generate one complete example dossier for every selectable design and CV layout", async ({
  page,
}) => {
  test.setTimeout(900_000);
  await mkdir(OUT_DIR, { recursive: true });

  const manifest: string[] = [
    "Bewerbungsdossier PDF Gallery",
    "",
    "Jede auswählbare Designvorlage ist mindestens einmal als vollständiges Dossier enthalten.",
    "Der klassische Motivationsschreiben-Modus 'Brief' ist separat enthalten.",
    "Alle fünf CV-Layouts sind separat enthalten.",
    "",
  ];

  let number = 1;
  for (const template of DESIGN_TEMPLATES) {
    await seedDossier(page, template, template, "classic");
    const fileName = `${String(number).padStart(2, "0")}-design-${template}.pdf`;
    await saveCombinedPdf(page, fileName);
    manifest.push(`${fileName} — Titelblatt + Motivationsschreiben + CV im Design ${template}`);
    number += 1;
  }

  await seedDossier(page, "modern", "brief", "classic");
  const briefName = `${String(number).padStart(2, "0")}-motivationsschreiben-brief.pdf`;
  await saveCombinedPdf(page, briefName);
  manifest.push(`${briefName} — klassischer weisser Brief im vollständigen Dossier`);
  number += 1;

  for (const layout of CV_LAYOUTS) {
    await seedDossier(page, "modern", "modern", layout);
    const fileName = `${String(number).padStart(2, "0")}-cv-layout-${layout}.pdf`;
    await saveCombinedPdf(page, fileName);
    manifest.push(`${fileName} — vollständiges Dossier mit CV-Layout ${layout}`);
    number += 1;
  }

  await writeFile(join(OUT_DIR, "README.txt"), `${manifest.join("\n")}\n`, "utf-8");
});
