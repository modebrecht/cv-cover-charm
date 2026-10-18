import {
  CV_SECTION_TITLE_FONT_SIZE_MAX,
  CV_SECTION_TITLE_FONT_SIZE_MIN,
  type CvDesign,
} from "./types";

/** The Word-reviewed Modern standard layout only. Other layouts retain their
 * existing template defaults, including the frozen native Sidebar geometry. */
export function cvReadingDefaults(template?: string, layout = "classic") {
  return template === "modern" && layout === "classic"
    ? { continuationTopMm: 20, sectionTitleFontSizePx: 14 }
    : { continuationTopMm: 10, sectionTitleFontSizePx: undefined };
}

export function cvSectionTitleFontSizePx(design: CvDesign, layout: string) {
  const value = design.sectionTitleFontSizePx;
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(CV_SECTION_TITLE_FONT_SIZE_MIN, Math.min(CV_SECTION_TITLE_FONT_SIZE_MAX, value))
    : cvReadingDefaults(design.template, layout).sectionTitleFontSizePx;
}
