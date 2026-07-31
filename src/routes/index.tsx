import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { CoverForm } from "@/components/cover/CoverForm";
import { CoverPreview } from "@/components/cover/CoverPreview";
import { TemplatePicker } from "@/components/cover/TemplatePicker";
import { ColorChooser } from "@/components/cover/ColorChooser";
import {
  DEMO_DATA,
  TEMPLATES,
  type CoverData,
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
  const [colorsByTemplate, setColorsByTemplate] = useState<Record<TemplateId, Record<string, string>>>({
    klassisch: defaultColors("klassisch"),
    modern: defaultColors("modern"),
    freundlich: defaultColors("freundlich"),
  });
  const [downloading, setDownloading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const activeTemplate = useMemo(
    () => TEMPLATES.find((t) => t.id === template)!,
    [template],
  );
  const colors = colorsByTemplate[template];

  const patch = (p: Partial<CoverData>) => setData((d) => ({ ...d, ...p }));
  const setColor = (key: string, value: string) =>
    setColorsByTemplate((c) => ({ ...c, [template]: { ...c[template], [key]: value } }));
  const resetColors = () =>
    setColorsByTemplate((c) => ({ ...c, [template]: defaultColors(template) }));

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
    if (!previewRef.current || downloading) return;
    setMenuOpen(false);
    setDownloading(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const img = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      pdf.addImage(img, "JPEG", 0, 0, 210, 297);
      pdf.save(`${fileBase()}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  const downloadJson = () => {
    setMenuOpen(false);
    const payload = { version: 1, template, colors: colorsByTemplate, data };
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
        if (parsed.template && ["klassisch", "modern", "freundlich"].includes(parsed.template)) {
          setTemplate(parsed.template);
        }
        if (parsed.colors) {
          setColorsByTemplate((c) => ({ ...c, ...parsed.colors }));
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
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold">Lehrstellen-Titelblatt</h1>
            <p className="text-xs text-muted-foreground">
              Deckblatt für deine Bewerbung – Schweiz
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadDemo}
              className="rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              Demo ausfüllen
            </button>
            <label className="cursor-pointer rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-accent">
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
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {downloading ? "Erstelle PDF…" : "Herunterladen"}
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
                <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-md border bg-popover shadow-lg">
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
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[minmax(320px,420px)_1fr]">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3 rounded-lg border bg-background p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Vorlage
              </h3>
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-muted-foreground underline hover:text-foreground"
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

          <section className="rounded-lg border bg-background p-4">
            <CoverForm data={data} onChange={patch} />
          </section>
        </div>

        <div className="flex justify-center">
          <div className="sticky top-24">
            <div
              className="origin-top"
              style={{
                transform: "scale(var(--preview-scale, 0.7))",
                transformOrigin: "top center",
              }}
            >
              <CoverPreview
                ref={previewRef}
                template={template}
                data={data}
                colors={colors}
              />
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @media (min-width: 1280px) { :root { --preview-scale: 0.75; } }
        @media (max-width: 1024px) { :root { --preview-scale: 0.55; } }
        @media (max-width: 640px) { :root { --preview-scale: 0.4; } }
      `}</style>
    </div>
  );
}
