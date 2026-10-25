import { useEffect, useRef, useState } from "react";
import type { CvLayoutWarning } from "@/components/cv/CvCanvas";
import { letterReadiness } from "@/components/letter/preflight";
import {
  createPdfAdvisoryConsent,
  observePdfPreflight,
  type PdfAdvisoryConsent,
  type PdfPreflightResult,
} from "@/lib/pdf-preflight";
import {
  coverPdfDocumentFromSaved,
  coverPdfHasContent,
  cvPdfDocumentFromSaved,
  cvPdfHasContent,
  letterPdfDocumentFromSaved,
  letterPdfHasContent,
} from "@/lib/dossier-pdf-document";
import {
  COVER_STORAGE_KEY,
  CV_STORAGE_KEY,
  LETTER_STORAGE_KEY,
  readStoredDossierPart,
} from "@/lib/dossier-project";
import { nativePrintUiEnabled } from "@/lib/native-print-visibility";
import { briefDocxNextUiEnabled } from "@/lib/docx-next/brief-visibility";
import {
  coverFamilyDocxQaEnabled,
  isCoverFamilyDocxQaTemplate,
} from "@/lib/docx-next/cover-family-visibility";
import {
  designDocxNextUiEnabled,
  designNativeBadgeUiEnabled,
  designInteriorAuditUiEnabled,
  designRubricSpacingUiEnabled,
  designReadingRowsUiEnabled,
  NATIVE_BADGE_WORD_REJECTION,
} from "@/lib/docx-next/design-visibility";

export type DossierExportFormat = "json" | "pdf" | "docx";

type Props = {
  open: boolean;
  cvPageCount: number;
  warnings: CvLayoutWarning[] | null;
  coverChanged: boolean;
  downloading: boolean;
  jsonAvailable?: boolean;
  pdfAvailable?: boolean;
  docxAvailable?: boolean;
  docxTemplateLabel?: string | null;
  onClose: () => void;
  onDownload: (format: DossierExportFormat, consent?: PdfAdvisoryConsent) => void | Promise<void>;
  onNativePrint?: () => void | Promise<void>;
  nativePrinting?: boolean;
  nativePrintError?: string | null;
  onBriefDocxNext?: () => void | Promise<void>;
  onDesignDocxNext?: () => void | Promise<void>;
  onCoverFamilyDocxNext?: () => void | Promise<void>;
  briefDocxNextError?: string | null;
};

function joinParts(parts: string[]) {
  if (parts.length <= 1) return parts[0] ?? "";
  if (parts.length === 2) return `${parts[0]} und ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")} und ${parts.at(-1)}`;
}

function FileFormatIcon({ label }: { label: "JSON" | "PDF" | "DOCX" }) {
  const labelSize = label === "DOCX" ? 7.2 : 8.5;
  return (
    <svg
      viewBox="0 0 40 48"
      className="h-11 w-10 shrink-0 text-primary"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M7 3.5h18l8 8V43a1.5 1.5 0 0 1-1.5 1.5h-24A1.5 1.5 0 0 1 6 43V5A1.5 1.5 0 0 1 7.5 3.5Z"
        fill="currentColor"
        fillOpacity="0.08"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M25 3.8V12h8" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="4" y="24" width="32" height="14" rx="4" fill="currentColor" />
      <text
        x="20"
        y="33.3"
        textAnchor="middle"
        fill="var(--color-primary-foreground)"
        fontSize={labelSize}
        fontWeight="700"
        letterSpacing="0.3"
      >
        {label}
      </text>
    </svg>
  );
}

