import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FormBetrieb,
  FormBewerbung,
  FormFoto,
  FormMeta,
  FormOrtDatum,
  FormPerson,
} from "@/components/cover/CoverForm";
import { CoverCanvas, type Point } from "@/components/cover/CoverCanvas";
import { TemplatePicker } from "@/components/cover/TemplatePicker";
import { ColorChooser } from "@/components/cover/ColorChooser";
import { ScaledPreview } from "@/components/cover/ScaledPreview";
import { ThemeToggle } from "@/components/cover/ThemeToggle";
import { ElementBar } from "@/components/cover/ElementBar";
import { Section } from "@/components/cover/Section";
import { buildBlocks, type StyleOverrides } from "@/components/cover/layouts";
import { downloadBlob, safeFileName } from "@/lib/download";
import { DEFAULTS, FONT, PDF, SHAPE } from "@/default-config";

import {
  DEMO_DATA,
  EMPTY_META,
  TEMPLATES,
  type BlockStyle,
  type CoverData,
  type CustomField,
  type PdfMeta,
  type ShapeKind,
  type TemplateId,
} from "@/components/cover/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lehrstellen-Titelblatt Generator – Bewerbung Schweiz" },
      {
        name: "description",
        content:
          "Kostenloser Generator für das Deckblatt deiner Lehrstellenbewerbung in der Schweiz. Vorlagen wählen, Farben anpassen, als PDF herunterladen.",
      },
      { property: "og:title", content: "Lehrstellen-Titelblatt Generator – Bewerbung Schweiz" },
      {
        property: "og:description",
        content:
          "Kostenloser Generator für das Deckblatt deiner Lehrstellenbewerbung in der Schweiz. Vorlagen wählen, Farben anpassen, als PDF herunterladen.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const today = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
};

const emptyData: CoverData = {
  meta: { ...EMPTY_META },
  kicker: "",
  eyebrow: "",
  beruf: "",
  lehrbeginn: "",
  vorname: "",
  nachname: "",
  adresse: "",
  plzOrt: "",
  telefon: "",
  email: "",
  geburtsdatum: "",
  lehrbetrieb: "",
  ansprechperson: "",
  betriebAdresse: "",
  ort: "",
  datum: "",
  foto: null,
};

const STORAGE_KEY = "titelblatt:v3";
const SAVE_VERSION = 3;

/** Ort und Datum vorbelegen, ohne Eingaben zu überschreiben. */
const prefill = (d: CoverData): CoverData => ({
  ...d,
  meta: { ...EMPTY_META, ...(d.meta ?? {}) },
  datum: d.datum || today(),
  ort: d.ort || DEFAULTS.LOCATION,
  kicker: d.kicker || DEFAULTS.KICKER,
});

function defaultColors(templateId: TemplateId): Record<string, string> {
  const t = TEMPLATES.find((x) => x.id === templateId)!;
  return Object.fromEntries(t.slots.map((s) => [s.key, s.default]));
}

const allDefaultColors = () =>
  Object.fromEntries(TEMPLATES.map((t) => [t.id, defaultColors(t.id)])) as Record<
    TemplateId,
    Record<string, string>
  >;

const allEmptyLayouts = () =>
  Object.fromEntries(TEMPLATES.map((t) => [t.id, {}])) as Record<TemplateId, StyleOverrides>;

type SectionKey =
  | "vorlage"
  | "farben"
  | "typo"
  | "bewerbung"
  | "person"
  | "foto"
  | "betrieb"
  | "ortDatum"
  | "meta";

const SHAPE_LABEL: Record<ShapeKind, string> = {
  circle: "Kreis",
  rect: "Rechteck",
  line: "Linie",
  path: "Freihand",
};

const filled = (values: (string | null)[]) => values.filter((v) => v && v.trim()).length;

