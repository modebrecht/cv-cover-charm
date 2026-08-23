import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ThemeToggle } from "@/components/cover/ThemeToggle";
import { Section } from "@/components/cover/Section";
import { TemplatePicker } from "@/components/cover/TemplatePicker";
import { ColorChooser } from "@/components/cover/ColorChooser";
import { ScaledPreview } from "@/components/cover/ScaledPreview";
import { CvCanvas } from "@/components/cv/CvCanvas";
import { ElementBar } from "@/components/cover/ElementBar";
import { AddElementMenu } from "@/components/cover/AddElementMenu";
import {
  newDrawnElement,
  newImageElement,
  newRuleElement,
  newShapeElement,
  newTextElement,
  type NewElement,
} from "@/components/cover/new-element";
import { buildCustomBlocks, type StyleOverrides } from "@/components/cover/layouts";
import {
  FormCvEntries,
  FormCvLines,
  FormCvPerson,
  FormCvReferenzen,
  FormCvSprachen,
  SectionLayoutControls,
  SectionOptions,
} from "@/components/cv/CvForm";
import {
  CV_SECTION_LABELS,
  CV_SCALE_MAX,
  CV_SCALE_MIN,
  CV_TYPE_DEFAULTS,
  DEFAULT_CV_TITLE,
  DEMO_CV,
  cvSectionLayout,
  emptyCv,
  normalizeCvSectionLayout,
  type CvData,
  type CvDesign,
  type CvLayoutSectionKey,
  type CvPerson,
  type CvPlacementKey,
  type CvSectionLayout,
  type CvSectionKey,
} from "@/components/cv/types";
import { emptyCoverDraft, personFilled, readCoverDraft, type CoverDraft } from "@/lib/dossier";
import {
  customKind,
  FONT_LABELS,
  TEMPLATES,
  withoutBlockGeometry,
  type BlockStyle,
  type CustomField,
  type FontKey,
  type ShapeKind,
  type TemplateId,
} from "@/components/cover/types";
import { downloadBlob, safeFileName } from "@/lib/download";
import { PDF, PREVIEW, SHAPE } from "@/default-config";
import {
  describe,
  formatWhen,
  HISTORY_KEYS,
  pushSnapshot,
  readHistory,
  type Snapshot,
} from "@/lib/history";
import { readPhoto } from "@/lib/image";
import { useForeignWrite, usePageVisible } from "@/lib/autosave";
import { applyDossierTheme } from "@/lib/dossier-theme";
import { setCvPhotoStyle } from "@/components/cv/photo";
import { SIDEBAR_PCT_MAX, SIDEBAR_PCT_MIN } from "@/components/cv/archetype";

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
const SAVE_VERSION = 4;

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
  /**
   * Abweichungen vom Vorgabestil je eigenem Element.
   *
   * Das Titelblatt führt eine solche Ablage je Vorlage, weil dort jede Vorlage
   * ein anderes Raster hat. Der Lebenslauf hat nur eines, darum reicht hier
   * eine einzige.
   */
  elementStyles?: StyleOverrides;
};

/**
 * Alte Entwürfe trugen noch den deutlich kräftigeren damaligen Standardwert.
 * Nur diese bekannten Defaults werden migriert; bewusst gewählte Werte bleiben erhalten.
 */
