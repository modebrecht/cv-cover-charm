import type { Block } from "./types";
import type { UserStyledBlock } from "./user-style-precedence";

/** Font measurements, never DOM/page rectangles. Captured before pure model construction. */
export type CoverTextMetrics = {
  version: 1;
  sourceKey: string;
  profile: string;
  blocks: Record<string, { sizePt: number; lines: number }>;
};

/** Exact stale-input check, deliberately excluding image bytes and rendered positions. */
export function coverTextMetricsKey(blocks: Block[], fontScale: number): string {
  return JSON.stringify({
    fontScale,
    blocks: blocks.map((block) => ({
      id: block.id,
      kind: block.kind,
      lines: block.lines,
      style: block.style,
      userStyleKeys: (block as UserStyledBlock).userStyleKeys,
    })),
  });
}
