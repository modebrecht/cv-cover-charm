import { useEffect, useState, useSyncExternalStore } from "react";
import type { TemplateId } from "./types";
import { TEMPLATES } from "./types";
import { UI } from "@/default-config";
import {
  CV_LAYOUTS,
  getCvLayoutChoice,
  setCvLayout,
  subscribeCvLayoutChoice,
  type CvLayoutId,
} from "@/components/cv/layout";
import "../cv/layout-variants.css";

type Props = {
  value: TemplateId;
  onChange: (id: TemplateId) => void;
};

function LayoutPreview({ id }: { id: CvLayoutId }) {
  if (id === "modern") {
    return (
      <span className="flex h-9 w-full overflow-hidden rounded border border-foreground/15 bg-background">
        <span className="w-[30%] bg-foreground/10" />
        <span className="flex flex-1 flex-col gap-1 p-1.5">
          <span className="h-1.5 w-2/3 rounded bg-foreground/55" />
          <span className="h-1 w-full rounded bg-foreground/15" />
          <span className="mt-0.5 h-1 w-4/5 rounded bg-foreground/15" />
        </span>
      </span>
    );
  }

  if (id === "minimal") {
    return (
      <span className="flex h-9 w-full flex-col rounded border border-foreground/15 bg-background px-3 py-1.5">
        <span className="h-1.5 w-2/5 rounded bg-foreground/60" />
        <span className="mt-1 h-px w-1/5 bg-foreground/35" />
        <span className="mt-1.5 h-1 w-4/5 rounded bg-foreground/12" />
        <span className="mt-1 h-1 w-3/5 rounded bg-foreground/12" />
      </span>
    );
  }

  if (id === "timeline") {
    return (
      <span className="relative flex h-9 w-full overflow-hidden rounded border border-foreground/15 bg-background p-1.5 pl-4">
        <span className="absolute bottom-1.5 left-2.5 top-1.5 w-px bg-foreground/25" />
        <span className="absolute left-[7px] top-2 h-2 w-2 rounded-full border-2 border-background bg-foreground/55" />
        <span className="absolute left-[7px] top-[22px] h-2 w-2 rounded-full border-2 border-background bg-foreground/35" />
        <span className="flex flex-1 flex-col gap-1">
          <span className="h-1.5 w-1/2 rounded bg-foreground/55" />
          <span className="h-1 w-full rounded bg-foreground/15" />
          <span className="mt-0.5 h-1 w-4/5 rounded bg-foreground/15" />
        </span>
      </span>
    );
  }

  return (
    <span className="flex h-9 w-full flex-col gap-1 rounded border border-foreground/15 bg-background p-1.5">
      <span className="h-1.5 w-1/2 rounded bg-foreground/55" />
      <span className="h-1 w-full rounded bg-foreground/15" />
      <span className="h-1 w-4/5 rounded bg-foreground/15" />
    </span>
  );
}

export function TemplatePicker({ value, onChange }: Props) {
  const dense = !UI.TEMPLATE_DESCRIPTIONS;
  const cvLayout = useSyncExternalStore(
    subscribeCvLayoutChoice,
    getCvLayoutChoice,
    () => "classic",
  );
  const [onCvPage, setOnCvPage] = useState(false);

  useEffect(() => {
    setOnCvPage(window.location.pathname.includes("lebenslauf"));
  }, []);

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
