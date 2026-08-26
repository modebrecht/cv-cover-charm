import { expect, test, type Page } from "@playwright/test";
import { readFile, stat } from "node:fs/promises";

const BASE_URL = "http://127.0.0.1:4173";
const FAMILY_IDS = ["classic", "modern", "executive", "editorial"] as const;
const FAMILY_TEMPLATES = {
  classic: "serioes",
  modern: "modern",
  executive: "pastell",
  editorial: "klassisch",
} as const;
const LAYOUT_IDS = ["classic", "modern", "minimal", "timeline", "editorial"] as const;
const PHOTO_SHAPES = ["rect", "square", "portrait", "circle"] as const;

const PHOTO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='320' viewBox='0 0 240 320'%3E%3Crect width='240' height='320' fill='%23dbeafe'/%3E%3Ccircle cx='120' cy='110' r='55' fill='%2394a3b8'/%3E%3Crect x='55' y='180' width='130' height='105' rx='42' fill='%2364748b'/%3E%3C/svg%3E";

const previewRoot = (page: Page) =>
  page.locator('[data-dossier-document="cv"][data-export-mode="false"]').first();
const exportRoot = (page: Page) =>
  page.locator('[data-dossier-document="cv"][data-export-mode="true"]').first();

function entry(id: string, index: number) {
  return {
    id,
    zeit: `${2026 - index} – ${2027 - index}`,
    titel: `Ausbildung und Praxiserfahrung ${index + 1}`,
    ort: `Beispielbetrieb ${index + 1}, Zürich`,
    beschreibung:
      "Mitarbeit an realistischen Aufgaben, selbstständige Dokumentation und Zusammenarbeit im Team.",
  };
}

function cvData({ long = false, photo = false } = {}) {
  const schoolCount = long ? 13 : 2;
  return {
    person: {
      vorname: long ? "Lea Sophie Alexandra" : "Lea",
      nachname: long ? "Müller-Winterberger-Schneider" : "Müller",
      adresse: "Bahnhofstrasse 42",
      plzOrt: "8000 Zürich",
      telefon: "+41 79 123 45 67",
      email: "lea.mueller@example.ch",
      geburtsdatum: "14.03.2010",
      nationalitaet: "Schweiz",
      untertitel: "Schülerin, 3. Sekundarklasse",
      foto: photo ? PHOTO : null,
    },
    schule: Array.from({ length: schoolCount }, (_, i) => entry(`school-${i}`, i)),
    erfahrung: Array.from({ length: long ? 11 : 2 }, (_, i) => entry(`work-${i}`, i + 2)),
    sprachen: long
      ? []
      : [
          { id: "de", name: "Deutsch", niveau: "Muttersprache" },
          { id: "en", name: "Englisch", niveau: "B1" },
        ],
    hobbys: long ? [] : ["Volleyball", "Programmieren"],
    staerken: long ? [] : ["Zuverlässig", "Teamfähig"],
    referenzen: long
      ? Array.from({ length: 5 }, (_, i) => ({
          id: `ref-${i}`,
          name: `Referenzperson ${i + 1}`,
          funktion: "Klassenlehrperson",
          kontakt: `+41 44 123 45 ${String(i).padStart(2, "0")}`,
        }))
      : [
          {
            id: "ref-1",
            name: "Herr Thomas Weber",
            funktion: "Klassenlehrer",
            kontakt: "+41 44 123 45 67",
          },
        ],
    labels: {},
    hidden: {},
  };
}

function cvPayload(options?: {
  long?: boolean;
  photo?: boolean;
  template?: (typeof FAMILY_TEMPLATES)[keyof typeof FAMILY_TEMPLATES];
}) {
  return {
    version: 2,
    data: cvData(options),
    design: {
      template: options?.template ?? "modern",
      colors: { primary: "#111827", accent: "#f43f5e", bg: "#fafafa" },
      bgOpacity: 0.06,
      useElements: false,
    },
    elements: [],
  };
}

type SeedOptions = {
  family?: (typeof FAMILY_IDS)[number];
  layout?: (typeof LAYOUT_IDS)[number];
  mirrored?: boolean;
  long?: boolean;
  photo?: boolean;
  photoShape?: (typeof PHOTO_SHAPES)[number];
  coverRaw?: string;
  legacyPhotoShape?: (typeof PHOTO_SHAPES)[number];
};

