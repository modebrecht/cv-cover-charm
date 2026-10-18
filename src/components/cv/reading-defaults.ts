import {
  CV_SECTION_TITLE_FONT_SIZE_MAX,
  CV_SECTION_TITLE_FONT_SIZE_MIN,
  type CvDesign,
} from "./types";
import {
  DOSSIER_CONTINUATION_TOP_MM,
  DOSSIER_CV_RUBRIC_PX,
  frozenCvReadingLayout,
} from "@/lib/dossier-reading-settings";

/** All flowing CV layouts share defaults. Sidebar retains its frozen baseline. */
export function cvReadingDefaults(_template?: string, layout = "classic") {
  return frozenCvReadingLayout(layout)
    ? { continuationTopMm: 10, sectionTitleFontSizePx: undefined }
    : {
        continuationTopMm: DOSSIER_CONTINUATION_TOP_MM,
        sectionTitleFontSizePx: DOSSIER_CV_RUBRIC_PX,
      };
}

export function cvSectionTitleFontSizePx(design: CvDesign, layout: string) {
  const value = design.sectionTitleFontSizePx;
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(CV_SECTION_TITLE_FONT_SIZE_MIN, Math.min(CV_SECTION_TITLE_FONT_SIZE_MAX, value))
    : cvReadingDefaults(design.template, layout).sectionTitleFontSizePx;
}
