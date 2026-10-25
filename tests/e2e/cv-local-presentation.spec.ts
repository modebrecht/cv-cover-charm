import { expect, test, type Page } from "@playwright/test";
import type { FixtureCase } from "./support/cv-renderer-fixture";

async function mount(page: Page, cases: FixtureCase[]) {
  await page.evaluate(async (items) => {
    const path = "/tests/e2e/support/cv-renderer-fixture.tsx";
    const fixture = await import(/* @vite-ignore */ path);
    fixture.mountCvFixtures(items);
    await document.fonts.ready;
  }, cases);
  await expect(page.locator('[data-fixture] [data-cv-page="0"]')).toHaveCount(cases.length);
  await page.waitForTimeout(300);
}
async function state(page: Page) {
  return page.locator("[data-fixture]").evaluateAll((nodes) =>
    nodes.map((root) => {
      const cv = root.querySelector<HTMLElement>('[data-dossier-document="cv"]')!;
      const style = (selector: string) => {
        const node = cv.querySelector<HTMLElement>(selector);
        if (!node) return null;
        const s = getComputedStyle(node);
        return [
          s.left,
          s.right,
          s.top,
          s.bottom,
          s.width,
          s.height,
          s.borderRadius,
          s.marginTop,
          s.fontFamily,
        ];
      };
      return {
        dataset: { ...cv.dataset },
        pages: cv.querySelectorAll("[data-cv-page]").length,
        main: style('[data-cv-page="0"] > [data-cv-main]'),
        measure: style("[data-cv-measure-page] > [data-cv-main]"),
        photo: style('[data-cv-page="0"] [data-cv-photo]'),
        crop: style('[data-cv-page="0"] [data-cv-photo] img'),
        sidebar: style("[data-cv-sidebar]"),
        axis: getComputedStyle(cv.querySelector('[data-cv-page="0"] > [data-cv-main]')!, "::before")
          .content,
      };
    }),
  );
}

test("two CV instances own template, layout, mirror, crop, margins and photo shape simultaneously", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4173/");
  await page.evaluate(() => {
    localStorage.clear();
    document.documentElement.dataset.dossierTemplate = "brief";
  });
  const rootBefore = await page.evaluate(() => ({
    dataset: { ...document.documentElement.dataset },
    style: document.documentElement.style.cssText,
  }));
  await mount(page, [
    {
      id: "a",
      template: "studio3",
      presentation: {
        layoutChoice: "timeline",
        infoPosition: "standard",
        photoStyle: { shape: "circle", zoom: 1.4, x: 20, y: 70, borderWidth: 1 },
        sectionGapMm: 3,
      },
    },
    {
      id: "b",
      template: "gallery",
      sidebarPct: 22,
      presentation: {
        layoutChoice: "modern",
        infoPosition: "mirrored",
        photoStyle: { shape: "rect", zoom: 2, x: 80, y: 10, borderWidth: 0.5 },
        pageMargins: { top: 40, left: 30, right: 78, bottom: 1 },
      },
    },
  ]);
  expect(
    await page.evaluate(() => ({
      dataset: { ...document.documentElement.dataset },
      style: document.documentElement.style.cssText,
    })),
  ).toEqual(rootBefore);
  const before = await state(page);
  expect(before[0].dataset).toMatchObject({
    cvTemplate: "studio3",
    cvVariant: "timeline",
    cvPhotoShape: "circle",
    cvMirrored: "false",
  });
  expect(before[1].dataset).toMatchObject({
    cvTemplate: "gallery",
    cvLayout: "modern",
    cvPhotoShape: "rect",
    cvMirrored: "true",
  });
  expect(before[0].axis).toBe('""');
  for (const item of before) expect(item.measure?.slice(0, 5)).toEqual(item.main?.slice(0, 5));
  expect(Number.parseFloat(before[1].main![0])).toBeCloseTo((78 * 96) / 25.4, 2); // mirrored saved margin
  const writes = await page.evaluate(() => {
    const root = document.documentElement;
    root.dataset.cvVariant = "editorial";
    root.dataset.cvMirrored = "true";
    root.dataset.cvPhotoShape = "square";
    root.dataset.cvInfoPosition = "standard";
    root.dataset.cvSectionGap = "custom";
    root.style.setProperty("--cv-photo-width", "300%");
    root.style.setProperty("--cv-photo-left", "-99%");
    root.style.setProperty("--cv-section-gap", "20mm");
    root.style.setProperty("--cv-doc-title-margin-top", "99px");
    return root.outerHTML.slice(0, root.outerHTML.indexOf(">") + 1);
  });
  await page.waitForTimeout(150);
  expect(await state(page)).toEqual(before);
  expect(
    await page.evaluate(() =>
      document.documentElement.outerHTML.slice(
        0,
        document.documentElement.outerHTML.indexOf(">") + 1,
      ),
    ),
  ).toEqual(writes);
});

test("local classic, sidebar sides, Timeline, Magazin and every photo shape survive hostile html state", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto("http://127.0.0.1:4173/");
  for (const [layoutChoice, infoPosition, shape] of [
    ["classic", "standard", "rect"],
    ["modern", "standard", "square"],
    ["modern", "mirrored", "portrait"],
    ["timeline", "standard", "circle"],
    ["editorial", "mirrored", "rect"],
  ] as const) {
    await mount(page, [
      {
        id: "a",
        template: "ledger",
        long: layoutChoice === "classic",
        sidebarPct: 22,
        presentation: {
          layoutChoice,
          infoPosition,
          photoStyle: { shape, zoom: 1, x: 50, y: 50, borderWidth: 0.3 },
        },
      },
    ]);
    const before = await state(page);
    expect(before[0].dataset.cvVariant).toBe(layoutChoice);
    expect(before[0].dataset.cvPhotoShape).toBe(shape);
    if (layoutChoice === "classic") expect(before[0].pages).toBeGreaterThan(1);
    await page.evaluate(() => {
      document.documentElement.dataset.cvVariant = "minimal";
      document.documentElement.dataset.cvMirrored = "false";
      document.documentElement.dataset.cvPhotoShape = "circle";
    });
    expect(await state(page)).toEqual(before);
  }
});
