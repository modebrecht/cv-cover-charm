import { normalizedCoverLabels, coverTextPresentation } from "@/components/cover/presentation";
import { captureCoverTextMetrics } from "@/components/cover/resolve";
import { FONT_STACKS, lineText } from "@/components/cover/types";
import { measureLines } from "@/lib/text-fit";
import { letterReadiness } from "@/components/letter/preflight";
import {
  coverPdfDocumentFromSaved,
  coverPdfHasContent,
  letterPdfDocumentFromSaved,
  cvPdfDocumentFromSaved,
  cvPdfHasContent,
} from "@/lib/dossier-pdf-document";
import {
  COVER_STORAGE_KEY,
  LETTER_STORAGE_KEY,
  CV_STORAGE_KEY,
  readStoredDossierPart,
} from "@/lib/dossier-project";
import { downloadBlob, safeFileName } from "@/lib/download";
import { captureDossierDocxNextSnapshot } from "./docx-next/snapshot";
import { buildDossierDocModel } from "./docx-next/build-model";
import { renderDossierDocx } from "./docx-next/renderer";
import { walkBlocks, type DossierDocModel } from "./docx-next/model";
import { prepareBriefFontProfile } from "./docx-next/brief-fonts.browser";
import { briefDocxNextUiEnabled } from "./docx-next/brief-visibility";
import { captureCoverBadgeAdvances } from "./docx-next/cover-badges.browser";
import { resolveCvRubricOptions } from "@/components/cv/citrus-rubric";
import {
  NATIVE_BADGE_WORD_REJECTION,
  RUBRIC_ANCHOR_WORD_REJECTION,
} from "./docx-next/design-visibility";

/** Capture the same saved application inputs used by the actual dossier workflow. */
export function captureSavedBriefSnaps¶»§q«^