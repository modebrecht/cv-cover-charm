import { describe, expect, test } from "bun:test";
import {
  buildCvPageFitPlan,
  cvPageFitSectionWeight,
  measureCvPageFitSectionHeights,
  cvPageFitKeepsManualPosition,
} from "../../src/components/cv/page-fit";
import {
  DEMO_CV,
  cvSectionOrder,
  normalizeCvSectionLayout,
  type CvData,
} from "../../src/components/cv/types";
import { DEFAULT_DOSSIER_CHROME_OPTIONS } from "../../src/lib/dossier-chrome";
import {
  defaultHeaderFontSizePtForTemplate,
  resolveTemplateChromeOptions,
} from "../../src/lib/template-chrome";

describe("CV pupil page fit", () => {
  test("moves every rubric back to page 1 in one-page mode", () => {
    const plan = buildCvPageFitPlan(DEMO_CV, "one");
    for (const key of cvSectionOrder(DEMO_CV)) {
      expect(plan.pageBySection[key]).toBe(1);
    }
  });

  test("uses Masonry for safe compact rubrics before shrinking one-page content", () => {
    const plan = buildCvPageFitPlan(DEMO_CV, "one", { allowHalfWidth: true });

    expect(plan.widthBySection.schule).toBe("full");
    expect(plan.widthBySection.erfahrung).toBe("full");
    expect(plan.widthBySection.referenzen).toBe("full");
    expect(plan.packingBySection.schule).toBe("rows");
    expect(plan.packingBySection.erfahrung).toBe("rows");
    expect(plan.packingBySection.referenzen).toBe("rows");

    for (const key of ["sprachen", "hobbys", "staerken"] as const) {
      expect(plan.widthBySection[key]).toBe("half");
      expect(plan.packingBySection[key]).toBe("masonry");
    }
    expect(plan.effectiveWeight).toBeLessThan(plan.totalWeight);
  });

  test("does not split an already narrow sidebar into Masonry columns", () => {
    const plan = buildCvPageFitPlan(DEMO_CV, "one", { allowHalfWidth: false });
    for (const key of cvSectionOrder(DEMO_CV)) {
      expect(plan.widthBySection[key]).toBe("full");
      expect(plan.packingBySection[key]).toBe("rows");
    }
    expect(plan.effectiveWeight).toBe(plan.totalWeight);
  });

  test("keeps personal data on page 1 and gives real content to page 2", () => {
    const plan = buildCvPageFitPlan(DEMO_CV, "two");
    expect(plan.pageBySection.person).toBe(1);

    const pageTwoContent = cvSectionOrder(DEMO_CV).filter(
      (key) => plan.pageBySection[key] === 2 && cvPageFitSectionWeight(DEMO_CV, key) > 0,
    );
    expect(pageTwoContent.length).toBeGreaterThan(0);
    for (const key of cvSectionOrder(DEMO_CV)) {
      expect(plan.widthBySection[key]).toBe("full");
      expect(plan.packingBySection[key]).toBe("rows");
    }
  });

  test("keeps legacy section layouts on normal rows and preserves explicit Masonry", () => {
    expect(normalizeCvSectionLayout({ positioning: "flow", width: "half" }).packing).toBe("rows");
    expect(
      normalizeCvSectionLayout({ positioning: "flow", width: "half", packing: "masonry" }).packing,
    ).toBe("masonry");
  });

  test("tightens dense one-page content without crossing the safe scale floor", () => {
    const dense: CvData = {
      ...DEMO_CV,
      erfahrung: DEMO_CV.erfahrung.map((entry, index) => ({
        ...entry,
        id: `${entry.id}-${index}`,
        beschreibung: `${entry.beschreibung} ${"Langer Bewerbungstext ".repeat(20)}`,
      })),
    };
    const plan = buildCvPageFitPlan(dense, "one");
    expect(plan.bodyScaleFactor).toBeLessThan(1);
    expect(plan.bodyScaleFactor).toBeGreaterThanOrEqual(0.82);
  });
});

