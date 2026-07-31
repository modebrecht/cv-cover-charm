import { forwardRef, useRef } from "react";
import type { Block, BlockStyle, CoverData, TemplateId } from "./types";
import { FONT_STACKS } from "./types";
import { resolveColor } from "./layouts";
import { CoverBackground } from "./CoverBackground";

const MM = 96 / 25.4; // px pro mm bei 96dpi

type Props = {
  template: TemplateId;
  data: CoverData;
  colors: Record<string, string>;
  blocks: Block[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  editable?: boolean;
};

function initials(data: CoverData) {
  return [data.vorname, data.nachname]
    .map((s) => s?.[0])
    .filter(Boolean)
    .join("")
    .toUpperCase();
}

function textStyle(st: BlockStyle, colors: Record<string, string>): React.CSSProperties {
  return {
    fontSize: `${st.size}pt`,
    lineHeight: st.lineHeight,
    color: resolveColor(st.color, colors),
    textAlign: st.align,
    fontWeight: st.weight,
    fontStyle: st.italic ? "italic" : "normal",
    textTransform: st.uppercase ? "uppercase" : "none",
    letterSpacing: `${st.tracking}em`,
    opacity: st.opacity,
    fontFamily: FONT_STACKS[st.font],
    whiteSpace: "pre-wrap",
  };
}

export const CoverCanvas = forwardRef<HTMLDivElement, Props>(function CoverCanvas(
  { template, data, colors, blocks, selected, onSelect, onMove, editable = true },
  ref,
) {
  const pageRef = useRef<HTMLDivElement>(null);

  const startDrag = (e: React.PointerEvent, block: Block) => {
    if (!editable) return;
    e.preventDefault();
    onSelect(block.id);
    const page = pageRef.current;
    if (!page) return;
    const rect = page.getBoundingClientRect();
    const scale = rect.width / (210 * MM);
    const startX = e.clientX;
    const startY = e.clientY;
    const ox = block.style.x;
    const oy = block.style.y;
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);

    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / scale / MM;
      const dy = (ev.clientY - startY) / scale / MM;
      onMove(
        block.id,
        Math.round(Math.max(-20, Math.min(210, ox + dx)) * 10) / 10,
        Math.round(Math.max(-20, Math.min(297, oy + dy)) * 10) / 10,
      );
    };
    const up = () => {
      el.releasePointerCapture(e.pointerId);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
  };

  return (
    <div
      ref={ref}
      className="relative overflow-hidden bg-white shadow-2xl"
      style={{ width: "210mm", height: "297mm" }}
      onPointerDown={(e) => {
        if (editable && e.target === e.currentTarget) onSelect(null);
      }}
    >
      <div ref={pageRef} className="absolute inset-0">
        <CoverBackground template={template} colors={colors} />

        {blocks.map((b) => {
          if (b.style.hidden) return null;
          const isPhoto = b.kind === "photo";
          const empty = isPhoto ? !data.foto && !initials(data) : b.lines.length === 0;
          if (empty) return null;
          const active = editable && selected === b.id;

          return (
            <div
              key={b.id}
              onPointerDown={(e) => startDrag(e, b)}
              className="absolute"
              style={{
                left: `${b.style.x}mm`,
                top: `${b.style.y}mm`,
                width: `${b.style.w}mm`,
                cursor: editable ? "move" : "default",
                touchAction: "none",
                outline: active ? "1px dashed rgba(59,130,246,0.9)" : "none",
                outlineOffset: "2px",
                boxShadow: active ? "0 0 0 4px rgba(59,130,246,0.12)" : "none",
              }}
            >
              {isPhoto ? (
                data.foto ? (
                  <img
                    src={data.foto}
                    alt="Bewerbungsfoto"
                    draggable={false}
                    style={{
                      width: "100%",
                      height: `${b.style.w * (b.style.ratio ?? 1)}mm`,
                      objectFit: "cover",
                      borderRadius: b.style.radius ? "9999px" : 0,
                      boxShadow: `0 0 0 3px ${colors.bg}, 0 0 0 4px ${resolveColor(b.style.color, colors)}`,
                    }}
                  />
                ) : (
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: "100%",
                      height: `${b.style.w * (b.style.ratio ?? 1)}mm`,
                      borderRadius: b.style.radius ? "9999px" : 0,
                      border: `1px solid ${resolveColor(b.style.color, colors)}`,
                      color: resolveColor(b.style.color, colors),
                      fontFamily: FONT_STACKS[b.style.font],
                      fontSize: `${Math.max(14, b.style.w * 0.45)}pt`,
                    }}
                  >
                    {initials(data)}
                  </div>
                )
              ) : (
                <div style={textStyle(b.style, colors)}>
                  {b.lines.map((l, i) => (
                    <div key={i}>{l}</div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});
