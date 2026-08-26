import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ColorChooser } from "@/components/cover/ColorChooser";
import { ScaledPreview } from "@/components/cover/ScaledPreview";
import { Section } from "@/components/cover/Section";
import { ThemeToggle } from "@/components/cover/ThemeToggle";
import { FONT_LABELS, TEMPLATES, type FontKey } from "@/components/cover/types";
import { ResizableEditorPanel } from "@/components/dossier/ResizableEditorPanel";
import { SaveStatus, type SaveState } from "@/components/dossier/SaveStatus";
import { LetterCanvas } from "@/components/letter/LetterCanvas";
import { LetterLayoutControls } from "@/components/letter/LetterLayoutControls";
import { LetterRichTextEditor } from "@/components/letter/LetterRichTextEditor";
import { LetterTemplatePicker } from "@/components/letter/LetterTemplatePicker";
import {
  mergeNonEmptyLetterData,
  readLetterDossierSource,
  type LetterDossierSource,
} from "@/components/letter/dossier-transfer";
import {
  EMPTY_LETTER,
  LETTER_STORAGE_KEY,
  defaultLetterColors,
  emptyLetterDesign,
  normalizeLetterDesign,
  type LetterData,
  type LetterDesign,
  type LetterTemplateId,
  type SavedLetter,
} from "@/components/letter/types";

export const Route = createFileRoute("/anschreiben")({
  head: () => ({
    meta: [
      { title: "Bewerbungsbrief für die Lehrstellenbewerbung" },
      {
        name: "description",
        content:
          "Persönlicher Bewerbungsbrief für deine Lehrstellenbewerbung – passend zu Titelblatt und Lebenslauf.",
      },
    ],
  }),
  component: Anschreiben,
});

const inputClass =
  "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

/** Standard-Anrede und -Gruss allein bedeuten noch nicht, dass der Brief begonnen wurde. */
function letterHasStarted(data: LetterData): boolean {
  return [
    data.absenderName,
    data.absenderAdresse,
    data.absenderPlzOrt,
    data.absenderTelefon,
    data.absenderEmail,
    data.empfaengerFirma,
    data.empfaengerName,
    data.empfaengerAdresse,
    data.empfaengerPlzOrt,
    data.ort,
    data.datum,
    data.betreff,
    data.text,
    data.richTextHtml,
    data.unterschrift,
  ].some((value) => !!value?.trim());
}

/** Ort/Datum werden im Titelblatt vorbelegt und reichen allein nicht für einen echten Entwurf. */
function titlePageHasMeaningfulSource(source: LetterDossierSource | null): boolean {
  if (!source) return false;
  const personal =
    source.personalSource === "Titelblatt" &&
    [
      source.personalData.absenderName,
      source.personalData.absenderAdresse,
      source.personalData.absenderPlzOrt,
      source.personalData.absenderTelefon,
      source.personalData.absenderEmail,
    ].some((value) => !!value?.trim());
  const application =
    source.applicationSource === "Titelblatt" &&
    [
      source.applicationData.empfaengerFirma,
      source.applicationData.empfaengerName,
      source.applicationData.empfaengerAdresse,
      source.applicationData.empfaengerPlzOrt,
      source.applicationData.betreff,
    ].some((value) => !!value?.trim());
  return personal || application;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block text-xs font-medium text-foreground">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </label>
  );
}

