import { useEffect, useState, type ReactNode } from "react";
import { ArrowDown, FileDown, FileJson, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { docxDownloadErrorMessage, savedAppDocxNextAvailability } from "@/lib/docx-next/app-source";
import type { DocumentPart } from "@/lib/docx-next/model";

type Props = {
  part: DocumentPart["id"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  ready: boolean;
  onPdf: () => void | Promise<void>;
  pdfDisabled?: boolean;
  pdfHint?: string;
  onJson: () => void;
  onDossierPdf: () => void | Promise<void>;
  dossierPdfDisabled?: boolean;
  dossierPdfHint?: string;
  children?: ReactNode;
};

/** Shared download choices; editing and project loading stay in the adjacent menu. */
export function EditorDownloadMenu({
  part,
  open,
  onOpenChange,
  busy,
  ready,
  onPdf,
  pdfDisabled,
  pdfHint,
  onJson,
  onDossierPdf,
  dossierPdfDisabled,
  dossierPdfHint,
  children,
}: Props) {
  const [word, setWord] = useState<{ available: boolean; reason: string } | null>(null);
  const [partWord, setPartWord] = useState<{ available: boolean; reason: string } | null>(null);
  const [wordBusy, setWordBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    const dossier = savedAppDocxNextAvailability();
    setWord(dossier);
    setPartWord(savedAppDocxNextAvailability(part));
    setError(null);
  }, [open, part]);
  const downloading = busy || wordBusy;
  const downloadWord = async (documentPart?: DocumentPart["id"]) => {
    if (downloading) return;
    setWordBusy(true);
    setError(null);
    try {
      const { downloadSavedDossierDocxNext } = await import("@/lib/dossier-docx-next-export");
      await downloadSavedDossierDocxNext(documentPart);
      onOpenChange(false);
    } catch (cause) {
      setError(docxDownloadErrorMessage(cause));
    } finally {
      setWordBusy(false);
    }
  };
  const wordDisabled = downloading || !word?.available;
  const partWordDisabled = downloading || !partWord?.available;
  const itemClass = "min-h-11 cursor-pointer px-3 py-2";
  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        if (!wordBusy) onOpenChange(next);
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Download"
          title="Download"
          aria-busy={downloading}
          data-editor-ready={ready ? "true" : "false"}
          className="inline-flex shrink-0 items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ArrowDown className="h-5 w-5" aria-hidden="true" />
          <span className="hidden md:inline">{downloading ? "Download…" : "Download"}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        data-editor-download-menu
        align="end"
        className="w-72 max-w-[calc(100vw-1rem)]"
      >
        <DropdownMenuItem
          className={itemClass}
          disabled={downloading || pdfDisabled}
          title={pdfHint}
          onSelect={() => void onPdf()}
        >
          <FileDown aria-hidden="true" /> PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          className={itemClass}
          disabled={partWordDisabled}
          title={partWord?.reason}
          onSelect={(event) => {
            event.preventDefault();
            void downloadWord(part);
          }}
        >
          <FileText aria-hidden="true" /> DOCX
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className={itemClass} disabled={downloading} onSelect={onJson}>
          <FileJson aria-hidden="true" /> Dossier JSON
        </DropdownMenuItem>
        <DropdownMenuItem
          className={itemClass}
          disabled={downloading || dossierPdfDisabled}
          title={dossierPdfHint}
          onSelect={() => void onDossierPdf()}
        >
          <FileDown aria-hidden="true" /> Dossier PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          className={itemClass}
          disabled={wordDisabled}
          title={word?.reason}
          onSelect={(event) => {
            event.preventDefault();
            void downloadWord();
          }}
        >
          <FileText aria-hidden="true" /> Dossier DOCX
        </DropdownMenuItem>
        {pdfDisabled && pdfHint ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">PDF: {pdfHint}</p>
        ) : null}
        {dossierPdfDisabled && dossierPdfHint ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">Dossier PDF: {dossierPdfHint}</p>
        ) : null}
        {partWord && !partWord.available ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">DOCX: {partWord.reason}</p>
        ) : null}
        {word && !word.available && (partWord?.available || word.reason !== partWord?.reason) ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">Dossier DOCX: {word.reason}</p>
        ) : null}
        {wordBusy ? (
          <p className="px-3 py-2 text-xs" role="status">
            DOCX wird erstellt…
          </p>
        ) : null}
        {error ? (
          <p className="px-3 py-2 text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