describe("dossier header default typography", () => {
  test("uses 14 pt by default in every template resolver", () => {
    expect(defaultHeaderFontSizePtForTemplate("brief")).toBe(14);
    expect(
      resolveTemplateChromeOptions("brief", {}, DEFAULT_DOSSIER_CHROME_OPTIONS).headerFontSizePt,
    ).toBe(14);
  });

  test("keeps an explicit user header size", () => {
    expect(
      resolveTemplateChromeOptions(
        "brief",
        {},
        {
          ...DEFAULT_DOSSIER_CHROME_OPTIONS,
          headerFontSizePt: 11,
        },
      ).headerFontSizePt,
    ).toBe(11);
  });
});

describe("measured two-page CV balancing", () => {
  const measured = {
    person: 140,
    "custom:familie": 56,
    schule: 112,
    erfahrung: 131,
    sprachen: 73,
    hobbys: 75,
    staerken: 75,
    referenzen: 79,
  };

  test("uses actual sheet heights and brings practical experience onto the underfilled first page", () => {
    const original = structuredClone(DEMO_CV);
    const estimate = buildCvPageFitPlan(original, "two");
    const plan = buildCvPageFitPlan(original, "two", { measuredSectionHeightsPx: measured });
    expect(estimate.pageBySection.erfahrung).toBe(2);
    expect(plan.pageBySection.erfahrung).toBe(1);
    expect(plan.pageBySection.sprachen).toBe(2);
    expect(plan.pageBySection.referenzen).toBe(2);
    expect(plan.pageBySection.person).toBe(1);
    expect(plan.widthBySection.erfahrung).toBe("full");
    expect(plan.packingBySection.erfahrung).toBe("rows");
    expect(original).toEqual(DEMO_CV);
  });

  test("reads modern and classic canvas row IDs from the unpaginated measuring sheet", () => {
    const fakeRow = (id: string, height: number) => ({
      dataset: { cvContentRow: id },
      getBoundingClientRect: () => ({ height }),
    });
    const rows = [
      fakeRow("kopf", 140),
      fakeRow("layout-custom:familie", 56),
      fakeRow("h-schule", 10),
      fakeRow("schule-entry-1", 102),
      fakeRow("layout-erfahrung", 131),
      fakeRow("layout-sprachen", 73),
      fakeRow("layout-hobbys", 75),
      fakeRow("layout-staerken", 75),
      fakeRow("layout-referenzen", 79),
    ];
    const canvas = {
      querySelectorAll: (selector: string) => {
        expect(selector).toBe("[data-cv-measure-page] [data-cv-content-row]");
        return rows;
      },
    } as unknown as HTMLElement;
    expect(measureCvPageFitSectionHeights(canvas)).toEqual(measured);
    expect(measureCvPageFitSectionHeights(null)).toBeNull();
  });

  test("explicit free placements are protected from automatic page redistribution", () => {
    const data = structuredClone(DEMO_CV);
    data.sectionLayouts = {
      ...data.sectionLayouts,
      erfahrung: {
        page: 2,
        width: "half",
        packing: "rows",
        positioning: "free",
        x: 25,
        y: 68,
        widthMm: 90,
        heightMm: 50,
      },
    };
    expect(cvPageFitKeepsManualPosition(data, "erfahrung")).toBe(true);
    expect(cvPageFitKeepsManualPosition(data, "schule")).toBe(false);
    expect(
      buildCvPageFitPlan(data, "two", {
        measuredSectionHeightsPx: measured,
      }).pageBySection.erfahrung,
    ).toBe(1);
    // The action's UI adapter deliberately skips assigning this section.
    expect(data.sectionLayouts.erfahrung).toMatchObject({
      page: 2,
      positioning: "free",
      x: 25,
      y: 68,
    });
  });
  test("incomplete or invalid sheet heights fall back to the stable source-weight plan", () => {
    const fallback = buildCvPageFitPlan(DEMO_CV, "two").pageBySection;
    expect(
      buildCvPageFitPlan(DEMO_CV, "two", {
        measuredSectionHeightsPx: { ...measured, schule: NaN },
      }).pageBySection,
    ).toEqual(fallback);
    expect(
      buildCvPageFitPlan(DEMO_CV, "two", {
        measuredSectionHeightsPx: { person: 140, schule: 112 },
      }).pageBySection,
    ).toEqual(fallback);
  });
});
