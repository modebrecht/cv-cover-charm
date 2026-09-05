import { forwardRef } from "react";
import "@/components/cover/fresh-templates";
import { CoverCanvas } from "@/components/cover/CoverCanvas";
import { CvCanvas } from "@/components/cv/CvCanvas";
import type { CvLayoutWarning } from "@/components/cv/CvCanvas";
import { LetterCanvas } from "@/components/letter/LetterCanvas";
import {
  letterPdfDocumentFromSaved,
  type CoverPdfDocument,
  type CvPdfDocument,
  type LetterPdfDocument,
} from "@/lib/dossier-pdf-document";
import { LETTER_STORAGE_KEY, readStoredDossierPart } from "@/lib/dossier-project";
import { DEFAULT_DOSSIER_CHROME_STATE, type DossierChromeState } from "@/lib/dossier-chrome";
import { resolveDossierContact } from "@/lib/dossier-contact";

const ignoreSelection = () => {};
const ignoreMove = () => {};

/** Unsichtbarer 1:1-Drucksatz: Titelblatt, Anschreiben, danach sämtliche CV-Seiten. */
export const DossierPdfCanvas = forwardRef<
  HTMLDivElement,
  {
    cover: CoverPdfDocument | null;
    /** Optional explizit übergeben; bestehende Editoren lesen sonst den gespeicherten Brief. */
    letter?: LetterPdfDocument | null;
    cv: CvPdfDocument | null;
    chromeState?: DossierChromeState;
    onCvLayoutWarnings?: (warnings: CvLayoutWarning[]) => void;
    onCvPageCount?: (count: number) => void;
  }
>(function DossierPdfCanvas(
  {
    cover,
    letter,
    cv,
    chromeState = DEFAULT_DOSSIER_CHROME_STATE,
    onCvLayoutWarnings,
    onCvPageCount,
  },
  ref,
) {
  const letterChromeOptions = chromeState.sync ? chromeState.shared : chromeState.letter;
  const cvChromeOptions = chromeState.sync ? chromeState.shared : chromeState.cv;
  const storedLetter =
    letter === undefined
      ? letterPdfDocumentFromSaved(readStoredDossierPart(LETTER_STORAGE_KEY))
      : letter;
  const sharedChromeContact = chromeState.sync
    ? resolveDossierContact({
        cover: cover?.data,
        cv: cv?.data,
        letter: storedLetter?.data,
      })
    : undefined;

  return (
    <div ref={ref}>
      {cover ? (
        <CoverCanvas
          template={cover.template}
          data={cover.data}
          colors={cover.colors}
          blocks={cover.blocks}
          selected={null}
          onSelect={ignoreSelection}
          onMove={ignoreMove}
          fontScale={cover.fontScale}
          editable={false}
        />
      ) : null}
      {storedLetter ? (
        <div data-dossier-document="letter">
          <LetterCanvas
            data={storedLetter.data}
            design={storedLetter.design}
            chromeOptions={letterChromeOptions}
            chromeContact={sharedChromeContact}
            exportMode
          />
        </div>
      ) : null}
      {cv ? (
        <CvCanvas
          data={cv.data}
          design={cv.design}
          chromeOptions={cvChromeOptions}
          chromeContact={sharedChromeContact}
          elements={cv.elements}
          elementStyles={cv.elementStyles}
          exportMode
          onLayoutWarnings={onCvLayoutWarnings}
          onPageCount={onCvPageCount}
        />
      ) : null}
    </div>
  );
});
