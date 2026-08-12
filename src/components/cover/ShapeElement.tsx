import type { BlockStyle, ShapeKind } from "./types";
import { resolveColor } from "./layouts";

type Props = {
  shape: ShapeKind;
  path?: string;
  style: BlockStyle;
  colors: Record<string, string>;
};

/**
 * Zeichnet eine selbst hinzugefügte Form. Alle Masse in mm, damit Vorschau und
 * PDF-Export dieselbe Geometrie verwenden.
 */
export function ShapeElement({ shape, path, style: st, colors }: Props) {
  const stroke = resolveColor(st.color, colors);
  const fill = st.fill ? resolveColor(st.fill, colors) : "transparent";
  const widthMm = st.w;
  const heightMm = st.w * (st.ratio ?? 1);
  const strokeMm = st.strokeWidth ?? 0.8;

  if (shape === "line") {
    return (
      <div
        style={{
          width: "100%",
          height: `${Math.max(strokeMm, 0.2)}mm`,
          background: stroke,
          opacity: st.opacity,
        }}
      />
    );
  }

  if (shape === "path") {
    return (
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ width: "100%", height: `${heightMm}mm`, opacity: st.opacity, display: "block" }}
      >
        <path
          d={path ?? ""}
          fill={st.fill ? fill : "none"}
          stroke={stroke}
          // Strichstärke in mm auf das 0–100-Koordinatensystem umrechnen
          strokeWidth={(strokeMm / Math.max(widthMm, 1)) * 100}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: `${heightMm}mm`,
        background: fill,
        border: strokeMm > 0 ? `${strokeMm}mm solid ${stroke}` : "none",
        borderRadius: shape === "circle" ? "9999px" : `${st.bgRadius >= 999 ? 0 : st.bgRadius}mm`,
        opacity: st.opacity,
        boxSizing: "border-box",
      }}
    />
  );
}
