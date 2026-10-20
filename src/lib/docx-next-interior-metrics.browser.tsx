import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { DossierHeaderFooterChrome } from "@/components/dossier/DossierHeaderFooterChrome";
import { FONT_STACKS } from "@/components/cover/types";
import { resolveDossierChromeSnapshot } from "./dossier-resolved-chrome";
import {
  interiorMetricsKey,
  type HeaderMeasurement,
  type InteriorTextMetrics,
} from "./docx-next/interior-metrics";
import type { DossierAppSnapshot } from "./docx-next/source";
import { compositeTextColor } from "./docx-next/colors";
import { CvCanvas, resolveCvChromeContact } from "@/components/cv/CvCanvas";
import { dossierContactFromCv } from "./dossier-contact-data";
import { resolveCvRubricOptions } from "@/components/cv/citrus-rubric";
import { cvContentBox, cvFrameFor } from "@/components/cv/archetype";
import { letterPageGeometry } from "@/components/letter/layout-system";
import { briefFontTextSupported } from "./docx-next/brief-fonts.browser";

const mm = (px: number) => (px * 25.4) / 96;
const rgb = (value: string) => {
  const n = value.match(/[\d.]+/g)?.map(Number);
  if (!n || n.length < 3) throw Error("DOCX Next: UngÃ¼ltige Headerfarbe.");
  return n
    .slice(0, 3)
    .map((v) => Math.round(v).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
};

/** Render the actual Web chrome from the captured saved inputs. No PDF canvas,
 * screenshot text, cached rectangles, synthetic font substitution or model XML. */
export async function cap¶»§q«^