import type { ColorSlot } from "./types";

type Props = {
  slots: ColorSlot[];
  colors: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onReset: () => void;
};

export function ColorChooser({ slots, colors, onChange, onReset }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Farben
        </h3>
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-muted-foreground underline hover:text-foreground"
        >
          Zurücksetzen
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {slots.map((s) => (
          <label key={s.key} className="flex items-center gap-2 rounded-md border border-input p-2">
            <input
              type="color"
              value={colors[s.key] ?? s.default}
              onChange={(e) => onChange(s.key, e.target.value)}
              className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
            />
            <span className="text-xs">{s.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
