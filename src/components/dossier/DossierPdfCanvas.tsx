import { forwardRef, useCallback, useMemo, useState } from "react";
import "@/components/cover/fresh-templates";
import { CoverCanvas } from "@/components/cover/CoverCanvas";
import { CvCanvas } from "@/components/cv/CvCanvas";
import type { CvLayoutWarning } from "@/components/cv/CvCanvas";
import { LetterDocument } from "@/components/letter/LetterDocument";
import {
  letterPdfDocumentFromSaved,
  type CoverPdfDocument,
  type CvPdfDocument,
  type LetterPdfDocument,
} from "@/lib/dossier-pdf-document";
import { LETTER_STORAGE_KEY, readStoredDossierPart } from "@/lib/dossier-project";
import { DEFAULT_DOSSIER_CHROME_STATE, type DossierChromeState } from "@/lib/dossier-chrome";
import { resolveDossierChromeSnapshot } from "@/lib/dossier-resolved-chrome";

const ignoreSelection = () => {};
const ignoreMove = () => {};

/** Unsichtbarer 1:1-Drucksatz: Titelblatt, alle Anschreiben-Seiten, danach sämtliche CV-Seiten. */
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
  // Re-read saved content as before, but preserve its identity while readiness
  // callbacks update this canvas so they do not restart Letter measurement.
  const savedLetter =
    letter === undefined ? JSON.stringify(readStoredDossierPart(LETTER_STORAGE_KEY)) : undefined;
  const storedLetter = useMemo(
    () =>
      letter === undefined
        ? letterPdfDocumentFromSaved(savedLetter ? JSON.parse(savedLetter) : undefined)
        : letter,
    [letter, savedLetter],
  );
  const resolvedChrome = useMemo(
    () => resolveDossierChromeSnapshot({ cover, letter: storedLetter, cv }, chromeState),
    [cover, storedLetter, cv, chromeState],
  );
  // Expose existing CV callbacks as a readiness contract for native print.
  // This does not calculate pagination or change the renderer's page assignment.
  const [cvStatus, setCvStatus] = useState({ source: cv, pageCount: 0, ready: false });
  const receiveCvPages = useCallback(
    (pageCount: number) => {
      setCvStatus((current) =>
        current.source === cv && current.pageCount === pageCount
          ? current
          : { source: cv, pageCount, ready: current.source === cv && current.ready },
      );
      onCvPageCount?.(pageCount);
    },
    [cv, onCvPageCount],
  );
  const receiveCvWarnings = useCallback(
    (warnings: CvLayoutWarning[]) => {
      setCvStatus((current) =>
        current.source === cv && current.ready
          ? current
          : { source: cv, pageCount: current.source === cv ? current.pageCount : 0, ready: true },
      );
      onCvLayoutWarnings?.(warnings);
    },
    [cv, onCvLayoutWarnings],
  );

  return (
    <div
      ref={ref}
      data-dossier-pdf-canvas
      data-dossier-cv-ready={cvStatus.source === cv && cvStatus.ready ? "true" : "false"}
      data-dossier-cv-page-count={cvStatus.source === cv ? cvStatus.pageCount : 0}
    >
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
          manageGlobalTemplateScope={false}
        />
      ) : null}
      {storedLetter ? (
        <div data-dossier-document="letter" data-dossier-template={storedLetter.design.template}>
          <LetterDocument
            data={storedLetter.data}
            design={storedLetter.design}
            chromeOptions={resolvedChrome.letter.options}
            chromeContact={resolvedChrome.letter.contact}
            exportMode
            ariaLabel="Exportansicht Dossier Motivationsschreiben"
          />
        </div>
      ) : null}
      {cv ? (
        <CvCanvas
          data={cv.data}
          design={cv.design}
          chromeOptions={resolvedChrome.cv.options}
          chromeContact={resolvedChrome.cv.contact}
          elements={cv.elements}
          elementStyles={cv.elementStyles}
          exportMode
          manageGlobalTemplateScope={false}
          onLayoutWarnings={receiveCvWarnings}
          onPageCount={receiveCvPages}
        />
      ) : null}
    </div>
  );
});
