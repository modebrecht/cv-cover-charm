import { expect, test, type Page } from "@playwright/test";
import { stat } from "node:fs/promises";

const BASE_URL = "http://127.0.0.1:4173";
const FAMILY_IDS = ["classic", "modern", "executive", "editorial"] as const;
const LAYOUT_IDS = ["classic", "modern", "minimal", "timeline", "executive", "editorial"] as const;
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

function cvPayload(options?: { long?: boolean; photo?: boolean }) {
  return {
    version: 2,
    data: cvData(options),
    design: {
      template: "modern",
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
  await page.goto(`${BASE_URL}/lebenslauf`, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ payload, family, layout, mirrored, photoShape, coverRaw, legacyPhotoShape }) => {
      localStorage.clear();
      localStorage.setItem("lebenslauf:v1", JSON.stringify(payload));
      localStorage.setItem("dossier:family:v1", family);
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
    },
    {
      payload: cvPayload({ long: options.long, photo: options.photo }),
      family: options.family ?? "classic",
      layout: options.layout ?? "classic",
      mirrored: options.mirrored ?? false,
      photoShape: options.photoShape,
      coverRaw: options.coverRaw,
      legacyPhotoShape: options.legacyPhotoShape,
    },
  );
  await page.reload({ waitUntil: "domcontentloaded" });
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
  await expect.poll(() => clippingErrors(page), { message: `${label} preview geometry` }).toEqual([]);
}

test.describe("M5.8 dossier regression", () => {
  test.setTimeout(120_000);

  test("all 24 design-style × CV-layout combinations render without clipping", async ({ page }) => {
    for (const family of FAMILY_IDS) {
      for (const layout of LAYOUT_IDS) {
        await seedCv(page, { family, layout });
        await expect(page.locator("html")).toHaveAttribute("data-dossier-family", family);
        await expect(page.locator("html")).toHaveAttribute("data-cv-variant", layout);
        await assertNoMainClipping(page, `${family}/${layout}`);
      }
    }
  });

  test("all six layouts remain valid when mirrored", async ({ page }) => {
    for (const layout of LAYOUT_IDS) {
      await seedCv(page, { family: "executive", layout, mirrored: true, photo: true });
      await expect(page.locator("html")).toHaveAttribute("data-cv-mirrored", "true");
      await expect(previewRoot(page).locator("[data-cv-page] [data-cv-photo]").first()).toBeVisible();
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

  test("long names and long content paginate across every layout without clipping", async ({ page }) => {
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
    const copied = await page.evaluate(() => JSON.parse(localStorage.getItem("lebenslauf:photo:v2") ?? "{}"));
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
    await page.getByRole("button", { name: /Als PDF/ }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename().toLowerCase()).toMatch(/\.pdf$/);
    const path = await download.path();
    expect(path).not.toBeNull();
    expect((await stat(path ?? "")).size).toBeGreaterThan(10_000);
  });
});