async function settlePagination(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

async function seedCv(page: Page, options: SeedOptions = {}) {
  const family = options.family ?? "classic";
  await page.goto(`${BASE_URL}/lebenslauf`, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ payload, layout, mirrored, photoShape, coverRaw, legacyPhotoShape }) => {
      localStorage.clear();
      localStorage.setItem("lebenslauf:v1", JSON.stringify(payload));
      localStorage.setItem("lebenslauf:layout:v1", layout);
      localStorage.setItem("lebenslauf:layout-mirror:v1", mirrored ? "true" : "false");
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
      if (photoShape) {
        localStorage.setItem(
          "lebenslauf:photo:v2",
          JSON.stringify({ shape: photoShape, zoom: 1.6, x: 25, y: 70, borderWidth: 0.4 }),
        );
      }
      if (legacyPhotoShape) {
        localStorage.removeItem("lebenslauf:photo:v2");
        localStorage.setItem("lebenslauf:photo-shape:v1", legacyPhotoShape);
      }
      if (coverRaw) localStorage.setItem("titelblatt:v3", coverRaw);
      window.location.reload();
    },
    {
      payload: cvPayload({
        long: options.long,
        photo: options.photo,
        template: FAMILY_TEMPLATES[family],
      }),
      layout: options.layout ?? "classic",
      mirrored: options.mirrored ?? false,
      photoShape: options.photoShape,
      coverRaw: options.coverRaw,
      legacyPhotoShape: options.legacyPhotoShape,
    },
  );
  await page.waitForLoadState("domcontentloaded");
  await previewRoot(page).locator("[data-cv-page]").first().waitFor({ state: "visible" });
  await settlePagination(page);
}

async function clippingErrors(page: Page) {
  return previewRoot(page)
    .locator("[data-cv-page]")
    .evaluateAll((pages) => {
      const failures: string[] = [];
      pages.forEach((pageEl, pageIndex) => {
        const main = pageEl.querySelector<HTMLElement>("[data-cv-main]");
        if (!main) {
          failures.push(`page ${pageIndex + 1}: missing main`);
          return;
        }
        const mainRect = main.getBoundingClientRect();
        Array.from(main.children).forEach((child, childIndex) => {
          const rect = (child as HTMLElement).getBoundingClientRect();
          if (rect.bottom > mainRect.bottom + 1.5) {
            failures.push(`page ${pageIndex + 1} row ${childIndex + 1}: bottom clipped`);
          }
          if (rect.left < mainRect.left - 1.5 || rect.right > mainRect.right + 1.5) {
            failures.push(`page ${pageIndex + 1} row ${childIndex + 1}: horizontal overflow`);
          }
        });
      });
      return failures;
    });
}

async function assertNoMainClipping(page: Page, label: string) {
  await expect
    .poll(() => clippingErrors(page), { message: `${label} preview geometry` })
    .toEqual([]);
}

async function seedCoverTemplate(page: Page, template: string) {
  await page.addInitScript(
    ({ selectedTemplate }) => {
      localStorage.clear();
      localStorage.setItem(
        "titelblatt:v3",
        JSON.stringify({
          version: 6,
          template: selectedTemplate,
          colors: {
            [selectedTemplate]: {
              bg: "#faf7f2",
              primary: "#24364b",
              secondary: "#c9895d",
              tertiary: "#d8c3aa",
              accent: "#d6a47d",
              ink: "#1f2937",
            },
          },
          layout: { [selectedTemplate]: {} },
          customs: [],
          fontScale: 1,
          data: {
            meta: { title: "", author: "", subject: "", keywords: "" },
            kicker: "Bewerbung um eine Lehrstelle als",
            eyebrow: "Bewerbung",
            beruf: "Informatiker/in EFZ",
            lehrbeginn: "Lehrbeginn August 2027",
            vorname: "Lea",
            nachname: "Müller",
            adresse: "Bahnhofstrasse 42",
            plzOrt: "8000 Zürich",
            telefon: "+41 79 123 45 67",
            email: "lea.mueller@example.ch",
            geburtsdatum: "14.03.2010",
            lehrbetrieb: "Beispiel AG",
            ansprechperson: "Herr Thomas Weber",
            betriebAdresse: "Industriestrasse 8, 8005 Zürich",
            ort: "Hubersdorf",
            datum: "22.08.2026",
            labelKontakt: "",
            labelEmpfaenger: "",
            foto: null,
          },
        }),
      );
    },
    { selectedTemplate: template },
  );
  await page.goto(`${BASE_URL}/titelblatt`, { waitUntil: "domcontentloaded" });

  const sheet = page.locator('[data-dossier-document="cover"]').first();
  await sheet.waitFor({ state: "visible" });
  await sheet.locator('[data-block-id="decor-bottom-field"]').waitFor({ state: "visible" });
  return sheet;
}

