import type { Block } from "./types";
import { FONT_STACKS, lineText } from "./types";
import { fitFontSize, measureLines } from "@/lib/text-fit";

const MM = 96 / 25.4; // px pro mm bei 96dpi
const PT_TO_MM = 25.4 / 72;

type Resolved = { size: number; y: number; height: number };

/**
 * Bestimmt für jeden Block die effektive Schriftgrösse (globale Skalierung +
 * Auto-Verkleinerung) und die tatsächliche y-Position. Blöcke mit `follows`
 * hängen sich unter ihren Vorgänger, damit ein mehrzeiliger Titel den Namen
 * darunter verschiebt statt ihn zu überdecken.
 */
export function resolveLayout(blocks: Block[], fontScale: number): Record<string, Resolved> {
  const out: Record<string, Resolved> = {};

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

    const wanted = st.size * fontScale;
    const size =
      b.kind === "photo" || !st.maxLines || b.lines.length === 0
        ? wanted
        : fitFontSize({ ...metrics, sizePt: wanted, maxLines: st.maxLines });

    const height =
      b.kind === "photo"
        ? st.w * (st.ratio ?? 1)
        : b.lines.length === 0
          ? 0
          : measureLines({ ...metrics, sizePt: size }) * size * st.lineHeight * PT_TO_MM +
            (st.bg ? st.padY * 2 : 0);

    const parent = st.follows ? out[st.follows] : undefined;
    const y = parent ? parent.y + parent.height + (st.gap ?? 4) : st.y;

    out[b.id] = { size, y, height };
  }

  return out;
}
