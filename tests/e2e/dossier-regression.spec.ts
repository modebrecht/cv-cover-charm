import { expect, test, type Page } from "@playwright/test";
import { stat } from "node:fs/promises";

const BASE_URL = "http://127.0.0.1:4173";
const FAMILY_IDS = ["classic", "modern", "executive", "editorial"] as const;
/**
 * "executive" (Zweispaltig) was the same grid as "modern" with different
 * padding, so it is gone from the picker; a saved value still reads as
 * "modern". The migration has its own test below.
 */
const LAYOUT_IDS = ["classic", "modern", "minimal", "timeline", "editorial"] as const;
const PHOTO_SHAPES = ["rect", "square", "portrait", "circle"] as const;

/**
 * One title-page template per structural archetype.
 *
 * The suite used to seed template "modern" for every case, so only one of the
 * four archetypes was ever rendered. A side column running underneath the text
 * column therefore went unnoticed.
 */
const ARCHETYPE_TEMPLATES = [
  { template: "studio", archetype: "column" },
  { template: "terracotta", archetype: "column" },
  { template: "sonne", archetype: "band" },
  { template: "citrus", archetype: "card" },
  { template: "klassisch", archetype: "quiet" },
] as const;

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

function cvData({ long = false, photo = false, contactLabel = "" } = {}) {
  const schoolCount = long ? 13 : 2;
  return {
    titel: "Lebenslauf",
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
    labels: contactLabel ? { kontakt: contactLabel } : {},
    hidden: {},
  };
}

