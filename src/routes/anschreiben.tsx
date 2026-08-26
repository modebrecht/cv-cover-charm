import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ColorChooser } from "@/components/cover/ColorChooser";
import { ScaledPreview } from "@/components/cover/ScaledPreview";
import { Section } from "@/components/cover/Section";
import { TemplatePicker } from "@/components/cover/TemplatePicker";
import { ThemeToggle } from "@/components/cover/ThemeToggle";
import { FONT_LABELS, TEMPLATES, type FontKey, type TemplateId } from "@/components/cover/types";
import { ResizableEditorPanel } from "@/components/dossier/ResizableEditorPanel";
import { SaveStatus, type SaveState } from "@/components/dossier/SaveStatus";
import { LetterCanvas } from "@/components/letter/LetterCanvas";
import { LetterLayoutControls } from "@/components/letter/LetterLayoutControls";
import { LetterRichTextEditor } from "@/components/letter/LetterRichTextEditor";
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
  type SavedLetter,
} from "@/components/letter/types";

export const Route = createFileRoute("/anschreiben")({
  head: () => ({
    meta: [
      { title: "Anschreiben für die Lehrstellenbewerbung" },
      {
        name: "description",
        content:
          "Persönliches Anschreiben für deine Lehrstellenbewerbung – passend zu Titelblatt und Lebenslauf.",
      },
    ],
  }),
  component: Anschreiben,
});

const inputClass =
  "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

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
    let loadedLetter = false;

    try {
      const raw = window.localStorage.getItem(LETTER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SavedLetter>;
        if (parsed.data && typeof parsed.data === "object") {
          setData({ ...EMPTY_LETTER, ...parsed.data });
          loadedLetter = true;
        }
        if (parsed.design) setDesign(normalizeLetterDesign(parsed.design));
        setSaveState("saved");
      }
    } catch {
      setSaveState("error");
    }

    // Wie beim Lebenslauf: erster Besuch startet aus dem bereits vorhandenen
    // Dossier. Ein später erneut geöffnetes Anschreiben bleibt dagegen exakt so,
    // wie der Schüler es zuletzt gespeichert hat.
    if (!loadedLetter) {
      if (dossier.hasPersonal) {
        setData((current) => mergeNonEmptyLetterData(current, dossier.personalData));
      }
      if (dossier.hasApplication) {
        setData((current) => mergeNonEmptyLetterData(current, dossier.applicationData));
      }
      if (dossier.design) setDesign((current) => ({ ...current, ...dossier.design }));

      const automatic = [
        dossier.hasPersonal ? "persönliche Angaben" : null,
        dossier.hasApplication ? "Betriebsdaten" : null,
        dossier.hasDesign ? "Design" : null,
      ].filter(Boolean);
      if (automatic.length) {
        setTransferNote({
          kind: "ok",
          text: `Beim ersten Öffnen übernommen: ${automatic.join(", ")}.`,
        });
      }
    }

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
    () => TEMPLATES.find((candidate) => candidate.id === design.template) ?? TEMPLATES[0],
    [design.template],
  );

  const patch = (value: Partial<LetterData>) => setData((current) => ({ ...current, ...value }));
  const toggle = (key: string) => setOpen((current) => ({ ...current, [key]: !current[key] }));

  const changeTemplate = (next: TemplateId) => {
    setDesign((current) => ({
      ...current,
      template: next,
      colors: defaultLetterColors(next),
    }));
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
      setDesign(dossier.design);
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
        <button
          type="button"
          onClick={() => setPanelOpen((value) => !value)}
          className="rounded-md border px-2.5 py-1.5 text-xs font-medium sm:hidden"
          aria-pressed={panelOpen}
        >
          Formular
        </button>
        <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          ← Dossier
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold sm:text-base">Anschreiben</h1>
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

            <Section
              title="Vom Dossier übernehmen"
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
                  Aus Dossier übernehmen
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
              <TemplatePicker value={design.template} onChange={changeTemplate} />
            </Section>

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
