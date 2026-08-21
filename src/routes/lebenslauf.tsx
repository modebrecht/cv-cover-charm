import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ThemeToggle } from "@/components/cover/ThemeToggle";
import { Section } from "@/components/cover/Section";
import { TemplatePicker } from "@/components/cover/TemplatePicker";
import { ColorChooser } from "@/components/cover/ColorChooser";
import { ScaledPreview } from "@/components/cover/ScaledPreview";
import { CvCanvas } from "@/components/cv/CvCanvas";
import {
  FormCvEntries,
  FormCvLines,
  FormCvPerson,
  FormCvReferenzen,
  FormCvSprachen,
  SectionOptions,
} from "@/components/cv/CvForm";
import {
  CV_SECTION_LABELS,
  DEMO_CV,
  emptyCv,
  type CvData,
  type CvDesign,
  type CvPerson,
  type CvSectionKey,
} from "@/components/cv/types";
import { emptyCoverDraft, personFilled, readCoverDraft, type CoverDraft } from "@/lib/dossier";
import { TEMPLATES, type CustomField, type TemplateId } from "@/components/cover/types";
import { downloadBlob, safeFileName } from "@/lib/download";
import { PDF, PREVIEW } from "@/default-config";
import {
  describe,
  formatWhen,
  HISTORY_KEYS,
  pushSnapshot,
  readHistory,
  type Snapshot,
} from "@/lib/history";
import { useForeignWrite, usePageVisible } from "@/lib/autosave";
import { applyDossierTheme } from "@/lib/dossier-theme";

export const Route = createFileRoute("/lebenslauf")({
  head: () => ({
    meta: [
      { title: "Lebenslauf für die Lehrstellenbewerbung" },
      {
        name: "description",
        content:
          "Lebenslauf für deine Lehrstellenbewerbung – im gleichen Design wie dein Titelblatt, als PDF zum Herunterladen.",
      },
    ],
  }),
  component: Lebenslauf,
});

const STORAGE_KEY = "lebenslauf:v1";
const SAVE_VERSION = 3;

/**
 * Vorgabe: 75 % Transparenz.
 *
 * Der Regler steuert nur noch die Zierde – Spalte, Band und Kartengrund einer
 * Bauform bleiben unabhängig davon voll deckend. Darum darf die Zierde wieder
 * sichtbar sein. Der frühere Wert von 6 % stammt aus der Zeit, als der
 * Hintergrund die Vorlage allein tragen musste und dabei unsichtbar wurde.
 */
const DEFAULT_BG_OPACITY = 0.25;
const LEGACY_DEFAULT_BG_OPACITIES = [0.06, 0.12];

function defaultColors(template: TemplateId): Record<string, string> {
  const t = TEMPLATES.find((x) => x.id === template) ?? TEMPLATES[0];
  return Object.fromEntries(t.slots.map((s) => [s.key, s.default]));
}

type Saved = {
  version: number;
  data: CvData;
  design: CvDesign;
  elements: CustomField[];
};

/**
 * Alte Entwürfe trugen noch den deutlich kräftigeren damaligen Standardwert.
 * Nur diese bekannten Defaults werden migriert; bewusst gewählte Werte bleiben erhalten.
 */
function migratedDesign(current: CvDesign, incoming: CvDesign, version?: number): CvDesign {
  const merged = { ...current, ...incoming };
  const isOldSave = (version ?? 1) < SAVE_VERSION;
  const usedOldDefault = LEGACY_DEFAULT_BG_OPACITIES.some(
    (value) => Math.abs(merged.bgOpacity - value) < 0.001,
  );
  if (isOldSave && usedOldDefault) merged.bgOpacity = DEFAULT_BG_OPACITY;
  return merged;
}

/** Trägt der Lebenslauf überhaupt Inhalt? Leere Stände sind nichts wert. */
function cvHasContent(d: CvData): boolean {
  if (!d) return false;
  const p = d.person ?? {};
  if (p.vorname?.trim() || p.nachname?.trim() || p.untertitel?.trim()) return true;
  return !!(
    d.schule?.length ||
    d.erfahrung?.length ||
    d.sprachen?.length ||
    d.hobbys?.length ||
    d.staerken?.length ||
    d.referenzen?.length
  );
}

