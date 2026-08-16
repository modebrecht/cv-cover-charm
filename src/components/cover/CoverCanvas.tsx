import { forwardRef, useRef, useState } from "react";
import type { Block, BlockStyle, CoverData, Line, TemplateId } from "./types";
import { FONT_STACKS, lineText } from "./types";
import { resolveColor } from "./layouts";
import { CoverBackground } from "./CoverBackground";
import { ShapeElement } from "./ShapeElement";
import { resolveLayout } from "./resolve";
import { FRAME, PAGE } from "@/default-config";

const MM = 96 / 25.4; // px pro mm bei 96dpi

/** Ganzzahlige Blattmasse – siehe PAGE in default-config. */
const { WIDTH: PAGE_W, HEIGHT: PAGE_H } = PAGE;

export type Point = { x: number; y: number };

type Props = {
  template: TemplateId;
  data: CoverData;
  colors: Record<string, string>;
  blocks: Block[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, patch: Partial<BlockStyle>) => void;
  /** Globale Schriftskalierung (1 = Vorlagen-Standard). */
  fontScale?: number;
  editable?: boolean;
  /** Zeichenmodus: Ziehen erzeugt eine Freihandform statt zu verschieben. */
  drawing?: boolean;
  onDrawn?: (points: Point[]) => void;
};

function initials(data: CoverData) {
  return [data.vorname, data.nachname]
    .map((s) => s?.[0])
    .filter(Boolean)
    .join("")
    .toUpperCase();
}

function textStyle(
  st: BlockStyle,
  size: number,
  colors: Record<string, string>,
): React.CSSProperties {
  return {
    fontSize: `${size}pt`,
    lineHeight: st.lineHeight,
    color: resolveColor(st.color, colors),
    textAlign: st.align,
    fontWeight: st.weight,
    fontStyle: st.italic ? "italic" : "normal",
    textDecoration: st.underline ? "underline" : "none",
    textTransform: st.uppercase ? "uppercase" : "none",
    letterSpacing: `${st.tracking}em`,
    opacity: st.opacity,
    fontFamily: FONT_STACKS[st.font],
    whiteSpace: "pre-wrap",
  };
}

/**
 * Rahmen um Foto und Bilder.
 *
 * Bewusst als `box-shadow` und nicht als `border`: der Rahmen liegt damit
 * ausserhalb der Box, die eingestellte Bildgrösse bleibt also exakt erhalten.
 * `fallback` ist die Vorgabe, solange niemand am Regler war.
 */
function frameShadow(
  st: BlockStyle,
  colors: Record<string, string>,
  fallback: number,
): string | undefined {
  const mm = st.borderWidth ?? fallback;
  if (mm <= 0) return undefined;
  const color = resolveColor(st.borderColor ?? st.color, colors);
  const gap = FRAME.GAP_PX;
  return `0 0 0 ${gap}px ${colors.bg}, 0 0 0 ${gap + mm * MM}px ${color}`;
}

/** Eckenradius des Fotorahmens: 999 = Kreis, sonst mm. */
export function photoRadius(st: BlockStyle): string | number {
  const r = st.radius ?? 0;
  if (r >= 999) return "9999px";
  return r > 0 ? `${r}mm` : 0;
}

/**
 * Bildausschnitt wie in Word: `imgZoom` vergrössert, `imgX`/`imgY` verschieben
 * den sichtbaren Ausschnitt innerhalb des Rahmens.
 */
export function crop(st: BlockStyle): React.CSSProperties {
  const zoom = Math.max(1, st.imgZoom ?? 1);
  const x = st.imgX ?? 50;
  const y = st.imgY ?? 50;
  return {
    position: "absolute",
    width: `${zoom * 100}%`,
    height: `${zoom * 100}%`,
    // ohne das begrenzt die Basis-Regel `img { max-width: 100% }` die Breite,
    // und beim Zoomen entsteht ein unbedeckter Streifen im Rahmen
    maxWidth: "none",
    maxHeight: "none",
    left: `${-(zoom - 1) * x}%`,
    top: `${-(zoom - 1) * y}%`,
    objectFit: "cover",
  };
}

function marker(st: BlockStyle, index: number): string {
  switch (st.list) {
    case "bullet":
      return "• ";
    case "dash":
      return "– ";
    case "number":
      return `${index + 1}. `;
    default:
      return "";
  }
}

function renderLine(line: Line, colors: Record<string, string>) {
  if (typeof line === "string") return line;
  return line.map((seg, i) => (
    <span
      key={i}
      style={{
        color: seg.color ? resolveColor(seg.color, colors) : undefined,
        fontWeight: seg.weight,
      }}
    >
      {seg.t}
    </span>
  ));
}

