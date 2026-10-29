import { describe, expect, test } from "bun:test";
import {
  planCvMeasuredTwoPages,
  type CvTwoPageMeasurement,
} from "../../src/components/cv/page-fit";
import { DEMO_CV } from "../../src/components/cv/types";

const measurement = (): CvTwoPageMeasurement => ({
  main: {
    person: 140,
    "custom:familie": 56,
    schule: 112,
    erfahrung: 131,
    sprachen: 73,
    hobbys: 75,
    staerken: 75,
    referenzen: 79,
  },
  sidebar: {},
  mainCapacity: [900, 900],
  sidebarCapacity: [900, 900],
  sidebarFixed: [0, 0],
});

describe("full-width measured two-page CV planning", () => {
  test("uses measured section heights and preserves the source", () => {
    const data = structuredClone(DEMO_CV),
      before = JSON.stringify(data);
    const plan = planCvMeasuredTwoPages(data, measurement())!;
    expect(plan.erfahrung).toBe(1);
    expect(plan.sprachen).toBe(2);
    expect(plan.referenzen).toBe(2);
    expect(JSON.stringify(data)).toBe(before);
  });
  test("moves more content to the first sheet when continuation capacity is smaller", () => {
    const measured = measurement();
    measured.mainCapacity[1] = 400;
    const plan = planCvMeasuredTwoPages(DEMO_CV, measured)!;
    expect(plan.sprachen).toBe(1);
    expect(plan.hobbys).toBe(2);
  });
  test("balances Sidebar independently and reserves first-page contact/photo space", () => {
    const measured = measurement();
    measured.main = {
      person: 140,
      "custom:familie": 50,
      schule: 100,
      erfahrung: 100,
      referenzen: 50,
    };
    measured.sidebar = { sprachen: 500, hobbys: 250, staerken: 150 };
    measured.sidebarFixed = [250, 0];
    const plan = planCvMeasuredTwoPages(DEMO_CV, measured, ["sprachen", "hobbys", "staerken"])!;
    expect(plan.sprachen).toBe(1);
    expect(plan.hobbys).toBe(2);
    expect(plan.erfahrung).toBe(2);
  });
  test("does not plan a new page or position for a free section", () => {
    const data = structuredClone(DEMO_CV);
    data.sectionLayouts = { erfahrung: { page: 2, positioning: "free", x: 20, y: 40 } };
    expect(planCvMeasuredTwoPages(data, measurement())!.erfahrung).toBeUndefined();
    expect(data.sectionLayouts.erfahrung).toEqual({ page: 2, positioning: "free", x: 20, y: 40 });
  });
  test("accepts a header outside the main flow and rejects incomplete or invalid geometry", () => {
    const measured = measurement();
    delete measured.main.person;
    expect(planCvMeasuredTwoPages(DEMO_CV, measured)).not.toBeNull();
    delete measured.main.erfahrung;
    expect(planCvMeasuredTwoPages(DEMO_CV, measured)).toBeNull();
    for (const invalid of [0, -1, Infinity, NaN]) {
      const value = measurement();
      value.mainCapacity[1] = invalid;
      expect(planCvMeasuredTwoPages(DEMO_CV, value)).toBeNull();
    }
  });
});
