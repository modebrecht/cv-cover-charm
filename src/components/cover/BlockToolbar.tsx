import { useEffect, useRef, useState } from "react";
import type { Block, BlockStyle, ColorSlot, ListStyle } from "./types";
import { LIST_STYLES } from "./types";

const MM = 96 / 25.4;
const A4_H = 1123;

type Props = {
  block: Block;
  /** aufgelöste y-Position in mm (kann von style.y abweichen, s. `follows`) */
  y: number;
  scale: number;
  slots: ColorSlot[];
  colors: Record<string, string>;
  onChange: (patch: Partial<BlockStyle>) => void;
  onReset: () => void;
  onDelete?: () => void;
  onClose: () => void;
  onOpenDetails: () => void;
};

const btn =
  "inline-flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-xs leading-none transition-colors";
const idle = "text-foreground hover:bg-accent";
const on = "bg-primary text-primary-foreground";

function Divider() {
  return <span className="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden />;
}

/**
 * Schwebende Werkzeugleiste direkt am gewählten Element. Sie liegt unskaliert
 * über der Vorschau, damit die Bedienung bei jedem Zoom gleich gross bleibt.
 */
export function BlockToolbar({
  block,
  y,
  scale,
  slots,
  colors,
  onChange,
  onReset,
  onDelete,
  onClose,
  onOpenDetails,
}: Props) {
  const st = block.style;
  const isText = block.kind === "text";
  const isSlot = slots.some((s) => s.key === st.color);
  const [listOpen, setListOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setListOpen(false), [block.id]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setListOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Über dem Element platzieren, unten umklappen wenn oben kein Platz ist.
  const topPx = y * MM * scale;
  const below = topPx < 60;
  const anchor = below
    ? Math.min(topPx + (isText ? 14 : st.w * (st.ratio ?? 1) * MM * scale) + 10, A4_H * scale - 46)
    : topPx - 46;
  const centerPx = (st.x + st.w / 2) * MM * scale;

  return (
    <div
      ref={ref}
      className="absolute z-30"
      style={{ top: Math.max(4, anchor), left: centerPx, transform: "translateX(-50%)" }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex max-w-[min(92vw,640px)] flex-wrap items-center gap-0.5 rounded-lg border bg-popover/95 p-1 shadow-xl backdrop-blur">
        <span className="max-w-28 truncate px-1.5 text-xs font-medium text-muted-foreground">
          {block.label}
        </span>
        <Divider />

        <button
          type="button"
          aria-label="Kleiner"
          className={`${btn} ${idle}`}
          onClick={() => onChange({ size: Math.max(6, Math.round((st.size - 1) * 2) / 2) })}
        >
          A−
        </button>
        <input
          type="range"
          aria-label="Schriftgrösse"
          min={6}
          max={64}
          step={0.5}
          value={st.size}
          onChange={(e) => onChange({ size: Number(e.target.value) })}
          className="mx-1 w-24 accent-primary"
        />
        <button
          type="button"
          aria-label="Grösser"
          className={`${btn} ${idle}`}
          onClick={() => onChange({ size: Math.min(64, Math.round((st.size + 1) * 2) / 2) })}
        >
          A+
        </button>
        <span className="w-10 shrink-0 text-center text-xs tabular-nums text-muted-foreground">
          {st.size}pt
        </span>

        {isText && (
          <>
            <Divider />
            <button
              type="button"
              aria-label="Fett"
              className={`${btn} font-bold ${st.weight >= 600 ? on : idle}`}
              onClick={() => onChange({ weight: st.weight >= 600 ? 400 : 700 })}
            >
              B
            </button>
            <button
              type="button"
              aria-label="Kursiv"
              className={`${btn} italic ${st.italic ? on : idle}`}
              onClick={() => onChange({ italic: !st.italic })}
            >
              I
            </button>
            <button
              type="button"
              aria-label="Unterstrichen"
              className={`${btn} underline ${st.underline ? on : idle}`}
              onClick={() => onChange({ underline: !st.underline })}
            >
              U
            </button>
            <button
              type="button"
              aria-label="Grossbuchstaben"
              className={`${btn} ${st.uppercase ? on : idle}`}
              onClick={() => onChange({ uppercase: !st.uppercase })}
            >
              AA
            </button>

            <Divider />
            {(["left", "center", "right"] as const).map((a) => (
              <button
                key={a}
                type="button"
                aria-label={`Ausrichtung ${a}`}
                className={`${btn} ${st.align === a ? on : idle}`}
                onClick={() => onChange({ align: a })}
              >
                {a === "left" ? "⯇" : a === "center" ? "≡" : "⯈"}
              </button>
            ))}

            <Divider />
            <div className="relative">
              <button
                type="button"
                aria-label="Aufzählung"
                className={`${btn} ${st.list !== "none" ? on : idle}`}
                onClick={() => setListOpen((v) => !v)}
              >
                {LIST_STYLES.find((l) => l.value === st.list)?.label ?? "•"} ▾
              </button>
              {listOpen && (
                <div className="absolute left-0 top-8 z-40 w-36 overflow-hidden rounded-md border bg-popover shadow-lg">
                  {LIST_STYLES.map((l) => (
                    <button
                      key={l.value}
                      type="button"
                      className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-accent ${
                        st.list === l.value ? "font-semibold" : ""
                      }`}
                      onClick={() => {
                        onChange({ list: l.value as ListStyle });
                        setListOpen(false);
                      }}
                    >
                      <span className="w-4">{l.label}</span>
                      {l.value === "none"
                        ? "Ohne Zeichen"
                        : l.value === "number"
                          ? "Nummeriert"
                          : "Liste"}
                    </button>
                  ))}
                  <div className="border-t">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-accent"
                      onClick={() => {
                        onChange({ bg: st.bg ? null : (slots[slots.length - 1]?.key ?? "accent") });
                        setListOpen(false);
                      }}
                    >
                      <span className="w-4">▭</span>
                      {st.bg ? "Hervorhebung aus" : "Als Badge hervorheben"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <Divider />
        <label className="inline-flex h-7 cursor-pointer items-center rounded px-1 hover:bg-accent">
          <span className="sr-only">Farbe</span>
          <input
            type="color"
            value={isSlot ? colors[st.color] : st.color}
            onChange={(e) => onChange({ color: e.target.value })}
            className="h-5 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
          />
        </label>

        <Divider />
        <button
          type="button"
          className={`${btn} ${idle}`}
          onClick={onOpenDetails}
          title="Alle Optionen"
        >
          ⋯
        </button>
        <button type="button" className={`${btn} ${idle}`} onClick={onReset} title="Zurücksetzen">
          ↺
        </button>
        <button
          type="button"
          className={`${btn} ${idle}`}
          onClick={() => {
            onChange({ hidden: true });
            onClose();
          }}
          title="Ausblenden"
        >
          👁
        </button>
        {onDelete && (
          <button
            type="button"
            className={`${btn} text-destructive hover:bg-destructive/10`}
            onClick={onDelete}
            title="Löschen"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