function Index() {
  const [data, setData] = useState<CoverData>(emptyData);
  const [template, setTemplate] = useState<TemplateId>(DEFAULTS.TEMPLATE);
  const [colorsByTemplate, setColorsByTemplate] =
    useState<Record<TemplateId, Record<string, string>>>(allDefaultColors);
  const [layoutByTemplate, setLayoutByTemplate] =
    useState<Record<TemplateId, StyleOverrides>>(allEmptyLayouts);
  const [customs, setCustoms] = useState<CustomField[]>([]);
  const [fontScale, setFontScale] = useState<number>(FONT.DEFAULT_SCALE);
  const [selected, setSelected] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    vorlage: true,
    farben: false,
    typo: false,
    bewerbung: true,
    person: true,
    foto: false,
    betrieb: false,
    ortDatum: false,
    meta: false,
  });
  const [fitHeight, setFitHeight] = useState<number | undefined>(undefined);

  const menuRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLDivElement>(null);
  const restored = useRef(false);

  const activeTemplate = useMemo(() => TEMPLATES.find((t) => t.id === template)!, [template]);
  const colors = colorsByTemplate[template];
  const overrides = layoutByTemplate[template];
  const blocks = useMemo(
    () => buildBlocks(template, data, customs, overrides),
    [template, data, customs, overrides],
  );
  const selectedBlock = blocks.find((b) => b.id === selected) ?? null;
  const selectedCustom = customs.find((c) => c.id === selected) ?? null;

  const toggleSection = (key: SectionKey) => setOpen((o) => ({ ...o, [key]: !o[key] }));

  const patch = (p: Partial<CoverData>) => setData((d) => ({ ...d, ...p }));
  const setColor = (key: string, value: string) =>
    setColorsByTemplate((c) => ({ ...c, [template]: { ...c[template], [key]: value } }));
  const resetColors = () =>
    setColorsByTemplate((c) => ({ ...c, [template]: defaultColors(template) }));

  const patchStyle = useCallback(
    (id: string, p: Partial<BlockStyle>) =>
      setLayoutByTemplate((l) => ({
        ...l,
        [template]: { ...l[template], [id]: { ...(l[template][id] ?? {}), ...p } },
      })),
    [template],
  );
  const resetBlock = (id: string) =>
    setLayoutByTemplate((l) => {
      const next = { ...l[template] };
      delete next[id];
      return { ...l, [template]: next };
    });
  const resetLayout = () => {
    setLayoutByTemplate((l) => ({ ...l, [template]: {} }));
    setFontScale(FONT.DEFAULT_SCALE);
  };

  const addCustom = (shape?: ShapeKind, pill = false) => {
    setAddOpen(false);
    if (shape === "path") {
      setDrawing(true);
      setSelected(null);
      setStatus({ kind: "ok", text: "Form aufs Blatt zeichnen – Esc bricht ab." });
      return;
    }
    const id = `custom-${Date.now()}`;
    setCustoms((c) => [
      ...c,
      shape
        ? { id, label: SHAPE_LABEL[shape], text: "", shape }
        : { id, label: pill ? "Pille" : "Eigenes Feld", text: pill ? "Neue Pille" : "Neuer Text" },
    ]);
    if (pill) {
      // Textfeld mit Hintergrund: schrumpft auf die Textbreite, runde Ecken
      patchStyle(id, {
        bg: activeTemplate.slots[activeTemplate.slots.length - 1]?.key ?? "accent",
        color: "bg",
        weight: 700,
        align: "center",
        padX: 5,
        padY: 1.8,
        bgRadius: 999,
      });
    }
    setSelected(id);
  };

  /** Freihand-Zug in eine Form umrechnen (Pfad normiert auf 0–100). */
  const addDrawnShape = (points: Point[]) => {
    setDrawing(false);
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const w = Math.max(Math.max(...xs) - minX, SHAPE.MIN_DRAW);
    const h = Math.max(Math.max(...ys) - minY, SHAPE.MIN_DRAW);
    const d = points
      .map((p, i) => {
        const nx = ((p.x - minX) / w) * 100;
        const ny = ((p.y - minY) / h) * 100;
        return `${i === 0 ? "M" : "L"}${nx.toFixed(2)} ${ny.toFixed(2)}`;
      })
      .join(" ");

    const id = `custom-${Date.now()}`;
    setCustoms((c) => [...c, { id, label: "Freihand", text: "", shape: "path", path: d }]);
    setLayoutByTemplate((l) => ({
      ...l,
      [template]: {
        ...l[template],
        [id]: { x: Math.round(minX * 10) / 10, y: Math.round(minY * 10) / 10, w, ratio: h / w },
      },
    }));
    setSelected(id);
  };
  const patchCustom = (id: string, p: Partial<CustomField>) =>
    setCustoms((c) => c.map((f) => (f.id === id ? { ...f, ...p } : f)));
  const removeCustom = (id: string) => {
    setCustoms((c) => c.filter((f) => f.id !== id));
    setSelected(null);
  };

  const photoBlock = blocks.find((b) => b.kind === "photo") ?? null;

  /** Dokumentinfos, die im PDF landen, wenn das Feld leer bleibt. */
  const autoMeta: PdfMeta = useMemo(() => {
    const name = [data.vorname, data.nachname].filter(Boolean).join(" ");
    const titel = ["Titelblatt", name].filter(Boolean).join(" – ");
    const betreff = [data.kicker, data.beruf].filter(Boolean).join(" ").trim();
    return {
      title: data.beruf ? `${titel} – ${data.beruf}` : titel,
      author: name,
      subject: betreff || "Bewerbung",
      keywords: ["Bewerbung", "Lehrstelle", data.beruf, data.lehrbetrieb, data.ort]
        .filter(Boolean)
        .join(", "),
    };
  }, [data.vorname, data.nachname, data.beruf, data.kicker, data.lehrbetrieb, data.ort]);

  const hiddenBlocks = blocks.filter((b) => b.style.hidden);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (addRef.current && !addRef.current.contains(e.target as Node)) setAddOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(t);
  }, [status]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelected(null);
        setMenuOpen(false);
        setAddOpen(false);
        setDrawing(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Vorschau soll ohne Scrollen ganz sichtbar sein.
  useEffect(() => {
    const update = () => setFitHeight(window.innerHeight - 230);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Entwurf laden (nach der Hydration, damit Server und Client übereinstimmen).
  useEffect(() => {
    restored.current = true;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      saved = null;
    }
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p.data) setData(prefill({ ...emptyData, ...p.data }));
        if (p.template && TEMPLATES.some((t) => t.id === p.template)) setTemplate(p.template);
        if (p.colors) setColorsByTemplate((c) => ({ ...c, ...p.colors }));
        if (p.layout) setLayoutByTemplate((l) => ({ ...l, ...p.layout }));
        if (Array.isArray(p.customs)) setCustoms(p.customs);
        if (typeof p.fontScale === "number") setFontScale(p.fontScale);
        return;
      } catch {
        // beschädigter Entwurf – mit leerem Formular weitermachen
      }
    }
    setData(prefill);
  }, []);

  // Entwurf sichern
  useEffect(() => {
    if (!restored.current) return;
    const id = setTimeout(() => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            version: SAVE_VERSION,
            template,
            colors: colorsByTemplate,
            layout: layoutByTemplate,
            customs,
            fontScale,
            data,
          }),
        );
      } catch {
        // Speicher voll (z. B. sehr grosses Foto) – Bearbeiten geht trotzdem weiter
      }
    }, 400);
    return () => clearTimeout(id);
  }, [template, colorsByTemplate, layoutByTemplate, customs, fontScale, data]);

  const loadDemo = () => {
    setData(prefill({ ...DEMO_DATA, datum: "", ort: "", kicker: "" }));
    setStatus({ kind: "ok", text: "Beispieldaten eingefügt" });
  };
  const resetForm = () => {
    setData(prefill(emptyData));
    setSelected(null);
  };

  const fileBase = () => {
    const n = [data.vorname, data.nachname].filter(Boolean).join("-");
    return safeFileName(n ? `Titelblatt-${n}` : "Titelblatt");
  };

  const downloadPdf = async () => {
    if (!exportRef.current || downloading) return;
    setMenuOpen(false);
    setSelected(null);
    setDownloading(true);
    try {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(exportRef.current, {
        scale: PDF.SCALE,
        backgroundColor: "#ffffff",
        useCORS: true,
        width: 794,
        height: 1123,
        windowWidth: 794,
        windowHeight: 1123,
        scrollX: 0,
        scrollY: 0,
      });
      const img = canvas.toDataURL("image/jpeg", PDF.QUALITY);
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      pdf.setProperties({
        title: data.meta.title || autoMeta.title,
        author: data.meta.author || autoMeta.author,
        subject: data.meta.subject || autoMeta.subject,
        keywords: data.meta.keywords || autoMeta.keywords,
        creator: "Lehrstellen-Titelblatt",
      });
      pdf.addImage(img, "JPEG", 0, 0, 210, 297, undefined, "FAST");
      downloadBlob(pdf.output("blob"), `${fileBase()}.pdf`);
      setStatus({ kind: "ok", text: "PDF heruntergeladen" });
    } catch (e) {
      console.error(e);
      setStatus({ kind: "error", text: "PDF konnte nicht erstellt werden." });
    } finally {
      setDownloading(false);
    }
  };

  const downloadJson = () => {
    setMenuOpen(false);
    const payload = {
      version: SAVE_VERSION,
      template,
      colors: colorsByTemplate,
      layout: layoutByTemplate,
      customs,
      fontScale,
      data,
    };
    downloadBlob(
      new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
      `${fileBase()}.json`,
    );
    setStatus({ kind: "ok", text: "Entwurf als JSON gespeichert" });
  };

  const importJson = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = () => setStatus({ kind: "error", text: "Datei konnte nicht gelesen werden." });
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed || typeof parsed !== "object" || !parsed.data) {
          throw new Error("kein Titelblatt-Entwurf");
        }
        setData(prefill({ ...emptyData, ...parsed.data }));
        if (parsed.template && TEMPLATES.some((t) => t.id === parsed.template)) {
          setTemplate(parsed.template);
        }
        if (parsed.colors) setColorsByTemplate((c) => ({ ...c, ...parsed.colors }));
        if (parsed.layout) setLayoutByTemplate((l) => ({ ...l, ...parsed.layout }));
        if (Array.isArray(parsed.customs)) setCustoms(parsed.customs);
        if (typeof parsed.fontScale === "number") setFontScale(parsed.fontScale);
        setStatus({ kind: "ok", text: "Entwurf geladen" });
      } catch {
        setStatus({ kind: "error", text: "Diese JSON-Datei ist kein gültiger Entwurf." });
      }
    };
    reader.readAsText(file);
  };

  const personCount = filled([
    data.vorname,
    data.nachname,
    data.adresse,
    data.plzOrt,
    data.telefon,
    data.geburtsdatum,
    data.email,
  ]);

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
            <h1 className="truncate text-sm font-semibold sm:text-base">Lehrstellen-Titelblatt</h1>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              Deckblatt für deine Bewerbung – Schweiz
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
            <ThemeToggle />
            <button
              type="button"
              onClick={loadDemo}
              className="hidden rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-accent md:inline-flex"
            >
              Demo ausfüllen
            </button>
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
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-md border bg-popover shadow-lg">
                  <button
                    type="button"
                    onClick={downloadPdf}
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
                    onClick={() => {
                      loadDemo();
                      setMenuOpen(false);
                    }}
                    className="w-full border-t px-3 py-2 text-left text-sm hover:bg-accent md:hidden"
                  >
                    Demo ausfüllen
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* Formular-Panel: schiebt sich nach links raus, die Vorschau wächst nach */}
        <aside
          className={`absolute inset-y-0 left-0 z-20 w-[min(92vw,420px)] shrink-0 overflow-y-auto overflow-x-hidden border-r bg-muted/40 transition-transform duration-300 ease-out md:static md:transition-[width,transform] ${
            panelOpen
              ? "translate-x-0 md:w-[320px] lg:w-[380px] xl:w-[420px]"
              : "-translate-x-full md:w-0 md:overflow-hidden md:border-r-0"
          }`}
          aria-hidden={!panelOpen}
          inert={!panelOpen}
        >
          <div className="flex w-[min(92vw,420px)] max-w-full flex-col gap-3 p-3 md:w-full">
            <div className="flex items-center justify-between gap-2 px-1">
              <span className="text-xs text-muted-foreground">
                Alles ausfüllen, dann schliessen.
              </span>
              <button
                type="button"
                onClick={resetForm}
                className="shrink-0 text-xs text-muted-foreground underline hover:text-foreground"
              >
                Formular leeren
              </button>
            </div>

            <Section
              title="Bewerbung"
              open={open.bewerbung}
              onToggle={() => toggleSection("bewerbung")}
              hint={`${filled([data.beruf, data.lehrbeginn])} / 2`}
            >
              <FormBewerbung data={data} onChange={patch} />
            </Section>

            <Section
              title="Persönliche Daten"
              open={open.person}
              onToggle={() => toggleSection("person")}
              hint={`${personCount} / 7`}
            >
              <FormPerson data={data} onChange={patch} />
            </Section>

            <Section
              title="Foto"
              open={open.foto}
              onToggle={() => toggleSection("foto")}
              hint={data.foto ? "gesetzt" : "optional"}
            >
              <FormFoto
                data={data}
                onChange={patch}
                onError={(text) => setStatus({ kind: "error", text })}
                photoStyle={photoBlock?.style}
                onPhotoStyle={photoBlock ? (p) => patchStyle(photoBlock.id, p) : undefined}
              />
            </Section>

            <Section
              title="Lehrbetrieb"
              open={open.betrieb}
              onToggle={() => toggleSection("betrieb")}
              hint={`${filled([data.lehrbetrieb, data.ansprechperson, data.betriebAdresse])} / 3`}
            >
              <FormBetrieb data={data} onChange={patch} />
            </Section>

            <Section
              title="Ort & Datum"
              open={open.ortDatum}
              onToggle={() => toggleSection("ortDatum")}
              hint={`${filled([data.ort, data.datum])} / 2`}
            >
              <FormOrtDatum data={data} onChange={patch} />
            </Section>

            <Section
              title="PDF-Angaben"
              open={open.meta}
              onToggle={() => toggleSection("meta")}
              hint={filled(Object.values(data.meta)) ? "angepasst" : "automatisch"}
            >
              <FormMeta
                meta={data.meta}
                auto={autoMeta}
                onChange={(p) => patch({ meta: { ...data.meta, ...p } })}
              />
            </Section>

            <div className="mt-2 h-px bg-border" />

            <Section
              title="Vorlage"
              open={open.vorlage}
              onToggle={() => toggleSection("vorlage")}
              hint={activeTemplate.name}
            >
              <TemplatePicker value={template} onChange={setTemplate} />
            </Section>

            <Section
              title="Farben"
              open={open.farben}
              onToggle={() => toggleSection("farben")}
              hint={`${activeTemplate.slots.length}`}
            >
              <ColorChooser
                slots={activeTemplate.slots}
                colors={colors}
                onChange={setColor}
                onApplyPalette={(next) => setColorsByTemplate((c) => ({ ...c, [template]: next }))}
                onReset={resetColors}
              />
            </Section>

            <Section
              title="Text & Layout"
              open={open.typo}
              onToggle={() => toggleSection("typo")}
              hint={`${Math.round(fontScale * 100)} %`}
            >
              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-2 text-xs">
                  <span className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Schriftgrösse gesamt {Math.round(fontScale * 100)} %
                    </span>
                    <button
                      type="button"
                      onClick={() => setFontScale(FONT.DEFAULT_SCALE)}
                      className="text-muted-foreground underline hover:text-foreground"
                    >
                      100 %
                    </button>
                  </span>
                  <input
                    type="range"
                    min={FONT.SCALE_MIN}
                    max={FONT.SCALE_MAX}
                    step={0.05}
                    value={fontScale}
                    onChange={(e) => setFontScale(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <span className="text-muted-foreground/80">
                    Skaliert alle Texte. Einzelne Elemente stellst du direkt in der Vorschau ein.
                  </span>
                </label>

                <button
                  type="button"
                  onClick={resetLayout}
                  className="self-start text-xs text-muted-foreground underline hover:text-foreground"
                >
                  Layout zurücksetzen
                </button>

                {hiddenBlocks.length > 0 && (
                  <div className="flex flex-col gap-2 rounded-md border border-dashed p-2">
                    <span className="text-xs text-muted-foreground">Ausgeblendet</span>
                    <div className="flex flex-wrap gap-1">
                      {hiddenBlocks.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => patchStyle(b.id, { hidden: false })}
                          className="rounded-md border border-input px-2 py-1 text-xs hover:bg-accent"
                        >
                          {b.label} einblenden
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Section>
          </div>
        </aside>

        {/* Backdrop auf kleinen Screens – bedienbar ist auch der Button oben */}
        {panelOpen && (
          <div
            aria-hidden
            onClick={() => setPanelOpen(false)}
            className="absolute inset-0 z-10 bg-foreground/20 md:hidden"
          />
        )}

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-auto px-3 pt-4 sm:px-6">
            <div className="mx-auto w-full max-w-[900px]">
              <ScaledPreview max={1} fitHeight={fitHeight}>
                <CoverCanvas
                  template={template}
                  data={data}
                  colors={colors}
                  blocks={blocks}
                  selected={selected}
                  onSelect={setSelected}
                  onMove={patchStyle}
                  fontScale={fontScale}
                  drawing={drawing}
                  onDrawn={addDrawnShape}
                />
              </ScaledPreview>
            </div>
          </div>

          {/* Werkzeugleiste unter dem Blatt – verdeckt nie das Element selbst */}
          <div className="shrink-0 px-3 pb-3 pt-2 sm:px-6">
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
                  colors={colors}
                  onChange={(p) => patchStyle(selectedBlock.id, p)}
                  onReset={() => resetBlock(selectedBlock.id)}
                  onClose={() => setSelected(null)}
                  custom={selectedCustom ?? undefined}
                  onCustomChange={
                    selectedCustom ? (p) => patchCustom(selectedCustom.id, p) : undefined
                  }
                  onDelete={selectedCustom ? () => removeCustom(selectedCustom.id) : undefined}
                  hasPhoto={!!data.foto}
                />
              ) : (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-background px-4 py-2.5">
                  <span className="text-sm text-muted-foreground">
                    Element antippen zum Anpassen, ziehen zum Verschieben.
                  </span>
                  <div className="relative ml-auto" ref={addRef}>
                    <button
                      type="button"
                      onClick={() => setAddOpen((v) => !v)}
                      aria-expanded={addOpen}
                      className="inline-flex items-center gap-2 rounded-md border border-input px-3 py-1.5 text-sm font-medium hover:bg-accent"
                    >
                      + Element
                      <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true">
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
                    {addOpen && (
                      <div className="absolute bottom-full right-0 mb-2 w-52 overflow-hidden rounded-md border bg-popover shadow-lg">
                        <button
                          type="button"
                          onClick={() => addCustom()}
                          className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
                        >
                          <span className="w-4 text-center">T</span> Textfeld
                        </button>
                        <button
                          type="button"
                          onClick={() => addCustom(undefined, true)}
                          className="flex w-full items-center gap-3 border-t px-3 py-2 text-left text-sm hover:bg-accent"
                        >
                          <span className="w-4 text-center" aria-hidden>
                            ⬭
                          </span>
                          Pille (Text)
                        </button>
                        {(["circle", "rect", "line", "path"] as const).map((sh) => (
                          <button
                            key={sh}
                            type="button"
                            onClick={() => addCustom(sh)}
                            className="flex w-full items-center gap-3 border-t px-3 py-2 text-left text-sm hover:bg-accent"
                          >
                            <span className="w-4 text-center" aria-hidden>
                              {sh === "circle"
                                ? "○"
                                : sh === "rect"
                                  ? "▭"
                                  : sh === "line"
                                    ? "—"
                                    : "✎"}
                            </span>
                            {SHAPE_LABEL[sh]}
                            {sh === "path" && (
                              <span className="ml-auto text-xs text-muted-foreground">
                                zeichnen
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {status && (
                <p
                  role="status"
                  className={`mt-2 text-center text-xs md:hidden ${
                    status.kind === "error" ? "text-destructive" : "text-primary"
                  }`}
                >
                  {status.text}
                </p>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Unskalierte 1:1-Kopie für den PDF-Export */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          left: "-10000px",
          top: 0,
          width: "794px",
          height: "1123px",
          pointerEvents: "none",
          zIndex: -1,
        }}
      >
        <CoverCanvas
          ref={exportRef}
          template={template}
          data={data}
          colors={colors}
          blocks={blocks}
          selected={null}
          onSelect={() => {}}
          onMove={() => {}}
          fontScale={fontScale}
          editable={false}
        />
      </div>
    </div>
  );
}