function Lebenslauf() {
  const [data, setData] = useState<CvData>(emptyCv);
  const [design, setDesign] = useState<CvDesign>(() => {
    const d = emptyCoverDraft();
    return {
      template: d.template,
      colors: d.colors,
      bgOpacity: DEFAULT_BG_OPACITY,
      useElements: false,
    };
  });
  const [elements, setElements] = useState<CustomField[]>([]);
  const [cover, setCover] = useState<CoverDraft | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [zoom, setZoom] = useState<number>(PREVIEW.ZOOM_DEFAULT);
  const [downloading, setDownloading] = useState(false);
  const [fitHeight, setFitHeight] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({
    design: true,
    person: true,
    schule: false,
    erfahrung: false,
    sprachen: false,
    hobbys: false,
    staerken: false,
    referenzen: false,
  });

  const [history, setHistory] = useState<Snapshot[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const visible = usePageVisible();
  const { markWritten, changedElsewhere } = useForeignWrite(STORAGE_KEY);

  const exportRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const restored = useRef(false);

  /** Einen gespeicherten oder importierten Lebenslauf übernehmen. */
  const applySaved = useCallback((p: Partial<Saved>) => {
    if (p.data) setData({ ...emptyCv, ...p.data, person: { ...emptyCv.person, ...p.data.person } });
    if (p.design) setDesign((d) => migratedDesign(d, p.design!, p.version));
    if (Array.isArray(p.elements)) setElements(p.elements);
  }, []);

  const toggle = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const patchData = (p: Partial<CvData>) => setData((d) => ({ ...d, ...p }));
  const patchPerson = (p: Partial<CvPerson>) =>
    setData((d) => ({ ...d, person: { ...d.person, ...p } }));

  const activeTemplate = useMemo(
    () => TEMPLATES.find((t) => t.id === design.template) ?? TEMPLATES[0],
    [design.template],
  );

  /** Gespeicherten Lebenslauf übernehmen. Gibt zurück, ob es einen gab. */
  const loadFromStorage = useCallback((): boolean => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      saved = null;
    }
    if (!saved) return false;
    try {
      const p = JSON.parse(saved) as Partial<Saved>;
      applySaved(p);
      markWritten(saved);
      return true;
    } catch {
      return false;
    }
  }, [markWritten, applySaved]);

  /* ---------- Laden ---------- */
  useEffect(() => {
    restored.current = true;
    setHistory(readHistory(HISTORY_KEYS.cv));
    const draft = readCoverDraft();
    setCover(draft);

    if (loadFromStorage()) return;

    // Erster Besuch: Gestaltung und Angaben vom Titelblatt übernehmen.
    if (draft) {
      setDesign((d) => ({ ...d, template: draft.template, colors: draft.colors }));
      setElements(draft.elements);
      if (personFilled(draft.person)) {
        setData((d) => ({ ...d, person: { ...d.person, ...draft.person } }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Zurück im Tab: ein anderes Fenster hat womöglich neuer geschrieben. */
  useEffect(() => {
    if (!visible || !restored.current) return;
    if (changedElsewhere()) {
      loadFromStorage();
      setHistory(readHistory(HISTORY_KEYS.cv));
      setStatus({ kind: "ok", text: "Neuerer Stand aus einem anderen Fenster geladen" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  /** Der laufende Lebenslauf, so wie er gespeichert bzw. exportiert wird. */
  const payload = useCallback(
    (): Saved => ({ version: SAVE_VERSION, data, design, elements }),
    [data, design, elements],
  );

  /** Stand in die eigene Historie legen – die des Titelblatts bleibt unberührt. */
  const keepSnapshot = useCallback(
    (label: string, force = false) => {
      const p = payload();
      if (!cvHasContent(p.data)) return;
      setHistory(
        pushSnapshot(HISTORY_KEYS.cv, p as unknown as Record<string, unknown>, label, force),
      );
    },
    [payload],
  );

  /* ---------- Sichern ---------- */
  useEffect(() => {
    if (!restored.current) return;
    if (!visible) return;
    const id = setTimeout(() => {
      try {
        const text = JSON.stringify(payload());
        localStorage.setItem(STORAGE_KEY, text);
        markWritten(text);
      } catch {
        // Speicher voll – Bearbeiten geht weiter
      }
      keepSnapshot("Automatisch");
    }, 400);
    return () => clearTimeout(id);
  }, [payload, keepSnapshot, visible, markWritten]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) setHistoryOpen(false);
  }, [menuOpen]);

  /**
   * Schriftbild der Vorlage auf das Dokument legen.
   *
   * `dossier-theme.css` gestaltet den Lebenslauf über `--dossier-*` und
   * `html[data-dossier-family]`. Gesetzt wurden diese Werte bisher nur beim
   * Wechsel der Vorlage im Titelblatt – auf dieser Seite blieben sie deshalb
   * auf der Familie "modern" stehen, egal welche Vorlage gewählt war. Jede
   * Regel mit `!important` hat damit Moderns Typografie erzwungen, also genau
   * das, was hier eigentlich von der Vorlage kommen soll.
   */
  useEffect(() => {
    applyDossierTheme(design.template);
  }, [design.template]);

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(t);
  }, [status]);

  useEffect(() => {
    const update = () => setFitHeight(window.innerHeight - 200);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const syncFromCover = useCallback(() => {
    const draft = readCoverDraft();
    setCover(draft);
    if (!draft) {
      setStatus({ kind: "error", text: "Es gibt noch kein gespeichertes Titelblatt." });
      return;
    }
    setDesign((d) => ({ ...d, template: draft.template, colors: draft.colors }));
    setElements(draft.elements);
    setStatus({ kind: "ok", text: "Vorlage und Farben vom Titelblatt übernommen" });
  }, []);

  const takePerson = () => {
    const draft = readCoverDraft();
    if (!draft || !personFilled(draft.person)) {
      setStatus({ kind: "error", text: "Im Titelblatt stehen noch keine Angaben." });
      return;
    }
    setData((d) => ({ ...d, person: { ...d.person, ...draft.person } }));
    setStatus({ kind: "ok", text: "Angaben vom Titelblatt übernommen" });
  };

  const loadDemo = () => {
    keepSnapshot("Vor den Beispieldaten", true);
    setData(DEMO_CV);
    setMenuOpen(false);
    setStatus({ kind: "ok", text: "Beispieldaten eingefügt" });
  };

  const downloadJson = () => {
    setMenuOpen(false);
    downloadBlob(
      new Blob([JSON.stringify(payload(), null, 2)], { type: "application/json" }),
      `${fileBase()}.json`,
    );
    setStatus({ kind: "ok", text: "Entwurf gespeichert" });
  };

  const importJson = async (file?: File) => {
    if (!file) return;
    try {
      const p = JSON.parse(await file.text()) as Partial<Saved>;
      if (!p || typeof p !== "object" || !p.data) throw new Error("kein Lebenslauf");
      keepSnapshot("Vor dem Laden", true);
      applySaved(p);
      setStatus({ kind: "ok", text: "Entwurf geladen" });
    } catch {
      setStatus({ kind: "error", text: "Datei konnte nicht gelesen werden." });
    }
  };

  const restoreSnapshot = (snap: Snapshot) => {
    keepSnapshot("Vor dem Zurückholen", true);
    const p = snap.payload as unknown as Partial<Saved>;
    const foto = data.person.foto;
    applySaved(p);
    if (foto) setData((d) => ({ ...d, person: { ...d.person, foto } }));
    setMenuOpen(false);
    setStatus({ kind: "ok", text: `Stand von ${formatWhen(snap.at)} geladen` });
  };

  const fileBase = () => {
    const n = [data.person.vorname, data.person.nachname].filter(Boolean).join("-");
    return safeFileName(n ? `Lebenslauf-${n}` : "Lebenslauf");
  };

  const downloadPdf = async () => {
    if (!exportRef.current || downloading) return;
    setDownloading(true);
    try {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);
      const pages = Array.from(exportRef.current.querySelectorAll<HTMLElement>("[data-cv-page]"));
      if (!pages.length) throw new Error("keine Seiten");

      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const name = [data.person.vorname, data.person.nachname].filter(Boolean).join(" ");
      pdf.setProperties({
        title: name ? `Lebenslauf – ${name}` : "Lebenslauf",
        author: name,
        subject: "Lebenslauf",
        creator: name,
      });

      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i], {
          scale: PDF.SCALE,
          backgroundColor: "#ffffff",
          useCORS: true,
        });
        if (i > 0) pdf.addPage();
        pdf.addImage(
          canvas.toDataURL("image/jpeg", PDF.QUALITY),
          "JPEG",
          0,
          0,
          210,
          297,
          undefined,
          "FAST",
        );
      }
      downloadBlob(pdf.output("blob"), `${fileBase()}.pdf`);
      setStatus({ kind: "ok", text: `PDF mit ${pages.length} Seite(n) heruntergeladen` });
    } catch (e) {
      console.error(e);
      setStatus({ kind: "error", text: "PDF konnte nicht erstellt werden." });
    } finally {
      setDownloading(false);
    }
  };

  const sectionLabel = (key: CvSectionKey) => data.labels[key]?.trim() || CV_SECTION_LABELS[key];
  const setLabel = (key: CvSectionKey, v: string) =>
    patchData({ labels: { ...data.labels, [key]: v } });
  const setHidden = (key: CvSectionKey, v: boolean) =>
    patchData({ hidden: { ...data.hidden, [key]: v } });

  const opts = (key: CvSectionKey) => (
    <SectionOptions
      value={data.labels[key] ?? ""}
      placeholder={CV_SECTION_LABELS[key]}
      hidden={!!data.hidden[key]}
      onLabel={(v) => setLabel(key, v)}
      onHidden={(v) => setHidden(key, v)}
    />
  );

  const canvas = <CvCanvas data={data} design={design} elements={elements} />;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="relative z-30 shrink-0 border-b">
        <div className="flex items-center gap-2 px-3 py-2 sm:px-4">
          <button
            type="button"
            onClick={() => setPanelOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <span className="sm:hidden">Formular</span>
            <span className="hidden sm:inline">
              {panelOpen ? "Formular schliessen" : "Formular"}
            </span>
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold sm:text-base">Lebenslauf</h1>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              Teil deines Bewerbungsdossiers
            </p>
          </div>

          {status && (
            <span
              role="status"
              className={`hidden truncate rounded-md px-3 py-1.5 text-xs md:inline-block ${
                status.kind === "error"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {status.text}
            </span>
          )}

          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/titelblatt"
              className="hidden rounded-md border border-input px-3 py-2 text-sm hover:bg-accent sm:inline-flex"
            >
              Titelblatt
            </Link>
            <ThemeToggle />
            <select
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              title="Zoom der Vorschau"
              className="hidden rounded-md border border-input bg-background px-2 py-2 text-sm hover:bg-accent sm:inline-flex"
            >
              {PREVIEW.ZOOM_STEPS.map((z) => (
                <option key={z} value={z}>
                  {Math.round(z * 100)} %
                </option>
              ))}
            </select>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                disabled={downloading}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 sm:px-4"
              >
                {downloading ? "PDF…" : "Download"}
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                  <path
                    d="M3 4.5l3 3 3-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-md border bg-popover shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      downloadPdf();
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    <span>Als PDF</span>
                    <span className="text-xs text-muted-foreground">.pdf</span>
                  </button>
                  <button
                    type="button"
                    onClick={downloadJson}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    <span>Entwurf speichern</span>
                    <span className="text-xs text-muted-foreground">.json</span>
                  </button>
                  <label className="block cursor-pointer border-t px-3 py-2 text-left text-sm hover:bg-accent">
                    Entwurf laden
                    <input
                      type="file"
                      accept="application/json"
                      className="hidden"
                      onChange={(e) => {
                        importJson(e.target.files?.[0]);
                        e.target.value = "";
                        setMenuOpen(false);
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={loadDemo}
                    className="w-full border-t px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    Beispiel ausfüllen
                  </button>

                  {history.length > 0 && (
                    <div className="border-t">
                      <button
                        type="button"
                        onClick={() => setHistoryOpen((v) => !v)}
                        aria-expanded={historyOpen}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                      >
                        <span>Früheren Stand laden</span>
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {history.length}
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 12 12"
                            aria-hidden="true"
                            style={{
                              transform: historyOpen ? "rotate(180deg)" : "none",
                              transition: "transform 150ms",
                            }}
                          >
                            <path
                              d="M3 4.5l3 3 3-3"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      </button>
                      {historyOpen && (
                        <div className="max-h-60 overflow-y-auto border-t bg-muted/30 pb-1">
                          <p className="px-3 pb-1 pt-2 text-xs text-muted-foreground">
                            Ohne Bilder – ein gewähltes Foto bleibt erhalten.
                          </p>
                          {history.map((snap) => (
                            <button
                              key={snap.id}
                              type="button"
                              onClick={() => restoreSnapshot(snap)}
                              className="flex w-full items-baseline justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent"
                            >
                              <span className="truncate">{describe(snap.payload)}</span>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {formatWhen(snap.at)}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <aside
          className={`absolute inset-y-0 left-0 z-20 w-[min(92vw,420px)] shrink-0 overflow-y-auto overflow-x-hidden border-r bg-muted/40 transition-transform duration-300 ease-out sm:static sm:transition-[width,transform] ${
            panelOpen
              ? "translate-x-0 sm:w-[280px] md:w-[340px] lg:w-[400px]"
              : "-translate-x-full sm:w-0 sm:overflow-hidden sm:border-r-0"
          }`}
          aria-hidden={!panelOpen}
          inert={!panelOpen}
        >
          <div className="flex w-[min(92vw,420px)] max-w-full flex-col gap-3 p-3 sm:w-full">
            <div className="px-1">
              <span className="text-xs text-muted-foreground">Alles ausfüllen, dann als PDF.</span>
            </div>

            <Section
              title="Design"
              open={open.design}
              onToggle={() => toggle("design")}
              hint={activeTemplate.name}
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2 rounded-md border border-dashed p-2">
                  <span className="text-xs text-muted-foreground">
                    {cover
                      ? "Der Lebenslauf übernimmt Vorlage und Farben vom Titelblatt."
                      : "Noch kein Titelblatt gespeichert – du kannst hier frei wählen."}
                  </span>
                  <button
                    type="button"
                    onClick={syncFromCover}
                    className="self-start rounded-md border border-input px-3 py-1.5 text-xs hover:bg-accent"
                  >
                    Vom Titelblatt übernehmen
                  </button>

                  <label className="mt-1 flex items-start gap-2 text-xs">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={design.useElements}
                      onChange={(e) => setDesign((d) => ({ ...d, useElements: e.target.checked }))}
                    />
                    <span>
                      Elemente vom Titelblatt übernehmen
                      <span className="block text-muted-foreground">
                        Formen und Linien – ohne die Texte.
                        {elements.length > 0 && ` ${elements.length} vorhanden.`}
                      </span>
                    </span>
                  </label>
                </div>

                <label className="flex flex-col gap-2 text-xs">
                  <span className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Transparenz {Math.round((1 - design.bgOpacity) * 100)} %
                    </span>
                    <button
                      type="button"
                      onClick={() => setDesign((d) => ({ ...d, bgOpacity: DEFAULT_BG_OPACITY }))}
                      className="text-muted-foreground underline hover:text-foreground"
                    >
                      94 %
                    </button>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round((1 - design.bgOpacity) * 100)}
                    onChange={(e) =>
                      setDesign((d) => ({ ...d, bgOpacity: 1 - Number(e.target.value) / 100 }))
                    }
                    className="w-full accent-primary"
                  />
                  <span className="text-muted-foreground/80">
                    Je höher, desto blasser der Hintergrund. Auf dem Lebenslauf zählt der Text mehr
                    als die Fläche.
                  </span>
                </label>

                <div>
                  <span className="mb-2 block text-xs text-muted-foreground">Vorlage</span>
                  <TemplatePicker
                    value={design.template}
                    onChange={(template) =>
                      setDesign((d) => ({ ...d, template, colors: defaultColors(template) }))
                    }
                  />
                </div>

                <div>
                  <span className="mb-2 block text-xs text-muted-foreground">Farben</span>
                  <ColorChooser
                    slots={activeTemplate.slots}
                    colors={design.colors}
                    onChange={(key, value) =>
                      setDesign((d) => ({ ...d, colors: { ...d.colors, [key]: value } }))
                    }
                    onApplyPalette={(next) => setDesign((d) => ({ ...d, colors: next }))}
                    onReset={() => setDesign((d) => ({ ...d, colors: defaultColors(d.template) }))}
                  />
                </div>
              </div>
            </Section>

            <Section
              title="Angaben zur Person"
              open={open.person}
              onToggle={() => toggle("person")}
              hint={data.person.vorname || data.person.nachname ? "gesetzt" : "leer"}
            >
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={takePerson}
                  className="self-start rounded-md border border-input px-3 py-1.5 text-xs hover:bg-accent"
                >
                  Angaben vom Titelblatt holen
                </button>
                <FormCvPerson person={data.person} onChange={patchPerson} />
              </div>
            </Section>

            <Section
              title={sectionLabel("schule")}
              open={open.schule}
              onToggle={() => toggle("schule")}
              hint={`${data.schule.length}`}
            >
              {opts("schule")}
              <FormCvEntries
                entries={data.schule}
                onChange={(schule) => patchData({ schule })}
                titelLabel="Schule / Stufe"
                ortLabel="Schulhaus, Ort"
              />
            </Section>

            <Section
              title={sectionLabel("erfahrung")}
              open={open.erfahrung}
              onToggle={() => toggle("erfahrung")}
              hint={`${data.erfahrung.length}`}
            >
              {opts("erfahrung")}
              <FormCvEntries
                entries={data.erfahrung}
                onChange={(erfahrung) => patchData({ erfahrung })}
                titelLabel="Was hast du gemacht?"
                ortLabel="Betrieb, Ort"
              />
            </Section>

            <Section
              title={sectionLabel("sprachen")}
              open={open.sprachen}
              onToggle={() => toggle("sprachen")}
              hint={`${data.sprachen.length}`}
            >
              {opts("sprachen")}
              <FormCvSprachen
                list={data.sprachen}
                onChange={(sprachen) => patchData({ sprachen })}
              />
            </Section>

            <Section
              title={sectionLabel("hobbys")}
              open={open.hobbys}
              onToggle={() => toggle("hobbys")}
              hint={`${data.hobbys.length}`}
            >
              {opts("hobbys")}
              <FormCvLines
                list={data.hobbys}
                onChange={(hobbys) => patchData({ hobbys })}
                placeholder="z. B. Volleyball im Verein"
                addLabel="+ Hobby"
              />
            </Section>

            <Section
              title={sectionLabel("staerken")}
              open={open.staerken}
              onToggle={() => toggle("staerken")}
              hint={`${data.staerken.length}`}
            >
              {opts("staerken")}
              <FormCvLines
                list={data.staerken}
                onChange={(staerken) => patchData({ staerken })}
                placeholder="z. B. Zuverlässig und pünktlich"
                addLabel="+ Stärke"
              />
            </Section>

            <Section
              title={sectionLabel("referenzen")}
              open={open.referenzen}
              onToggle={() => toggle("referenzen")}
              hint={`${data.referenzen.length}`}
            >
              {opts("referenzen")}
              <FormCvReferenzen
                list={data.referenzen}
                onChange={(referenzen) => patchData({ referenzen })}
              />
            </Section>
          </div>
        </aside>

        {panelOpen && (
          <div
            aria-hidden
            onClick={() => setPanelOpen(false)}
            className="absolute inset-0 z-10 bg-foreground/20 sm:hidden"
          />
        )}

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-auto px-2 py-3 lg:px-6">
            <div className="mx-auto w-full max-w-[900px]">
              <ScaledPreview max={1} fitHeight={fitHeight} zoom={zoom}>
                {canvas}
              </ScaledPreview>
            </div>
          </div>
          {status && (
            <p
              role="status"
              className={`shrink-0 pb-2 text-center text-xs md:hidden ${
                status.kind === "error" ? "text-destructive" : "text-primary"
              }`}
            >
              {status.text}
            </p>
          )}
        </main>
      </div>

      <div
        aria-hidden
        ref={exportRef}
        style={{
          position: "fixed",
          left: "-10000px",
          top: 0,
          pointerEvents: "none",
          zIndex: -1,
        }}
      >
        <CvCanvas data={data} design={design} elements={elements} exportMode />
      </div>
    </div>
  );
}
