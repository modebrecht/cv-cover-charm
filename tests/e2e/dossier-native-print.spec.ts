import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { parityStorage } from "./support/cv-parity-fixture";

const BASE = "http://127.0.0.1:4173";
const NATIVE_LABEL = "Drucken / als PDF speichern";
const PRINT_PAGES = "[data-dossier-print-page]";

async function seed(page: Page, storage: Record<string, string>) {
  await page.addInitScript((values) => {
    localStorage.clear();
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);
    const target = window as typeof window & { nativePrintCalls: unknown[] };
    target.nativePrintCalls = [];
    // Model the dialog remaining open until afterprint; no product API is replaced.
    window.print = () => {
      const root = document.querySelector<HTMLElement>("[data-dossier-pdf-canvas]")!;
      target.nativePrintCalls.push({
        fonts: document.fonts.status,
        images: Array.from(
          root.querySelectorAll<HTMLImageElement>("img"),
          (image) => image.complete && image.naturalWidth > 0,
        ),
        letterReady: root.querySelector<HTMLElement>("[data-letter-document-root]")?.dataset
          .letterPaginationReady,
        cvReady: root.dataset.dossierCvReady,
        order: Array.from(
          root.querySelectorAll<HTMLElement>("[data-dossier-print-page]"),
          (sheet) => sheet.dataset.dossierPrintPage,
        ),
      });
      window.dispatchEvent(new Event("beforeprint"));
    };
  }, storage);
}

async function open(page: Page) {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Gesamtdossier herunterladen/ }).click();
  const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
  await expect(dialog.getByRole("button", { name: "PDF herunterladen", exact: true })).toBeEnabled({
    timeout: 30_000,
  });
  await expect(page.locator("[data-dossier-pdf-canvas]")).toHaveCount(1);
  await expect(page.locator("[data-dossier-pdf-canvas]")).toHaveAttribute(
    "data-dossier-cv-ready",
    "true",
  );
  return dialog;
}

async function calls(page: Page) {
  return page.evaluate(
    () => (window as typeof window & { nativePrintCalls: unknown[] }).nativePrintCalls,
  );
}

async function pdfPages(bytes: Uint8Array) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({ data: new Uint8Array(bytes), disableFontFace: true });
  const pdf = await task.promise;
  try {
    const pages: { text: string; width: number; height: number }[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const sheet = await pdf.getPage(i);
      const viewport = sheet.getViewport({ scale: 1 });
      const content = await sheet.getTextContent();
      pages.push({
        text: content.items.map((item) => ("str" in item ? item.str : "")).join(" "),
        width: viewport.width,
        height: viewport.height,
      });
    }
    return pages;
  } finally {
    await task.destroy();
  }
}

function multiStorage() {
  const storage = parityStorage("gallery", true, true);
  const letter = JSON.parse(storage["anschreiben:v1"]);
  letter.data.text = Array.from(
    { length: 14 },
    (_, index) =>
      `Briefmarker${String(index + 1).padStart(2, "0")}: Ich interessiere mich sehr für diesen Beruf und möchte meine Motivation, Zuverlässigkeit und Lernbereitschaft mit einem ausführlichen Beispiel aus Schule und Alltag zeigen.`,
  ).join("\n\n");
  letter.data.richTextHtml = "";
  storage["anschreiben:v1"] = JSON.stringify(letter);
  return storage;
}

