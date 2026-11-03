import { describe, expect, test } from "bun:test";
import { buildCvOnePageCompactTrials } from "../../src/components/cv/page-fit";
import { DEMO_CV, cvSectionLayout } from "../../src/components/cv/types";

describe("measured one-page compact candidates", () => {
  test("tries individual adjacent pairs before compacting all three short rubrics", () => {
    const data = structuredClone(DEMO_CV);
    data.customSections = [];
    const before = JSON.stringify(data);
    const trials = buildCvOnePageCompactTrials(data);
    const compact = (trial: typeof data) =>
      (["sprachen", "hobbys", "staerken"] as const).filter(
        (key) => cvSectionLayout(trial, key).packing === "masonry",
      );
    expect(trials.map(compact)).toEqual([
      ["sprachen", "hobbys"],
      ["hobbys", "staerken"],
      ["sprachen", "hobbys", "staerken"],
    ]);
    for (const trial of trials) {
      for (const key of ["person", "schule", "erfahrung", "referenzen"] as const)
        expect(cvSectionLayout(trial, key)).toEqual(cvSectionLayout(data, key));
      expect({ ...trial, sectionLayouts: undefined }).toEqual({
        ...data,
        sectionLayouts: undefined,
      });
    }
    expect(JSON.stringify(data)).toBe(before);
  });

  test("a free-positioned rubric breaks a compact group and keeps its coordinates", () => {
    const data = structuredClone(DEMO_CV);
    data.customSections = [];
    data.sectionLayouts = {
      hobbys: { positioning: "free", page: 2, x: 27, y: 42, widthMm: 64 },
    };
    const before = JSON.stringify(data);
    expect(buildCvOnePageCompactTrials(data)).toEqual([]);
    expect(JSON.stringify(data)).toBe(before);
  });

  test("does not invent more changes when all eligible rubrics are already compact", () => {
    const data = structuredClone(DEMO_CV);
    data.customSections = [];
    data.sectionLayouts = Object.fromEntries(
      ["sprachen", "hobbys", "staerken"].map((key) => [
        key,
        { width: "half", packing: "masonry", positioning: "flow", page: 1 },
      ]),
    );
    expect(buildCvOnePageCompactTrials(data)).toEqual([]);
  });
});
