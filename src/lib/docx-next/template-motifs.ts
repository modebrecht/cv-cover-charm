import type { DecorativeShape, DocumentPart } from "./model";
import type { TemplateMotif } from "./templates";
import { color } from "./colors";

/** Configuration becomes existing paint primitives, never XML or semantic pictures. */
export function templateMotifs(
  part: DocumentPart,
  policies: readonly TemplateMotif[],
  colors: Record<string, string>,
  fallback: string,
  bandHeightMm?: number,
  repeat?: "first" | "continuation",
): DecorativeShape[] {
  return policies
    .filter((policy) => !repeat || !policy.repeat || policy.repeat === repeat)
    .map((policy, index) => ({
      kind: "decorative-shape",
      id: `${part.id}.artwork.motif.${repeat ?? "first"}:${index}`,
      semanticText: false,
      shape: policy.shape,
      ...(policy.path ? { path: policy.path } : {}),
      repeat: repeat ?? policy.repeat ?? "first",
      clipToPage: true,
      xMm: part.page.widthMm * policy.xFraction,
      yMm: policy.topMm,
      widthMm: part.page.widthMm * policy.widthFraction,
      heightMm: policy.heightMm ?? bandHeightMm ?? 0,
      radiusMm: 0,
      opacity: policy.opacity ?? 1,
      fill: {
        color: color(colors[policy.fillSlot], fallback),
        ...(policy.endSlot
          ? { endColor: color(colors[policy.endSlot], fallback), angleDeg: policy.angleDeg ?? 135 }
          : {}),
      },
      stroke: { color: fallback, widthMm: 0 },
    }));
}