for (const scenario of ["simple", "multi", "studio3"] as const) {
  test(`native print maps canonical pages to A4 with correct order and no UI: ${scenario}`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await seed(
      page,
      scenario === "multi"
        ? multiStorage()
        : parityStorage(scenario === "studio3" ? "studio3" : "brief"),
    );
    const dialog = await open(page);
    const canvas = page.locator("[data-dossier-pdf-canvas]");
    const canonical = await canvas
      .locator(
        '[data-dossier-document="cover"], [data-letter-document-pages] [data-letter-page], [data-cv-page]',
      )
      .evaluateAll((pages) =>
        pages.map((sheet) => ({
          kind: sheet.hasAttribute("data-cv-page")
            ? "cv"
            : sheet.hasAttribute("data-letter-page")
              ? "letter"
              : "cover",
          text: sheet.textContent ?? "",
        })),
      );
    const letters = canonical.filter((sheet) => sheet.kind === "letter").length;
    const cvs = canonical.filter((sheet) => sheet.kind === "cv").length;
    const cvGeometry = () =>
      canvas.locator("[data-cv-page]").evaluateAll((sheets) =>
        sheets.map((sheet) => {
          const p = sheet.getBoundingClientRect();
          return Array.from(
            sheet.querySelectorAll<HTMLElement>(
              "[data-cv-main], [data-cv-header], [data-cv-section], [data-cv-entry-title], [data-cv-sidebar], [data-cv-photo]",
            ),
          ).map((node) => {
            const r = node.getBoundingClientRect();
            return [
              ((r.x - p.x) / p.width) * 210,
              ((r.y - p.y) / p.height) * 297,
              (r.width / p.width) * 210,
              (r.height / p.height) * 297,
            ];
          });
        }),
      );
    const beforeGeometry = await cvGeometry();
    expect(canonical.map((sheet) => sheet.kind)).toEqual([
      "cover",
      ...Array(letters).fill("letter"),
      ...Array(cvs).fill("cv"),
    ]);
    expect(letters).toBe(scenario === "multi" ? 2 : 1);
    if (scenario === "multi") expect(cvs).toBeGreaterThanOrEqual(2);
    else expect(cvs).toBe(1);
    await expect(page.locator("[data-dossier-native-print-root]")).not.toBeInViewport();
    expect(await calls(page)).toHaveLength(0);
    await dialog.getByRole("button", { name: NATIVE_LABEL, exact: true }).click();
    await expect.poll(() => calls(page)).toHaveLength(1);
    expect((await calls(page))[0]).toMatchObject({
      fonts: "loaded",
      cvReady: "true",
      letterReady: "true",
      order: canonical.map((sheet) => sheet.kind),
    });
    expect(((await calls(page))[0] as { images: boolean[] }).images.every(Boolean)).toBe(true);
    await page.emulateMedia({ media: "print" });
    await expect(dialog).not.toBeVisible();
    const printRoot = page.locator("body > [data-dossier-native-print-root]");
    await expect(printRoot).toBeVisible();
    const afterGeometry = await cvGeometry();
    expect(afterGeometry.length).toBe(beforeGeometry.length);
    afterGeometry.forEach((nodes, pageIndex) => {
      expect(nodes.length).toBe(beforeGeometry[pageIndex].length);
      nodes.forEach((box, nodeIndex) =>
        box.forEach((axis, axisIndex) =>
          expect(
            Math.abs(axis - beforeGeometry[pageIndex][nodeIndex][axisIndex]),
          ).toBeLessThanOrEqual(0.02),
        ),
      );
    });
    await expect(printRoot.locator(PRINT_PAGES)).toHaveCount(canonical.length);
    const geometry = await printRoot.locator(PRINT_PAGES).evaluateAll((sheets) =>
      sheets.map((sheet) => {
        const rect = sheet.getBoundingClientRect();
        const style = getComputedStyle(sheet.closest("[data-dossier-print-frame]")!);
        return {
          width: rect.width,
          height: rect.height,
          breakAfter: style.breakAfter,
          text: sheet.textContent ?? "",
        };
      }),
    );
    geometry.forEach((sheet, index) => {
      expect(sheet.width).toBeCloseTo((210 * 96) / 25.4, 1);
      expect(sheet.height).toBeCloseTo((297 * 96) / 25.4, 1);
      expect(sheet.breakAfter).toBe(index === canonical.length - 1 ? "auto" : "page");
      expect(sheet.text).toBe(canonical[index].text);
    });
    // Test-only native output: the application itself exclusively calls print().
    const pdf = await pdfPages(
      await page.pdf({
        preferCSSPageSize: true,
        printBackground: true,
        displayHeaderFooter: false,
      }),
    );
    expect(pdf).toHaveLength(canonical.length);
    for (const sheet of pdf) {
      expect(sheet.width).toBeCloseTo((210 * 72) / 25.4, 0);
      expect(sheet.height).toBeCloseTo((297 * 72) / 25.4, 0);
      expect(sheet.text.trim()).not.toBe("");
      expect(sheet.text).not.toContain("Dossier herunterladen");
      expect(sheet.text).not.toContain("Projekt speichern");
    }
    expect(pdf[1].text).toContain(
      scenario === "multi" ? "Briefmarker01" : "Die Informatik begeistert mich",
    );
    expect(pdf[1 + letters].text).toContain("Sekundarschule");
    if (scenario === "multi") {
      const markers = [
        ...Array.from({ length: 14 }, (_, i) => `Briefmarker${String(i + 1).padStart(2, "0")}`),
        ...Array.from({ length: 18 }, (_, i) => `Praxisstation ${String(i + 1).padStart(2, "0")}`),
        "Referenzmarker",
      ];
      for (const marker of markers) {
        const expected = canonical.flatMap((sheet, index) =>
          sheet.text.includes(marker) ? [index] : [],
        );
        expect(expected, marker).toHaveLength(1);
        expect(
          pdf.flatMap((sheet, index) => (sheet.text.includes(marker) ? [index] : [])),
          marker,
        ).toEqual(expected);
      }
    }
    await page.emulateMedia({ media: "screen" });
    await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
    await expect(page.locator("body")).not.toHaveAttribute("data-dossier-native-print");
    await expect(dialog).toBeVisible();
    await expect(canvas.locator(PRINT_PAGES)).toHaveCount(0);
    await expect(
      dialog.getByRole("button", { name: "PDF herunterladen", exact: true }),
    ).toBeEnabled();
    if (scenario === "simple") {
      const downloadPromise = page.waitForEvent("download", { timeout: 120_000 });
      await dialog.getByRole("button", { name: "PDF herunterladen", exact: true }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe("Dossier-Lea-Mueller-Informatiker-in-EFZ.pdf");
      const automatic = await pdfPages(new Uint8Array(await readFile((await download.path())!)));
      expect(automatic).toHaveLength(canonical.length);
      expect(automatic[1].text).toContain("Die Informatik begeistert mich");
      expect(automatic[2].text).toContain("Sekundarschule");
      expect(await calls(page)).toHaveLength(1);
    }
  });
}

