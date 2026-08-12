import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FormBetrieb,
  FormBewerbung,
  FormFoto,
  FormOrtDatum,
  FormPerson,
} from "@/components/cover/CoverForm";
import { CoverCanvas } from "@/components/cover/CoverCanvas";
import { TemplatePicker } from "@/components/cover/TemplatePicker";
import { ColorChooser } from "@/components/cover/ColorChooser";
import { ScaledPreview } from "@/components/cover/ScaledPreview";
import { ThemeToggle } from "@/components/cover/ThemeToggle";
import { BlockInspector } from "@/components/cover/BlockInspector";
import { BlockToolbar } from "@/components/cover/BlockToolbar";
import { Section } from "@/components/cover/Section";
import { buildBlocks, type StyleOverrides } from "@/components/cover/layouts";
import { resolveLayout } from "@/components/cover/resolve";
import { downloadBlob, safeFileName } from "@/lib/download";

import {
  DEMO_DATA,
  TEMPLATES,
  type BlockStyle,
  type CoverData,
  type CustomField,
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
  | "ortDatum";

const filled = (values: (string | null)[]) => values.filter((v) => v && v.trim()).length;

function Index() {
  const [data, setData] = useState<CoverData>(emptyData);
  const [template, setTemplate] = useState<TemplateId>("modern");
  const [colorsByTemplate, setColorsByTemplate] =
    useState<Record<TemplateId, Record<string, string>>>(allDefaultColors);
  const [layoutByTemplate, setLayoutByTemplate] =
    useState<Record<TemplateId, StyleOverrides>>(allEmptyLayouts);
  const [customs, setCustoms] = useState<CustomField[]>([]);
  const [fontScale, setFontScale] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
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
  });
  const [fitHeight, setFitHeight] = useState<number | undefined>(undefined);

  const menuRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
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
  const selectedY = selectedBlock
    ? (resolveLayout(blocks, fontScale)[selectedBlock.id]?.y ?? selectedBlock.style.y)
    : 0;

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
    setFontScale(1);
  };

  const addCustom = () => {
    const id = `custom-${Date.now()}`;
    setCustoms((c) => [...c, { id, label: "Eigenes Feld", text: "Neuer Text" }]);
    setSelected(id);
    setDetailsOpen(true);
  };
  const patchCustom = (id: string, p: Partial<CustomField>) =>
    setCustoms((c) => c.map((f) => (f.id === id ? { ...f, ...p } : f)));
  const removeCustom = (id: string) => {
    setCustoms((c) => c.filter((f) => f.id !== id));
    setSelected(null);
  };

  const hiddenBlocks = blocks.filter((b) => b.style.hidden);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
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
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Vorschau soll ohne Scrollen ganz sichtbar sein.
  useEffect(() => {
    const update = () => setFitHeight(window.innerHeight - 150);
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
        if (p.data) setData({ ...emptyData, ...p.data });
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
    setData((d) => (d.datum ? d : { ...d, datum: today() }));
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
    setData({ ...DEMO_DATA, datum: today() });
    setStatus({ kind: "ok", text: "Beispieldaten eingefügt" });
  };
  const resetForm = () => {
    setData({ ...emptyData, datum: today() });
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
        scale: 3, // 288 dpi – Text bleibt auch gedruckt scharf
        backgroundColor: "#ffffff",
        useCORS: true,
        width: 794,
        height: 1123,
        windowWidth: 794,
        windowHeight: 1123,
        scrollX: 0,
        scrollY: 0,
      });
      const img = canvas.toDataURL("image/jpeg", 0.94);
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
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
        setData({ ...emptyData, ...parsed.data });
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

  const openDetails = () => {
    setPanelOpen(true);
    setDetailsOpen(true);
    requestAnimationFrame(() =>
      detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
    );
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
          className={`absolute inset-y-0 left-0 z-20 w-[min(92vw,420px)] shrink-0 overflow-y-auto border-r bg-muted/40 transition-transform duration-300 ease-out lg:static lg:transition-[width,transform] ${
            panelOpen
              ? "translate-x-0 lg:w-[420px]"
              : "-translate-x-full lg:w-0 lg:overflow-hidden lg:border-r-0"
          }`}
          aria-hidden={!panelOpen}
          inert={!panelOpen}
        >
          <div className="flex w-[min(92vw,420px)] flex-col gap-3 p-3 lg:w-[420px]">
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
                      onClick={() => setFontScale(1)}
                      className="text-muted-foreground underline hover:text-foreground"
                    >
                      100 %
                    </button>
                  </span>
                  <input
                    type="range"
                    min={0.8}
                    max={1.6}
                    step={0.05}
                    value={fontScale}
                    onChange={(e) => setFontScale(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <span className="text-muted-foreground/80">
                    Skaliert alle Texte. Einzelne Elemente stellst du direkt in der Vorschau ein.
                  </span>
                </label>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={addCustom}
                    className="rounded-md border border-input px-2 py-1 text-xs font-medium hover:bg-accent"
                  >
                    + Eigenes Feld
                  </button>
                  <button
                    type="button"
                    onClick={resetLayout}
                    className="text-xs text-muted-foreground underline hover:text-foreground"
                  >
                    Layout zurücksetzen
                  </button>
                </div>

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

            {selectedBlock && (
              <div ref={detailsRef}>
                <Section
                  title="Element – alle Optionen"
                  open={detailsOpen}
                  onToggle={() => setDetailsOpen((v) => !v)}
                  hint={selectedBlock.label}
                >
                  <BlockInspector
                    block={selectedBlock}
                    slots={activeTemplate.slots}
                    colors={colors}
                    onChange={(p) => patchStyle(selectedBlock.id, p)}
                    onReset={() => resetBlock(selectedBlock.id)}
                    customText={
                      selectedCustom
                        ? { label: selectedCustom.label, text: selectedCustom.text }
                        : undefined
                    }
                    onCustomChange={
                      selectedCustom ? (p) => patchCustom(selectedCustom.id, p) : undefined
                    }
                    onDelete={selectedCustom ? () => removeCustom(selectedCustom.id) : undefined}
                  />
                </Section>
              </div>
            )}
          </div>
        </aside>

        {/* Backdrop auf kleinen Screens – bedienbar ist auch der Button oben */}
        {panelOpen && (
          <div
            aria-hidden
            onClick={() => setPanelOpen(false)}
            className="absolute inset-0 z-10 bg-foreground/20 lg:hidden"
          />
        )}

        <main className="min-w-0 flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-[900px] px-3 py-4 sm:px-6">
            <ScaledPreview
              max={1}
              fitHeight={fitHeight}
              overlay={(scale) =>
                selectedBlock ? (
                  <BlockToolbar
                    block={selectedBlock}
                    y={selectedY}
                    scale={scale}
                    slots={activeTemplate.slots}
                    colors={colors}
                    onChange={(p) => patchStyle(selectedBlock.id, p)}
                    onReset={() => resetBlock(selectedBlock.id)}
                    onDelete={selectedCustom ? () => removeCustom(selectedCustom.id) : undefined}
                    onClose={() => setSelected(null)}
                    onOpenDetails={openDetails}
                  />
                ) : null
              }
            >
              <CoverCanvas
                template={template}
                data={data}
                colors={colors}
                blocks={blocks}
                selected={selected}
                onSelect={setSelected}
                onMove={patchStyle}
                fontScale={fontScale}
              />
            </ScaledPreview>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {selectedBlock
                ? "Ziehen zum Verschieben · Esc hebt die Auswahl auf"
                : "Tipp: Element antippen zum Anpassen, ziehen zum Verschieben."}
            </p>
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
