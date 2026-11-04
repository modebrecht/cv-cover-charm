import type { TextStyle } from "./model";

/** Fresh effective CSS styles and optional semantic page membership for the explicit QA export. */
export type CvSidebarTextMetrics = {
  version: 3;
  sourceKey: string;
  profile: string;
  /** A field on both sheets is ambiguous and cannot be used to split native rows. */
  fieldPages?: Record<string, 1 | 2 | "ambiguous">;
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
