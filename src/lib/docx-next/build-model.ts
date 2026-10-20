import {
  cvLineFieldId,
  semanticListItemIds,
  CV_PERSON_FIELD_IDS,
  referenceContactFields,
  referenceHasContent,
  dossierChromeFieldId,
  dossierElementFieldId,
} from "@/lib/dossier-semantic-fields";
import {
  CV_SECTION_LABELS,
  DEFAULT_CV_PLACEMENTS,
  cvSectionOrder,
  cvSectionLayout,
  customSectionForKey,
  entryFilled,
  isCustomSectionKey,
  type CvEntry,
  type CvLayoutSectionKey,
} from "@/components/cv/types";
import { cvPersonalInfoRows } from "@/lib/cv-personal-info";
import { resolveCvRubricOptions } from "@/components/cv/citrus-rubric";
import { coverAttachmentValues } from "@/components/cover/types";
import { buildCustomBlocks } from "@/components/cover/layouts-base";
import { coverTemplateSlots } from "@/components/cover/template-slots";
import { resolveDossierChromeSnapshot } from "@/lib/dossier-resolved-chrome";
import type {
  DossierDocModel,
  DocumentPart,
  DocBlock,
  Paragraph,
  TextStyle,
  Alignment,
  ModelIssue,
} from "./model";
import { walkBlocks } from "./model";
import { nextTemplate } from "./templates";
import { color, compositeTextColor } from "./colors";
export { color } from "./colors";
import { composeAuthoredCover } from "./cover-authored";
import { composeSourceCompactBands } from "./compact-chrome";
import { composeMeasuredHeaders } from "./interior-composition";
import { ownFlowSurfaceSpacing } from "./flow-surface-spacing";
import { composeCvReadingColumns } from "./cv-reading-columns";
import type { InteriorTextMetri¶»§q«^