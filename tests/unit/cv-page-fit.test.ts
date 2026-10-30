import { describe, expect, test } from "bun:test";
import {
  buildCvPageFitPlan,
  cvPageFitSectionWeight,
  measureCvPageFitSectionHeights,
  cvPageFitKeepsManualPosition,
  chooseCvSmartPageFitMode,
  measureCvPageFitCapacityPx,
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

  test("does not choose one-page typography from character counts", () => {
    const dense: CvData = {
      ...DEMO_CV,
      erfahrung: DEMO_CV.erfahrung.map((entry, index) => ({
        ...entry,
        id: `${entry.id}-${index}`,
        beschreibung: `${entry.beschreibung} ${"Langer Bewerbungstext ".repeat(20)}`,
      })),
    };
    const plan = buildCvPageFitPlan(dense, "one");
    expect(plan.bodyScaleFactor).toBe(1);
    expect(plan.headingScaleFactor).toBe(1);
    expect(plan.titleScaleFactor).toBe(1);
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

describe("intelligent 1–2 page choice", () => {
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
  test("keeps a short CV on one page instead of creating two mostly empty sheets", () => {
    const data = structuredClone(DEMO_CV);
    const before = JSON.stringify(data);
    expect(chooseCvSmartPageFitMode(data, measured, 900)).toBe("one");
    expect(buildCvPageFitPlan(data, "one").pageBySection.referenzen).toBe(1);
    expect(JSON.stringify(data)).toBe(before);
  });
  test("repeating automatic fit keeps an already-fitting compact one-page layout", () => {
    const compacted = {
      person: 114,
      "custom:familie": 50,
      schule: 94,
      erfahrung: 238,
      referenzen: 69,
    };
    expect(chooseCvSmartPageFitMode(DEMO_CV, compacted, 875, true)).toBe("one");
    expect(chooseCvSmartPageFitMode(DEMO_CV, compacted, 875, false)).toBe("two");
    expect(chooseCvSmartPageFitMode(DEMO_CV, compacted, 610, true)).toBe("two");
  });
  test("uses two pages when the actual content exceeds conservative available capacity", () => {
    expect(chooseCvSmartPageFitMode(DEMO_CV, measured, 740)).toBe("two");
    expect(chooseCvSmartPageFitMode(DEMO_CV, measured, 0)).toBe("two");
    expect(chooseCvSmartPageFitMode(DEMO_CV, null, 900)).toBe("two");
    expect(chooseCvSmartPageFitMode(DEMO_CV, { ...measured, schule: NaN }, 900)).toBe("two");
  });
  test("keeps a manually free-positioned second-page section on page two", () => {
    const data = structuredClone(DEMO_CV);
    data.sectionLayouts = {
      ...data.sectionLayouts,
      erfahrung: {
        ...normalizeCvSectionLayout(data.sectionLayouts?.erfahrung),
        positioning: "free",
        page: 2,
        x: 25,
        y: 40,
      },
    };
    expect(chooseCvSmartPageFitMode(data, measured, 900)).toBe("two");
  });
  test("reads the effective first A4 content area, not the entire paper height", () => {
    const elem = { getBoundingClientRect: () => ({ height: 912 }) };
    const canvas = {
      querySelector: (selector: string) => {
        expect(selector).toBe('[data-cv-page="0"] [data-cv-main]');
        return elem;
      },
    } as unknown as HTMLElement;
    expect(measureCvPageFitCapacityPx(canvas)).toBe(912);
    expect(measureCvPageFitCapacityPx(null)).toBeNull();
  });

  test("compares independent Sidebar and main-column demand instead of requiring Sidebar rows in main", () => {
    const mainSectionKeys = [
      "person",
      "custom:familie",
      "schule",
      "erfahrung",
      "referenzen",
    ] as const;
    const main = { person: 75, "custom:familie": 67, schule: 104, erfahrung: 122, referenzen: 74 };
    expect(chooseCvSmartPageFitMode(DEMO_CV, main, 875, false)).toBe("two");
    expect(
      chooseCvSmartPageFitMode(DEMO_CV, main, 875, false, {
        mainSectionKeys,
        sidebarFitsFirstPage: true,
      }),
    ).toBe("one");
    for (const sidebarFitsFirstPage of [false, undefined]) {
      expect(
        chooseCvSmartPageFitMode(DEMO_CV, main, 875, false, {
          mainSectionKeys,
          sidebarFitsFirstPage,
        }),
      ).toBe("two");
    }
    expect(
      chooseCvSmartPageFitMode(DEMO_CV, { ...main, erfahrung: 1200 }, 875, false, {
        mainSectionKeys,
        sidebarFitsFirstPage: true,
      }),
    ).toBe("two");
  });

  test("a measured Sidebar cannot override free second-page placement", () => {
    const data = structuredClone(DEMO_CV);
    data.sectionLayouts = {
      sprachen: { ...normalizeCvSectionLayout(undefined), positioning: "free", page: 2 },
    };
    expect(
      chooseCvSmartPageFitMode(data, measured, 900, false, {
        mainSectionKeys: ["person", "custom:familie", "schule", "erfahrung", "referenzen"],
        sidebarFitsFirstPage: true,
      }),
    ).toBe("two");
  });
});

describe("automatic compact classic flow demand", () => {
  test("complete paginator demand permits one page when grouped rows have no separate rubric heights", () => {
    expect(
      chooseCvSmartPageFitMode(DEMO_CV, { person: 100, erfahrung: 199 }, 695, false, {
        measuredFlowDemand: 0.68,
      }),
    ).toBe("one");
    expect(chooseCvSmartPageFitMode(DEMO_CV, null, null, false, { measuredFlowDemand: 0.68 })).toBe(
      "one",
    );
  });
  test("compact rows retain the ten-percent reserve and reject missing or invalid full demand", () => {
    for (const demand of [0.91, 1.1, null, NaN, Infinity, 0, -1])
      expect(
        chooseCvSmartPageFitMode(DEMO_CV, { person: 1 }, 1000, true, {
          measuredFlowDemand: demand,
        }),
      ).toBe("two");
  });
  test("a free second-page placement wins over a small complete flow demand", () => {
    const data = structuredClone(DEMO_CV);
    data.sectionLayouts = {
      ...data.sectionLayouts,
      referenzen: { page: 2, width: "full", positioning: "free", packing: "rows" },
    };
    expect(chooseCvSmartPageFitMode(data, null, null, false, { measuredFlowDemand: 0.2 })).toBe(
      "two",
    );
  });
});
