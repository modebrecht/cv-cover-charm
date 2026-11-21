import type { TextStyle } from "./model";
import type { DossierAppSnapshot } from "./source";

export function canMeasureCabinSidebar(source: DossierAppSnapshot) {
  return (
    source.cv.design.font === "freundlich" &&
    ["terracotta", "studio3"].includes(source.cv.design.template) &&
    source.settings.sidebarSide === "right"
  );
}

export type CvSidebarOpeningMetrics = {
  headerInsetMm: number;
  headerReserveMm: number;
  sidebarText?: { leftMm: number; widthMm: number };
  photo?: { xMm: number; yMm: number; widthMm: number; gapAfterMm: number };
};

/** Fresh effective CSS styles and optional semantic page membership for the explicit QA export. */
export type CvSidebarTextMetrics = {
  version: 3;
  sourceKey: string;
  profile: string;
  opening?: CvSidebarOpeningMetrics;
  /** Explicit mirrored-CV trial with the bundled Cabin faces. */
  cabin?: true;
  /** A field on both sheets is ambiguous and cannot be used to split native rows. */
  fieldPages?: Record<string, 1 | 2 | "ambiguous">;
  /** First visible page of each field, used to find whole-row boundaries. */
  longFlow?: { pageCount: number; fieldStarts: Record<string, number> };
  /** Contact paint/text stays owned by the existing measured-header composition. */
  contactHeaders?: true;
  fields: Record<
    string,
    {
      text: string;
      style: TextStyle;
      lineHeightPt: number;
      normalLineHeightFactor: number;
      documentScale: number;
      listIndentMm?: number;
      listMarkerStyle?: Pick<TextStyle, "color" | "bold">;
      beforeMm: number;
      afterMm: number;
    }
  >;
  headings: Record<
    string,
    {
      beforeMm: number;
      afterMm: number;
      textInsetMm?: number;
      rule?: {
        /** A wrapped Sidebar title gives its rule a complete following row. */
        placement?: "below";
        textWidthMm: number;
        gapMm: number;
        heightMm: number;
        color: string;
        opacity: number;
      };
    }
  >;
  entries: Record<
    string,
    {
      afterMm: number;
      dateRail?: { widthMm: number; gapMm: number };
    }
  >;
  headerAfterMm: number;
  referenceGapMm?: number;
  surfaces: Record<
    "first" | "continuation",
    {
      sidebarColor: string;
      readingPlane: { color: string; opacity: number };
    }
  >;
  /** Header paint is also sampled for contact mode; measured headers own its output. */
  compactChrome: {
    header: {
      heightMm: number;
      color: string;
      borderMm: number;
      borderColor: string;
    };
    footer: {
      heightMm: number;
      color: string;
      borderMm: number;
      borderColor: string;
    };
  };
};
