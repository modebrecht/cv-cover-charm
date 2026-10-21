import { expect, test } from "bun:test";
import { cvContentBox, cvFrameFor } from "../../src/components/cv/archetype";
import { resolveDossierChromeSnapshot } from "../../src/lib/dossier-resolved-chrome";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { applyCvPaintedFooterReserve } from "../../src/lib/docx-next/cv-painted-footer";
import { type InteriorTextMetrics } from "../../src/lib/docx-next/interior-metrics";
import type { DossierAppSnapshot } from "../../src/lib/docx-next/source";
import type { CoverTextMetrics } from "../../src/components/cover/text-metrics";
import compactSource from "../fixtures/docx-next/modern-rubric-snapshot.json";
import compactCover from "../fixtures/docx-next/modern-rubric-metrics.json";
import contactSource from "../fixtures/docx-next/modern-header-snapshot.json";
import contactCover from "../fixtures/docx-next/modern-header-metrics.json";
import contactMetrics from "../fixtures/docx-next/modern-header-interior-metrics.json";

function webBottom(input: DossierAppSnapshot) {
  const chrome = resolveDossierChromeSnapshot(input, input.settings.chrome!).cv
    .options;
  return cvContentBox(
    cvFrameFor(input.cv.design.template),
    0,
    "classic",
    undefined,
    chrome,
    {
      pageMargins: input.settings.margins?.cv ?? null,
      continuationTopMarginMm: input.settings.cvContinuationTopMarginMm ?? null,
    },
  ).bottom;
}

test("painted compact CV uses the Web footer budget and retains custom footer heights and saved values", () => {
  for (const height of [null, 8, 18]) {
    const input = structuredClone(
      compactSource,
    ) as unknown as DossierAppSnapshot;
    input.settings.chrome!.shared.footerHeightMm = height;
    const before = JSON.stringify(input);
    const model = buildDossierDocModel(input, {
      coverComposition: "authored-frames",
      coverTextMetrics: structuredClone(compactCover) as CoverTextMetrics,
      compactChromeComposition: "source-bands",
      cvContentComposition: "reading-rows",
    });
    expect(model.cv.page.margins.bottom).toBe(webBottom(input));
    expect(model.cv.page.margins.bottom).toBe(1 + (height ?? 4));
    expect(model.cv.footer).toEqual([]);
    expect(JSON.stringify(input)).toBe(before);
    const band = model.cv.headerShapes!.find(
      (shape) => shape.id === "cv.compact.footer",
    )!;
    expect(band.yMm + band.heightMm).toBe(297);
  }
});

test("measured contact CV replaces the old text-footer reserve and leaves Letter and Cover margins intact", () => {
  const input = structuredClone(contactSource) as unknown as DossierAppSnapshot;
  const before = JSON.stringify(input);
  const options = {
    coverComposition: "authored-frames" as const,
    coverTextMetrics: structuredClone(contactCover) as CoverTextMetrics,
    interiorTextMetrics: structuredClone(
      contactMetrics,
    ) as unknown as InteriorTextMetrics,
  };
  const model = buildDossierDocModel(input, options);
  const prior = buildDossierDocModel(input, {
    ...options,
    interiorTextMetrics: undefined,
  });
  expect(model.cv.page.margins.bottom).toBe(webBottom(input));
  expect(model.cv.page.margins.bottom).toBe(5);
  expect(model.letter.page.margins.bottom).toBe(
    prior.letter.page.margins.bottom,
  );
  expect(model.cover).toEqual(prior.cover);
  expect(JSON.stringify(input)).toBe(before);
  expect(model.cv.headerFrames?.length).toBeGreaterThan(0);
});

test("painted-footer adjustment rejects a live native footer instead of exposing it to body text", () => {
  const input = structuredClone(contactSource) as unknown as DossierAppSnapshot;
  const model = buildDossierDocModel(input);
  const before = structuredClone(model.cv);
  const chrome = resolveDossierChromeSnapshot(input, input.settings.chrome!).cv
    .options;
  expect(model.cv.footer.length).toBeGreaterThan(0);
  expect(() => applyCvPaintedFooterReserve(model.cv, chrome)).toThrow(
    "Textfusszeile",
  );
  expect(model.cv).toEqual(before);
  const letterBefore = structuredClone(model.letter);
  applyCvPaintedFooterReserve(model.letter, chrome);
  expect(model.letter).toEqual(letterBefore);
});
