import { useEffect, useState } from "react";
import type { Block, BlockStyle, ColorSlot, CustomField, ListStyle } from "./types";
import { LIST_STYLES } from "./types";
import { FONT } from "@/default-config";
import { PhotoControls } from "./PhotoControls";

type Props = {
  block: Block;
  slots: ColorSlot[];
  colors: Record<string, string>;
  onChange: (patch: Partial<BlockStyle>) => void;
  onReset: () => void;
  onClose: () => void;
  custom?: CustomField;
  onCustomChange?: (patch: Partial<CustomField>) => void;
  onDelete?: () => void;
  /** Ist ein Foto hochgeladen? Steuert die Zuschnitt-Regler. */
  hasPhoto?: boolean;
};

type Tab = "text" | "absatz" | "farbe" | "position" | "form";

const TAB_LABELS: Record<Tab, string> = {
  text: "Text",
  form: "Form",
  absatz: "Absatz",
  farbe: "Farbe",
  position: "Position",
};

const inputCls =
  "rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

const toggle = (on: boolean) =>
  `inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-sm transition-colors ${
    on ? "border-primary bg-primary text-primary-foreground" : "border-input hover:bg-accent"
  }`;

/** Beschriftetes Steuerelement mit fixer Label-Zeile darüber. */
function Ctl({
  label,
  children,
  grow,
}: {
  label: string;
  children: React.ReactNode;
  grow?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1 ${grow ? "min-w-40 flex-1" : ""}`}>
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );
}

function Slider({
  value,
  min,
  max,
  step,
  onChange,
  suffix,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  suffix: string;
}) {
  return (
    <>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full min-w-24 accent-primary"
      />
      <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {Math.round(value * 100) / 100}
        {suffix}
      </span>
    </>
  );
}

function AlignIcon({ dir }: { dir: "left" | "center" | "right" }) {
  const lines: Record<typeof dir, number[][]> = {
    left: [
      [2, 12],
      [2, 8],
      [2, 12],
    ],
    center: [
      [2, 12],
      [4, 8],
      [2, 12],
    ],
    right: [
      [2, 12],
      [6, 8],
      [2, 12],
    ],
  };
  return (
    <svg width="14" height="12" viewBox="0 0 14 12" aria-hidden="true">
      {lines[dir].map(([x, w], i) => (
        <rect key={i} x={x} y={1 + i * 4} width={w} height="2" rx="1" fill="currentColor" />
      ))}
    </svg>
  );
}

/**
 * Werkzeugleiste für das gewählte Element. Sie sitzt fest unter der Vorschau –
 * eine schwebende Leiste verdeckt genau das Element, das man gerade einstellt.
 * Die Optionen sind auf Register verteilt, damit eine Zeile reicht.
 */
export function ElementBar({
  block,
  slots,
  colors,
  onChange,
  onReset,
  onClose,
  custom,
  onCustomChange,
  onDelete,
  hasPhoto = false,
}: Props) {
  const st = block.style;
  const isText = block.kind === "text";
  const isShape = block.kind === "shape";
  const isPhoto = block.kind === "photo";
  const isSlot = slots.some((s) => s.key === st.color);

  const tabs: Tab[] = isText
    ? ["text", "absatz", "farbe", "position"]
    : ["form", "farbe", "position"];
  const [tab, setTab] = useState<Tab>(tabs[0]);

  // Beim Wechsel auf ein anderes Element auf ein gültiges Register springen
  useEffect(() => {
    setTab(block.kind === "text" ? "text" : "form");
  }, [block.kind, block.id]);

  const colorInput = (value: string, onPick: (v: string) => void) => (
    <input
      type="color"
      value={value}
      onChange={(e) => onPick(e.target.value)}
      className="h-8 w-10 shrink-0 cursor-pointer rounded border border-input bg-transparent p-0.5"
    />
  );

  return (
    <div className="rounded-xl border bg-background shadow-lg">
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <span className="inline-flex items-center gap-2 text-sm font-semibold">
          <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
          {block.label}
        </span>

        <div className="ml-2 flex flex-wrap gap-1" role="tablist">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                tab === t
                  ? "bg-accent font-medium text-foreground"
                  : "text-muted-foreground hover:bg-accent/60"
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={onReset}
            className="rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
          >
            Zurücksetzen
          </button>
          {/*
            Eine einzige Aktion statt "Ausblenden" und "Löschen" nebeneinander:
            Selbst hinzugefügte Elemente verschwinden ganz, Elemente der Vorlage
            werden ausgeblendet und lassen sich im Formular wieder einblenden.
          */}
          <button
            type="button"
            onClick={() => (onDelete ? onDelete() : onChange({ hidden: true }))}
            className="rounded-md px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10"
          >
            Entfernen
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Auswahl aufheben"
            className="rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-x-5 gap-y-3 px-3 py-3">
        {tab === "text" && (
          <>
            <Ctl label="Schriftgrösse" grow>
              <button
                type="button"
                aria-label="Kleiner"
                className={toggle(false)}
                onClick={() =>
                  onChange({ size: Math.max(FONT.SLIDER_MIN, Math.round((st.size - 1) * 2) / 2) })
                }
              >
                A−
              </button>
              <Slider
                value={st.size}
                min={FONT.SLIDER_MIN}
                max={FONT.SLIDER_MAX}
                step={0.5}
                onChange={(size) => onChange({ size })}
                suffix="pt"
              />
              <button
                type="button"
                aria-label="Grösser"
                className={toggle(false)}
                onClick={() =>
                  onChange({ size: Math.min(FONT.SLIDER_MAX, Math.round((st.size + 1) * 2) / 2) })
                }
              >
                A+
              </button>
            </Ctl>

            <Ctl label="Stil">
              <button
                type="button"
                aria-label="Fett"
                className={`${toggle(st.weight >= 600)} font-bold`}
                onClick={() => onChange({ weight: st.weight >= 600 ? 400 : 700 })}
              >
                B
              </button>
              <button
                type="button"
                aria-label="Kursiv"
                className={`${toggle(st.italic)} italic`}
                onClick={() => onChange({ italic: !st.italic })}
              >
                I
              </button>
              <button
                type="button"
                aria-label="Unterstrichen"
                className={`${toggle(st.underline)} underline`}
                onClick={() => onChange({ underline: !st.underline })}
              >
                U
              </button>
              <button
                type="button"
                aria-label="Grossbuchstaben"
                className={toggle(st.uppercase)}
                onClick={() => onChange({ uppercase: !st.uppercase })}
              >
                AA
              </button>
            </Ctl>

            <Ctl label="Schriftart">
              <button
                type="button"
                className={toggle(false)}
                onClick={() => onChange({ font: st.font === "serif" ? "sans" : "serif" })}
              >
                {st.font === "serif" ? "Serif" : "Sans"}
              </button>
            </Ctl>

            {custom && onCustomChange && (
              <Ctl label="Inhalt" grow>
                <textarea
                  className={`${inputCls} h-9 w-full max-w-md resize-y`}
                  rows={1}
                  value={custom.text}
                  onChange={(e) => onCustomChange({ text: e.target.value })}
                  placeholder="Text (Zeilenumbruch möglich)"
                />
              </Ctl>
            )}
          </>
        )}

        {tab === "absatz" && (
          <>
            <Ctl label="Ausrichtung">
              {(["left", "center", "right"] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  aria-label={`Ausrichtung ${a}`}
                  className={toggle(st.align === a)}
                  onClick={() => onChange({ align: a })}
                >
                  <AlignIcon dir={a} />
                </button>
              ))}
            </Ctl>

            <Ctl label="Aufzählung">
              {LIST_STYLES.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  className={toggle(st.list === l.value)}
                  onClick={() => onChange({ list: l.value as ListStyle })}
                  title={l.value === "none" ? "Ohne Zeichen" : `Liste mit ${l.label}`}
                >
                  {l.label}
                </button>
              ))}
            </Ctl>

            <Ctl label="Zeilenhöhe" grow>
              <Slider
                value={st.lineHeight}
                min={0.9}
                max={2}
                step={0.05}
                onChange={(lineHeight) => onChange({ lineHeight })}
                suffix=""
              />
            </Ctl>

            <Ctl label="Laufweite" grow>
              <Slider
                value={st.tracking}
                min={-0.05}
                max={0.6}
                step={0.01}
                onChange={(tracking) => onChange({ tracking })}
                suffix="em"
              />
            </Ctl>
          </>
        )}

        {tab === "form" && (
          <>
            <Ctl label={isPhoto ? "Grösse" : "Breite"} grow>
              <Slider
                value={st.w}
                min={5}
                max={200}
                step={1}
                onChange={(w) => onChange({ w })}
                suffix="mm"
              />
            </Ctl>

            {block.shape !== "line" && (
              <Ctl label="Höhe" grow>
                <Slider
                  value={st.ratio ?? 1}
                  min={0.1}
                  max={2}
                  step={0.05}
                  onChange={(ratio) => onChange({ ratio })}
                  suffix="×"
                />
              </Ctl>
            )}

            {isPhoto && <PhotoControls style={st} onChange={onChange} hasPhoto={hasPhoto} />}

            {isShape && (
              <>
                <Ctl label="Linienstärke" grow>
                  <Slider
                    value={st.strokeWidth ?? 0.8}
                    min={0}
                    max={6}
                    step={0.1}
                    onChange={(strokeWidth) => onChange({ strokeWidth })}
                    suffix="mm"
                  />
                </Ctl>
                {block.shape === "rect" && (
                  <Ctl label="Eckenradius" grow>
                    <Slider
                      value={st.bgRadius >= 999 ? 0 : st.bgRadius}
                      min={0}
                      max={30}
                      step={0.5}
                      onChange={(bgRadius) => onChange({ bgRadius })}
                      suffix="mm"
                    />
                  </Ctl>
                )}
              </>
            )}
          </>
        )}

        {tab === "farbe" && (
          <>
            <Ctl label={isShape ? "Linie" : isPhoto ? "Rahmen" : "Textfarbe"}>
              <select
                value={isSlot ? st.color : "custom"}
                onChange={(e) =>
                  onChange({
                    color: e.target.value === "custom" ? colors[slots[0].key] : e.target.value,
                  })
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
              {colorInput(isSlot ? colors[st.color] : st.color, (color) => onChange({ color }))}
            </Ctl>

            {isShape && (
              <Ctl label="Füllung">
                <button
                  type="button"
                  className={toggle(!!st.fill)}
                  onClick={() => onChange({ fill: st.fill ? null : (slots[0]?.key ?? "accent") })}
                >
                  {st.fill ? "Gefüllt" : "Ohne"}
                </button>
                {st.fill && colorInput(colors[st.fill] ?? st.fill, (fill) => onChange({ fill }))}
              </Ctl>
            )}

            {isText && (
              <Ctl label="Hervorhebung">
                <button
                  type="button"
                  className={toggle(!!st.bg)}
                  onClick={() =>
                    onChange({ bg: st.bg ? null : (slots[slots.length - 1]?.key ?? "accent") })
                  }
                >
                  {st.bg ? "Badge an" : "Badge aus"}
                </button>
                {st.bg && colorInput(colors[st.bg] ?? st.bg, (bg) => onChange({ bg }))}
              </Ctl>
            )}

            <Ctl label="Deckkraft" grow>
              <Slider
                value={st.opacity}
                min={0.1}
                max={1}
                step={0.05}
                onChange={(opacity) => onChange({ opacity })}
                suffix=""
              />
            </Ctl>
          </>
        )}

        {tab === "position" && (
          <>
            <Ctl label="Position X / Y">
              <input
                type="number"
                aria-label="X in mm"
                value={st.x}
                step={1}
                onChange={(e) => onChange({ x: Number(e.target.value) })}
                className={`${inputCls} w-20`}
              />
              <input
                type="number"
                aria-label="Y in mm"
                value={st.y}
                step={1}
                onChange={(e) =>
                  onChange({
                    y: Number(e.target.value),
                    follows: null,
                    above: null,
                    anchorBottom: false,
                  })
                }
                className={`${inputCls} w-20`}
              />
            </Ctl>

            <Ctl label="Breite" grow>
              <Slider
                value={st.w}
                min={5}
                max={200}
                step={1}
                onChange={(w) => onChange({ w })}
                suffix="mm"
              />
            </Ctl>

            {(st.follows || st.above || st.anchorBottom) && (
              <Ctl label="Verkettung">
                <button
                  type="button"
                  className={toggle(true)}
                  onClick={() => onChange({ follows: null, above: null, anchorBottom: false })}
                  title="Position ist an ein anderes Element bzw. den Blattrand gebunden"
                >
                  Bindung lösen
                </button>
              </Ctl>
            )}
          </>
        )}
      </div>
    </div>
  );
}
