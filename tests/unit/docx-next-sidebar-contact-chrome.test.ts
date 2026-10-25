import { test, expect } from "bun:test";
import fixture from "../fixtures/docx-next/sidebar-contact-chrome-23okt.json";
import { cvFrameFor } from "../../src/components/cv/archetype";
import { cvSidebarGeometry } from "../../src/components/cv/sidebar-geometry";
import { DEFAULT_DOSSIER_CHROME_OPTIONS } from "../../src/lib/dossier-chrome";
import { buildDossierDocModel, type BuildModelOptions } from "../../src/lib/docx-next/build-model";
import { validateDossierDocModel } from "../../src/lib/docx-next/validation";
import { walkBlocks } from "../../src/lib/docx-next/model";
import { orderedPagePaint } from "../../src/lib/docx-next/page-artwork";
import type { DossierAppSnapshot } from "../../src/lib/docx-next/source";
import type { CoverTextMetrics } from "../../src/components/cover/text-metrics";
import type { CvSidebarTextMetrics } from "../../src/lib/docx-next/cv-sidebar-text-metrics";
import type { InteriorTextMetrics } from "../../src/lib/docx-next/interior-metrics";

function setup() {
  const source = structuredClone(fixture.snapshot) as unknown as DossierAppSnapshot;
  const options: BuildModelOptions = {
    coverComposition: "authored-frames",
    coverBadgePlacement: "body",
    coverTextMetrics: structuredClone(fixture.metrics) as CoverTextMetrics,
    cvSidebarComposition: "shared-body-stories",
    cvSidebarTextMetrics: structuredClone(fixture.sidebarMetrics) as CvSidebarTextMetrics,
    interiorTextMetrics: structuredClone(fixture.interiorMetrics) as InteriorTextMetrics,
  };
  return { source, options };
}

test("both Sidebar stories inherit the actual header clearance, including saved page tops", () => {
  for (const side of ["left", "right"] as const)
    for (const mode of ["compact", "contact", "none"] as const) {
      const options = {
        ...DEFAULT_DOSSIER_CHROME_OPTIONS,
        headerMode: mode,
        headerHeightMm: mode === "contact" ? 32 : null,
        headerDifferentFirstPage: false,
      };
      for (const page of [0, 1]) {
        const g = cvSidebarGeometry(
          cvFrameFor("modern"),
          page,
          0.3,
          options,
          { pageMargins: null, continuationTopMarginMm: null },
          side,
          true,
        );
        expect(g.mainText.topMm).toBe(mode === "contact" ? 52 : mode === "compact" ? 24 : 20);
        expect(g.sideText.topMm).toBe(g.mainText.topMm);
        expect(g.rail.leftMm).toBe(side === "left" ? 0 : 147);
        expect(g.rail.widthMm).toBe(63);
      }
      const saved = cvSidebarGeometry(
        cvFrameFor("modern"),
        1,
        0.3,
        options,
        { pageMargins: null, continuationTopMarginMm: 60 },
        side,
        true,
      );
      expect(saved.mainText.topMm).toBe(60);
      expect(saved.sideText.topMm).toBe(60);
    }
});

test("fresh contact headers retain native owners, source pictures and adjacent dossier parts on both sides", () => {
  for (const side of ["left", "right"] as const) {
    const { source, options } = setup();
    source.settings.sidebarSide = side;
    options.cvSidebarTextMetrics!.sourceKey = JSON.stringify(source);
    options.interiorTextMetrics!.sourceKey = JSON.stringify(source);
    const before = structuredClone(source),
      model = buildDossierDocModel(source, options);
    validateDossierDocModel(model);
    expect(source).toEqual(before);
    expect(model.cv.page.margins.top).toBe(52);
    expect(model.cv.headerFrames).toHaveLength(6);
    expect(model.cv.footer).toEqual([]);
    expect(model.cv.headerShapes!.some((s) => s.id.startsWith("cv.compact."))).toBe(false);
    const runs = model.cv
      .headerFrames!.filter((f) => f.repeat === "first")
      .flatMap((f) => f.paragraphs.flatMap((p) => p.runs));
    expect(runs.find((r) => r.fieldId === "cv.person.address")?.text).toBe(
      source.cv.data.person.adresse,
    );
    expect(runs.find((r) => r.fieldId === "cv.person.email")?.text).toBe(
      source.cv.data.person.email,
    );
    const photo = walkBlocks(model.cv.blocks).find((b) => b.id === "cv.person.photo");
    expect(photo?.kind === "image" && photo.source).toBe(source.cv.data.person.foto);
    const adjacent = buildDossierDocModel(source, { ...options, cvSidebarTextMetrics: undefined });
    expect(model.cover).toEqual(adjacent.cover);
    expect(model.letter).toEqual(adjacent.letter);
    const paints = orderedPagePaint(model.cv, true);
    expect(paints.findIndex((s) => s.id === "cv.measured.first.header")).toBeGreaterThan(
      paints.findIndex((s) => s.id === "cv.artwork.sidebar-surface"),
    );
  }
});

test("contact Sidebar fails closed without both fresh measured header stories", () => {
  for (const bad of ["missing", "cv-only", "stale", "compact-paint", "missing-field"] as const) {
    const { source, options } = setup();
    if (bad === "missing") delete options.interiorTextMetrics;
    if (bad === "cv-only") delete options.interiorTextMetrics!.headers.letter;
    if (bad === "stale") options.interiorTextMetrics!.sourceKey += "changed";
    if (bad === "compact-paint") options.compactChromeComposition = "source-bands";
    if (bad === "missing-field") options.interiorTextMetrics!.headers.cv!.first.frames = [];
    expect(() => buildDossierDocModel(source, options)).toThrow();
  }
});
