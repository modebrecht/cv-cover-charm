import { useEffect, useMemo, useState } from "react";
import type { ColorSlot } from "./types";
import { isActive, palettesFor } from "./palettes";
import { cvPalette } from "@/components/cv/palette";

type Props = {
  slots: ColorSlot[];
  colors: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onApplyPalette: (colors: Record<string, string>) => void;
  onReset: () => void;
};

export function ColorChooser({ slots, colors, onChange, onApplyPalette, onReset }: Props) {
  const palettes = useMemo(() => palettesFor(slots), [slots]);
  const cvText = useMemo(() => cvPalette(colors), [colors]);
  const [showCvText, setShowCvText] = useState(false);

  // ColorChooser is shared by title page and CV. Only the CV needs its own
  // semantic text overrides; using an effect keeps SSR/client markup identical.
  useEffect(() => {
    setShowCvText(window.location.pathname.startsWith("/lebenslauf"));
  }, []);

  const cvSlots = [
    { key: "cvInk", label: "Haupttext", value: colors.cvInk || cvText.ink },
    { key: "cvMuted", label: "Sekundärtext", value: colors.cvMuted || cvText.muted },
    { key: "cvHeading", label: "Überschriften", value: colors.cvHeading || cvText.accent },
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Farbsets
        </span>
        <div className="grid grid-cols-2 gap-2">
          {palettes.map((p) => {
            const active = isActive(colors, p);
            return (
              <button
                key={p.name}
                type="button"
                onClick={() => onApplyPalette(p.colors)}
                aria-pressed={active}
                className={`flex items-center gap-2 rounded-md border p-2 text-left text-xs transition-colors ${
                  active ? "border-foreground bg-accent" : "border-input hover:bg-accent/60"
                }`}
              >
                <span className="flex shrink-0 overflow-hidden rounded" aria-hidden>
                  {slots.map((s) => (
                    <span
                      key={s.key}
                      className="h-5 w-2.5"
                      style={{ backgroundColor: p.colors[s.key] }}
                    />
                  ))}
                </span>
                <span className="truncate">{p.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Einzelne Farben
          </span>
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            Zurücksetzen
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {slots.map((s) => (
            <label
              key={s.key}
              className="flex items-center gap-2 rounded-md border border-input p-2"
            >
              <input
                type="color"
                value={colors[s.key] ?? s.default}
                onChange={(e) => onChange(s.key, e.target.value)}
                className="h-8 w-10 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
              />
              <span className="truncate text-xs">{s.label}</span>
            </label>
          ))}
        </div>
      </div>

      {showCvText && (
        <div className="flex flex-col gap-2 border-t pt-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              CV-Textfarben
            </span>
            <button
              type="button"
              onClick={() => {
                onChange("cvInk", "");
                onChange("cvMuted", "");
                onChange("cvHeading", "");
              }}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              Automatisch
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {cvSlots.map((slot) => (
              <label
                key={slot.key}
                className="flex items-center gap-2 rounded-md border border-input p-2"
              >
                <input
                  type="color"
                  value={slot.value}
                  onChange={(e) => onChange(slot.key, e.target.value)}
                  className="h-8 w-10 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
                />
                <span className="truncate text-xs">{slot.label}</span>
              </label>
            ))}
          </div>
          <span className="text-[11px] leading-snug text-muted-foreground">
            Gilt für helle CV-Flächen. Auf dunklen Farbbändern und Sidebars bleibt die Schriftfarbe
            automatisch kontrastreich.
          </span>
        </div>
      )}
    </div>
  );
}
