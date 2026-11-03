import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { parseDossierProject } from "../../src/lib/dossier-project";
import reviewedProject from "../fixtures/import/modern-sidebar-from-23okt.json" with { type: "json" };
import existingProjects from "../fixtures/import/historical-projects-28okt.json" with { type: "json" };

const base = {
  kind: "cv-cover-charm-dossier",
  version: 1,
  savedAt: "2026-11-03T08:00:00.000Z",
  cv: { version: 6, data: { person: { vorname: "Testperson" } } },
};

describe("project file settings validation before replacement", () => {
  test("all 67 existing project fixtures retain file compatibility at their frozen hashes", () => {
    expect(existingProjects).toHaveLength(67);
    for (const fixture of existingProjects) {
      const bytes = readFileSync(new URL(`../../${fixture.path}`, import.meta.url));
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(fixture.sha256);
      if (!parseDossierProject(JSON.parse(bytes.toString("utf8")) as unknown))
        throw new Error(`Supported project rejected: ${fixture.path}`);
    }
  });
  test("the reviewed project retains legacy automatic spacing encoded as null", () => {
    expect(reviewedProject.cv.portableState.sectionGapMm).toBeNull();
    expect(parseDossierProject(reviewedProject)).not.toBeNull();
    expect(
      parseDossierProject({
        ...base,
        cv: {
          ...base.cv,
          portableState: { continuationGapMm: null, continuationTopMarginMm: null },
        },
      }),
    ).not.toBeNull();
  });
  test("corrupt shared settings cannot silently disappear or become defaults", () => {
    for (const bad of [
      { chrome: [] },
      { chrome: { shared: [] } },
      { chrome: { sync: "false" } },
      { chrome: { cv: { headerShowEmail: "false" } } },
      { chrome: { shared: { headerHeightMm: "broken" } } },
      { chrome: { version: 2 } },
      { chrome: { shared: { headerMode: "unsupported" } } },
      { hyphenation: [] },
      { hyphenation: { enabled: "false" } },
      { pageMargins: [] },
      { pageMargins: { cv: { top: 12, right: 12, bottom: 1 } } },
      { pageMargins: { letter: { top: "broken", right: 12, bottom: 12, left: 12 } } },
      { fieldTypography: { cv: [] } },
      { fieldTypography: { cv: { field: { value: "Text", style: { bold: "yes" } } } } },
      { fieldTypography: { version: 2, cv: {}, letter: {} } },
      { pageMargins: { cv: { top: Infinity, right: 12, bottom: 1, left: 12 } } },
    ]) {
      expect(parseDossierProject({ ...base, ...bad })).toBeNull();
    }
  });

  test("corrupt CV sidecars cannot silently reset layout or photo settings", () => {
    for (const portableState of [
      [],
      "broken",
      { mirrored: "true" },
      { layout: "unsupported" },
      { sectionGapMm: "eight" },
      { placements: [] },
      { placements: { schule: {} } },
      { placements: { schule: "unsupported" } },
      { photoStyle: [] },
      { photoStyle: { zoom: "broken" } },
      { photoStyle: { shape: "unsupported" } },
      { photoPlacement: { widthMm: {} } },
      { photoPlacement: { mode: "unsupported" } },
      { textAlign: {} },
    ]) {
      expect(parseDossierProject({ ...base, cv: { ...base.cv, portableState } })).toBeNull();
    }
  });

  test("legacy missing extensions and supported partial settings stay readable", () => {
    expect(parseDossierProject(base)?.cv).toEqual(base.cv);
    for (const hyphenation of [false, true, { enabled: true }]) {
      expect(parseDossierProject({ ...base, hyphenation })).not.toBeNull();
    }
    const project = parseDossierProject({
      ...base,
      chrome: { shared: { headerHeightMm: "20", headerInlineSeparator: "icons" } },
      pageMargins: { letter: { top: "12", right: 14, bottom: 16, left: 18 } },
      cv: {
        ...base.cv,
        portableState: {
          layout: "executive",
          continuationGapMm: 8,
          photoStyle: { zoom: 1.6, x: 30, y: 70 },
          photoPlacement: { mode: "auto", frameColor: null },
          futureAddition: { retained: true },
        },
      },
    });
    expect(project?.chrome?.shared.headerHeightMm).toBe(20);
    expect(project?.chrome?.shared.headerInlineSeparator).toBe("dot");
    expect(project?.pageMargins?.letter).toEqual({ top: 12, right: 14, bottom: 16, left: 18 });
    expect(project?.cv?.portableState).toEqual({
      layout: "executive",
      continuationGapMm: 8,
      photoStyle: { zoom: 1.6, x: 30, y: 70 },
      photoPlacement: { mode: "auto", frameColor: null },
      futureAddition: { retained: true },
    });
  });
});