function Anschreiben() {
  const [data, setData] = useState<LetterData>(EMPTY_LETTER);
  const [design, setDesign] = useState<LetterDesign>(emptyLetterDesign);
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [panelOpen, setPanelOpen] = useState(true);
  const [source, setSource] = useState<LetterDossierSource | null>(null);
  const [transferNote, setTransferNote] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);
  const [takeover, setTakeover] = useState({
    personal: true,
    application: true,
    design: true,
  });
  const [open, setOpen] = useState<Record<string, boolean>>({
    uebernehmen: true,
    absender: true,
    empfaenger: true,
    layout: true,
    brief: true,
    vorlage: false,
    farben: false,
    typo: false,
  });

  const refreshSource = useCallback(() => {
    const next = readLetterDossierSource();
    setSource(next);
    return next;
  }, []);

  useEffect(() => {
    const dossier = refreshSource();
    let nextData: LetterData = { ...EMPTY_LETTER };
    let nextDesign: LetterDesign = emptyLetterDesign();
    let savedDataLoaded = false;

    try {
      const raw = window.localStorage.getItem(LETTER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SavedLetter>;
        if (parsed.data && typeof parsed.data === "object") {
          nextData = { ...EMPTY_LETTER, ...parsed.data };
          savedDataLoaded = true;
        }
        if (parsed.design) nextDesign = normalizeLetterDesign(parsed.design);
        setSaveState("saved");
      }
    } catch {
      setSaveState("error");
    }

    // Ein technisch vorhandener, aber inhaltlich leerer Autosave zählt wie ein
    // erster Besuch. Sobald das Titelblatt echte Angaben enthält, startet der
    // Bewerbungsbrief mit denselben Daten und derselben Designsprache.
    if (
      (!savedDataLoaded || !letterHasStarted(nextData)) &&
      titlePageHasMeaningfulSource(dossier)
    ) {
      const automatic: string[] = [];
      if (dossier.personalSource === "Titelblatt" && dossier.hasPersonal) {
        nextData = mergeNonEmptyLetterData(nextData, dossier.personalData);
        automatic.push("persönliche Angaben");
      }
      if (dossier.applicationSource === "Titelblatt" && dossier.hasApplication) {
        nextData = mergeNonEmptyLetterData(nextData, dossier.applicationData);
        automatic.push("Betriebsdaten");
      }
      if (dossier.designSource === "Titelblatt" && dossier.design) {
        nextDesign = { ...nextDesign, ...dossier.design };
        automatic.push("Design");
      }
      if (automatic.length) {
        setTransferNote({
          kind: "ok",
          text: `Automatisch vom Titelblatt übernommen: ${automatic.join(", ")}.`,
        });
      }
    }

    setData(nextData);
    setDesign(nextDesign);
    setHydrated(true);
  }, [refreshSource]);

  useEffect(() => {
    const refresh = () => refreshSource();
    const onStorage = (event: StorageEvent) => {
      if (event.key === LETTER_STORAGE_KEY) return;
      refresh();
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [refreshSource]);

  useEffect(() => {
    if (!hydrated) return;
    setSaveState("saving");
    const timer = window.setTimeout(() => {
      try {
        const saved: SavedLetter = { version: 1, data, design };
        window.localStorage.setItem(LETTER_STORAGE_KEY, JSON.stringify(saved));
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [data, design, hydrated]);

  useEffect(() => {
    if (!transferNote) return;
    const timer = window.setTimeout(() => setTransferNote(null), 6000);
    return () => window.clearTimeout(timer);
  }, [transferNote]);

  const template = useMemo(
    () =>
      design.template === "brief"
        ? null
        : (TEMPLATES.find((candidate) => candidate.id === design.template) ?? TEMPLATES[0]),
    [design.template],
  );
  const titlePageReady = titlePageHasMeaningfulSource(source);
  const titlePageTemplateName = useMemo(() => {
    if (source?.designSource !== "Titelblatt" || !source.design) return null;
    return (
      TEMPLATES.find((candidate) => candidate.id === source.design?.template)?.name ??
      source.design.template
    );
  }, [source]);

  const patch = (value: Partial<LetterData>) => setData((current) => ({ ...current, ...value }));
  const toggle = (key: string) => setOpen((current) => ({ ...current, [key]: !current[key] }));

  const changeTemplate = (next: LetterTemplateId) => {
    setDesign((current) => ({
      ...current,
      template: next,
      colors: defaultLetterColors(next),
    }));
  };

  const syncAllFromTitlePage = () => {
    const dossier = refreshSource();
    if (!titlePageHasMeaningfulSource(dossier)) {
      setTransferNote({
        kind: "error",
        text: "Fülle zuerst dein Titelblatt aus.",
      });
      return;
    }

    const done: string[] = [];
    if (dossier.personalSource === "Titelblatt" && dossier.hasPersonal) {
      setData((current) => mergeNonEmptyLetterData(current, dossier.personalData));
      done.push("persönliche Angaben");
    }
    if (dossier.applicationSource === "Titelblatt" && dossier.hasApplication) {
      setData((current) => mergeNonEmptyLetterData(current, dossier.applicationData));
      done.push("Betriebsdaten");
    }
    if (dossier.designSource === "Titelblatt" && dossier.design) {
      setDesign((current) => ({ ...current, ...dossier.design! }));
      done.push("Design");
    }

    setTransferNote({
      kind: "ok",
      text: `Alles vom Titelblatt übernommen: ${done.join(", ")}. Dein Brieftext bleibt erhalten.`,
    });
  };

  const syncFromDossier = () => {
    const dossier = refreshSource();
    const done: string[] = [];

    if (takeover.personal && dossier.hasPersonal) {
      setData((current) => mergeNonEmptyLetterData(current, dossier.personalData));
      done.push("persönliche Angaben");
    }
    if (takeover.application && dossier.hasApplication) {
      setData((current) => mergeNonEmptyLetterData(current, dossier.applicationData));
      done.push("Betriebsdaten");
    }
    if (takeover.design && dossier.design) {
      setDesign((current) => ({ ...current, ...dossier.design! }));
      done.push("Design");
    }

    setTransferNote(
      done.length
        ? { kind: "ok", text: `Übernommen: ${done.join(", ")}. Dein Brieftext bleibt erhalten.` }
        : {
            kind: "error",
            text: "Für die Auswahl gibt es noch keine gespeicherten Angaben im Dossier.",
          },
    );
  };

  const anySource = !!source && (source.hasPersonal || source.hasApplication || source.hasDesign);

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-background">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-3 sm:px-4">
        <Link
          to="/"
          aria-label="Übersicht"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-input px-2.5 py-2 text-sm font-medium hover:bg-accent sm:px-3"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M2.5 7.2 8 2.8l5.5 4.4v5.5a.8.8 0 0 1-.8.8H9.8V9.6H6.2v3.9H3.3a.8.8 0 0 1-.8-.8Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="hidden sm:inline">Übersicht</span>
        </Link>
        <button
          type="button"
          onClick={() => setPanelOpen((value) => !value)}
          className="rounded-md border px-2.5 py-1.5 text-xs font-medium sm:hidden"
          aria-pressed={panelOpen}
        >
          Formular
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold sm:text-base">Bewerbungsbrief</h1>
        </div>
        <SaveStatus state={saveState} />
        <ThemeToggle />
      </header>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <ResizableEditorPanel open={panelOpen}>
          <div className="flex flex-col gap-3 p-3 pb-12 sm:p-4">
            <div className="rounded-lg border bg-background p-3 text-xs leading-relaxed text-muted-foreground">
              Schreibe deinen Bewerbungsbrief hier. Das Layout bleibt bewusst ruhiger als beim
              Lebenslauf, damit längerer Text gut lesbar bleibt.
            </div>

            <div className="rounded-lg border border-primary/25 bg-primary/5 p-3">
              <div className="text-sm font-semibold text-foreground">
                Mit dem Titelblatt abgleichen
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Übernimmt Kontaktdaten, Lehrbetrieb, Ort, Datum und Betreff sowie Vorlage, Farben
                und Schrift. Dein eigener Brieftext bleibt erhalten.
              </p>
              <button
                type="button"
                onClick={syncAllFromTitlePage}
                disabled={!titlePageReady}
                className="mt-3 w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Alles vom Titelblatt übernehmen
              </button>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {titlePageReady
                  ? titlePageTemplateName
                    ? `Titelblatt-Vorlage: ${titlePageTemplateName}`
                    : "Titelblatt-Daten gefunden."
                  : "Fülle zuerst dein Titelblatt aus."}
              </p>
            </div>

            <Section
              title="Einzeln übernehmen"
              open={open.uebernehmen}
              onToggle={() => toggle("uebernehmen")}
            >
              <div className="grid gap-2.5">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Aktualisiere Angaben aus Titelblatt oder Lebenslauf. Leere Quellfelder und dein
                  eigentlicher Brieftext werden dabei nie gelöscht.
                </p>

                <label className="flex items-start gap-2 rounded-md border p-2.5 text-xs">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={takeover.personal}
                    disabled={!source?.hasPersonal}
                    onChange={(event) =>
                      setTakeover((current) => ({ ...current, personal: event.target.checked }))
                    }
                  />
                  <span>
                    <span className="block font-medium">Persönliche Angaben</span>
                    <span className="text-muted-foreground">
                      Name, Adresse und Kontakt
                      {source?.personalSource ? ` · aus ${source.personalSource}` : " · noch leer"}
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-2 rounded-md border p-2.5 text-xs">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={takeover.application}
                    disabled={!source?.hasApplication}
                    onChange={(event) =>
                      setTakeover((current) => ({ ...current, application: event.target.checked }))
                    }
                  />
                  <span>
                    <span className="block font-medium">Betrieb und Bewerbung</span>
                    <span className="text-muted-foreground">
                      Empfänger, Ort, Datum und Betreff
                      {source?.applicationSource
                        ? ` · aus ${source.applicationSource}`
                        : " · noch leer"}
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-2 rounded-md border p-2.5 text-xs">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={takeover.design}
                    disabled={!source?.hasDesign}
                    onChange={(event) =>
                      setTakeover((current) => ({ ...current, design: event.target.checked }))
                    }
                  />
                  <span>
                    <span className="block font-medium">Design</span>
                    <span className="text-muted-foreground">
                      Vorlage, Farben und Schrift
                      {source?.designSource ? ` · aus ${source.designSource}` : " · noch leer"}
                    </span>
                  </span>
                </label>

                <button
                  type="button"
                  onClick={syncFromDossier}
                  disabled={!anySource}
                  className="mt-1 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Auswahl übernehmen
                </button>

                {transferNote && (
                  <div
                    role="status"
                    className={`rounded-md border px-3 py-2 text-xs ${
                      transferNote.kind === "error"
                        ? "border-destructive/40 text-destructive"
                        : "border-border bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    {transferNote.text}
                  </div>
                )}
              </div>
            </Section>

            <Section
              title="Meine Kontaktdaten"
              open={open.absender}
              onToggle={() => toggle("absender")}
            >
              <div className="grid gap-3">
                <Field
                  label="Vorname und Nachname"
                  value={data.absenderName}
                  onChange={(value) => patch({ absenderName: value })}
                />
                <Field
                  label="Adresse"
                  value={data.absenderAdresse}
                  onChange={(value) => patch({ absenderAdresse: value })}
                />
                <Field
                  label="PLZ und Ort"
                  value={data.absenderPlzOrt}
                  onChange={(value) => patch({ absenderPlzOrt: value })}
                />
                <Field
                  label="Telefon"
                  value={data.absenderTelefon}
                  onChange={(value) => patch({ absenderTelefon: value })}
                  type="tel"
                />
                <Field
                  label="E-Mail"
                  value={data.absenderEmail}
                  onChange={(value) => patch({ absenderEmail: value })}
                  type="email"
                />
              </div>
            </Section>

            <Section
              title="Firma / Lehrbetrieb"
              open={open.empfaenger}
              onToggle={() => toggle("empfaenger")}
            >
              <div className="grid gap-3">
                <Field
                  label="Lehrbetrieb"
                  value={data.empfaengerFirma}
                  onChange={(value) => patch({ empfaengerFirma: value })}
                />
                <Field
                  label="Ansprechperson"
                  value={data.empfaengerName}
                  onChange={(value) => patch({ empfaengerName: value })}
                  placeholder="z. B. Frau Anna Muster"
                />
                <Field
                  label="Adresse"
                  value={data.empfaengerAdresse}
                  onChange={(value) => patch({ empfaengerAdresse: value })}
                />
                <Field
                  label="PLZ und Ort"
                  value={data.empfaengerPlzOrt}
                  onChange={(value) => patch({ empfaengerPlzOrt: value })}
                />
              </div>
            </Section>

            <Section title="Briefinhalt" open={open.brief} onToggle={() => toggle("brief")}>
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Ort" value={data.ort} onChange={(value) => patch({ ort: value })} />
                  <Field
                    label="Datum"
                    value={data.datum}
                    onChange={(value) => patch({ datum: value })}
                    placeholder="25.08.2026"
                  />
                </div>
                <Field
                  label="Titel / Betreff"
                  value={data.betreff}
                  onChange={(value) => patch({ betreff: value })}
                  placeholder="Bewerbung um eine Lehrstelle als …"
                />
                <Field
                  label="Anrede"
                  value={data.anrede}
                  onChange={(value) => patch({ anrede: value })}
                />
                <LetterRichTextEditor
                  text={data.text}
                  richTextHtml={data.richTextHtml}
                  onChange={({ text, richTextHtml }) => patch({ text, richTextHtml })}
                />
                <Field
                  label="Grussformel"
                  value={data.gruss}
                  onChange={(value) => patch({ gruss: value })}
                />
                <Field
                  label="Name unter der Unterschrift"
                  value={data.unterschrift}
                  onChange={(value) => patch({ unterschrift: value })}
                />
              </div>
            </Section>

            <Section title="Layout" open={open.layout} onToggle={() => toggle("layout")}>
              <LetterLayoutControls
                design={design}
                onChange={(value) => setDesign((current) => ({ ...current, ...value }))}
              />
            </Section>

            <Section title="Vorlage" open={open.vorlage} onToggle={() => toggle("vorlage")}>
              <LetterTemplatePicker value={design.template} onChange={changeTemplate} />
            </Section>

            {design.template !== "brief" && template ? (
              <Section title="Farben" open={open.farben} onToggle={() => toggle("farben")}>
                <ColorChooser
                  slots={template.slots}
                  colors={design.colors}
                  onChange={(key, value) =>
                    setDesign((current) => ({
                      ...current,
                      colors: { ...current.colors, [key]: value },
                    }))
                  }
                  onApplyPalette={(colors) => setDesign((current) => ({ ...current, colors }))}
                  onReset={() =>
                    setDesign((current) => ({
                      ...current,
                      colors: defaultLetterColors(current.template),
                    }))
                  }
                />
              </Section>
            ) : null}

            <Section title="Schrift" open={open.typo} onToggle={() => toggle("typo")}>
              <label className="block text-xs font-medium">
                Schriftart
                <select
                  value={design.font}
                  onChange={(event) =>
                    setDesign((current) => ({ ...current, font: event.target.value as FontKey }))
                  }
                  className={inputClass}
                >
                  {Object.entries(FONT_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </Section>
          </div>
        </ResizableEditorPanel>

        <main className="min-w-0 flex-1 overflow-auto bg-muted/40 p-3 sm:p-6">
          <div className="mx-auto w-full max-w-[980px] py-2 sm:py-4">
            <ScaledPreview max={1}>
              <LetterCanvas data={data} design={design} />
            </ScaledPreview>
          </div>
        </main>
      </div>
    </div>
  );
}
