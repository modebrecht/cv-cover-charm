import {
  dossierFooterVisualHeightMmForOptions,
  type DossierChromeOptions,
} from "@/lib/dossier-chrome";
import { CV_PAGE_MARGIN_BOTTOM_MM } from "@/lib/dossier-page-margins";
import type { DocumentPart } from "./model";

/** A painted CV footer owns its visible band, with no native footer text story.
 * Reuse the shared CV policy: physical bottom margin plus the band exactly once.
 * The former template/text-story reserve must not survive the replacement.
 */
export function applyCvPaintedFooterReserve(
  part: DocumentPart,
  options: DossierChromeOptions,
) {
  if (part.id !== "cv" || part.layout.mode !== "classic") return;
  if (part.footer.length || part.firstFooter?.length)
    throw Error(
      "DOCX Next: Eine Textfusszeile darf ihre native Reserve nicht verlieren.",
    );
  part.page.margins.bottom =
    CV_PAGE_MARGIN_BOTTOM_MM + dossierFooterVisualHeightMmForOptions(options);
}
