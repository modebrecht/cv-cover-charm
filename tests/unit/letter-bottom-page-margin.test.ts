import { afterEach, describe, expect, test } from "bun:test";
import {
  letterDefaultPageMargins,
  letterFooterHeightMm,
  letterPageGeometry,
} from "@/components/letter/layout-system";
import { DEMO_LETTER, emptyLetterDesign } from "@/components/letter/types";
import {
  CV_PAGE_MARGIN_BOTTOM_MM,
  clearDossierPageMargins,
  getDossierPageMargins,
  setDossierPageMargins,
} from "@/lib/dossier-page-margins";

afterEach(() => clearDossierPageMargins());

describe("motivation-letter physical bottom margin", () => {
  test("defaults to 1 mm while footer reserve stays separate", () => {
    const design = {
      ...emptyLetterDesign(),
      headerMode: "none" as const,
      footerMode: "compact" as const,
    };

    expect(letterDefaultPageMargins(DEMO_LETTER, design).bottom).toBe(
      CV_PAGE_MARGIN_BOTTOM_MM,
    );

    const footerHeight = letterFooterHeightMm(DEMO_LETTER, "compact");
    expect(letterPageGeometry(DEMO_LETTER, design).content.bottom).toBe(
      CV_PAGE_MARGIN_BOTTOM_MM + footerHeight,
    );
  });

  test("a custom 1 mm letter bottom margin survives storage and rendering", () => {
    const design = {
      ...emptyLetterDesign(),
      headerMode: "none" as const,
      footerMode: "none" as const,
    };

    setDossierPageMargins("letter", { top: 18, right: 23, bottom: 1, left: 24 });

    expect(getDossierPageMargins("letter")?.bottom).toBe(1);
    expect(letterPageGeometry(DEMO_LETTER, design).content.bottom).toBe(1);
  });
});