function cvPayload(options?: {
  long?: boolean;
  photo?: boolean;
  template?: string;
  sidebarPct?: number;
  contactLabel?: string;
  scales?: Record<string, number>;
}) {
  return {
    version: 2,
    data: cvData(options),
    design: {
      template: options?.template ?? "modern",
      colors: { primary: "#111827", accent: "#f43f5e", bg: "#fafafa" },
      bgOpacity: 0.06,
      useElements: false,
      ...(options?.sidebarPct === undefined ? {} : { sidebarPct: options.sidebarPct }),
      ...(options?.scales ?? {}),
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
  /** Title-page template, which decides the CV's structural archetype. */
  template?: (typeof ARCHETYPE_TEMPLATES)[number]["template"];
  /** Side column width as a share of the sheet. */
  sidebarPct?: number;
  /** Own wording above the contact details. */
  contactLabel?: string;
  /** Where the contact block goes in the Sidebar layout. */
  kontakt?: "side" | "main";
  /** titleScale / headingScale / bodyScale overrides. */
  scales?: Record<string, number>;
  /** Free CV photo placement, size and frame colour. */
  photoPlace?: {
    mode: "auto" | "frei";
    xMm: number;
    yMm: number;
    widthMm: number;
    frameColor: string | null;
  };
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
    ({
      payload,
      family,
      layout,
      mirrored,
      photoShape,
      coverRaw,
      legacyPhotoShape,
      photoPlace,
      kontakt,
    }) => {
      localStorage.clear();
      localStorage.setItem("lebenslauf:v1", JSON.stringify(payload));
      localStorage.setItem("dossier:family:v1", family);
      localStorage.setItem("lebenslauf:layout:v1", layout);
      localStorage.setItem("lebenslauf:layout-mirror:v1", mirrored ? "true" : "false");
      localStorage.setItem(
        "lebenslauf:placement:v1",
        JSON.stringify({
          kontakt,
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
      if (photoPlace) localStorage.setItem("lebenslauf:photo-place:v1", JSON.stringify(photoPlace));
      if (coverRaw) localStorage.setItem("titelblatt:v3", coverRaw);
    },
    {
      payload: cvPayload({
        long: options.long,
        photo: options.photo,
        template: options.template,
        sidebarPct: options.sidebarPct,
        contactLabel: options.contactLabel,
        scales: options.scales,
      }),
      kontakt: options.kontakt ?? "side",
      family: options.family ?? "classic",
      layout: options.layout ?? "classic",
      mirrored: options.mirrored ?? false,
      photoShape: options.photoShape,
      coverRaw: options.coverRaw,
      legacyPhotoShape: options.legacyPhotoShape,
      photoPlace: options.photoPlace,
    },
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await previewRoot(page).locator("[data-cv-page]").first().waitFor({ state: "visible" });
  // The server-rendered sheet is visible before hydration, and it always shows
  // the default layout. The layout stores stamp data-cv-variant on the first
  // client render, so that attribute marks the point from which a one-shot
  // measurement sees the seeded state instead of the default one.
  await page.waitForFunction(() => document.documentElement.dataset.cvVariant !== undefined);
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

/**
 * Do the coloured areas of the frame run underneath the text?
 *
 * Clipping checks compare each row against its own container, so they stay
 * silent when the container itself is placed wrongly. This compares the frame
 * against the text column: side column and stripe sideways, head band and foot
 * band vertically.
 */
async function frameOverlaps(page: Page) {
  return previewRoot(page)
    .locator("[data-cv-page]")
    .evaluateAll((pages) => {
      const failures: string[] = [];
      const say = (page: number, what: string, by: number) =>
        failures.push(`page ${page}: ${what} overlaps the text column by ${Math.round(by)}px`);

      pages.forEach((pageEl, index) => {
        const main = pageEl.querySelector<HTMLElement>("[data-cv-main]");
        if (!main) return;
        const box = main.getBoundingClientRect();

        for (const [name, selector] of [
          ["side column", "[data-cv-sidebar]"],
          ["colour column", "[data-cv-column]"],
        ] as const) {
          const el = pageEl.querySelector<HTMLElement>(selector);
          if (!el) continue;
          const rect = el.getBoundingClientRect();
          const across = Math.min(rect.right, box.right) - Math.max(rect.left, box.left);
          const down = Math.min(rect.bottom, box.bottom) - Math.max(rect.top, box.top);
          if (across > 1 && down > 1) say(index + 1, name, across);
        }

        for (const [name, selector] of [
          ["head band", '[data-cv-band="head"]'],
          ["foot band", '[data-cv-band="foot"]'],
        ] as const) {
          const el = pageEl.querySelector<HTMLElement>(selector);
          if (!el) continue;
          const rect = el.getBoundingClientRect();
          const across = Math.min(rect.right, box.right) - Math.max(rect.left, box.left);
          const down = Math.min(rect.bottom, box.bottom) - Math.max(rect.top, box.top);
          if (across > 1 && down > 1) say(index + 1, name, down);
        }
      });
      return failures;
    });
}

test.describe("M5.8 dossier regression", () => {
  test.setTimeout(120_000);

  test("the design style follows the template, not a stored preference", async ({ page }) => {
    // The style used to be a second, saved choice that could contradict the
    // template. A stale value must no longer win.
    for (const [template, family] of [
      ["klassisch", "editorial"],
      ["edel", "executive"],
      ["serioes", "classic"],
      ["studio", "modern"],
    ] as const) {
      await seedCv(page, { template, family: "classic" });
      await expect(page.locator("html")).toHaveAttribute("data-dossier-family", family);
    }
  });

  test("every template renders in every layout without clipping", async ({ page }) => {
    for (const { template } of ARCHETYPE_TEMPLATES) {
      for (const layout of LAYOUT_IDS) {
        await seedCv(page, { template, layout });
        await expect(page.locator("html")).toHaveAttribute("data-cv-variant", layout);
        await assertNoMainClipping(page, `${template}/${layout}`);
      }
    }
  });

  test("every archetype works with every layout, without the columns overlapping", async ({
    page,
  }) => {
    for (const { template, archetype } of ARCHETYPE_TEMPLATES) {
      for (const layout of LAYOUT_IDS) {
        const label = `${template}/${archetype}/${layout}`;
        await seedCv(page, { template, layout });
        await expect(previewRoot(page)).toHaveAttribute("data-cv-archetype", archetype);
        await expect
          .poll(() => frameOverlaps(page), { message: `${label} column geometry` })
          .toEqual([]);
        await assertNoMainClipping(page, label);
      }
    }
  });

  test("the layout choice is never silently overridden", async ({ page }) => {
    // Column and card templates used to force their own renderer, so picking a
    // layout did nothing for twelve of nineteen templates.
    for (const { template } of ARCHETYPE_TEMPLATES) {
      for (const layout of LAYOUT_IDS) {
        await seedCv(page, { template, layout });
        await expect(page.locator("html")).toHaveAttribute("data-cv-variant", layout);
        const expected = layout === "modern" || layout === "executive" ? "modern" : "classic";
        await expect(previewRoot(page)).toHaveAttribute("data-cv-layout", expected);
      }
    }
  });

  test("taking over from the title page carries design, shapes, photo and person", async ({
    page,
  }) => {
    // A finished title page: own template, own colours, a shape and a photo.
    const cover = JSON.stringify({
      template: "verlauf",
      colors: {
        verlauf: { primary: "#7f5af0", secondary: "#2cb67d", ink: "#ffffff", bg: "#ffffff" },
      },
      layout: {},
      customs: [{ id: "shape-1", kind: "shape", shape: "circle", label: "Kreis" }],
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

    // A CV that starts on a different template with nothing of its own.
    await seedCv(page, { coverRaw: cover, template: "klassisch" });
    await expect(previewRoot(page)).toHaveAttribute("data-cv-archetype", "quiet");

    await page.getByRole("button", { name: "Übernehmen", exact: true }).click();

    // Copying is not enough: the shapes have to be switched on, or the button
    // looks as if it did nothing.
    await expect
      .poll(() =>
        page.evaluate(() => {
          const saved = JSON.parse(localStorage.getItem("lebenslauf:v1") ?? "{}");
          const root = document.querySelector(
            '[data-dossier-document="cv"][data-export-mode="false"]',
          );
          return {
            template: saved.design?.template,
            useElements: saved.design?.useElements,
            elements: (saved.elements ?? []).length,
            hasPhoto: !!saved.data?.person?.foto,
            vorname: saved.data?.person?.vorname ?? "",
            archetype: root?.getAttribute("data-cv-archetype"),
            // Per page: the decoration repeats on every sheet, so counting
            // across the whole document would only measure the page count.
            shapesDrawn:
              root?.querySelector("[data-cv-page]")?.querySelectorAll("[data-cv-decoration]")
                .length ?? 0,
          };
        }),
      )
      .toEqual({
        template: "verlauf",
        useElements: true,
        elements: 1,
        hasPhoto: true,
        vorname: "Lea",
        archetype: "card",
        shapesDrawn: 1,
      });
  });

  test("mirroring never leaves text back to front", async ({ page }) => {
    // Mirroring flips the whole page and flips each text-carrying child back.
    // A new element that is not on that list renders its text reversed -- the
    // name did, in the band. Compare every such child against the main column.
    for (const { template } of ARCHETYPE_TEMPLATES) {
      await seedCv(page, { template, layout: "modern", mirrored: true });
      const reversed = await previewRoot(page)
        .locator("[data-cv-page]")
        .evaluateAll((pages) =>
          pages.flatMap((pageEl, index) => {
            const main = pageEl.querySelector<HTMLElement>("[data-cv-main]");
            if (!main) return [];
            const upright = getComputedStyle(main).transform;
            return Array.from(pageEl.children)
              .filter(
                (child) =>
                  child instanceof HTMLElement &&
                  (child.textContent ?? "").trim().length > 0 &&
                  getComputedStyle(child).transform !== upright,
              )
              .map(
                (child) =>
                  `page ${index + 1}: ${(child as HTMLElement).getAttributeNames().join(",")}`,
              );
          }),
        );
      expect(reversed, `${template} mirrored`).toEqual([]);
    }
  });

  test("the document title is shown, editable and never English", async ({ page }) => {
    for (const { template } of ARCHETYPE_TEMPLATES) {
      await seedCv(page, { template });
      await expect(previewRoot(page).locator("[data-cv-doc-title]").first()).toHaveText(
        "Lebenslauf",
      );
      expect(await page.content()).not.toContain("CURRICULUM VITAE");
    }
  });

  test("a saved Zweispaltig layout reads as Sidebar", async ({ page }) => {
    await seedCv(page, { layout: "executive" as never });
    await expect(page.locator("html")).toHaveAttribute("data-cv-variant", "modern");
    await expect(previewRoot(page)).toHaveAttribute("data-cv-layout", "modern");
    await assertNoMainClipping(page, "migrated executive");
  });

  test("the side column width follows the setting", async ({ page }) => {
    for (const pct of [0.22, 0.3, 0.42]) {
      await seedCv(page, { layout: "modern", sidebarPct: pct });
      // The layout store stamps data-cv-variant on the first client render, but
      // the saved design arrives a tick later, so a single reading can still
      // catch the default width. Poll instead of measuring once.
      const share = () =>
        previewRoot(page)
          .locator("[data-cv-page]")
          .first()
          .evaluate((pageEl) => {
            const bar = pageEl.querySelector("[data-cv-sidebar]");
            if (!bar) return null;
            return bar.getBoundingClientRect().width / pageEl.getBoundingClientRect().width;
          });
      await expect.poll(share, { message: `sidebar at ${pct}` }).toBeCloseTo(pct, 2);
    }
  });

  test("each type slider moves its own texts and leaves the others alone", async ({ page }) => {
    /**
     * The distinct type sizes on the sheet, grouped by which slider owns them.
     *
     * Distinct and sorted rather than one entry per element: doubling a size
     * reflows the text over the pages, so the number of elements is not stable
     * — the set of sizes in use is.
     */
    const sizes = () =>
      previewRoot(page).evaluate((root) => {
        const of = (...selectors: string[]) =>
          [
            ...new Set(
              selectors.flatMap((selector) =>
                Array.from(root.querySelectorAll<HTMLElement>(selector)).map((el) =>
                  Number(parseFloat(getComputedStyle(el).fontSize).toFixed(1)),
                ),
              ),
            ),
          ].sort((a, b) => a - b);
        return {
          title: of("[data-cv-name]", "[data-cv-doc-title]"),
          heading: of("[data-cv-subtitle]", "[data-cv-section-title]"),
          body: of("[data-cv-entry-title]", "[data-cv-date]"),
        };
      });

    const KEY = { title: "titleScale", heading: "headingScale", body: "bodyScale" } as const;
    const ROLES = ["title", "heading", "body"] as const;

    await seedCv(page, { layout: "modern" });
    await expect.poll(async () => (await sizes()).heading.length).toBeGreaterThan(0);
    const base = await sizes();
    // A slider that reaches nothing is the fault being guarded against here.
    for (const role of ROLES) expect(base[role].length, `${role} texts found`).toBeGreaterThan(0);

    for (const role of ROLES) {
      await seedCv(page, { layout: "modern", scales: { [KEY[role]]: 2 } });
      // Rounded to one decimal, so doubled values can land a tenth apart.
      await expect
        .poll(async () =>
          (await sizes())[role].map((v, i) => Math.abs(v - base[role][i] * 2) < 0.25),
        )
        .toEqual(base[role].map(() => true));
      const now = await sizes();
      for (const other of ROLES) {
        if (other === role) continue;
        expect(now[other], `${KEY[role]} must not touch ${other}`).toEqual(base[other]);
      }
    }
  });

  test("the Kontakt heading can be renamed like every other one", async ({ page }) => {
    for (const kontakt of ["side", "main"] as const) {
      await seedCv(page, { layout: "modern", contactLabel: "Lea Müller", kontakt });
      await expect
        .poll(() =>
          previewRoot(page).locator("[data-cv-page] [data-cv-section-title]").allTextContents(),
        )
        .toContain("Lea Müller");
      expect(await page.content(), `default label still shown (${kontakt})`).not.toContain(
        ">Kontakt<",
      );
    }
  });

  test("a freely placed photo sits where it was put, in every layout", async ({ page }) => {
    for (const layout of ["classic", "modern"] as const) {
      await seedCv(page, {
        layout,
        photo: true,
        photoPlace: { mode: "frei", xMm: 140, yMm: 30, widthMm: 42, frameColor: null },
      });
      // The saved CV arrives a tick after hydration, so wait for the photo
      // itself rather than measuring whatever is on screen right now.
      await previewRoot(page).locator("[data-cv-photo-free]").first().waitFor({ state: "visible" });
      const box = await previewRoot(page)
        .locator("[data-cv-page]")
        .first()
        .evaluate((pageEl) => {
          const free = pageEl.querySelector("[data-cv-photo-free]");
          if (!free) return null;
          const sheet = pageEl.getBoundingClientRect();
          const rect = free.getBoundingClientRect();
          const mm = (px: number) => (px / sheet.width) * 210;
          return {
            xMm: mm(rect.left - sheet.left),
            yMm: mm(rect.top - sheet.top),
            widthMm: mm(rect.width),
            // Fixed per-shape sizes must not win over the chosen width.
            others: pageEl.querySelectorAll("[data-cv-photo]:not([data-cv-photo-free])").length,
          };
        });
      expect(box, `free photo in ${layout}`).not.toBeNull();
      expect(box!.xMm).toBeCloseTo(140, 0);
      expect(box!.yMm).toBeCloseTo(30, 0);
      expect(box!.widthMm).toBeCloseTo(42, 0);
      // The photo belongs in one place only, never in the head as well.
      expect(box!.others, `duplicate photo in ${layout}`).toBe(0);
    }
  });

  test("dragging the photo moves it and keeps the new spot", async ({ page }) => {
    await seedCv(page, {
      photo: true,
      photoPlace: { mode: "frei", xMm: 140, yMm: 30, widthMm: 40, frameColor: null },
    });
    const photo = previewRoot(page).locator("[data-cv-photo-free]").first();
    const before = await photo.boundingBox();
    expect(before).not.toBeNull();

    // The preview is scaled, so the promise is not a millimetre count but that
    // the photo stays under the pointer: it moves by exactly the pixels dragged.
    const dx = -60;
    const dy = 45;
    await page.mouse.move(before!.x + before!.width / 2, before!.y + before!.height / 2);
    await page.mouse.down();
    await page.mouse.move(before!.x + before!.width / 2 + dx, before!.y + before!.height / 2 + dy, {
      steps: 8,
    });
    await page.mouse.up();

    const after = await photo.boundingBox();
    expect(after!.x - before!.x, "horizontal travel").toBeCloseTo(dx, 0);
    expect(after!.y - before!.y, "vertical travel").toBeCloseTo(dy, 0);

    // Letting go writes the new spot, so it survives a reload.
    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("lebenslauf:photo-place:v1") ?? "null"),
    );
    expect(stored.mode).toBe("frei");
    expect(stored.xMm).toBeLessThan(140);
    expect(stored.yMm).toBeGreaterThan(30);
    await page.reload({ waitUntil: "domcontentloaded" });
    await photo.waitFor({ state: "visible" });
    const reloaded = await photo.boundingBox();
    expect(reloaded!.x, "spot after reload").toBeCloseTo(after!.x, 0);
  });

  test("the photo frame follows colour and thickness, and the export has no handles", async ({
    page,
  }) => {
    await seedCv(page, {
      photo: true,
      photoShape: "portrait",
      photoPlace: { mode: "frei", xMm: 140, yMm: 30, widthMm: 40, frameColor: "#00aa55" },
    });
    const ring = () =>
      previewRoot(page)
        .locator("[data-cv-photo-free]")
        .first()
        .evaluate((el) => getComputedStyle(el).boxShadow);
    expect(await ring()).toContain("rgb(0, 170, 85)");

    // Thickness 0 is the "no frame" setting and must remove the ring entirely.
    await page.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem("lebenslauf:photo:v2") ?? "{}");
      localStorage.setItem("lebenslauf:photo:v2", JSON.stringify({ ...raw, borderWidth: 0 }));
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await previewRoot(page).locator("[data-cv-photo-free]").first().waitFor({ state: "visible" });
    expect(await ring()).toContain("0px 0px 0px 0px");

    // Drag handles are an editing aid; the exported sheet must not carry them.
    await expect(exportRoot(page).locator("[data-cv-photo-handle]")).toHaveCount(0);
  });

  test("all layouts remain valid when mirrored", async ({ page }) => {
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
