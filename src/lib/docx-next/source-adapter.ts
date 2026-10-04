import type {
  CoverPdfDocument,
  LetterPdfDocument,
  CvPdfDocument,
} from "@/lib/dossier-pdf-document";
import type { DossierAppSnapshot } from "./source";

/** Compatibility edge only: the historical PDF types are authored dossier snapshots.
 * Explicit picks prevent future browser/PDF page plans entering the Next source.
 */
export function toDossierSource(
  cover: CoverPdfDocument,
  letter: LetterPdfDocument,
  cv: CvPdfDocument,
): Pick<DossierAppSnapshot, "cover" | "letter" | "cv"> {
  return structuredClone({
    cover: {
      template: cover.template,
      data: cover.data,
      colors: cover.colors,
      blocks: cover.blocks,
      fontScale: cover.fontScale,
      ...(cover.customFieldIds ? { customFieldIds: cover.customFieldIds } : {}),
    },
    letter: { data: letter.data, design: letter.design },
    cv: {
      data: cv.data,
      design: cv.design,
      elements: cv.elements,
      elementStyles: cv.elementStyles,
    },
  });
}
