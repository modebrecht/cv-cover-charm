import { expect, test } from "bun:test";
import {
  cvReadingDefaults,
  cvSectionTitleFontSizePx,
} from "../../src/components/cv/reading-defaults";
import {
  getCvContinuationTopMarginMm,
  CV_CONTINUATION_TOP_MARGIN_STORAGE_KEY,
  CV_CONTINUATION_GAP_STORAGE_KEY,
} from "../../src/components/cv/layout";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { nativePagePaintGeometry } from "../../src/lib/docx-next/page-artwork";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { validateDossierDocModel } from "../../src/lib/docx-next/validation";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { paintPng } from "../../src/lib/docx-next/artwork";
import { briefFixture } from "../fixtures/docx-next/brief";
import type { CvDesign } from "../../src/components/cv/types";

test("flowing reading defaults preserve explicit typography and frozen layouts", () => {
  const design = { template: "modern", colors: {}, bgOpacity: 0.25 } as CvDesign;
  expect(cvReadingDefaults("modern", "classic")).toEqual({
    continuationTopMm: 20,
    sectionTitleFontSizePx: 14,
  });
  for (const template of ["brief", "modern", "freundlich", "verlauf", "neon"]) {
    for (const layout of ["classic", "minimal", "timeline", "editorial"]) {
      expect(cvReadingDefaults(template, layout)).toEqual({
        continuationTopMm: 20,
        sectionTitleFontSizePx: 14,
      });
    }
  }
  expect(cvSectionTitleFontSizePx(design, "classic")).toBe(14);
  expect(cvSectionTitleFontSizePx({ ...design, sectionTitleFontSizePx: 19 }, "classic")).toBe(19);
  for (const [template, layout] of [
    ["modern", "modern"],
    ["modern", "executive"],
    ["sidebar", "modern"],
  ]) {
    expect(cvReadingDefaults(template, layout)).toEqual({
      continuationTopMm: 10,
      sectionTitleFontSizePx: undefined,
    });
    expect(cvSectionTitleFontSizePx({ ...design, template } as CvDesign, layout)).toBeUndefined();
  }
});

test("missing margins use the scoped default; saved and legacy values remain authoritative without writes", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  const saved = new Map<string, string>();
  try {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { localStorage: { getItem: (key: string) => saved.get(key) ?? null } },
    });
    expect(getCvContinuationTopMarginMm("modern", "classic")).toBe(20);
    expect(getCvContinuationTopMarginMm("modern", "modern")).toBe(10);
    expect(saved.size).toBe(0);
    saved.set(CV_CONTINUATION_TOP_MARGIN_STORAGE_KEY, "10");
    expect(getCvContinuationTopMarginMm("modern", "classic")).toBe(10);
    saved.delete(CV_CONTINUATION_TOP_MARGIN_STORAGE_KEY);
    saved.set(CV_CONTINUATION_GAP_STORAGE_KEY, "17");
    expect(getCvContinuationTopMarginMm("modern", "classic")).toBe(17);
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("native decorative coverage contains the observed Word PDF paper box after whole-twip import", async () => {
  const model = buildDossierDocModel(briefFixture());
  const part = model.letter;
  const geometry = nativePagePaintGeometry(part.page);
  // Actual supplied Word PDF: 595.32 x 841.92 pt; old image: 595.25 x 841.85 pt.
  expect(Math.floor((geometry.widthMm * 1440) / 25.4) / 20).toBeGreaterThanOrEqual(595.32);
  expect(Math.floor((geometry.heightMm * 1440) / 25.4) / 20).toBeGreaterThanOrEqual(841.92);
  const options = {
    allowUnacceptedModelIssues: true,
    rasterizeDecoration: async () => ({
      bytes: paintPng({ color: "111827" }),
      widthPx: 1,
      heightPx: 1,
      extension: "png" as const,
      contentType: "image/png",
    }),
  };
  part.pagePaintComposition = "single-asset";
  part.artwork = [
    {
      kind: "decorative-artwork",
      id: "letter.paper",
      semanticText: false,
      fill: { color: "111827" },
      xMm: 0,
      yMm: 0,
      widthMm: 210,
      heightMm: 297,
    },
  ];
  const entries = async () =>
    readZipEntries(new Uint8Array(await (await renderDossierDocx(model, options)).arrayBuffer()));
  const before = await entries();
  part.pagePaintCoverage = "native-grid";
  const after = await entries();
  const body = (files: typeof before) => files.find((x) => x.name === "word/document.xml")!.bytes;
  expect(body(after)).toEqual(body(before));
  expect(after.filter((x) => x.name.startsWith("word/media/"))).toEqual(
    before.filter((x) => x.name.startsWith("word/media/")),
  );
  const changed = after
    .filter((x) => !before.find((b) => b.name === x.name && String(b.bytes) === String(x.bytes)))
    .map((x) => x.name);
  expect(changed.length).toBeGreaterThan(0);
  expect(changed.every((p) => p.includes("letter-header"))).toBe(true);
  await expect(renderDossierDocx(model)).rejects.toThrow(
    "native page coverage requires the explicit candidate gate",
  );
});

test("native coverage cannot escape its composed chrome scope", () => {
  const model = buildDossierDocModel(briefFixture());
  model.cv.pagePaintCoverage = "native-grid";
  expect(() => validateDossierDocModel(model)).toThrow("native page paint coverage");
  model.cv.pagePaintComposition = "single-asset";
  expect(() => validateDossierDocModel(model)).not.toThrow();
  model.cover.pagePaintCoverage = "native-grid";
  model.cover.pagePaintComposition = "single-asset";
  expect(() => validateDossierDocModel(model)).toThrow("native page paint coverage");
});
