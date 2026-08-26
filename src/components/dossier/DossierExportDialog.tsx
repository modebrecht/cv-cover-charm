import { useEffect, useRef } from "react";
import type { CvLayoutWarning } from "@/components/cv/CvCanvas";
import { letterPdfDocumentFromSaved, letterPdfHasContent } from "@/lib/dossier-pdf-document";
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
  const letter = letterPdfDocumentFromSaved(readStoredDossierPart(LETTER_STORAGE_KEY));
  const letterReady = !!letter && letterPdfHasContent(letter.data);

  useEffect(() => {
    if (!open) return;
    downloadRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !downloading) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [downloading, onClose, open]);

  if (!open) return null;

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
          Reihenfolge: Titelblatt, Bewerbungsbrief und {cvPageCount || "alle"} CV-Seite
          {cvPageCount === 1 ? "" : "n"}.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          {!letterReady ? (
            <div className="rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
              Das Bewerbungsbrief fehlt noch. Öffne „Bewerbungsbrief“ im Dossier und ergänze
              mindestens die Bewerbungsangaben oder den Brieftext.
            </div>
          ) : null}

          {coverChanged ? (
            <div className="rounded-md border border-sky-300/70 bg-sky-50 px-3 py-2 text-xs leading-relaxed text-sky-950 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100">
              Das Titelblatt wurde seit der letzten Übernahme in den Lebenslauf verändert.
            </div>
          ) : null}

          {warnings === null ? (
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Layout wird geprüft…
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
            disabled={downloading || warnings === null || !letterReady}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {downloading ? "PDF wird erstellt…" : "Dossier herunterladen"}
          </button>
        </div>
      </div>
    </div>
  );
}