function coverPayload() {
  return {
    version: 7,
    template: "modern",
    colors: {
      modern: {
        bg: "#ffffff",
        primary: "#24364b",
        accent: "#d6a47d",
      },
    },
    layout: { modern: {} },
    customs: [],
    fontScale: 1.2,
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
      ort: "Hubersdorf",
      datum: "25.08.2026",
      labelKontakt: "",
      labelEmpfaenger: "",
      foto: null,
    },
  };
}

function letterPayload() {
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
      betreff: "Bewerbung um eine Lehrstelle als Informatiker/in EFZ",
      anrede: "Guten Tag Herr Weber",
      text: "Der Beruf Informatiker/in EFZ interessiert mich sehr. Ich arbeite gerne sorgfältig, lerne Neues und möchte Ihr Team in einer Schnupperlehre kennenlernen.",
      gruss: "Freundliche Grüsse",
      unterschrift: "Lea Müller",
    },
    design: {
      template: "modern",
      colors: { bg: "#ffffff", primary: "#24364b", accent: "#d6a47d" },
      font: "sans",
    },
  };
}

async function seedCoreDossier(page: Page, withLetter = false) {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ cover, cv, letter }) => {
      localStorage.clear();
      localStorage.setItem("titelblatt:v3", JSON.stringify(cover));
      localStorage.setItem("lebenslauf:v1", JSON.stringify(cv));
      if (letter) localStorage.setItem("anschreiben:v1", JSON.stringify(letter));
    },
    {
      cover: coverPayload(),
      cv: cvPayload({ template: "modern" }),
      letter: withLetter ? letterPayload() : null,
    },
  );
  await page.reload({ waitUntil: "domcontentloaded" });
}

