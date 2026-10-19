import type { DossierAppSnapshot } from "./source";
import type { ParagraphFrameBlock, ImageBlock, TextStyle, Paragraph } from "./model";

/** A separate immutable capture, never part of saved semantic input. */
export type HeaderMeasurement = {
  heightMm: number;
  bodyTopMm: number;
  background: string;
  borderColor: string;
  borderMm: number;
  footer: {
    heightMm: number;
    background: string;
    borderColor: string;
    borderMm: number;
    opacity: number;
  };
  frames: ParagraphFrameBlock[];
  icons: ImageBlock[];
};
export type InteriorTextMetrics = {
  version: 1;
  sourceKey: string;
  profile: string;
  headers: Partial<
    Record<"letter" | "cv", { first: HeaderMeasurement; continuation: HeaderMeasurement }>
  >;
  rubrics?: Record<
    string,
    {
      text: string;
      style: TextStyle;
      lineHeightPt: number;
      surface: NonNullable<Paragraph["flowSurface"]>;
    }
  >;
};
export const interiorMetricsKey = (source: DossierAppSnapshot) => JSON.stringify(source);

/** Fresh measurements of the existing classic personal header, never saved data. */
export type CvPersonalHeaderMetrics = {
  version: 1;
  sourceKey: string;
  profile: string;
  valueOffsetMm: number;
  personalGapMm: number;
  contactTopGapMm: number;
  paragraphs: Record<string, { style: TextStyle; lineHeightPt: number; afterMm: number }>;
};
