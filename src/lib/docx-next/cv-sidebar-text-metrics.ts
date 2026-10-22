import type { TextStyle } from "./model";

/** Fresh effective CSS styles. No page counts, field rectangles or text heights. */
export type CvSidebarTextMetrics = {
  version: 2;
  sourceKey: string;
  profile: string;
  fields: Record<
    string,
    {
      text: string;
      style: TextStyle;
      lineHeightPt: number;
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
