import { TEMPLATES } from "@/components/cover/types";
import type { LetterTemplateId } from "./types";

const SELECTABLE_TEMPLATES = TEMPLATES.filter((template) => template.id !== "colorful").sort(
  (a, b) => a.name.localeCompare(b.name, "de", { sensitivity: "base" }),
);

type Props = {
  value: LetterTemplateId;
  onChange: (id: LetterTemplateId) => void;
};

const baseClass =
  "flex min-h-10 items-center justify-center rounded-md border px-2 py-2 text-center text-xs font-medium leading-tight transition";

export function LetterTemplatePicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <button
        type="button"
        onClick={() => onChange("brief")}
        aria-pressed={value === "brief"}
        title="Klassischer Brief auf reinweissem Papier ohne Gestaltungselemente"
        className={`${baseClass} ${
          value === "brief"
            ? "border-foreground bg-accent"
            : "border-input hover:border-foreground/40 hover:bg-accent/40"
        }`}
      >
        Brief
      </button>
      {SELECTABLE_TEMPLATES.map((template) => {
        const active = template.id === value;
        return (
          <button
            key={template.id}
            type="button"
            onClick={() => onChange(template.id)}
            aria-pressed={active}
            title={template.description}
            className={`${baseClass} ${
              active
                ? "border-foreground bg-accent"
                : "border-input hover:border-foreground/40 hover:bg-accent/40"
            }`}
          >
            {template.name}
          </button>
        );
      })}
    </div>
  );
}