export function DossierExportDialog({
  open,
  cvPageCount,
  warnings,
  coverChanged,
  downloading,
  jsonAvailable,
  pdfAvailable,
  docxAvailable,
  docxTemplateLabel,
  onClose,
  onDownload,
  onNativePrint,
  nativePrinting = false,
  nativePrintError,
  onBriefDocxNext,
  onDesignDocxNext,
  onCoverFamilyDocxNext,
  briefDocxNextError,
}: Props) {
  const downloadRef = useRef<HTMLButtonElement>(null);
  const [format, setFormat] = useState<DossierExportFormat>("pdf");
  const [preflight, setPreflight] = useState<PdfPreflightResult | null>(null);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const letterOverflow =
    preflight?.status === "blocked"
      ? true
      : preflight?.status === "pending" || !preflight
        ? null
        : false;
  const letterPaginationError =
    preflight?.issues.find((issue) => issue.severity === "blocked")?.message ?? null;
  const formatSelectionEnabled =
    jsonAvailable !== undefined || pdfAvailable !== undefined || docxAvailable !== undefined;
  const canDownloadPdf = pdfAvailable ?? true;
  const canDownloadDocx = docxAvailable ?? false;
  const busy = downloading || nativePrinting;

  const cover = coverPdfDocumentFromSaved(readStoredDossierPart(COVER_STORAGE_KEY));
  const letter = letterPdfDocumentFromSaved(readStoredDossierPart(LETTER_STORAGE_KEY));
  const cv = cvPdfDocumentFromSaved(readStoredDossierPart(CV_STORAGE_KEY));
  const letterHasContent = !!letter && letterPdfHasContent(letter.data);
  const missingParts = [
    !cover || !coverPdfHasContent(cover.data) ? "Titelblatt" : null,
    !letterHasContent ? "Motivationsschreiben" : null,
    !cv || !cvPdfHasContent(cv.data) ? "Lebenslauf" : null,
  ].filter((part): part is string => part !== null);

  const letterState = letter
    ? letterReadiness(letter.data)
    : { started: false, readyToSend: false, missing: ["Motivationsschreiben"] };
  const missingLetterFields = joinParts(letterState.missing);

  useEffect(() => {
    if (!open) return;
    if (!formatSelectionEnabled) {
      setFormat("pdf");
      return;
    }
    setFormat((current) => {
      if (current === "pdf" && canDownloadPdf) return current;
      if (current === "docx" && canDownloadDocx && letterState.readyToSend) return current;
      if (current === "json") return current;
      if (canDownloadPdf) return "pdf";
      return "json";
    });
  }, [canDownloadDocx, canDownloadPdf, formatSelectionEnabled, letterState.readyToSend, open]);

  useEffect(() => {
    if (!open) return;
    downloadRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [busy, onClose, open]);

  useEffect(() => {
    if (!open || !canDownloadPdf) {
      setPreflight(null);
      setOverrideError(null);
      return;
    }
    return observePdfPreflight(
      () => document.querySelector<HTMLElement>("[data-dossier-pdf-canvas]"),
      "dossier",
      setPreflight,
    );
  }, [canDownloadPdf, open]);

  if (!open) return null;

  const layoutPending = warnings === null || letterOverflow === null;
  const pdfBlocked =
    !canDownloadPdf ||
    busy ||
    layoutPending ||
    !letterState.readyToSend ||
    letterOverflow === true ||
    preflight?.status !== "pass";
  const canOverride =
    canDownloadPdf &&
    !busy &&
    !layoutPending &&
    letterState.readyToSend &&
    preflight?.status === "advisory" &&
    preflight.issues.every((issue) => issue.overridePermitted);
  const overrideDownload = () => {
    try {
      const root = document.querySelector<HTMLElement>("[data-dossier-pdf-canvas]");
      if (!root) throw new Error("Die Exportansicht wird noch vorbereitet.");
      const consent = createPdfAdvisoryConsent(root, "dossier");
      setOverrideError(null);
      void onDownload("pdf", consent);
    } catch (error) {
      setOverrideError(
        error instanceof Error ? error.message : "Bitte den aktuellen Drucksatz erneut prüfen.",
      );
    }
  };
  const docxBlocked = !canDownloadDocx || busy || !letterState.readyToSend;
  const letterIssueCount =
    letterHasContent && !letterState.readyToSend ? letterState.missing.length : 0;
  const docxDesignIssue =
    formatSelectionEnabled &&
    missingParts.length === 0 &&
    letterState.readyToSend &&
    !canDownloadDocx;
  const pdfOverflowIssue = canDownloadPdf && letterState.readyToSend && letterOverflow === true;
  const blockingCount =
    missingParts.length + letterIssueCount + (docxDesignIssue ? 1 : 0) + (pdfOverflowIssue ? 1 : 0);
  const advisoryCount =
    (warnings?.length ?? 0) +
    (coverChanged ? 1 : 0) +
    (preflight?.issues.filter((issue) => issue.severity === "advisory").length ?? 0);

  const missingPartsCompact = `${missingParts.length} Dossierteil${missingParts.length === 1 ? "" : "e"} ${
    missingParts.length === 1 ? "fehlt" : "fehlen"
  }`;
  const missingFieldsCompact = `${letterState.missing.length} Angabe${
    letterState.missing.length === 1 ? "" : "n"
  } ${letterState.missing.length === 1 ? "fehlt" : "fehlen"}`;
  const pdfCompactStatus = missingParts.length
    ? missingPartsCompact
    : !letterState.readyToSend
      ? missingFieldsCompact
      : letterOverflow === true
        ? letterPaginationError
          ? "Briefinhalt prüfen"
          : "Briefseite prüfen"
        : layoutPending || !preflight || preflight.status === "pending"
          ? "Layout wird geprüft…"
          : preflight.status === "blocked"
            ? "Drucksatz prüfen"
            : preflight?.status === "advisory"
              ? "Layoutwarnung prüfen"
              : "Bereit";
  const docxCompactStatus = missingParts.length
    ? missingPartsCompact
    : !letterState.readyToSend
      ? missingFieldsCompact
      : !canDownloadDocx
        ? "Design angleichen"
        : "Bereit";
  const checkSummary = blockingCount
    ? `Was fehlt noch? · ${blockingCount} Punkt${blockingCount === 1 ? "" : "e"}`
    : (layoutPending || !preflight || preflight.status === "pending") && canDownloadPdf
      ? "Layout wird geprüft…"
      : preflight?.status === "blocked"
        ? "Drucksatz prüfen"
        : advisoryCount
          ? `${preflight?.status === "advisory" ? "Layoutwarnung prüfen" : "Bereit"} · ${advisoryCount} Hinweis${advisoryCount === 1 ? "" : "e"}`
          : "Alles bereit";

  const downloadBlocked = format === "pdf" ? pdfBlocked : format === "docx" ? docxBlocked : busy;
  const actionLabel = !formatSelectionEnabled
    ? downloading
      ? "PDF wird erstellt…"
      : "Dossier herunterladen"
    : format === "pdf"
      ? downloading
        ? "PDF wird erstellt…"
        : "PDF herunterladen"
      : format === "docx"
        ? downloading
          ? "DOCX wird erstellt…"
          : "DOCX herunterladen"
        : downloading
          ? "Projekt wird gespeichert…"
          : "Projekt speichern";
  const optionClass = (selected: boolean, disabled: boolean) =>
    `min-h-[5.25rem] w-full rounded-lg border px-3 py-3 text-left transition-colors ${
      selected ? "border-primary bg-primary/5" : "border-input bg-background hover:bg-accent"
    } ${disabled ? "cursor-not-allowed opacity-50 hover:bg-background" : ""}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/35 p-2 backdrop-blur-[1px] sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dossier-export-title"
        className="max-h-[calc(100vh-1rem)] w-full max-w-3xl overflow-y-auto rounded-xl border bg-background p-4 shadow-2xl sm:max-h-[calc(100vh-2rem)] sm:p-5"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="dossier-export-title" className="text-base font-semibold">
            Dossier herunterladen
          </h2>
          <p className="text-xs text-muted-foreground">
            {formatSelectionEnabled
              ? "Nur lokal auf deinem Gerät · kein Upload."
              : `Titelblatt · Motivationsschreiben · ${cvPageCount || "alle"} CV-Seite${cvPageCount === 1 ? "" : "n"}`}
          </p>
        </div>

        {formatSelectionEnabled ? (
          <div
            data-dossier-export-options
            className="mt-3 grid gap-2 sm:grid-cols-3"
            role="radiogroup"
            aria-label="Downloadformat"
          >
            <button
              type="button"
              role="radio"
              aria-label="Projektdatei (JSON) – Projekt speichern"
              aria-checked={format === "json"}
              disabled={busy}
              onClick={() => setFormat("json")}
              className={optionClass(format === "json", busy)}
            >
              <span className="flex items-center gap-3">
                <FileFormatIcon label="JSON" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">Projekt speichern (*.json)</span>
                  <span className="mt-1 block text-xs text-muted-foreground">Zwischenstand</span>
                </span>
              </span>
            </button>
            <button
              type="button"
              role="radio"
              aria-label="Fertiges Dossier (PDF)"
              aria-checked={format === "pdf"}
              disabled={!canDownloadPdf || busy}
              onClick={() => setFormat("pdf")}
              className={optionClass(format === "pdf", !canDownloadPdf || busy)}
            >
              <span className="flex items-center gap-3">
                <FileFormatIcon label="PDF" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">Fertiges Dossier (PDF)</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {pdfCompactStatus}
                  </span>
                </span>
              </span>
            </button>
            <button
              type="button"
              role="radio"
              aria-label="Bearbeitbares Dossier (DOCX)"
              aria-checked={format === "docx"}
              disabled={docxBlocked}
              onClick={() => setFormat("docx")}
              className={optionClass(format === "docx", docxBlocked)}
            >
              <span className="flex items-center gap-3">
                <FileFormatIcon label="DOCX" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">Bearbeitbares Dossier (DOCX)</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {docxCompactStatus}
                    {docxCompactStatus === "Bereit" && docxTemplateLabel
                      ? ` · Vorlage ${docxTemplateLabel}`
                      : ""}
                  </span>
                </span>
              </span>
            </button>
          </div>
        ) : null}

        <details data-dossier-export-check className="mt-3 rounded-lg border bg-muted/20">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
            <span>{checkSummary}</span>
            <span aria-hidden="true" className="text-muted-foreground">
              ▾
            </span>
          </summary>
          <div className="border-t px-3 py-2 text-xs leading-relaxed">
            <ul className="space-y-1.5 text-muted-foreground">
              {missingParts.map((part) => (
                <li key={part}>
                  <span className="font-medium text-foreground">{part}:</span> fehlt.
                </li>
              ))}
              {letterIssueCount ? (
                <li data-dossier-letter-readiness>
                  <span className="font-medium text-foreground">
                    Motivationsschreiben noch nicht versandbereit:
                  </span>{" "}
                  {missingLetterFields} ergänzen.
                </li>
              ) : null}
              {pdfOverflowIssue ? (
                <li data-dossier-letter-overflow>
                  <span className="font-medium text-foreground">
                    Motivationsschreiben kann nicht sicher exportiert werden.
                  </span>{" "}
                  {letterPaginationError ??
                    "Mindestens eine erzeugte Briefseite läuft über den nutzbaren Seitenbereich."}
                </li>
              ) : null}
              {docxDesignIssue ? (
                <li data-dossier-docx-design-issue>
                  <span className="font-medium text-foreground">Word (DOCX):</span> Titelblatt,
                  Motivationsschreiben und Lebenslauf müssen dasselbe Design verwenden. Wähle bei
                  allen drei dieselbe Vorlage.
                </li>
              ) : null}
              {!blockingCount && layoutPending && canDownloadPdf ? (
                <li>PDF: Layout wird noch geprüft.</li>
              ) : null}
              {coverChanged ? (
                <li>
                  Hinweis: Das Titelblatt wurde seit der letzten Übernahme in den Lebenslauf
                  verändert.
                </li>
              ) : null}
              {warnings?.map((warning) => (
                <li key={warning.id}>Layout-Hinweis: {warning.message}</li>
              ))}
              {preflight?.issues.map((issue) => (
                <li key={issue.code} data-pdf-advisory>
                  {issue.message}
                </li>
              ))}
              {!blockingCount && !layoutPending ? (
                <>
                  <li>
                    <span className="font-medium text-foreground">PDF:</span>{" "}
                    {preflight?.status === "pass"
                      ? "bereit."
                      : preflight?.status === "advisory"
                        ? canOverride
                          ? "Layoutwarnung vor dem Download bestätigen."
                          : "Umbruchmessung erneut vorbereiten; diese Dossierwarnung kann nicht übergangen werden."
                        : "Drucksatz wird geprüft oder muss korrigiert werden."}
                  </li>
                  {formatSelectionEnabled ? (
                    <li>
                      <span className="font-medium text-foreground">Word (DOCX):</span>{" "}
                      {canDownloadDocx ? "bereit." : "noch nicht verfügbar."}
                    </li>
                  ) : null}
                </>
              ) : null}
            </ul>
            <p className="mt-2 border-t pt-2 text-muted-foreground">
              Vor dem Versenden Inhalt, Rechtschreibung und Kontaktdaten selbst kontrollieren.
            </p>
          </div>
        </details>

        {designDocxNextUiEnabled() && cover?.template === "modern" && onDesignDocxNext ? (
          <div className="mt-3 rounded-lg border px-3 py-2" data-design-docx-next-qa>
            <p id="design-docx-next-help" className="text-xs text-muted-foreground">
              {designNativeBadgeUiEnabled()
                ? NATIVE_BADGE_WORD_REJECTION
                : designReadingRowsUiEnabled()
                  ? "Modern CV-Zeilen · gespeicherte Schriftgrössen und kompakte Rubrikspalten übernehmen. Darstellung und Bearbeitung in Word sind noch zu prüfen."
                  : designRubricSpacingUiEnabled()
                    ? "Modern CV-Pills · neuer Abstandstest nach Word-Rückmeldung. Benötigt Sans. Darstellung, Bearbeitung und Speichern in Word sind noch zu prüfen."
                    : designInteriorAuditUiEnabled()
                      ? "Modern-Innenlayout-Test · gemessene Kontakt-Header. Bisherige CV-Rubrik-Pills sind nach der Word-Prüfung gesperrt. Benötigt Sans im Lebenslauf."
                      : "Modern-Testexport · editierbares Word-Dossier mit leeren kompakten Kopf- und Fussstreifen. Vor der Verwendung in Word prüfen."}
            </p>
            <button
              type="button"
              onClick={() => void onDesignDocxNext()}
              disabled={
                busy ||
                missingParts.length > 0 ||
                !letterState.readyToSend ||
                designNativeBadgeUiEnabled()
              }
              aria-describedby="design-docx-next-help"
              className="mt-2 rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-50"
            >
              {downloading
                ? "Dossier wird erstellt…"
                : designNativeBadgeUiEnabled()
                  ? "Pillenversuch gesperrt"
                  : designReadingRowsUiEnabled()
                    ? "Modern CV-Zeilen testen"
                    : designRubricSpacingUiEnabled()
                      ? "Modern CV-Pills Abstand testen"
                      : designInteriorAuditUiEnabled()
                        ? "Modern Header und Rubriken prüfen"
                        : "Modern DOCX Next testen"}
            </button>
            {briefDocxNextError ? (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {briefDocxNextError}
              </p>
            ) : null}
          </div>
        ) : null}

        {briefDocxNextUiEnabled() && cover?.template === "brief" && onBriefDocxNext ? (
          <div className="mt-3 rounded-lg border px-3 py-2" data-brief-docx-next-qa>
            <p id="brief-docx-next-help" className="text-xs text-muted-foreground">
              Brief-Testexport · editierbares Word-Dossier. Schriftprofil Arial/Liberation Sans; vor
              der Verwendung in Word prüfen.
            </p>
            <button
              type="button"
              onClick={() => void onBriefDocxNext()}
              disabled={busy || missingParts.length > 0 || !letterState.readyToSend}
              aria-describedby="brief-docx-next-help"
              className="mt-2 rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-50"
            >
              {downloading ? "Dossier wird erstellt…" : "Brief DOCX Next testen"}
            </button>
            {briefDocxNextError ? (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {briefDocxNextError}
              </p>
            ) : null}
          </div>
        ) : null}

        {coverFamilyDocxQaEnabled() &&
        isCoverFamilyDocxQaTemplate(cover?.template) &&
        onCoverFamilyDocxNext ? (
          <div className="mt-3 rounded-lg border px-3 py-2" data-cover-family-docx-next-qa>
            <p className="text-xs text-muted-foreground">
              Vollständiges DOCX-Testdossier mit Titelblatt, Anschreiben und CV aus dem
              gespeicherten Projekt. Nur QA, keine Produktfreigabe.
              {coverChanged
                ? " Hinweis: Titelblatt und zuletzt übernommene CV-Kopfdaten unterscheiden sich."
                : ""}
            </p>
            <button
              type="button"
              onClick={() => void onCoverFamilyDocxNext()}
              disabled={busy || missingParts.length > 0 || !letterState.readyToSend}
              className="mt-2 rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-50"
            >
              {downloading ? "Dossier wird erstellt…" : "Ganzes DOCX-Testdossier herunterladen"}
            </button>
          </div>
        ) : null}

        {nativePrintUiEnabled() && onNativePrint ? (
          <div className="mt-3 rounded-lg border px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p id="native-print-help" className="text-xs text-muted-foreground">
                Experiment · öffnet den Druckdialog. Dort «Als PDF speichern» wählen.
              </p>
              <button
                type="button"
                onClick={() => void onNativePrint()}
                disabled={pdfBlocked}
                aria-describedby="native-print-help"
                className="rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
              >
                {nativePrinting ? "Druckdialog wird vorbereitet…" : "Drucken / als PDF speichern"}
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              A4 · Skalierung 100 % · ohne Kopf-/Fusszeilen.
            </p>
            {nativePrintError ? (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {nativePrintError}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          {canOverride && format === "pdf" ? (
            <button
              type="button"
              onClick={overrideDownload}
              className="rounded-md border border-input px-4 py-2 text-sm hover:bg-accent"
            >
              PDF trotzdem herunterladen
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            Zurück zum Bearbeiten
          </button>
          <button
            ref={downloadRef}
            type="button"
            onClick={() => void onDownload(format)}
            disabled={downloadBlocked}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {actionLabel}
          </button>
        </div>
        {overrideError ? (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {overrideError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
