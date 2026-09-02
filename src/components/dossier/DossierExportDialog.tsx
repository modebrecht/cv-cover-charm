import { useEffect, useRef, useState } from "react";
import type { CvLayoutWarning } from "@/components/cv/CvCanvas";
import { letterReadiness, letterTextLayerOverflows } from "@/components/letter/preflight";
import { letterPdfDocumentFromSaved } from "@/lib/dossier-pdf-document";
import { LETTER_STORAGE_KEY, readStoredDossierPart } from "@/lib/dossier-project";

type Props = {
  open: boolean;
  cvPageCount: number;
  warnings: CvLayoutWarning[] | null;
  coverChanged: boolean;
  downloading: boolean;
  onClose: () => void;
  onDownload: () => void;
};

/** Letzter neutraler Kontrollmoment – ohne Qualitätsnote oder Fertig-Versprechen. */
export function DossierExportDialog({
  open,
  cvPageCount,
  warnings,
  coverChanged,
  downloading,
  onClose,
  onDownload,
}: Props) {
  const downloadRef = useRef<HTMLButtonElement>(null);
  const [letterOverflow, setLetterOverflow] = useState<boolean | null>(null);
  const letter = letterPdfDocumentFromSaved(readStoredDossierPart(LETTER_STORAGE_KEY));
  const letterState = letter
    ? letterReadiness(letter.data)
    : { started: false, readyToSend: false, missing: ["Motivationsschreiben"] };

  useEffect(() => {
    if (!open) return;
    downloadRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !downloading) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [downloading, onClose, open]);

  useEffect(() => {
    if (!open) {
      setLetterOverflow(null);
      return;
    }

    let resizeObserver: ResizeObserver | null = null;
    let innerFrame = 0;
    const measure = () => {
      const layer = document.querySelector<HTMLElement>(
        "[data-dossier-document='letter'] [data-letter-text-layer]",
      );
      if (!layer) {
        setLetterOverflow(null);
        return;
      }
      setLetterOverflow(letterTextLayerOverflows(layer));
      if (!resizeObserver) {
        resizeObserver = new ResizeObserver(measure);
        resizeObserver.observe(layer);
      }
    };

    const mutationObserver = new MutationObserver(measure);
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    const outerFrame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(measure);
    });
    void document.fonts?.ready.then(measure);
    measure();

    return () => {
      cancelAnimationFrame(outerFrame);
      if (innerFrame) cancelAnimationFrame(innerFrame);
      resizeObserver?.disconnect();
      mutationObserver.disconnect();
    };
  }, [open]);

  if (!open) return null;

  const layoutPending = warnings === null || letterOverflow === null;
  const downloadBlocked =
    downloading || layoutPending || !letterState.readyToSend || letterOverflow === true;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/35 p-4 backdrop-blur-[1px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !downloading) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dossier-export-title"
        className="w-full max-w-md rounded-xl border bg-background p-5 shadow-2xl"
      >
        <h2 id="dossier-export-title" className="text-base font-semibold">
          Dossier herunterladen
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Reihenfolge: Titelblatt, Motivationsschreiben und {cvPageCount || "alle"} CV-Seite
          {cvPageCount === 1 ? "" : "n"}.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          {!letterState.readyToSend ? (
            <div
              role="alert"
              data-dossier-letter-readiness
              className="rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
            >
              <div className="font-semibold">Motivationsschreiben noch nicht versandbereit</div>
              <div className="mt-1">Ergänze noch:</div>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {letterState.missing.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {letterState.readyToSend && letterOverflow === null ? (
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Motivationsschreiben wird auf eine sichere A4-Seite geprüft…
            </div>
          ) : null}

          {letterOverflow === true ? (
            <div
              role="alert"
              data-dossier-letter-overflow
              className="rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
            >
              <div className="font-semibold">Motivationsschreiben ist zu lang</div>
              <div>
                Der Brief passt nicht auf eine A4-Seite. Kürze ihn im Motivationsschreiben-Editor;
                ein abgeschnittenes Dossier-PDF wird nicht erstellt.
              </div>
            </div>
          ) : null}

          {coverChanged ? (
            <div className="rounded-md border border-sky-300/70 bg-sky-50 px-3 py-2 text-xs leading-relaxed text-sky-950 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100">
              Das Titelblatt wurde seit der letzten Übernahme in den Lebenslauf verändert.
            </div>
          ) : null}

          {warnings === null ? (
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Lebenslauf-Layout wird geprüft…
            </div>
          ) : warnings.length ? (
            <div className="rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
              <div className="font-semibold">Layout-Hinweise</div>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {warnings.map((warning) => (
                  <li key={warning.id}>{warning.message}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            Kontrolliere vor dem Versenden Inhalt, Rechtschreibung und Kontaktdaten selbst.
          </div>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={downloading}
            className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            Zurück zum Bearbeiten
          </button>
          <button
            ref={downloadRef}
            type="button"
            onClick={onDownload}
            disabled={downloadBlocked}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {downloading ? "PDF wird erstellt…" : "Dossier herunterladen"}
          </button>
        </div>
      </div>
    </div>
  );
}
