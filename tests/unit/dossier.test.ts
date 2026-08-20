import { describe, expect, test } from "bun:test";
import { TEMPLATES } from "../../src/components/cover/types";
import {
  DOSSIER_FAMILIES,
  familyForTemplate,
  templatesForFamily,
} from "../../src/lib/dossier-family";
import {
  dossierNameScale,
  dossierThemeForFamily,
} from "../../src/lib/dossier-theme";
import {
  DOSSIER_PHOTO_SHAPES,
  dossierPhotoCropStyle,
  dossierPhotoPatchToBlockStyle,
  dossierPhotoRatio,
  normalizeDossierPhotoStyle,
  shapeFromBlockStyle,
} from "../../src/lib/dossier-photo";

describe("dossier families", () => {
  test("every cover template belongs to exactly one premium family", () => {
    const knownFamilies = new Set(DOSSIER_FAMILIES.map((family) => family.id));

    for (const template of TEMPLATES) {
      expect(knownFamilies.has(familyForTemplate(template.id))).toBe(true);
    }
  });

  test("each family exposes templates and its curated default belongs to that family", () => {
    for (const family of DOSSIER_FAMILIES) {
      const templates = templatesForFamily(family.id);
      expect(templates.length).toBeGreaterThan(0);
      expect(templates).toContain(family.coverTemplate);
    }
  });

  test("family themes expose distinct, production-safe design tokens", () => {
    const themes = DOSSIER_FAMILIES.map((family) => dossierThemeForFamily(family.id));

    for (const theme of themes) {
      expect(theme.typography.fontStack.length).toBeGreaterThan(10);
      expect(theme.typography.bodyLineHeight).toBeGreaterThanOrEqual(1.3);
      expect(theme.lineThicknessMm).toBeGreaterThan(0);
      expect(theme.lineThicknessMm).toBeLessThan(1);
      expect(theme.spacingDensity).toBeGreaterThan(0.8);
      expect(theme.spacingDensity).toBeLessThan(1.25);
      expect(theme.photoTreatment.contrast).toBeGreaterThan(0.8);
      expect(theme.backgroundIntensity).toBeGreaterThan(0);
      expect(theme.backgroundIntensity).toBeLessThanOrEqual(1);
    }

    expect(new Set(themes.map((theme) => theme.lineThicknessMm)).size).toBeGreaterThan(1);
  });
});

describe("responsive dossier typography", () => {
  test("long names scale down monotonically without becoming unreadably small", () => {
    const short = dossierNameScale("Lea Müller");
    const medium = dossierNameScale("Lea Sophie Müller-Winterberger");
    const long = dossierNameScale("Lea Sophie Alexandra Müller-Winterberger-Schneider");

    expect(short).toBe(1);
    expect(medium).toBeLessThanOrEqual(short);
    expect(long).toBeLessThan(medium);
    expect(long).toBeGreaterThanOrEqual(0.7);
  });
});

describe("unified photo model", () => {
  test("all four dossier photo shapes stay available", () => {
    expect(DOSSIER_PHOTO_SHAPES.map((shape) => shape.id)).toEqual([
      "rect",
      "square",
      "portrait",
      "circle",
    ]);
  });

  test("normalization clamps unsafe values but preserves real zero positions", () => {
    expect(
      normalizeDossierPhotoStyle({
        shape: "circle",
        zoom: 9,
        x: 0,
        y: 0,
        borderWidth: -4,
      }),
    ).toEqual({
      shape: "circle",
      zoom: 3,
      x: 0,
      y: 0,
      borderWidth: 0,
    });
  });

  test("shape geometry round-trips through title-page BlockStyle", () => {
    for (const shape of DOSSIER_PHOTO_SHAPES.map((item) => item.id)) {
      const patch = dossierPhotoPatchToBlockStyle({ shape });
      expect(shapeFromBlockStyle(patch)).toBe(shape);
      expect(patch.ratio).toBe(dossierPhotoRatio(shape));
    }
  });

  test("crop math is deterministic for title page and CV", () => {
    const style = normalizeDossierPhotoStyle({ zoom: 1.6, x: 25, y: 75 });
    const crop = dossierPhotoCropStyle(style);

    expect(Number.parseFloat(String(crop.width))).toBeCloseTo(160, 6);
    expect(Number.parseFloat(String(crop.height))).toBeCloseTo(160, 6);
    expect(Number.parseFloat(String(crop.left))).toBeCloseTo(-15, 6);
    expect(Number.parseFloat(String(crop.top))).toBeCloseTo(-45, 6);
  });
});
