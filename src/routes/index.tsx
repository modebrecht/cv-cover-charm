import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { CoverForm } from "@/components/cover/CoverForm";
import { CoverCanvas } from "@/components/cover/CoverCanvas";
import { TemplatePicker } from "@/components/cover/TemplatePicker";
import { ColorChooser } from "@/components/cover/ColorChooser";
import { ScaledPreview } from "@/components/cover/ScaledPreview";
import { ThemeToggle } from "@/components/cover/ThemeToggle";
import { BlockInspector } from "@/components/cover/BlockInspector";
import { buildBlocks, type StyleOverrides } from "@/components/cover/layouts";

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
      { property: "og:title", content: "Lehrstellen-Titelblatt Generator" },
      {
        property: "og:description",
        content:
          "Erstelle ein professionelles Titelblatt für deine Lehrstellenbewerbung – gratis als PDF.",
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


function defaultColors(templateId: TemplateId): Record<string, string> {
  const t = TEMPLATES.find((x) => x.id === templateId)!;
  return Object.fromEntries(t.slots.map((s) => [s.key, s.default]));
}

function Index() {
  const [data, setData] = useState<CoverData>(emptyData);
  const [template, setTemplate] = useState<TemplateId>("modern");
  const [colorsByTemplate, setColorsByTemplate] = useState<Record<TemplateId, Record<string, string>>>(
    () =>
      Object.fromEntries(TEMPLATES.map((t) => [t.id, defaultColors(t.id)])) as Record<
        TemplateId,
        Record<string, string>
      >,
  );
  const [layoutByTemplate, setLayoutByTemplate] = useState<Record<TemplateId, StyleOverrides>>(
    () => Object.fromEntries(TEMPLATES.map((t) => [t.id, {}])) as Record<TemplateId, StyleOverrides>,
  );
  const [customs, setCustoms] = useState<CustomField[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);


  const activeTemplate = useMemo(
    () => TEMPLATES.find((t) => t.id === template)!,
    [template],
  );
  const colors = colorsByTemplate[template];
  const overrides = layoutByTemplate[template];
  const blocks = useMemo(
    () => buildBlocks(template, data, customs, overrides),
    [template, data, customs, overrides],
  );
  const selectedBlock = blocks.find((b) => b.id === selected) ?? null;
  const selectedCustom = customs.find((c) => c.id === selected) ?? null;

  const patch = (p: Partial<CoverData>) => setData((d) => ({ ...d, ...p }));
  const setColor = (key: string, value: string) =>
    setColorsByTemplate((c) => ({ ...c, [template]: { ...c[template], [key]: value } }));
  const resetColors = () =>
    setColorsByTemplate((c) => ({ ...c, [template]: defaultColors(template) }));

  const patchStyle = (id: string, p: Partial<BlockStyle>) =>
    setLayoutByTemplate((l) => ({
      ...l,
      [template]: { ...l[template], [id]: { ...(l[template][id] ?? {}), ...p } },
    }));
  const resetBlock = (id: string) =>
    setLayoutByTemplate((l) => {
      const next = { ...l[template] };
      delete next[id];
      return { ...l, [template]: next };
    });
  const resetLayout = () => setLayoutByTemplate((l) => ({ ...l, [template]: {} }));

  const addCustom = () => {
    const id = `custom-${Date.now()}`;
    setCustoms((c) => [...c, { id, label: "Eigenes Feld", text: "Neuer Text" }]);
    setSelected(id);
  };
  const patchCustom = (id: string, p: Partial<CustomField>) =>
    setCustoms((c) => c.map((f) => (f.id === id ? { ...f, ...p } : f)));
  const removeCustom = (id: string) => {
    setCustoms((c) => c.filter((f) => f.id !== id));
    setSelected(null);
  };

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // set current date after hydration (avoids SSR/client mismatch)
  useEffect(() => {
    setData((d) => (d.datum ? d : { ...d, datum: today() }));
  }, []);


  const loadDemo = () => {
    setData({ ...DEMO_DATA, datum: today() });
  };
  const resetForm = () => setData(emptyData);

  const fileBase = () => {
    const n = [data.vorname, data.nachname].filter(Boolean).join("-");
    return n ? `Titelblatt-${n}` : "Titelblatt";
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
      const node = exportRef.current;
      const canvas = await html2canvas(node, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        width: 794,
        height: 1123,
        windowWidth: 794,
        windowHeight: 1123,
        scrollX: 0,
        scrollY: 0,
      });
      const img = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      pdf.addImage(img, "JPEG", 0, 0, 210, 297, undefined, "FAST");
      pdf.save(`${fileBase()}.pdf`);
    } finally {
      setDownloading(false);
    }
  };


  const downloadJson = () => {
    setMenuOpen(false);
    const payload = {
      version: 2,
      template,
      colors: colorsByTemplate,
      layout: layoutByTemplate,
      customs,
      data,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileBase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (parsed.data) setData({ ...emptyData, ...parsed.data });
        if (parsed.template && TEMPLATES.some((t) => t.id === parsed.template)) {
          setTemplate(parsed.template);
        }
        if (parsed.colors) {
          setColorsByTemplate((c) => ({ ...c, ...parsed.colors }));
        }
        if (parsed.layout) {
          setLayoutByTemplate((l) => ({ ...l, ...parsed.layout }));
        }
        if (Array.isArray(parsed.customs)) {
          setCustoms(parsed.customs);
        }

      } catch {
        // ignore
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold sm:text-lg">
              Lehrstellen-Titelblatt
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              Deckblatt für deine Bewerbung – Schweiz
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={loadDemo}
              className="hidden rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-accent sm:inline-flex"
            >
              Demo ausfüllen
            </button>
            <label className="hidden cursor-pointer rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-accent md:inline-flex">
              JSON laden
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  importJson(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
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
                <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-md border bg-popover shadow-lg">
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
                    <span>Als JSON</span>
                    <span className="text-xs text-muted-foreground">.json</span>
                  </button>
                  <div className="border-t sm:hidden">
                    <button
                      type="button"
                      onClick={() => {
                        loadDemo();
                        setMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      Demo ausfüllen
                    </button>
                    <label className="block cursor-pointer px-3 py-2 text-left text-sm hover:bg-accent">
                      JSON laden
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
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(320px,420px)_1fr] lg:gap-8">
        <div className="order-2 flex flex-col gap-6 lg:order-1">
          <section className="flex flex-col gap-3 rounded-lg border bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Vorlage
              </h3>
              <button
                type="button"
                onClick={resetForm}
                className="shrink-0 text-xs text-muted-foreground underline hover:text-foreground"
              >
                Formular leeren
              </button>
            </div>
            <TemplatePicker value={template} onChange={setTemplate} />
          </section>

          <section className="rounded-lg border bg-background p-4">
            <ColorChooser
              slots={activeTemplate.slots}
              colors={colors}
              onChange={setColor}
              onReset={resetColors}
            />
          </section>

          <section className="flex flex-col gap-3 rounded-lg border bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Element
              </h3>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={addCustom}
                  className="rounded-md border border-input px-2 py-1 text-xs font-medium hover:bg-accent"
                >
                  + Feld
                </button>
                <button
                  type="button"
                  onClick={resetLayout}
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                >
                  Layout zurücksetzen
                </button>
              </div>
            </div>
            <BlockInspector
              block={selectedBlock}
              slots={activeTemplate.slots}
              colors={colors}
              onChange={(p) => selectedBlock && patchStyle(selectedBlock.id, p)}
              onReset={() => selectedBlock && resetBlock(selectedBlock.id)}
              customText={
                selectedCustom ? { label: selectedCustom.label, text: selectedCustom.text } : undefined
              }
              onCustomChange={
                selectedCustom ? (p) => patchCustom(selectedCustom.id, p) : undefined
              }
              onDelete={selectedCustom ? () => removeCustom(selectedCustom.id) : undefined}
            />
          </section>

          <section className="rounded-lg border bg-background p-4">
            <CoverForm data={data} onChange={patch} />
          </section>
        </div>

        <div className="order-1 min-w-0 lg:order-2">
          <div className="mx-auto w-full max-w-[794px] lg:sticky lg:top-24">
            <ScaledPreview max={0.85}>
              <CoverCanvas
                ref={previewRef}
                template={template}
                data={data}
                colors={colors}
                blocks={blocks}
                selected={selected}
                onSelect={setSelected}
                onMove={(id, x, y) => patchStyle(id, { x, y })}
              />
            </ScaledPreview>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Tipp: Elemente in der Vorschau verschieben und antippen zum Anpassen.
            </p>
          </div>
        </div>

      </main>
    </div>
  );

}
