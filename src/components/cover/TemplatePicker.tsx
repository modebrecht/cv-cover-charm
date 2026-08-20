import { useSyncExternalStore } from "react";
import { TEMPLATES, type TemplateId } from "./types";
import { UI } from "@/default-config";
import {
  CV_LAYOUTS,
  getCvLayout,
  setCvLayout,
  subscribeCvLayout,
  type CvLayoutId,
} from "@/components/cv/layout";

type Props = {
  value: TemplateId;
  onChange: (id: TemplateId) => void;
};

function LayoutPreview({ id }: { id: CvLayoutId }) {
  if (id === "modern") {
    return (
      <span className="flex h-8 w-full overflow-hidden rounded border border-foreground/15 bg-background">
        <span className="w-[30%] bg-foreground/10" />
        <span className="flex flex-1 flex-col gap-1 p-1.5">
          <span className="h-1.5 w-2/3 rounded bg-foreground/55" />
          <span className="h-1 w-full rounded bg-foreground/15" />
          <span className="mt-0.5 h-1 w-4/5 rounded bg-foreground/15" />
        </span>
      </span>
    );
  }
  return (
    <span className="flex h-8 w-full flex-col gap-1 rounded border border-foreground/15 bg-background p-1.5">
      <span className="h-1.5 w-1/2 rounded bg-foreground/55" />
      <span className="h-1 w-full rounded bg-foreground/15" />
      <span className="h-1 w-4/5 rounded bg-foreground/15" />
    </span>
  );
}

export function TemplatePicker({ value, onChange }: Props) {
  // Ohne Beschreibungen passen mehr Vorlagen ins Bild – dann engeres Raster.
  const dense = !UI.TEMPLATE_DESCRIPTIONS;
  const cvLayout = useSyncExternalStore(subscribeCvLayout, getCvLayout, () => "classic");
  const onCvPage = typeof window !== "undefined" && window.location.pathname.includes("lebenslauf");

  return (
    <div>
      <div className={dense ? "grid grid-cols-2 gap-2" : "grid grid-cols-3 gap-3"}>
        {TEMPLATES.map((t) => {
          const active = t.id === value;
          const base = active
            ? "border-foreground bg-accent"
            : "border-input hover:border-foreground/40";
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              aria-pressed={active}
              title={t.description}
              className={
                dense
                  ? `truncate rounded-md border px-2.5 py-2 text-left text-sm font-medium transition ${base}`
                  : `flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition ${base}`
              }
            >
              {dense ? (
                t.name
              ) : (
                <>
                  <span className="text-sm font-semibold">{t.name}</span>
                  <span className="text-xs text-muted-foreground">{t.description}</span>
                </>
              )}
            </button>
          );
        })}
      </div>

      {onCvPage && (
        <div className="mt-4 border-t pt-4">
          <div className="mb-2">
            <span className="block text-xs font-medium">CV-Layout</span>
            <span className="text-xs text-muted-foreground">
              Inhalt bleibt gleich – nur die Anordnung ändert sich.
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {CV_LAYOUTS.map((layout) => {
              const active = cvLayout === layout.id;
              return (
                <button
                  key={layout.id}
                  type="button"
                  onClick={() => setCvLayout(layout.id)}
                  aria-pressed={active}
                  className={`flex flex-col gap-2 rounded-md border p-2 text-left transition ${
                    active
                      ? "border-foreground bg-accent"
                      : "border-input hover:border-foreground/40"
                  }`}
                >
                  <LayoutPreview id={layout.id} />
                  <span>
                    <span className="block text-xs font-semibold">{layout.name}</span>
                    <span className="block text-[11px] leading-tight text-muted-foreground">
                      {layout.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
