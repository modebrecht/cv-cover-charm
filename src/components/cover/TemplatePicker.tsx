import { TEMPLATES, type TemplateId } from "./types";

type Props = {
  value: TemplateId;
  onChange: (id: TemplateId) => void;
};

export function TemplatePicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {TEMPLATES.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition ${
              active
                ? "border-foreground bg-accent"
                : "border-input hover:border-foreground/40"
            }`}
          >
            <span className="text-sm font-semibold">{t.name}</span>
            <span className="text-xs text-muted-foreground">{t.description}</span>
          </button>
        );
      })}
    </div>
  );
}