export const CoverCanvas = forwardRef<HTMLDivElement, Props>(function CoverCanvas(
  {
    template,
    data,
    colors,
    blocks,
    selected,
    onSelect,
    onMove,
    fontScale = 1,
    editable = true,
    drawing = false,
    onDrawn,
  },
  ref,
) {
  const pageRef = useRef<HTMLDivElement>(null);
  const layout = resolveLayout(blocks, fontScale);
  const [stroke, setStroke] = useState<Point[]>([]);

  /** Zeigerposition in mm auf dem Blatt. */
  const toMm = (e: { clientX: number; clientY: number }): Point => {
    const rect = pageRef.current!.getBoundingClientRect();
    const scale = rect.width / PAGE_W;
    return {
      x: (e.clientX - rect.left) / scale / MM,
      y: (e.clientY - rect.top) / scale / MM,
    };
  };

  const startDraw = (e: React.PointerEvent) => {
    if (!pageRef.current) return;
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const points: Point[] = [toMm(e)];
    setStroke(points);

    const move = (ev: PointerEvent) => {
      const p = toMm(ev);
      const last = points[points.length - 1];
      // Punkte ausdünnen, sonst wird der Pfad unnötig lang
      if (Math.hypot(p.x - last.x, p.y - last.y) < 0.6) return;
      points.push(p);
      setStroke([...points]);
    };
    const up = () => {
      el.releasePointerCapture(e.pointerId);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      setStroke([]);
      if (points.length > 1) onDrawn?.(points);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };

  const startDrag = (e: React.PointerEvent, block: Block) => {
    if (!editable || drawing) return;
    e.preventDefault();
    onSelect(block.id);
    const page = pageRef.current;
    if (!page) return;
    const rect = page.getBoundingClientRect();
    const scale = rect.width / PAGE_W;
    const startX = e.clientX;
    const startY = e.clientY;
    const ox = block.style.x;
    const oy = layout[block.id]?.y ?? block.style.y;
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);

    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / scale / MM;
      const dy = (ev.clientY - startY) / scale / MM;
      onMove(block.id, {
        x: Math.round(Math.max(-20, Math.min(210, ox + dx)) * 10) / 10,
        y: Math.round(Math.max(-20, Math.min(297, oy + dy)) * 10) / 10,
        // von Hand verschoben ⇒ Verkettung und Verankerung lösen, sonst
        // springt der Block beim nächsten Rendern zurück
        ...(block.style.follows ? { follows: null } : {}),
        ...(block.style.above ? { above: null } : {}),
        ...(block.style.anchorBottom ? { anchorBottom: false } : {}),
      });
    };
    const up = () => {
      el.releasePointerCapture(e.pointerId);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };

  return (
    <div
      ref={ref}
      className="relative overflow-hidden shadow-2xl"
      style={{
        width: `${PAGE_W}px`,
        height: `${PAGE_H}px`,
        // Grundton des Blattes statt Weiss: sollte ein Hintergrund-Layer je um
        // einen Bruchteil eines Pixels danebenliegen, blitzt die Vorlagenfarbe
        // durch und nicht ein weisser Haarstrich.
        backgroundColor: colors.bg ?? "#ffffff",
      }}
      onPointerDown={(e) => {
        if (drawing) return;
        // Klick auf freie Fläche hebt die Auswahl auf. Der Vergleich mit
        // currentTarget reicht nicht, weil Hintergrund-Layer darüber liegen.
        if (editable && !(e.target as HTMLElement).closest("[data-block-id]")) {
          onSelect(null);
        }
      }}
    >
      <div ref={pageRef} className="absolute inset-0">
        <CoverBackground template={template} colors={colors} />

        {blocks.map((b) => {
          if (b.style.hidden) return null;
          const isPhoto = b.kind === "photo";
          const isShape = b.kind === "shape";
          const isImage = b.kind === "image";
          const empty = isPhoto
            ? !data.foto && !initials(data)
            : // ein Textfeld mit Bild, aber ohne Text ist nicht leer
              !isShape && !isImage && !b.src && b.lines.length === 0;
          if (empty) return null;
          const active = editable && selected === b.id;
          const st = b.style;
          const { size, y } = layout[b.id];
          const hasBadge = b.kind === "text" && !!st.bg;
          const textBorder = st.borderWidth ?? 0;

          return (
            <div
              key={b.id}
              data-block-id={b.id}
              onPointerDown={(e) => startDrag(e, b)}
              className="absolute"
              style={{
                left: `${st.x}mm`,
                top: `${y}mm`,
                width: `${st.w}mm`,
                cursor: editable && !drawing ? "move" : "default",
                touchAction: "none",
                outline: active ? "1px dashed rgba(59,130,246,0.9)" : "none",
                outlineOffset: "2px",
                boxShadow: active ? "0 0 0 4px rgba(59,130,246,0.12)" : "none",
              }}
            >
              {isShape ? (
                <ShapeElement shape={b.shape ?? "rect"} path={b.path} style={st} colors={colors} />
              ) : isImage ? (
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: `${st.w * (st.ratio ?? 1)}mm`,
                    overflow: "hidden",
                    borderRadius: photoRadius(st),
                    // ohne Bild bleibt ein gestrichelter Platzhalter stehen,
                    // sonst wäre das frisch eingefügte Element unsichtbar
                    border: b.src ? "none" : `1px dashed ${resolveColor(st.color, colors)}`,
                    boxShadow: b.src ? frameShadow(st, colors, 0) : undefined,
                    opacity: st.opacity,
                  }}
                >
                  {b.src ? (
                    <img src={b.src} alt="" draggable={false} style={crop(st)} />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center"
                      style={{
                        color: resolveColor(st.color, colors),
                        fontFamily: FONT_STACKS[st.font],
                        fontSize: `${Math.max(7, st.w * 0.13)}pt`,
                        textAlign: "center",
                        padding: "2mm",
                      }}
                    >
                      Bild wählen
                    </div>
                  )}
                </div>
              ) : isPhoto ? (
                data.foto ? (
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: `${st.w * (st.ratio ?? 1)}mm`,
                      overflow: "hidden",
                      borderRadius: photoRadius(st),
                      boxShadow: frameShadow(st, colors, FRAME.PHOTO_WIDTH),
                    }}
                  >
                    <img src={data.foto} alt="Bewerbungsfoto" draggable={false} style={crop(st)} />
                  </div>
                ) : (
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: "100%",
                      height: `${st.w * (st.ratio ?? 1)}mm`,
                      borderRadius: photoRadius(st),
                      background: st.fill ? resolveColor(st.fill, colors) : "transparent",
                      border: `1px solid ${resolveColor(st.color, colors)}`,
                      color: resolveColor(st.color, colors),
                      fontFamily: FONT_STACKS[st.font],
                      fontWeight: st.weight >= 600 ? st.weight : 400,
                      fontSize: `${Math.max(14, st.w * 0.42) * fontScale}pt`,
                    }}
                  >
                    {initials(data)}
                  </div>
                )
              ) : (
                <div
                  style={{
                    ...textStyle(st, size, colors),
                    // Rahmen und Bild bringen einen Innenabstand mit. Ohne
                    // beides bleibt der Block unverändert, sonst würde sich
                    // jeder bestehende Text verschieben.
                    ...(textBorder > 0 || b.src
                      ? {
                          position: "relative",
                          overflow: b.src ? "hidden" : undefined,
                          borderRadius: `${st.boxRadius ?? 0}mm`,
                          border:
                            textBorder > 0
                              ? `${textBorder}mm solid ${resolveColor(st.borderColor ?? st.color, colors)}`
                              : undefined,
                          padding: `${st.padY}mm ${st.padX}mm`,
                          minHeight: b.src ? `${st.w * (st.ratio ?? 0.6)}mm` : undefined,
                        }
                      : {}),
                  }}
                >
                  {b.src && <img src={b.src} alt="" draggable={false} style={crop(st)} />}
                  {b.lines.map((l, i) => (
                    <div key={i} style={b.src ? { position: "relative" } : undefined}>
                      {hasBadge ? (
                        <span
                          style={{
                            display: "inline-block",
                            background: resolveColor(st.bg as string, colors),
                            padding: `${st.padY}mm ${st.padX}mm`,
                            borderRadius: st.bgRadius >= 999 ? "9999px" : `${st.bgRadius}mm`,
                          }}
                        >
                          {marker(st, i)}
                          {renderLine(l, colors)}
                        </span>
                      ) : (
                        <>
                          {marker(st, i)}
                          {renderLine(l, colors)}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {drawing && (
          <div
            className="absolute inset-0 z-10"
            style={{ cursor: "crosshair", touchAction: "none" }}
            onPointerDown={startDraw}
          >
            {stroke.length > 1 && (
              <svg
                className="pointer-events-none absolute inset-0"
                width="100%"
                height="100%"
                viewBox="0 0 210 297"
                preserveAspectRatio="none"
              >
                <polyline
                  points={stroke.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="none"
                  stroke="rgb(59,130,246)"
                  strokeWidth={0.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