test("native print waits for a delayed image; errors and cancellation release the print mode", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const storage = parityStorage("ledger");
  const cv = JSON.parse(storage["lebenslauf:v1"]);
  cv.data.person.foto = `${BASE}/native-delayed-photo.svg`;
  storage["lebenslauf:v1"] = JSON.stringify(cv);
  let releaseImage!: () => void;
  const loaded = new Promise<void>((resolve) => {
    releaseImage = resolve;
  });
  await page.route("**/native-delayed-photo.svg", async (route) => {
    await loaded;
    await route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="100"><rect width="80" height="100" fill="tan"/></svg>',
    });
  });
  await seed(page, storage);
  const dialog = await open(page);
  await dialog.getByRole("button", { name: NATIVE_LABEL, exact: true }).click();
  await expect(
    dialog.getByRole("button", { name: "Druckdialog wird vorbereitet…", exact: true }),
  ).toBeDisabled();
  expect(await calls(page)).toHaveLength(0);
  await expect(page.locator("body")).not.toHaveAttribute("data-dossier-native-print");
  releaseImage();
  await expect.poll(() => calls(page)).toHaveLength(1);
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  await expect(dialog.getByRole("button", { name: NATIVE_LABEL, exact: true })).toBeEnabled();
  await page.evaluate(() => {
    window.print = () => {
      throw new Error("Print blocked for test");
    };
  });
  await dialog.getByRole("button", { name: NATIVE_LABEL, exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Print blocked for test");
  await expect(page.locator("body")).not.toHaveAttribute("data-dossier-native-print");
  await expect(
    dialog.getByRole("button", { name: "PDF herunterladen", exact: true }),
  ).toBeEnabled();
});

