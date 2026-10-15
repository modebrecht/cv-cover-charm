import { resolveCoverAnchors } from "./anchors";
import type { Block } from "./types";
import { FONT_STACKS, lineText } from "./types";
import { fitFontSize, measureLines } from "@/lib/text-fit";
import { dossierNameScale } from "@/lib/dossier-theme";
import { coverTextMetricsKey, type CoverTextMetrics } from "./text-metrics";

const MM = 96 / 25.4; // px pro mm bei 96dpi
const PT_TO_MM = 25.4 / 72;

type Resolved = { size: number; y: number; height: number };

/**
 * Bestimmt für jeden Block die effektive Schriftgrösse (globale Skalierung +
 * Auto-Verkleinerung) und daraus die tatsächliche y-Position.
 */
export function resolveLayout(
  blocks: Block[],
  fontScale: number,
  spacingDensity = 1,
): Record<string, Resolved> {
  const metricsOf = new Map<string, { size: number; height: number }>();

  for (const b of blocks) {
    const st = b.style;
    const text = b.lines.map(lineText).join("\n");
    const metrics = {
      text,
      widthPx: st.w * MM,
      fontFamily: FONT_STACKS[st.font],
      weight: st.weight,
      italic: st.italic,
      tracking: st.tracking,
      uppercase: st.uppercase,
    };

    // M5.4: Titelblatt und CV reagieren zuerst mit derselben sanften
    // Längen-Skalierung. Das exakte fitFontSize bleibt danach die zweite
    // Sicherheitsstufe für die tatsächliche Breite der Titelblatt-Vorlage.
    const nameScale = b.id === "name" ? dossierNameScale(text) : 1;
    const wanted = st.size * fontScale * nameScale;
    const size =
      b.kind !== "text" || !st.maxLines || b.lines.length === 0
        ? wanted
        : fitFontSize({ ...metrics, sizePt: wanted, maxLines: st.maxLines });

    const height =
      b.kind === "photo" || b.kind === "shape"
        ? st.w * (st.ratio ?? 1)
        : b.lines.length === 0
          ? 0
          : measureLines({ ...metrics, sizePt: size }) * size * st.lineHeight * PT_TO_MM +
            (st.bg ? st.padY * 2 : 0);

    metricsOf.set(b.id, { size, height });
  }

  return resolveCoverAnchors(blocks, metricsOf, spacingDensity);
}

/** Capture the existing font-fit result, not DOM positions or final CSS rectangles.
 * Call after the declared fonts are loaded. A server without Canvas cannot supply this packet.
 */
export function captureCoverTextMetrics(
  blocks: Block[],
  fontScale: number,
  profile: string,
): CoverTextMetrics {
  if (typeof document === "undefined" || !profile.trim())
    throw Error("Cover font metrics require a loaded browser font profile");
  const layout = resolveLayout(blocks, fontScale);
  return {
    version: 1,
    sourceKey: coverTextMetricsKey(blocks, fontScale),
    profile,
    blocks: Object.fromEntries(
      blocks
        .filter((b) => b.kind === "text")
        .map((b) => {
          const metric = layout[b.id];
          const height = metric.height - (b.style.bg ? b.style.padY * 2 : 0);
          return [
            b.id,
            {
              sizePt: metric.size,
              lines: b.lines.length
                ? Math.round(height / (metric.size * b.style.lineHeight * PT_TO_MM))
                : 0,
            },
          ];
        }),
    ),
  };
}
