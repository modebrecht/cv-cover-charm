import { describe, expect, test } from "bun:test";
import { TEMPLATES } from "../../src/components/cover/types";
import {
  DOSSIER_FAMILIES,
  familyForTemplate,
  templatesForFamily,
} from "../../src/lib/dossier-family";
import { dossierNameScale, dossierThemeForFamily } from "../../src/lib/dossier-theme";
import {
  DOSSIER_PHOTO_SHAPES,
  dossierPhotoCropStyle,
  dossierPhotoPatchToBlockStyle,
  dossierPhotoRatio,
  normalizeDossierPhotoStyle,
  shapeFromBlockStyle,
} from "../../src/lib/dossier-photo";
import { coverDraftFingerprint, emptyCoverDraft, readCoverPhoto } from "../../src/lib/dossier";
import {
  coverPdfDocumentFromSaved,
  coverPdfHasContent,
  cvPdfDocumentFromSaved,
  cvPdfHasContent,
} from "../../src/lib/dossier-pdf-document";
import { emptyCv } from "../../src/components/cv/types";
import {
  DOSSIER_PROJECT_KIND,
  createDossierProject,
  parseDossierProject,
} from "../../src/lib/dossier-project";

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

  test("cover photo reader restores current title-page crop and shape", () => {
    const cover = JSON.stringify({
      version: 6,
      template: "modern",
      layout: {
        modern: {
          foto: {
            ratio: 1,
            radius: 999,
            imgZoom: 1.8,
            imgX: 20,
            imgY: 65,
            borderWidth: 0.7,
          },
        },
      },
      data: {
        foto: "data:image/svg+xml,%3Csvg%3E%3C/svg%3E",
      },
    });
    const previousWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) => (key === "titelblatt:v3" ? cover : null),
        },
      },
    });

    try {
      expect(readCoverPhoto()).toEqual({
        foto: "data:image/svg+xml,%3Csvg%3E%3C/svg%3E",
        photoStyle: {
          shape: "circle",
          zoom: 1.8,
          x: 20,
          y: 65,
          borderWidth: 0.7,
        },
      });
    } finally {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: previousWindow,
      });
    }
  });
});

describe("title-page change detection", () => {
  test("transferable changes produce a new stable fingerprint", () => {
    const draft = emptyCoverDraft();
    const original = coverDraftFingerprint(draft);

    expect(coverDraftFingerprint({ ...draft })).toBe(original);
    expect(
      coverDraftFingerprint({
        ...draft,
        person: { ...draft.person, vorname: "Lea" },
      }),
    ).not.toBe(original);
    expect(
      coverDraftFingerprint({
        ...draft,
        colors: { ...draft.colors, accent: "#123456" },
      }),
    ).not.toBe(original);
  });
});

describe("combined dossier project", () => {
  test("keeps title page and CV in one versioned file", () => {
    const project = createDossierProject({
      cover: { version: 7, data: { vorname: "Lea" } },
      cv: { version: 6, data: { title: "Lebenslauf" } },
    });

    expect(project.kind).toBe(DOSSIER_PROJECT_KIND);
    expect(parseDossierProject(JSON.parse(JSON.stringify(project)))).toEqual(project);
  });

  test("rejects unrelated JSON and empty project envelopes", () => {
    expect(parseDossierProject({ data: {} })).toBeNull();
    expect(
      parseDossierProject({ kind: DOSSIER_PROJECT_KIND, version: 1, savedAt: "now" }),
    ).toBeNull();
    expect(
      parseDossierProject({
        kind: DOSSIER_PROJECT_KIND,
        version: 1,
        savedAt: "now",
        cover: { version: 7 },
      }),
    ).toBeNull();
  });
});

describe("combined dossier PDF availability", () => {
  test("requires meaningful content in both document parts", () => {
    const emptyCover = coverPdfDocumentFromSaved({
      template: "modern",
      data: { datum: "23.08.2026", ort: "Hubersdorf" },
    });
    const filledCover = coverPdfDocumentFromSaved({
      template: "modern",
      data: { vorname: "Lea", nachname: "Müller" },
    });
    const filledCv = cvPdfDocumentFromSaved({
      data: {
        ...emptyCv,
        schule: [
          { id: "schule-1", zeit: "2023 – heute", titel: "Sek B", ort: "Olten", beschreibung: "" },
        ],
      },
    });

    expect(emptyCover && coverPdfHasContent(emptyCover.data)).toBe(false);
    expect(filledCover && coverPdfHasContent(filledCover.data)).toBe(true);
    expect(cvPdfHasContent(emptyCv)).toBe(false);
    expect(filledCv && cvPdfHasContent(filledCv.data)).toBe(true);
  });
});