test("preparation waits for fonts and both pagination signals, and refuses overflow", async ({
  page,
}) => {
  await seed(page, parityStorage("brief"));
  await open(page);
  await page.evaluate(async () => {
    const root = document.querySelector<HTMLElement>("[data-dossier-pdf-canvas]")!;
    const letter = root.querySelector<HTMLElement>("[data-letter-document-root]")!;
    root.dataset.dossierCvReady = "true";
    letter.dataset.letterPaginationReady = "true";
    const target = window as typeof window & {
      releaseNativeFonts: () => void;
      nativePreparation: Promise<unknown>;
      nativePreparationResolved: boolean;
      nativeRelease: () => void;
    };
    const fontPromise = new Promise<FontFaceSet>((resolve) => {
      target.releaseNativeFonts = () => resolve(document.fonts);
    });
    Object.defineProperty(document.fonts, "ready", { configurable: true, value: fontPromise });
    const { prepareDossierNativePrint } = await import(String("/src/lib/dossier-native-print.ts"));
    target.nativePreparationResolved = false;
    target.nativePreparation = prepareDossierNativePrint(root).then(
      (prepared: { release: () => void }) => {
        target.nativeRelease = prepared.release;
        target.nativePreparationResolved = true;
      },
    );
  });
  // Both paginations are ready, but pending fonts must still block activation.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(page.locator("body")).not.toHaveAttribute("data-dossier-native-print");
  expect(await calls(page)).toHaveLength(0);
  await page.evaluate(() => {
    document.querySelector<HTMLElement>(
      "[data-letter-document-root]",
    )!.dataset.letterPaginationReady = "false";
    document.querySelector<HTMLElement>("[data-dossier-pdf-canvas]")!.dataset.dossierCvReady =
      "false";
    (window as typeof window & { releaseNativeFonts: () => void }).releaseNativeFonts();
  });
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(page.locator("body")).not.toHaveAttribute("data-dossier-native-print");
  await page.evaluate(() => {
    document.querySelector<HTMLElement>(
      "[data-letter-document-root]",
    )!.dataset.letterPaginationReady = "true";
  });
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  // Letter has settled; CV alone is still pending.
  await expect(page.locator("body")).not.toHaveAttribute("data-dossier-native-print");
  await page.evaluate(() => {
    document.querySelector<HTMLElement>("[data-dossier-pdf-canvas]")!.dataset.dossierCvReady =
      "true";
  });
  await page.evaluate(
    () => (window as typeof window & { nativePreparation: Promise<unknown> }).nativePreparation,
  );
  await expect(page.locator("body")).toHaveAttribute("data-dossier-native-print", "true");
  await page.evaluate(() => {
    (window as typeof window & { nativeRelease: () => void }).nativeRelease();
    Reflect.deleteProperty(document.fonts, "ready");
  });
  const error = await page.evaluate(async () => {
    const root = document.querySelector<HTMLElement>("[data-dossier-pdf-canvas]")!;
    const letter = root.querySelector<HTMLElement>("[data-letter-document-root]")!;
    letter.dataset.letterPaginationError = "physical-overflow";
    letter.dataset.letterPaginationErrorMessage = "Overflow guard";
    const { prepareDossierNativePrint } = await import(String("/src/lib/dossier-native-print.ts"));
    try {
      await prepareDossierNativePrint(root);
      return null;
    } catch (cause) {
      return (cause as Error).message;
    }
  });
  expect(error).toBe("Overflow guard");
  expect(await calls(page)).toHaveLength(0);
  await expect(page.locator("body")).not.toHaveAttribute("data-dossier-native-print");
});
