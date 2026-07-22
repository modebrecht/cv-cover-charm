import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { CoverForm } from "@/components/cover/CoverForm";
import { CoverPreview } from "@/components/cover/CoverPreview";
import { TemplatePicker } from "@/components/cover/TemplatePicker";
import { ColorChooser } from "@/components/cover/ColorChooser";
import { TEMPLATES, type CoverData, type TemplateId } from "@/components/cover/types";

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
  datum: today(),
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

  const downloadPdf = async () => {
    if (!previewRef.current || downloading) return;
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
      const name = data.nachname || data.vorname || "Bewerbung";
      pdf.save(`Titelblatt-${name}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold">Lehrstellen-Titelblatt</h1>
            <p className="text-xs text-muted-foreground">
              Deckblatt für deine Bewerbung – Schweiz
            </p>
          </div>
          <button
            type="button"
            onClick={downloadPdf}
            disabled={downloading}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {downloading ? "Erstelle PDF…" : "PDF herunterladen"}
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[minmax(320px,420px)_1fr]">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3 rounded-lg border bg-background p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Vorlage
            </h3>
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
          <div className="sticky top-6">
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
