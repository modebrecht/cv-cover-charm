import { describe, expect, test } from "bun:test";
import { parseDossierProject } from "../../src/lib/dossier-project";
import { parseDossierProjectText } from "../../src/lib/dossier-project-file";

const project = (sectionLayouts: unknown) => ({
  kind: "cv-cover-charm-dossier",
  version: 1,
  savedAt: "2026-11-03T11:00:00.000Z",
  cv: { version: 6, data: { person: { vorname: "Test" }, sectionLayouts } },
});

describe("project file CV section-layout boundary", () => {
  test("rejects malformed maps, unsupported choices and broken coordinates before restore", () => {
    for (const sectionLayouts of [
      [],
      "broken",
      false,
      { erfahrung: [] },
      { erfahrung: "broken" },
      { erfahrung: 42 },
      { erfahrung: false },
      { erfahrung: { page: 0 } },
      { erfahrung: { page: 3 } },
      { erfahrung: { page: "2" } },
      { erfahrung: { width: "narrow" } },
      { erfahrung: { positioning: "absolute" } },
      { erfahrung: { packing: "grid" } },
      { erfahrung: { page: 2, positioning: "free", x: "broken", y: 44 } },
      { erfahrung: { x: "31" } },
      { erfahrung: { y: [] } },
      { erfahrung: { widthMm: {} } },
      { erfahrung: { heightMm: false } },
      { erfahrung: { x: Infinity } },
      { erfahrung: { y: NaN } },
      { "custom:skills": { heightMm: -Infinity } },
    ]) {
      expect(parseDossierProject(project(sectionLayouts))).toBeNull();
    }
    expect(
      parseDossierProjectText(
        JSON.stringify(project({ erfahrung: { x: "overflow" } })).replace('"overflow"', "1e999"),
      ),
    ).toBeNull();
  });

  test("preserves complete, partial and automatic layouts including custom sections", () => {
    const sectionLayouts = {
      erfahrung: {
        page: 2,
        width: "half",
        positioning: "free",
        packing: "rows",
        x: 31.25,
        y: 44.75,
        widthMm: 78,
        heightMm: 42,
      },
      sprachen: { page: 1, width: "half", packing: "masonry" },
      "custom:skills": { page: 2, x: null, y: null, widthMm: null, heightMm: null },
      schule: null,
      referenzen: { futureAddition: { retained: true } },
    };
    const value = project(sectionLayouts);
    const before = JSON.stringify(value);
    expect(parseDossierProject(value)?.cv?.data).toEqual(value.cv.data);
    expect(JSON.stringify(value)).toBe(before);
    for (const automatic of [undefined, null, {}, { erfahrung: {} }, { erfahrung: null }]) {
      expect(parseDossierProject(project(automatic))?.cv?.data).toEqual(project(automatic).cv.data);
    }
  });
});