test.describe("M5.8 dossier regression", () => {
  test.setTimeout(120_000);

  test("Horizont-Farbfläche schliesst ohne weisse Naht bis zum unteren Blattrand", async ({
    page,
  }) => {
    const sheet = await seedCoverTemplate(page, "welle");
    const geometry = await sheet.evaluate((documentElement) => {
      const band = documentElement.querySelector<HTMLElement>(
        '[data-block-id="decor-bottom-field"]',
      );
      const rule = documentElement.querySelector<HTMLElement>(
        '[data-block-id="decor-horizon-rule"]',
      );
      if (!band || !rule) throw new Error("Sichtbarer Horizont-Hintergrund fehlt");

      const sheetRect = documentElement.getBoundingClientRect();
      const bandRect = band.getBoundingClientRect();
      const ruleRect = rule.getBoundingClientRect();
      return {
        sheetRight: sheetRect.right,
        sheetBottom: sheetRect.bottom,
        bandTop: bandRect.top,
        bandRight: bandRect.right,
        bandBottom: bandRect.bottom,
        ruleTop: ruleRect.top,
      };
    });

    expect(Math.abs(geometry.bandTop - geometry.ruleTop)).toBeLessThanOrEqual(0.5);
    expect(geometry.bandRight).toBeGreaterThan(geometry.sheetRight);
    expect(geometry.bandBottom).toBeGreaterThan(geometry.sheetBottom);
  });

  test("all 20 design-style × CV-layout combinations render without clipping", async ({ page }) => {
    for (const family of FAMILY_IDS) {
      for (const layout of LAYOUT_IDS) {
        await seedCv(page, { family, layout });
        await expect(page.locator("html")).toHaveAttribute("data-dossier-family", family);
        await expect(page.locator("html")).toHaveAttribute("data-cv-variant", layout);
        await assertNoMainClipping(page, `${family}/${layout}`);
      }
    }
  });

  test("all five layouts remain valid when mirrored", async ({ page }) => {
    for (const layout of LAYOUT_IDS) {
      await seedCv(page, { family: "executive", layout, mirrored: true, photo: true });
      await expect(page.locator("html")).toHaveAttribute("data-cv-mirrored", "true");
      await expect(
        previewRoot(page).locator("[data-cv-page] [data-cv-photo]").first(),
      ).toBeVisible();
      await assertNoMainClipping(page, `mirrored executive/${layout}`);
    }
  });

  test("all four photo shapes preserve shared crop and border treatment", async ({ page }) => {
    const expectedRatio = { rect: 0.75, square: 1, portrait: 1.25, circle: 1 } as const;
    for (const shape of PHOTO_SHAPES) {
      await seedCv(page, { family: "modern", layout: "classic", photo: true, photoShape: shape });
      await expect(page.locator("html")).toHaveAttribute("data-cv-photo-shape", shape);
      const photo = previewRoot(page).locator("[data-cv-page] [data-cv-photo]").first();
      await expect(photo).toBeVisible();
      const box = await photo.boundingBox();
      expect(box).not.toBeNull();
      expect((box?.height ?? 0) / (box?.width ?? 1)).toBeCloseTo(expectedRatio[shape], 1);
      const crop = await photo.locator("img").evaluate((img) => {
        const style = getComputedStyle(img);
        return { width: style.width, left: style.left, top: style.top };
      });
      expect(Number.parseFloat(crop.width)).toBeGreaterThan((box?.width ?? 0) * 1.5);
      expect(Number.parseFloat(crop.left)).toBeLessThan(0);
      expect(Number.parseFloat(crop.top)).toBeLessThan(0);
    }
  });

  test("long names and long content paginate across every layout without clipping", async ({
    page,
  }) => {
    for (const layout of LAYOUT_IDS) {
      await seedCv(page, { family: "editorial", layout, long: true });
      const root = previewRoot(page);
      await expect.poll(() => root.locator("[data-cv-page]").count()).toBeGreaterThan(1);
      await assertNoMainClipping(page, `long editorial/${layout}`);
      const nameBox = await root.locator("[data-cv-page='0'] [data-cv-name]").first().boundingBox();
      const mainBox = await root.locator("[data-cv-page='0'] [data-cv-main]").first().boundingBox();
      expect(nameBox).not.toBeNull();
      expect(mainBox).not.toBeNull();
      expect((nameBox?.x ?? 0) + (nameBox?.width ?? 0)).toBeLessThanOrEqual(
        (mainBox?.x ?? 0) + (mainBox?.width ?? 0) + 1.5,
      );
    }
  });

  test("legacy CV photo-shape preference migrates safely", async ({ page }) => {
    await seedCv(page, { photo: true, legacyPhotoShape: "circle" });
    await expect(page.locator("html")).toHaveAttribute("data-cv-photo-shape", "circle");
    await page.getByRole("button", { name: "Quadrat", exact: true }).click();
    const migrated = await page.evaluate(() => localStorage.getItem("lebenslauf:photo:v2"));
    expect(migrated).not.toBeNull();
    expect(JSON.parse(migrated ?? "{}").shape).toBe("square");
  });

  test("copying and editing the CV photo never mutates title-page storage", async ({ page }) => {
    const cover = JSON.stringify({
      version: 6,
      template: "modern",
      colors: { modern: { primary: "#111827", accent: "#f43f5e", bg: "#fafafa" } },
      layout: {
        modern: {
          foto: {
            ratio: 1,
            radius: 999,
            imgZoom: 1.8,
            imgX: 20,
            imgY: 65,
            borderWidth: 0.7,
          },
        },
      },
      customs: [],
      fontScale: 1,
      data: {
        vorname: "Lea",
        nachname: "Müller",
        adresse: "Bahnhofstrasse 42",
        plzOrt: "8000 Zürich",
        telefon: "+41 79 123 45 67",
        email: "lea@example.ch",
        geburtsdatum: "14.03.2010",
        foto: PHOTO,
      },
    });
    await seedCv(page, { coverRaw: cover });
    expect(await page.evaluate(() => localStorage.getItem("titelblatt:v3"))).toBe(cover);
    await expect(page.locator("html")).toHaveAttribute("data-cv-photo-shape", /.+/);
    await page.getByRole("button", { name: "Vom Titelblatt", exact: true }).click();
    await expect
      .poll(() =>
        page.evaluate(() => JSON.parse(localStorage.getItem("lebenslauf:photo:v2") ?? "{}").shape),
      )
      .toBe("circle");
    const copied = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("lebenslauf:photo:v2") ?? "{}"),
    );
    expect(copied.zoom).toBe(1.8);
    expect(copied.x).toBe(20);
    expect(copied.y).toBe(65);
    expect(copied.borderWidth).toBe(0.7);
    await expect(previewRoot(page).locator("[data-cv-page] [data-cv-photo]").first()).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("titelblatt:v3"))).toBe(cover);
    await page.getByRole("button", { name: "Quadrat", exact: true }).click();
    await page.waitForTimeout(500);
    const storage = await page.evaluate(() => ({
      cover: localStorage.getItem("titelblatt:v3"),
      cvPhoto: localStorage.getItem("lebenslauf:photo:v2"),
    }));
    expect(storage.cover).toBe(cover);
    expect(JSON.parse(storage.cvPhoto ?? "{}").shape).toBe("square");
  });

  test("empty saved CV inherits the full title page and can re-sync everything", async ({
    page,
  }) => {
    const cover = coverPayload();
    cover.template = "pastell";
    cover.colors = {
      pastell: { bg: "#fff7ed", primary: "#7c2d12", accent: "#fb923c" },
    };
    cover.font = "serif";
    cover.fontScale = 1.15;

    const emptyStoredCv = cvPayload({ template: "modern" });
    emptyStoredCv.data = {
      person: {
        vorname: "",
        nachname: "",
        adresse: "",
        plzOrt: "",
        telefon: "",
        email: "",
        geburtsdatum: "",
        nationalitaet: "",
        untertitel: "",
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
    };

    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await page.evaluate(
      ({ titlePage, cv }) => {
        localStorage.clear();
        localStorage.setItem("titelblatt:v3", JSON.stringify(titlePage));
        localStorage.setItem("lebenslauf:v1", JSON.stringify(cv));
      },
      { titlePage: cover, cv: emptyStoredCv },
    );
    await page.goto(`${BASE_URL}/lebenslauf`, { waitUntil: "domcontentloaded" });

    const takeAll = page.getByRole("button", { name: "Alles vom Titelblatt übernehmen" });
    await expect(takeAll).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const saved = JSON.parse(localStorage.getItem("lebenslauf:v1") ?? "{}");
          return {
            template: saved.design?.template,
            font: saved.design?.font,
            vorname: saved.data?.person?.vorname,
          };
        }),
      )
      .toEqual({ template: "pastell", font: "serif", vorname: "Lea" });

    await page.evaluate(() => {
      const titlePage = JSON.parse(localStorage.getItem("titelblatt:v3") ?? "{}");
      titlePage.template = "modern";
      titlePage.colors = {
        ...(titlePage.colors ?? {}),
        modern: { bg: "#ffffff", primary: "#172554", accent: "#38bdf8" },
      };
      titlePage.font = "sans";
      titlePage.data.vorname = "Mia";
      localStorage.setItem("titelblatt:v3", JSON.stringify(titlePage));
    });

    await takeAll.click();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const saved = JSON.parse(localStorage.getItem("lebenslauf:v1") ?? "{}");
          return {
            template: saved.design?.template,
            accent: saved.design?.colors?.accent,
            font: saved.design?.font,
            vorname: saved.data?.person?.vorname,
          };
        }),
      )
      .toEqual({ template: "modern", accent: "#38bdf8", font: "sans", vorname: "Mia" });
  });

  test("PDF export downloads a non-empty PDF from the export CV pages only", async ({ page }) => {
    await seedCv(page, { family: "executive", layout: "timeline", long: true, photo: true });
    const preview = previewRoot(page);
    const exported = exportRoot(page);
    await expect.poll(() => preview.locator("[data-cv-page]").count()).toBeGreaterThan(1);
    const previewPages = await preview.locator("[data-cv-page]").count();
    await expect.poll(() => exported.locator("[data-cv-page]").count()).toBe(previewPages);
    expect(await page.locator("[data-cv-measure-page][data-cv-page]").count()).toBe(0);

    await page.getByRole("button", { name: "Download" }).click();
    const downloadPromise = page.waitForEvent("download", { timeout: 90_000 });
    await page.getByRole("button", { name: /Nur Lebenslauf als PDF/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename().toLowerCase()).toMatch(/\.pdf$/);
    const path = await download.path();
    expect(path).not.toBeNull();
    expect((await stat(path ?? "")).size).toBeGreaterThan(10_000);
  });

  test("empty saved Motivationsschreiben inherits title-page data and design and can re-sync all", async ({
    page,
  }) => {
    await seedCoreDossier(page);
    await page.evaluate(() => {
      localStorage.setItem(
        "anschreiben:v1",
        JSON.stringify({
          version: 1,
          data: {
            absenderName: "",
            absenderAdresse: "",
            absenderPlzOrt: "",
            absenderTelefon: "",
            absenderEmail: "",
            empfaengerFirma: "",
            empfaengerName: "",
            empfaengerAdresse: "",
            empfaengerPlzOrt: "",
            ort: "",
            datum: "",
            betreff: "",
            anrede: "Guten Tag",
            text: "",
            richTextHtml: "",
            gruss: "Freundliche Grüsse",
            unterschrift: "",
          },
          design: {
            template: "brief",
            colors: { bg: "#ffffff", primary: "#111111", accent: "#111111" },
            font: "sans",
          },
        }),
      );
    });
    await page.goto(`${BASE_URL}/anschreiben`, { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Motivationsschreiben" })).toBeVisible();
    await expect(page.getByLabel("Vorname und Nachname")).toHaveValue("Lea Müller");
    await expect(page.getByRole("textbox", { name: "Lehrbetrieb", exact: true })).toHaveValue(
      "Beispiel AG",
    );
    await expect(page.getByLabel("PLZ und Ort").nth(1)).toHaveValue("4500 Solothurn");
    await expect(page.getByRole("textbox", { name: "Titel / Betreff", exact: true })).toHaveValue(
      "Bewerbung um eine Lehrstelle als Informatiker/in EFZ",
    );
    const preview = page.getByLabel("Vorschau Motivationsschreiben");
    await expect(preview).toBeVisible();
    await expect(preview).toHaveAttribute("data-letter-template", "modern");
    await expect(page.getByRole("button", { name: "Farben", exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Alles vom Titelblatt übernehmen", exact: true }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const saved = JSON.parse(localStorage.getItem("anschreiben:v1") ?? "{}");
          return {
            template: saved.design?.template,
            accent: saved.design?.colors?.accent,
            font: saved.design?.font,
            name: saved.data?.absenderName,
          };
        }),
      )
      .toEqual({ template: "modern", accent: "#d6a47d", font: "sans", name: "Lea Müller" });

    const body = page.getByLabel("Brieftext");
    const preservedBody = "Mein individuell geschriebener Brieftext bleibt erhalten.";
    await body.fill(preservedBody);
    await expect
      .poll(() =>
        page.evaluate(
          () => JSON.parse(localStorage.getItem("anschreiben:v1") ?? "{}").data?.text ?? "",
        ),
      )
      .toBe(preservedBody);

    await page.evaluate(() => {
      const cover = JSON.parse(localStorage.getItem("titelblatt:v3") ?? "{}");
      cover.data.lehrbetrieb = "Neue Beispiel AG";
      cover.data.ansprechperson = "Frau Anna Neu";
      cover.colors.modern.accent = "#38bdf8";
      cover.font = "serif";
      localStorage.setItem("titelblatt:v3", JSON.stringify(cover));
    });

    await page.getByRole("button", { name: "Alles vom Titelblatt übernehmen" }).click();
    await expect(page.getByRole("textbox", { name: "Lehrbetrieb", exact: true })).toHaveValue(
      "Neue Beispiel AG",
    );
    await expect(preview).toHaveAttribute("data-letter-font", "serif");
    await expect(body).toHaveText(preservedBody);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const saved = JSON.parse(localStorage.getItem("anschreiben:v1") ?? "{}");
          return {
            accent: saved.design?.colors?.accent,
            font: saved.design?.font,
            text: saved.data?.text,
          };
        }),
      )
      .toEqual({ accent: "#38bdf8", font: "serif", text: preservedBody });
  });

  test("letter layout controls and Word-like formatting persist", async ({ page }) => {
    await seedCoreDossier(page);
    await page.goto(`${BASE_URL}/anschreiben`, { waitUntil: "domcontentloaded" });
    // Das Feld wird erst clientseitig aus dem Dossier befüllt und ist damit unser Hydration-Signal.
    await expect(page.getByLabel("Vorname und Nachname")).toHaveValue("Lea Müller");

    await page.getByRole("button", { name: "Meine Kontaktdaten Rechts" }).click();
    await page.getByRole("button", { name: "Firma / Lehrbetrieb Rechts" }).click();
    await page.getByRole("button", { name: "Ort & Datum Rechts" }).click();
    await page.getByLabel("Trennlinie nach meinen Kontaktdaten").check();
    await page.getByLabel("Trennlinie nach Firma / Lehrbetrieb").check();
    await page.getByLabel("Trennlinie nach Titel / Betreff").check();

    const preview = page.getByLabel("Vorschau Motivationsschreiben");
    await expect(preview.locator('[data-letter-section="sender"]')).toHaveCSS(
      "text-align",
      "right",
    );
    await expect(preview.locator('[data-letter-section="recipient"]')).toHaveCSS(
      "text-align",
      "right",
    );
    await expect(preview.locator('[data-letter-section="date"]')).toHaveCSS("text-align", "right");
    await expect(preview.locator('[data-letter-pdf-rule="sender"]')).toBeVisible();
    await expect(preview.locator('[data-letter-pdf-rule="recipient"]')).toBeVisible();
    await expect(preview.locator('[data-letter-pdf-rule="subject"]')).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Titel / Betreff", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Vorlage", exact: true }).click();
    await expect(page.getByRole("button", { name: "Modern", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.getByRole("button", { name: "Brief", exact: true }).click();
    await expect(preview).toHaveAttribute("data-letter-template", "brief");
    await expect(page.getByRole("button", { name: "Farben", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Editorial", exact: true }).click();
    await expect(preview).toHaveAttribute("data-letter-template", "klassisch");
    await expect(page.getByRole("button", { name: "Farben", exact: true })).toBeVisible();

    const body = page.getByRole("textbox", { name: "Brieftext" });
    await body.evaluate((element) => {
      element.innerHTML = "<div>Absatz eins formatiert</div><div>Absatz zwei bleibt separat</div>";
      element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
    });

    const selectBlock = async (index: number) => {
      await body.evaluate((element, blockIndex) => {
        const block = element.children.item(blockIndex);
        if (!block) throw new Error(`Brieftext-Block ${blockIndex} fehlt`);
        const range = document.createRange();
        range.selectNodeContents(block);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      }, index);
    };

    await selectBlock(0);
    await page.getByRole("button", { name: "Fett" }).click();
    await page.getByRole("button", { name: "Kursiv" }).click();
    await page.getByRole("button", { name: "Unterstrichen" }).click();

    await page.getByRole("button", { name: "Liste" }).click();
    await expect(page.getByRole("button", { name: "Bullet", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Strich", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Plus", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Punkt zentriert", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Kein Zeichen", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Bullet", exact: true }).click();

    await selectBlock(1);
    await page.getByRole("button", { name: "2 Spalten" }).click();
    await expect(page.getByRole("button", { name: "2 Spalten" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.getByRole("button", { name: "Tabelle" }).click();
    await expect(page.getByRole("grid", { name: "Tabellengrösse auswählen" })).toBeVisible();
    await page.getByRole("gridcell", { name: "Tabelle 2 × 3 einfügen" }).hover();
    await expect(page.getByText("2 × 3 Tabelle")).toBeVisible();
    await page.getByRole("gridcell", { name: "Tabelle 2 × 3 einfügen" }).click();

    const previewBody = preview.locator('[data-letter-pdf-richtext="body"]');
    const previewBlocks = previewBody.locator(":scope > div");
    await expect(previewBlocks).toHaveCount(3);
    await expect(previewBlocks.nth(0)).not.toHaveAttribute("data-columns", /.+/);
    await expect(previewBlocks.nth(0)).toHaveAttribute("data-list", "bullet");
    await expect(previewBlocks.nth(1)).toHaveAttribute("data-columns", "2");
    await expect(previewBlocks.nth(1)).toHaveCSS("column-count", "2");
    await expect(previewBlocks.nth(0).locator("strong")).toContainText("Absatz eins formatiert");
    await expect(previewBlocks.nth(0).locator("em")).toContainText("Absatz eins formatiert");
    await expect(previewBlocks.nth(0).locator("u")).toContainText("Absatz eins formatiert");
    expect(
      await previewBlocks
        .nth(0)
        .evaluate((element) => getComputedStyle(element, "::before").content),
    ).toContain("•");

    const table = previewBody.locator("table[data-letter-table]");
    await expect(table).toHaveCount(1);
    await expect(table.locator("tr")).toHaveCount(2);
    await expect(table.locator("td")).toHaveCount(6);

    await expect
      .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("anschreiben:v1") ?? "{}")))
      .toMatchObject({
        design: {
          senderAlign: "right",
          recipientAlign: "right",
          dateAlign: "right",
          ruleAfterSender: true,
          ruleAfterRecipient: true,
          ruleAfterSubject: true,
        },
        data: { text: "Absatz eins formatiert\nAbsatz zwei bleibt separat" },
      });

    const saved = await page.evaluate(
      () => JSON.parse(localStorage.getItem("anschreiben:v1") ?? "{}").data?.richTextHtml ?? "",
    );
    expect(saved).toContain("<strong>");
    expect(saved).toContain("<em>");
    expect(saved).toContain("<u>");
    expect(saved).toContain('data-list="bullet"');
    expect(saved).toContain('data-columns="2"');
    expect(saved).toContain("<table data-letter-table>");
    expect(saved).toContain("<td>");
  });

  test("start screen requires the letter, reads fresh storage and downloads cover-letter-CV in order", async ({
    page,
  }) => {
    await seedCoreDossier(page);

    // Dieser Text entsteht erst nach dem clientseitigen Storage-Read und ist damit
    // zugleich unser Hydration-Signal: Titelblatt und CV sind bereit, nur der Brief fehlt.
    await expect(
      page.getByText("Gesamtdossier verfügbar, sobald Motivationsschreiben ausgefüllt ist."),
    ).toBeVisible();

    const dossierCard = page.getByRole("button", { name: /Gesamtdossier herunterladen/ });
    await dossierCard.click();
    await expect(page.getByRole("dialog", { name: "Dossier herunterladen" })).toHaveCount(0);
    await expect(page.getByText("Noch nicht vollständig: Motivationsschreiben.")).toBeVisible();

    await page.evaluate((letter) => {
      localStorage.setItem("anschreiben:v1", JSON.stringify(letter));
    }, letterPayload());

    // Kein Reload: dieser zweite Klick schützt gezielt gegen stale React state.
    await dossierCard.click();
    const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/Reihenfolge: Titelblatt, Motivationsschreiben und/);

    await expect
      .poll(() =>
        page.locator("[data-dossier-document]").evaluateAll((nodes) => {
          const order = nodes
            .map((node) => node.getAttribute("data-dossier-document"))
            .filter((value): value is string => !!value);
          return order.filter((value, index) => order.indexOf(value) === index).slice(0, 3);
        }),
      )
      .toEqual(["cover", "letter", "cv"]);

    const downloadButton = dialog.getByRole("button", { name: "Dossier herunterladen" });
    await expect(downloadButton).toBeEnabled();
    const downloadPromise = page.waitForEvent("download", { timeout: 90_000 });
    await downloadButton.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename().toLowerCase()).toMatch(/\.pdf$/);
    const path = await download.path();
    expect(path).not.toBeNull();
    expect((await stat(path ?? "")).size).toBeGreaterThan(10_000);

    // Der Brief muss als echter PDF-Text vorliegen. Im alten Screenshot-Export
    // kamen diese Inhalte nur als Bildpixel vor und tauchten im PDF-Quelltext nicht auf.
    const pdfSource = (await readFile(path ?? "")).toString("latin1");
    expect(pdfSource).toContain("Bewerbung um eine Lehrstelle als Informatiker/in EFZ");
    expect(pdfSource).toContain("Guten Tag Herr Weber");
  });

  test("document editors expose one consistent overview home link", async ({ page }) => {
    for (const path of ["/titelblatt", "/lebenslauf", "/anschreiben"]) {
      await page.goto(`${BASE_URL}${path}`);
      const header = page.locator("header").first();
      const overview = header.getByRole("link", { name: "Übersicht" });
      await expect(overview).toHaveCount(1);
      await expect(overview).toHaveAttribute("href", "/");
    }

    await page.goto(`${BASE_URL}/titelblatt`);
    await expect(page.locator('header a[href="/lebenslauf"]')).toHaveCount(0);
    await page.goto(`${BASE_URL}/lebenslauf`);
    await expect(page.locator('header a[href="/titelblatt"]')).toHaveCount(0);
  });

  test("card-template sidebar clears the header and stays inside the card", async ({ page }) => {
    await seedCv(page, { layout: "modern" });
    await page.evaluate(() => {
      const saved = JSON.parse(localStorage.getItem("lebenslauf:v1") ?? "{}");
      saved.data = { ...saved.data, titel: "Lebenslauf" };
      saved.design = {
        ...saved.design,
        template: "neon",
        colors: { bg: "#09071f", primary: "#7c3aed", accent: "#ec4899" },
      };
      localStorage.setItem("lebenslauf:v1", JSON.stringify(saved));
      window.location.reload();
    });
    await page.waitForLoadState("domcontentloaded");

    const sheet = previewRoot(page).locator('[data-cv-page="0"]');
    await sheet.waitFor({ state: "visible" });
    const sidebar = sheet.locator("[data-cv-sidebar]");
    const header = sheet.locator("[data-cv-main] [data-cv-header]").first();
    const main = sheet.locator("[data-cv-main]");
    await expect(sidebar).toBeVisible();
    await expect(header).toBeVisible();

    const geometry = await Promise.all([
      sheet.boundingBox(),
      sidebar.boundingBox(),
      header.boundingBox(),
      main.boundingBox(),
    ]);
    const [sheetBox, sidebarBox, headerBox, mainBox] = geometry;
    expect(sheetBox).not.toBeNull();
    expect(sidebarBox).not.toBeNull();
    expect(headerBox).not.toBeNull();
    expect(mainBox).not.toBeNull();

    expect(sidebarBox!.x).toBeGreaterThan(sheetBox!.x + 1);
    expect(sidebarBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height - 1.5);
    expect(sidebarBox!.x + sidebarBox!.width).toBeLessThanOrEqual(mainBox!.x + 1.5);
    await expect(sheet.getByText("Lebenslauf", { exact: true })).toBeVisible();
  });
});
