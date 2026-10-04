import type { Block, CoverData, CustomField, TemplateId } from "@/components/cover/types";
import type { StyleOverrides } from "@/components/cover/layouts";
import type { CvData, CvDesign, CvPlacements } from "@/components/cv/types";
import type { LetterData, LetterDesign } from "@/components/letter/types";
import type { DossierChromeState } from "@/lib/dossier-chrome";
import type { DossierPhotoStyle } from "@/lib/dossier-photo";
import type { CvPhotoPlacement } from "@/components/cv/photo-place";
import type { Alignment, PageMargins, TextStyle } from "./model";
import type { CvLayoutInput } from "./layouts";
import type { FontPolicy } from "./fonts";

/** Authored data/styles only. Never measured DOM rectangles or print page fragments.
 * Cover Block geometry is saved design intent: decorative positions, photo framing,
 * custom-element order/width. Text positions/heights never define Word pagination.
 */
export type DossierCoverSource = {
  template: TemplateId;
  data: CoverData;
  colors: Record<string, string>;
  blocks: Block[];
  fontScale: number;
  customFieldIds?: string[];
};
export type DossierLetterSource = { data: LetterData; design: LetterDesign };
export type DossierCvSource = {
  data: CvData;
  design: CvDesign;
  elements: CustomField[];
  elementStyles: StyleOverrides;
};

export type DossierAppSnapshot = {
  cover: DossierCoverSource;
  letter: DossierLetterSource;
  cv: DossierCvSource;
  settings: {
    chrome?: DossierChromeState;
    margins?: Partial<Record<"letter" | "cv", PageMargins>>;
    cvLayout?: CvLayoutInput;
    sidebarSide?: "left" | "right";
    placements?: Partial<CvPlacements>;
    cvAlignment?: Alignment;
    cvSectionGapMm?: number | null;
    cvContinuationTopMarginMm?: number;
    cvPhotoStyle?: DossierPhotoStyle;
    cvPhotoPlacement?: CvPhotoPlacement;
    /** Canonical paths only; no visible-value or occurrence matching. */
    fieldStyles?: Record<string, Partial<TextStyle>>;
    unresolvedTypography?: string[];
    fontPolicy?: FontPolicy;
  };
};
