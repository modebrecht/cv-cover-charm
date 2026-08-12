import type { Block, BlockStyle, ColorSlot, ListStyle } from "./types";
import { LIST_STYLES } from "./types";

type Props = {
  block: Block | null;
  slots: ColorSlot[];
  colors: Record<string, string>;
  onChange: (patch: Partial<BlockStyle>) => void;
  onReset: () => void;
  customText?: { label: string; text: string };
  onCustomChange?: (patch: { label?: string; text?: string }) => void;
  onDelete?: () => void;
};

const inputCls =
  "rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex flex-1 items-center justify-end gap-2">{children}</div>
    </label>
  );
}

export function BlockInspector({
  block,
  slots,
  colors,
  onChange,
  onReset,
  customText,
  onCustomChange,
  onDelete,
}: Props) {
  if (!block) {
    return (
      <p className="text-xs text-muted-foreground">
        Element in der Vorschau antippen, um Position, Schriftgrösse und Farbe anzupassen.
      </p>
    );
  }

  const st = block.style;
  const isSlot = slots.some((s) => s.key === st.color);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{block.label}</span>
        <div className="flex shrink-0 items-center gap-3">
          {onDelete && (
            <button type="button" onClick={onDelete} className="text-xs text-destructive underline">
              Löschen
            </button>
          )}
          <button type="button" onClick={onReset} className="text-xs text-muted-foreground underline">
            Zurücksetzen
          </button>
        </div>
      </div>

      {customText && onCustomChange && (
        <div className="flex flex-col gap-2">
          <input
            className={inputCls}
            value={customText.label}
            onChange={(e) => onCustomChange({ label: e.target.value })}
            placeholder="Bezeichnung"
          />
          <textarea
            className={inputCls}
            rows={2}
            value={customText.text}
            onChange={(e) => onCustomChange({ text: e.target.value })}
            placeholder="Text (Zeilenumbruch möglich)"
          />
        </div>
      )}

      {block.kind === "text" ? (
        <>
          <Row label={`Schriftgrösse ${st.size}pt`}>
            <input
              type="range"
              min={6}
              max={60}
              step={0.5}
              value={st.size}
              onChange={(e) => onChange({ size: Number(e.target.value) })}
              className="w-32"
            />
          </Row>
          <Row label="Farbe">
            <select
              value={isSlot ? st.color : "custom"}
              onChange={(e) =>
                onChange({ color: e.target.value === "custom" ? colors[slots[0].key] : e.target.value })
              }
              className={inputCls}
            >
              {slots.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
              <option value="custom">Eigene</option>
            </select>
            <input
              type="color"
              value={isSlot ? colors[st.color] : st.color}
              onChange={(e) => onChange({ color: e.target.value })}
              className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
            />
          </Row>
          <Row label="Ausrichtung">
            <div className="flex gap-1">
              {(["left", "center", "right"] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => onChange({ align: a })}
                  className={`rounded-md border px-2 py-1 text-xs ${st.align === a ? "bg-primary text-primary-foreground" : "border-input hover:bg-accent"}`}
                >
                  {a === "left" ? "L" : a === "center" ? "M" : "R"}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Stil">
            <div className="flex flex-wrap justify-end gap-1">
              <button
                type="button"
                onClick={() => onChange({ weight: st.weight >= 600 ? 400 : 700 })}
                className={`rounded-md border px-2 py-1 text-xs font-bold ${st.weight >= 600 ? "bg-primary text-primary-foreground" : "border-input hover:bg-accent"}`}
              >
                B
              </button>
              <button
                type="button"
                onClick={() => onChange({ italic: !st.italic })}
                className={`rounded-md border px-2 py-1 text-xs italic ${st.italic ? "bg-primary text-primary-foreground" : "border-input hover:bg-accent"}`}
              >
                I
              </button>
              <button
                type="button"
                onClick={() => onChange({ uppercase: !st.uppercase })}
                className={`rounded-md border px-2 py-1 text-xs ${st.uppercase ? "bg-primary text-primary-foreground" : "border-input hover:bg-accent"}`}
              >
                AA
              </button>
              <button
                type="button"
                onClick={() => onChange({ underline: !st.underline })}
                className={`rounded-md border px-2 py-1 text-xs underline ${st.underline ? "bg-primary text-primary-foreground" : "border-input hover:bg-accent"}`}
              >
                U
              </button>
              <button
                type="button"
                onClick={() => onChange({ font: st.font === "serif" ? "sans" : "serif" })}
                className="rounded-md border border-input px-2 py-1 text-xs hover:bg-accent"
              >
                {st.font === "serif" ? "Serif" : "Sans"}
              </button>
            </div>
          </Row>
          <Row label="Aufzählung">
            <div className="flex gap-1">
              {LIST_STYLES.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => onChange({ list: l.value as ListStyle })}
                  className={`rounded-md border px-2 py-1 text-xs ${st.list === l.value ? "bg-primary text-primary-foreground" : "border-input hover:bg-accent"}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Hervorhebung">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChange({ bg: st.bg ? null : (slots[slots.length - 1]?.key ?? "accent") })}
                className={`rounded-md border px-2 py-1 text-xs ${st.bg ? "bg-primary text-primary-foreground" : "border-input hover:bg-accent"}`}
              >
                Badge
              </button>
              {st.bg && (
                <input
                  type="color"
                  value={colors[st.bg] ?? st.bg}
                  onChange={(e) => onChange({ bg: e.target.value })}
                  className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
                />
              )}
            </div>
          </Row>
          {st.bg && (
            <Row label={`Badge-Rundung ${st.bgRadius >= 999 ? "Pille" : `${st.bgRadius}mm`}`}>
              <input
                type="range"
                min={0}
                max={999}
                step={1}
                value={st.bgRadius}
                onChange={(e) => onChange({ bgRadius: Number(e.target.value) })}
                className="w-32"
              />
            </Row>
          )}
          <Row label={`Laufweite ${st.tracking.toFixed(2)}em`}>
            <input
              type="range"
              min={-0.05}
              max={0.6}
              step={0.01}
              value={st.tracking}
              onChange={(e) => onChange({ tracking: Number(e.target.value) })}
              className="w-32"
            />
          </Row>
          <Row label={`Zeilenhöhe ${st.lineHeight.toFixed(2)}`}>
            <input
              type="range"
              min={0.9}
              max={2}
              step={0.05}
              value={st.lineHeight}
              onChange={(e) => onChange({ lineHeight: Number(e.target.value) })}
              className="w-32"
            />
          </Row>
          <Row label={`Deckkraft ${Math.round(st.opacity * 100)}%`}>
            <input
              type="range"
              min={0.2}
              max={1}
              step={0.05}
              value={st.opacity}
              onChange={(e) => onChange({ opacity: Number(e.target.value) })}
              className="w-32"
            />
          </Row>
          <Row label={`Breite ${st.w}mm`}>
            <input
              type="range"
              min={20}
              max={190}
              step={1}
              value={st.w}
              onChange={(e) => onChange({ w: Number(e.target.value) })}
              className="w-32"
            />
          </Row>
        </>
      ) : (
        <>
          <Row label={`Grösse ${st.w}mm`}>
            <input
              type="range"
              min={20}
              max={100}
              step={1}
              value={st.w}
              onChange={(e) => onChange({ w: Number(e.target.value) })}
              className="w-32"
            />
          </Row>
          <Row label={`Höhenverhältnis ${(st.ratio ?? 1).toFixed(2)}`}>
            <input
              type="range"
              min={0.6}
              max={1.6}
              step={0.05}
              value={st.ratio ?? 1}
              onChange={(e) => onChange({ ratio: Number(e.target.value) })}
              className="w-32"
            />
          </Row>
          <Row label="Form">
            <button
              type="button"
              onClick={() => onChange({ radius: st.radius ? 0 : 999 })}
              className="rounded-md border border-input px-2 py-1 text-xs hover:bg-accent"
            >
              {st.radius ? "Rund" : "Eckig"}
            </button>
          </Row>
          <Row label="Rahmenfarbe">
            <input
              type="color"
              value={isSlot ? colors[st.color] : st.color}
              onChange={(e) => onChange({ color: e.target.value })}
              className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
            />
          </Row>
        </>
      )}

      <Row label="Position">
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={st.x}
            step={1}
            onChange={(e) => onChange({ x: Number(e.target.value) })}
            className={`${inputCls} w-16`}
          />
          <input
            type="number"
            value={st.y}
            step={1}
            onChange={(e) => onChange({ y: Number(e.target.value) })}
            className={`${inputCls} w-16`}
          />
        </div>
      </Row>

      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={st.hidden} onChange={(e) => onChange({ hidden: e.target.checked })} />
        Element ausblenden
      </label>
    </div>
  );
}