function migratedDesign(current: CvDesign, incoming: CvDesign, version?: number): CvDesign {
  const merged = { ...current, ...incoming };
  if (!merged.font || !(merged.font in FONT_LABELS)) delete merged.font;
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
  const [elementStyles, setElementStyles] = useState<StyleOverrides>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<CvLayoutSectionKey | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [cover, setCover] = useState<CoverDraft | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [zoom, setZoom] = useState<number>(PREVIEW.ZOOM_DEFAULT);
  const [downloading, setDownloading] = useState(false);
  const [fitHeight, setFitHeight] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<{
    kind: "ok" | "error";
    text: string;
    /** Rücknahme, z. B. nach dem Löschen eines Elements. */
    undo?: () => void;
  } | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({
    uebernehmen: true,
    vorlage: false,
    farben: false,
    typo: false,
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
  /** Zweiter Klick bestätigt "Alles zurücksetzen" – sonst wäre alles weg. */
  const [confirmWipe, setConfirmWipe] = useState(false);
  /** Beispieldaten überschreiben den aktuellen Inhalt und brauchen eine Rückfrage. */
  const [confirmDemo, setConfirmDemo] = useState(false);

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
    if (p.elementStyles) setElementStyles(p.elementStyles);
  }, []);

  const toggle = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const patchData = (p: Partial<CvData>) => setData((d) => ({ ...d, ...p }));
  const patchPerson = (p: Partial<CvPerson>) =>
    setData((d) => ({ ...d, person: { ...d.person, ...p } }));

  const activeTemplate = useMemo(
    () => TEMPLATES.find((t) => t.id === design.template) ?? TEMPLATES[0],
    [design.template],
  );

  /* ---------------------------------------------------------------------- */
  /* Eigene Elemente – dieselbe Bedienung wie auf dem Titelblatt            */
  /* ---------------------------------------------------------------------- */

  const blocks = useMemo(() => {
    const built = buildCustomBlocks(design.template, elements, elementStyles, activeTemplate.slots);
    if (!design.font) return built;
    return built.map((block) =>
      elementStyles[block.id]?.font
        ? block
        : { ...block, style: { ...block.style, font: design.font as FontKey } },
    );
  }, [design.template, design.font, elements, elementStyles, activeTemplate]);
  const selectedBlock = blocks.find((b) => b.id === selected) ?? null;
  const selectedCustom = elements.find((c) => c.id === selected) ?? null;

  const patchStyle = useCallback(
    (id: string, p: Partial<BlockStyle>) =>
      setElementStyles((s) => ({ ...s, [id]: { ...(s[id] ?? {}), ...p } })),
    [],
  );
  const patchCustom = (id: string, p: Partial<CustomField>) =>
    setElements((c) => c.map((f) => (f.id === id ? { ...f, ...p } : f)));

  /** Ein fertig gebautes Element einhängen: Inhalt speichern, Stil anlegen. */
  const place = ({ field, style }: NewElement) => {
    setElements((c) => [...c, field]);
    if (style) patchStyle(field.id, style);
    // Eigene Elemente sind nur sichtbar, wenn sie eingeschaltet sind. Ein neu
    // eingefügtes Feld, das unsichtbar bleibt, wäre ein toter Knopf.
    setDesign((d) => (d.useElements ? d : { ...d, useElements: true }));
    setSelected(field.id);
  };

  const addCustom = (shape?: ShapeKind, pill = false) => {
    if (shape === "path") {
      setDrawing(true);
      setSelected(null);
      setStatus({ kind: "ok", text: "Form aufs Blatt zeichnen – Esc bricht ab." });
      return;
    }
    place(
      shape
        ? newShapeElement(elements, shape)
        : newTextElement(
            elements,
            pill
              ? (activeTemplate.slots[activeTemplate.slots.length - 1]?.key ?? "accent")
              : undefined,
          ),
    );
  };

  const addImage = () => {
    place(newImageElement(elements));
    setStatus({ kind: "ok", text: "Bild-Element eingefügt – unten „Bild wählen“." });
  };

  const addRule = () => place(newRuleElement(elements));

  const pickImage = async (id: string, file: File | null) => {
    if (!file) {
      patchCustom(id, { src: null });
      return;
    }
    try {
      patchCustom(id, { src: await readPhoto(file) });
    } catch (e) {
      setStatus({ kind: "error", text: e instanceof Error ? e.message : "Bild nicht lesbar" });
    }
  };

  const removeElement = (id: string) => {
    const gone = elements.find((c) => c.id === id);
    setSelected(null);
    setElements((c) => c.filter((f) => f.id !== id));
    if (gone) {
      setStatus({
        kind: "ok",
        text: `${gone.label} gelöscht`,
        undo: () => {
          setElements((c) => (c.some((f) => f.id === gone.id) ? c : [...c, gone]));
          setStatus(null);
        },
      });
    }
  };

  /** Ein Element auf den Vorgabestil der Vorlage zurücksetzen. */
  const resetElement = (id: string) =>
    setElementStyles((s) => {
      const next = { ...s };
      delete next[id];
      return next;
    });

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

    // Erster Besuch: alles vom Titelblatt übernehmen – dieselbe Wirkung wie
    // der Knopf mit allen Haken, damit beide Wege dasselbe Ergebnis liefern.
    if (draft) {
      setDesign((d) => ({
        ...d,
        template: draft.template,
        colors: draft.colors,
        font: draft.font ?? undefined,
        titleScale: draft.fontScale,
        headingScale: draft.fontScale,
        bodyScale: draft.fontScale,
        useElements: draft.elements.length > 0,
      }));
      setElements(draft.elements);
      setElementStyles({});
      if (draft.person.foto) setCvPhotoStyle(draft.photoStyle);
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
    (): Saved => ({ version: SAVE_VERSION, data, design, elements, elementStyles }),
    [data, design, elements, elementStyles],
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
      if (e.key !== "Escape") return;
      setMenuOpen(false);
      setSelected(null);
      setSelectedSection(null);
      setDrawing(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      setHistoryOpen(false);
      setConfirmWipe(false);
      setConfirmDemo(false);
    }
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
    const t = setTimeout(() => setStatus(null), status.undo ? 9000 : 4000);
    return () => clearTimeout(t);
  }, [status]);

  useEffect(() => {
    const update = () => setFitHeight(window.innerHeight - 230);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  /**
   * Was vom Titelblatt übernommen wird.
   *
   * Vorher setzte der Knopf nur Vorlage und Farben. Die Formen wurden zwar
   * kopiert, aber nicht eingeschaltet – sie blieben also unsichtbar –, und Foto
   * und Angaben zur Person lagen hinter zwei weiteren Knöpfen an anderer
   * Stelle. Ein Dossier wird davon nicht einheitlich; darum steht hier alles
   * beisammen und ist einzeln abwählbar.
   */
  const [takeover, setTakeover] = useState({
    template: true,
    colors: true,
    typography: true,
    elements: true,
    photo: true,
    person: true,
  });

  const TAKEOVER_LABELS: Array<{ key: keyof typeof takeover; label: string; hint: string }> = [
    { key: "template", label: "Vorlage und Hintergrund", hint: "Bauform, Spalte, Band, Karte" },
    { key: "colors", label: "Farben", hint: "auch deine eigenen Änderungen" },
    {
      key: "typography",
      label: "Schrift und Grösse",
      hint: "globale Schrift sowie die Gesamtgrösse",
    },
    { key: "elements", label: "Eigene Felder und Formen", hint: "Formen und Linien, ohne Texte" },
    { key: "photo", label: "Foto", hint: "samt Rahmenform und Ausschnitt" },
    { key: "person", label: "Persönliche Angaben", hint: "Name, Adresse, Kontakt" },
  ];

  const syncFromCover = useCallback(() => {
    const draft = readCoverDraft();
    setCover(draft);
    if (!draft) {
      setStatus({ kind: "error", text: "Es gibt noch kein gespeichertes Titelblatt." });
      return;
    }

    const done: string[] = [];

    if (takeover.template || takeover.colors || takeover.typography) {
      setDesign((d) => ({
        ...d,
        ...(takeover.template ? { template: draft.template } : {}),
        ...(takeover.colors ? { colors: draft.colors } : {}),
        ...(takeover.typography
          ? {
              font: draft.font ?? undefined,
              titleScale: draft.fontScale,
              headingScale: draft.fontScale,
              bodyScale: draft.fontScale,
            }
          : {}),
      }));
      if (takeover.template) done.push("Vorlage");
      if (takeover.colors) done.push("Farben");
      if (takeover.typography) done.push("Schrift");
    }

    if (takeover.elements) {
      setElements(draft.elements);
      setElementStyles({});
      // Kopieren allein genügt nicht: ohne diesen Schalter werden die Formen
      // nicht gezeichnet, und es sieht aus, als hätte der Knopf nichts getan.
      setDesign((d) => ({ ...d, useElements: draft.elements.length > 0 }));
      done.push(`Formen (${draft.elements.length})`);
    }

    if (takeover.photo && draft.person.foto) {
      setData((d) => ({ ...d, person: { ...d.person, foto: draft.person.foto } }));
      setCvPhotoStyle(draft.photoStyle);
      done.push("Foto");
    }

    if (takeover.person && personFilled(draft.person)) {
      const { foto: _foto, ...fields } = draft.person;
      setData((d) => ({ ...d, person: { ...d.person, ...fields } }));
      done.push("Angaben");
    }

    setStatus(
      done.length
        ? { kind: "ok", text: `Vom Titelblatt übernommen: ${done.join(", ")}` }
        : { kind: "error", text: "Nichts ausgewählt – oder im Titelblatt steht dazu nichts." },
    );
  }, [takeover]);

  /**
   * Rückmeldung direkt beim Knopf.
   *
   * Die Statuszeile steht oben in der Kopfzeile und ist auf schmalen Fenstern
   * ausgeblendet – wer hier im Seitenteil klickte, sah gar nichts und hielt
   * den Knopf für kaputt.
   */
  const [personNote, setPersonNote] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  useEffect(() => {
    if (!personNote) return;
    const t = setTimeout(() => setPersonNote(null), 4000);
    return () => clearTimeout(t);
  }, [personNote]);

  const takePerson = () => {
    const draft = readCoverDraft();
    if (!draft || !personFilled(draft.person)) {
      const note = { kind: "error" as const, text: "Im Titelblatt stehen noch keine Angaben." };
      setStatus(note);
      setPersonNote(note);
      return;
    }
    setData((d) => ({ ...d, person: { ...d.person, ...draft.person } }));
    const taken = [
      draft.person.vorname || draft.person.nachname ? "Name" : null,
      draft.person.adresse || draft.person.plzOrt ? "Adresse" : null,
      draft.person.telefon || draft.person.email ? "Kontakt" : null,
    ].filter(Boolean);
    const note = { kind: "ok" as const, text: `Übernommen: ${taken.join(", ")}` };
    setStatus(note);
    setPersonNote(note);
  };

  const loadDemo = () => {
    keepSnapshot("Vor den Beispieldaten", true);
    setData(DEMO_CV);
    setMenuOpen(false);
    setConfirmDemo(false);
    setSelectedSection(null);
    setStatus({ kind: "ok", text: "Beispieldaten eingefügt" });
  };

  /**
   * Nur die frei veränderte Geometrie zurücknehmen. Seitenwahl, Rubrikenmodus,
   * Farben, Texte, Rahmen und Ebenen bleiben bewusst erhalten.
   */
  const resetPositionsOnly = () => {
    keepSnapshot("Vor dem Zurücksetzen der Positionen", true);
    setElementStyles((current) =>
      Object.fromEntries(
        Object.entries(current).map(([id, style]) => [id, withoutBlockGeometry(style)]),
      ),
    );
    setData((current) => ({
      ...current,
      sectionLayouts: Object.fromEntries(
        Object.entries(current.sectionLayouts ?? {}).map(([key, value]) => [
          key,
          normalizeCvSectionLayout({
            ...value,
            x: null,
            y: null,
            widthMm: null,
            heightMm: null,
          }),
        ]),
      ),
    }));
    setSelected(null);
    setSelectedSection(null);
    setMenuOpen(false);
    setStatus({ kind: "ok", text: "Positionen und Grössen zurückgesetzt" });
  };

  /**
   * Ganzes Formular leeren – wie im Titelblatt.
   *
   * Der Stand wandert vorher in die Historie, damit ein Fehlgriff nicht
   * endgültig ist. Die Gestaltung kommt wieder vom Titelblatt, sofern es eines
   * gibt; sonst bleibt die aktuelle Vorlage stehen.
   */
  const resetEverything = () => {
    keepSnapshot("Vor dem Zurücksetzen", true);
    const draft = readCoverDraft();
    setData({ ...emptyCv, person: { ...emptyCv.person } });
    setElements(draft?.elements ?? []);
    setElementStyles({});
    setSelected(null);
    setSelectedSection(null);
    setDesign((d) => ({
      template: draft?.template ?? d.template,
      colors: draft?.colors ?? d.colors,
      font: draft?.font ?? undefined,
      bgOpacity: DEFAULT_BG_OPACITY,
      useElements: (draft?.elements.length ?? 0) > 0,
      titleScale: draft?.fontScale ?? CV_TYPE_DEFAULTS.titleScale,
      headingScale: draft?.fontScale ?? CV_TYPE_DEFAULTS.headingScale,
      bodyScale: draft?.fontScale ?? CV_TYPE_DEFAULTS.bodyScale,
    }));
    setConfirmWipe(false);
    setMenuOpen(false);
    setStatus({ kind: "ok", text: "Lebenslauf zurückgesetzt" });
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
  const setLabel = (key: CvPlacementKey, v: string) =>
    patchData({ labels: { ...data.labels, [key]: v } });
  const setHidden = (key: CvSectionKey, v: boolean) =>
    patchData({ hidden: { ...data.hidden, [key]: v } });

  const setSectionLayout = (key: CvLayoutSectionKey, patch: Partial<CvSectionLayout>) => {
    const next = normalizeCvSectionLayout({ ...cvSectionLayout(data, key), ...patch });
    patchData({ sectionLayouts: { ...data.sectionLayouts, [key]: next } });
    if (key === selectedSection && next.positioning !== "free") setSelectedSection(null);
  };

  const opts = (key: CvSectionKey) => (
    <SectionOptions
      section={key}
      value={data.labels[key] ?? ""}
      placeholder={CV_SECTION_LABELS[key]}
      hidden={!!data.hidden[key]}
      layout={cvSectionLayout(data, key)}
      onLabel={(v) => setLabel(key, v)}
      onHidden={(v) => setHidden(key, v)}
      onLayout={(patch) => setSectionLayout(key, patch)}
    />
  );

  const selectedSectionLayout = selectedSection ? cvSectionLayout(data, selectedSection) : null;
  const selectedSectionLabel = selectedSection
    ? selectedSection === "person"
      ? "Persönliche Angaben"
      : sectionLabel(selectedSection)
    : "";

  const canvas = (
    <CvCanvas
      data={data}
      design={design}
      elements={elements}
      elementStyles={elementStyles}
      selected={selected}
      onSelect={setSelected}
      selectedSection={selectedSection}
      onSelectSection={setSelectedSection}
      onMoveElement={patchStyle}
      onSectionLayout={setSectionLayout}
      drawing={drawing}
      onDrawn={(points, page) => {
        setDrawing(false);
        const drawn = newDrawnElement(elements, points, SHAPE.MIN_DRAW);
        place({ ...drawn, field: { ...drawn.field, page } });
      }}
    />
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-muted/30">
      <header className="z-30 shrink-0 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
          <button
            type="button"
            onClick={() => setPanelOpen((v) => !v)}
            aria-expanded={panelOpen}
            className="inline-flex shrink-0 items-center gap-2 rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M2 3.5h12M2 8h12M2 12.5h7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
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
              className={`hidden min-w-0 items-center gap-2 rounded-md px-3 py-1.5 text-xs md:inline-flex ${
                status.kind === "error"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-primary/10 text-primary"
              }`}
            >
              <span className="truncate">{status.text}</span>
              {status.undo && (
                <button
                  type="button"
                  onClick={status.undo}
                  className="shrink-0 font-medium underline underline-offset-2 hover:no-underline"
                >
                  Rückgängig
                </button>
              )}
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
            <label className="hidden items-center gap-1 sm:inline-flex">
              <span className="sr-only">Zoom der Vorschau</span>
              <select
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                title="Zoom der Vorschau"
                className="rounded-md border border-input bg-background px-2 py-2 text-sm hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {PREVIEW.ZOOM_STEPS.map((z) => (
                  <option key={z} value={z}>
                    {Math.round(z * 100)} %
                  </option>
                ))}
              </select>
            </label>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                disabled={downloading}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 sm:px-4"
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
                  {confirmDemo ? (
                    <div className="flex items-center gap-1 border-t bg-accent/40 px-3 py-2">
                      <span className="mr-auto text-xs font-medium">Beispieldaten übernehmen?</span>
                      <button
                        type="button"
                        onClick={loadDemo}
                        className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                      >
                        Ja
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDemo(false)}
                        className="rounded-md border border-input px-2 py-1 text-xs hover:bg-accent"
                      >
                        Abbrechen
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDemo(true)}
                      className="w-full border-t px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      Beispieldaten
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={resetPositionsOnly}
                    className="flex w-full items-center justify-between border-t px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    <span>Positionen &amp; Grössen zurücksetzen</span>
                    <span className="text-xs text-muted-foreground">Layout</span>
                  </button>

                  {/* Wie im Titelblatt: zweistufig, weil dabei alles verloren geht. */}
                  {confirmWipe ? (
                    <div className="flex items-center gap-1 border-t bg-destructive/5 px-3 py-2">
                      <span className="mr-auto text-xs font-medium text-destructive">
                        Wirklich alles?
                      </span>
                      <button
                        type="button"
                        onClick={resetEverything}
                        className="rounded-md bg-destructive px-2 py-1 text-xs font-medium text-destructive-foreground hover:bg-destructive/90"
                      >
                        Ja
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmWipe(false)}
                        className="rounded-md border border-input px-2 py-1 text-xs hover:bg-accent"
                      >
                        Abbrechen
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmWipe(true)}
                      className="w-full border-t px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
                    >
                      Alles zurücksetzen
                    </button>
                  )}

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
              ? "translate-x-0 sm:w-[260px] md:w-[320px] lg:w-[380px] xl:w-[420px]"
              : "-translate-x-full sm:w-0 sm:overflow-hidden sm:border-r-0"
          }`}
          aria-hidden={!panelOpen}
          inert={!panelOpen}
        >
          <div className="flex w-[min(92vw,420px)] max-w-full flex-col gap-3 p-3 sm:w-full">
            <div className="px-1">
              <span className="text-xs text-muted-foreground">Alles ausfüllen, dann als PDF.</span>
            </div>

            <div className="order-last flex flex-col gap-3">
              <div className="mt-2 h-px bg-border" />

              <Section
                title="Vom Titelblatt übernehmen"
                open={open.uebernehmen}
                onToggle={() => toggle("uebernehmen")}
                hint={cover ? "bereit" : "nicht vorhanden"}
              >
                <div className="flex flex-col gap-2 rounded-md border border-dashed p-2">
                  <span className="text-xs text-muted-foreground">
                    {cover
                      ? "Wähle, was mitkommen soll. Alles zusammen ergibt den roten Faden durchs Dossier."
                      : "Noch kein Titelblatt gespeichert – du kannst hier frei wählen."}
                  </span>

                  <div className="flex flex-col gap-1.5">
                    {TAKEOVER_LABELS.map(({ key, label, hint }) => (
                      <label key={key} className="flex items-start gap-2 text-xs">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={takeover[key]}
                          disabled={!cover}
                          onChange={(e) => setTakeover((t) => ({ ...t, [key]: e.target.checked }))}
                        />
                        <span>
                          {label}
                          <span className="block text-muted-foreground">
                            {hint}
                            {key === "elements" &&
                              cover &&
                              ` · ${cover.elements.length} im Titelblatt`}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={syncFromCover}
                    disabled={!cover}
                    className="self-start rounded-md border border-input px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
                  >
                    Übernehmen
                  </button>

                  <label className="mt-1 flex items-start gap-2 border-t pt-2 text-xs">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={design.useElements}
                      onChange={(e) => setDesign((d) => ({ ...d, useElements: e.target.checked }))}
                    />
                    <span>
                      Übernommene Formen anzeigen
                      <span className="block text-muted-foreground">
                        {elements.length > 0
                          ? `${elements.length} übernommen.`
                          : "Noch keine übernommen."}
                      </span>
                    </span>
                  </label>
                </div>
              </Section>

              <Section
                title="Vorlage"
                open={open.vorlage}
                onToggle={() => toggle("vorlage")}
                hint={activeTemplate.name}
              >
                <div className="flex flex-col gap-4">
                  <label className="flex flex-col gap-2 text-xs">
                    <span className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Hintergrund-Motiv {Math.round(design.bgOpacity * 100)} % sichtbar
                      </span>
                      <button
                        type="button"
                        onClick={() => setDesign((d) => ({ ...d, bgOpacity: DEFAULT_BG_OPACITY }))}
                        className="text-muted-foreground underline hover:text-foreground"
                      >
                        {Math.round(DEFAULT_BG_OPACITY * 100)} %
                      </button>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round(design.bgOpacity * 100)}
                      onChange={(e) =>
                        setDesign((d) => ({ ...d, bgOpacity: Number(e.target.value) / 100 }))
                      }
                      className="w-full accent-primary"
                    />
                    <span className="text-muted-foreground/80">
                      Gilt für die Zierde – Kreise, Verläufe, Formen. Was die Vorlage ausmacht
                      (Spalte, Farbband, Karte), bleibt immer sichtbar, sonst wäre sie nicht
                      wiederzuerkennen.
                    </span>
                  </label>

                  <div>
                    <TemplatePicker
                      value={design.template}
                      onChange={(template) =>
                        setDesign((d) => ({ ...d, template, colors: defaultColors(template) }))
                      }
                    />
                  </div>
                </div>
              </Section>

              <Section
                title="Farben"
                open={open.farben}
                onToggle={() => toggle("farben")}
                hint={`${activeTemplate.slots.length}`}
              >
                <ColorChooser
                  slots={activeTemplate.slots}
                  colors={design.colors}
                  onChange={(key, value) =>
                    setDesign((d) => ({ ...d, colors: { ...d.colors, [key]: value } }))
                  }
                  onApplyPalette={(next) => setDesign((d) => ({ ...d, colors: next }))}
                  onReset={() => setDesign((d) => ({ ...d, colors: defaultColors(d.template) }))}
                />
              </Section>

              <Section
                title="Schrift und Layout"
                open={open.typo}
                onToggle={() => toggle("typo")}
                hint={`${Math.round((design.bodyScale ?? CV_TYPE_DEFAULTS.bodyScale) * 100)} %`}
              >
                <div className="flex flex-col gap-3">
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="text-muted-foreground">Schriftart gesamtes Dossier</span>
                    <select
                      value={design.font ?? "template"}
                      onChange={(event) => {
                        const value = event.target.value;
                        setDesign((current) => ({
                          ...current,
                          font:
                            value !== "template" && value in FONT_LABELS
                              ? (value as FontKey)
                              : undefined,
                        }));
                      }}
                      className="rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="template">Passend zur Vorlage</option>
                      {(Object.entries(FONT_LABELS) as Array<[FontKey, string]>).map(
                        ([font, label]) => (
                          <option key={font} value={font}>
                            {label}
                          </option>
                        ),
                      )}
                    </select>
                    <span className="text-muted-foreground/80">
                      Dieselbe Auswahl wie im Titelblatt. Freie Textfelder können einzeln abweichen.
                    </span>
                  </label>

                  <label className="flex flex-col gap-1 text-xs">
                    <span className="text-muted-foreground">Linie neben der Überschrift</span>
                    <div className="flex gap-1">
                      {(
                        [
                          ["short", "Kurz"],
                          ["full", "Ganze Breite"],
                          ["none", "Keine"],
                        ] as const
                      ).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          aria-pressed={(design.headingRule ?? CV_TYPE_DEFAULTS.headingRule) === id}
                          onClick={() => setDesign((d) => ({ ...d, headingRule: id }))}
                          className={`flex-1 rounded-md border px-2 py-1.5 text-xs transition ${
                            (design.headingRule ?? CV_TYPE_DEFAULTS.headingRule) === id
                              ? "border-foreground bg-accent"
                              : "border-input hover:border-foreground/40"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </label>

                  {(
                    [
                      ["titleScale", "Name und Titel", "Der Name oben und der Dokumenttitel."],
                      [
                        "headingScale",
                        "Untertitel und Rubriken",
                        "Untertitel unter dem Namen sowie alle Rubriktitel, auch in der Seitenspalte.",
                      ],
                      [
                        "bodyScale",
                        "Fliesstext",
                        "Alles Übrige. Mehr Text passt bei kleinerer Schrift auf eine Seite.",
                      ],
                    ] as const
                  ).map(([key, label, hint]) => (
                    <label key={key} className="flex flex-col gap-1 text-xs">
                      <span className="text-muted-foreground">
                        {label} {Math.round((design[key] ?? CV_TYPE_DEFAULTS[key]) * 100)} %
                      </span>
                      <input
                        type="range"
                        min={Math.round(CV_SCALE_MIN * 100)}
                        max={Math.round(CV_SCALE_MAX * 100)}
                        step={5}
                        value={Math.round((design[key] ?? CV_TYPE_DEFAULTS[key]) * 100)}
                        onChange={(e) =>
                          setDesign((d) => ({ ...d, [key]: Number(e.target.value) / 100 }))
                        }
                        className="w-full accent-primary"
                      />
                      <span className="text-muted-foreground/80">{hint}</span>
                    </label>
                  ))}

                  <label className="flex flex-col gap-1 text-xs">
                    <span className="text-muted-foreground">
                      Seitenspalte{" "}
                      {Math.round((design.sidebarPct ?? CV_TYPE_DEFAULTS.sidebarPct) * 100)}
                      {" / "}
                      {100 - Math.round((design.sidebarPct ?? CV_TYPE_DEFAULTS.sidebarPct) * 100)}
                    </span>
                    <input
                      type="range"
                      min={Math.round(SIDEBAR_PCT_MIN * 100)}
                      max={Math.round(SIDEBAR_PCT_MAX * 100)}
                      step={1}
                      value={Math.round((design.sidebarPct ?? CV_TYPE_DEFAULTS.sidebarPct) * 100)}
                      onChange={(e) =>
                        setDesign((d) => ({ ...d, sidebarPct: Number(e.target.value) / 100 }))
                      }
                      className="w-full accent-primary"
                    />
                    <span className="text-muted-foreground/80">
                      Gilt für den Aufbau „Sidebar". Vorlagen mit eigener Farbspalte behalten deren
                      Breite vom Titelblatt.
                    </span>
                  </label>
                </div>
              </Section>
            </div>

            <Section
              title="Persönliche Angaben"
              open={open.person}
              onToggle={() => toggle("person")}
              hint={data.person.vorname || data.person.nachname ? "gesetzt" : "leer"}
            >
              <div className="flex flex-col gap-3">
                <SectionLayoutControls
                  section="person"
                  layout={cvSectionLayout(data, "person")}
                  onLayout={(patch) => setSectionLayout("person", patch)}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={takePerson}
                    className="rounded-md border border-input px-3 py-1.5 text-xs hover:bg-accent"
                  >
                    Angaben vom Titelblatt holen
                  </button>
                  {personNote && (
                    <span
                      role="status"
                      className={`rounded-md px-2 py-1 text-xs ${
                        personNote.kind === "error"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {personNote.text}
                    </span>
                  )}
                </div>

                <label className="flex flex-col gap-1 text-xs">
                  <span className="text-muted-foreground">Titel des Dokuments</span>
                  <input
                    type="text"
                    value={data.titel ?? ""}
                    placeholder={DEFAULT_CV_TITLE}
                    onChange={(e) => patchData({ titel: e.target.value })}
                    className="rounded-md border border-input bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="text-muted-foreground/80">
                    Steht über dem Namen. Leer lassen blendet ihn aus.
                  </span>
                </label>

                <FormCvPerson
                  person={data.person}
                  onChange={patchPerson}
                  contactLabel={data.labels.kontakt ?? ""}
                  onContactLabel={(v) => setLabel("kontakt", v)}
                />
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
          <div className="min-h-0 flex-1 overflow-auto px-2 pt-3 lg:px-6 lg:pt-4">
            <div className="mx-auto w-full max-w-[900px]">
              <ScaledPreview max={1} fitHeight={fitHeight} zoom={zoom}>
                {canvas}
              </ScaledPreview>
            </div>
          </div>

          {/* Werkzeugleiste unter dem Blatt – wie auf dem Titelblatt. */}
          <div className="shrink-0 px-2 pb-3 pt-2 lg:px-6">
            <div className="mx-auto w-full max-w-[900px]">
              {drawing ? (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed bg-background px-4 py-3 text-sm">
                  <span className="font-medium">Freihand zeichnen</span>
                  <span className="text-muted-foreground">
                    Mit gedrückter Maustaste eine Form aufs Blatt ziehen.
                  </span>
                  <button
                    type="button"
                    onClick={() => setDrawing(false)}
                    className="ml-auto rounded-md border border-input px-3 py-1.5 text-xs hover:bg-accent"
                  >
                    Abbrechen
                  </button>
                </div>
              ) : selectedBlock ? (
                <ElementBar
                  block={selectedBlock}
                  slots={activeTemplate.slots}
                  colors={design.colors}
                  onChange={(p) => patchStyle(selectedBlock.id, p)}
                  onReset={() => resetElement(selectedBlock.id)}
                  onClose={() => setSelected(null)}
                  custom={selectedCustom ?? undefined}
                  onCustomChange={
                    selectedCustom ? (p) => patchCustom(selectedCustom.id, p) : undefined
                  }
                  allowPagePlacement
                  onDelete={() => removeElement(selectedBlock.id)}
                  onPickImage={
                    selectedCustom && customKind(selectedCustom) !== "shape"
                      ? (file) => pickImage(selectedCustom.id, file)
                      : undefined
                  }
                  onAddImage={addImage}
                />
              ) : selectedSection && selectedSectionLayout ? (
                <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-background px-4 py-2.5 shadow-lg">
                  <div className="mr-auto flex min-w-32 flex-col gap-0.5">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Rubrik
                    </span>
                    <span className="truncate text-sm font-semibold">{selectedSectionLabel}</span>
                  </div>

                  <label className="flex min-w-24 flex-col gap-1">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Seite
                    </span>
                    <select
                      value={selectedSectionLayout.page}
                      onChange={(event) =>
                        setSectionLayout(selectedSection, {
                          page: Number(event.target.value) === 2 ? 2 : 1,
                        })
                      }
                      className="rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value={1}>Seite 1</option>
                      <option value={2}>Seite 2</option>
                    </select>
                  </label>

                  <label className="flex min-w-32 flex-col gap-1">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Breite
                    </span>
                    <select
                      value={selectedSectionLayout.width}
                      onChange={(event) =>
                        setSectionLayout(selectedSection, {
                          width: event.target.value === "half" ? "half" : "full",
                        })
                      }
                      className="rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="full">Volle Breite</option>
                      <option value="half">Halbe Breite</option>
                    </select>
                  </label>

                  <label className="flex min-w-36 flex-col gap-1">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Positionierung
                    </span>
                    <select
                      value={selectedSectionLayout.positioning}
                      onChange={(event) =>
                        setSectionLayout(selectedSection, {
                          positioning: event.target.value === "free" ? "free" : "flow",
                        })
                      }
                      className="rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="flow">Automatisch</option>
                      <option value="free">Frei platzieren</option>
                    </select>
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      setSectionLayout(selectedSection, {
                        x: null,
                        y: null,
                        widthMm: null,
                        heightMm: null,
                      })
                    }
                    className="rounded-md border border-input px-3 py-1.5 text-xs hover:bg-accent"
                  >
                    Position &amp; Grösse zurücksetzen
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSection(null)}
                    aria-label="Rubrik-Auswahl schliessen"
                    className="rounded-md border border-input px-2.5 py-1.5 text-sm hover:bg-accent"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-background px-4 py-2.5">
                  <span className="text-sm text-muted-foreground">
                    Eigenes Element antippen zum Anpassen, ziehen zum Verschieben.
                  </span>
                  <AddElementMenu
                    onText={() => addCustom()}
                    onPill={() => addCustom(undefined, true)}
                    onImage={addImage}
                    onRule={addRule}
                    onShape={(sh) => addCustom(sh)}
                  />
                </div>
              )}
              {status && (
                <p
                  role="status"
                  className={`mt-2 flex flex-wrap items-center justify-center gap-2 text-center text-xs md:hidden ${
                    status.kind === "error" ? "text-destructive" : "text-primary"
                  }`}
                >
                  {status.text}
                  {status.undo && (
                    <button
                      type="button"
                      onClick={status.undo}
                      className="font-medium underline underline-offset-2"
                    >
                      Rückgängig
                    </button>
                  )}
                </p>
              )}
            </div>
          </div>
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
        <CvCanvas
          data={data}
          design={design}
          elements={elements}
          elementStyles={elementStyles}
          exportMode
        />
      </div>
    </div>
  );
}
