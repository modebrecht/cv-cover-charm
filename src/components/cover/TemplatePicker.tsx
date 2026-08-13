import { TEMPLATES, type TemplateId } from "./types";
import { UI } from "@/default-config";

type Props = {
  value: TemplateId;
  onChange: (id: TemplateId) => void;
};

export function TemplatePicker({ value, onChange }: Props) {
  // Ohne Beschreibungen passen mehr Vorlagen ins Bild – dann engeres Raster.
  const dense = !UI.TEMPLATE_DESCRIPTIONS;

  return (
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
  );
}
