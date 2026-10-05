import type { DecorativeShape, DocumentPart } from "./model";
import type { TemplateMotif } from "./templates";
import { color } from "./colors";
import { ensureFirstHeader } from "./page-artwork";

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

/** Paint belongs to each part's native first/default story, independently of header text. */
export function composePageMotifs(
  part: DocumentPart,
  policies: readonly TemplateMotif[],
  colors: Record<string, string>,
  fallback: string,
  opacity = 1,
): void {
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1)
    throw new Error("DOCX Next page motif opacity must be between zero and one.");
  if (!opacity || !policies.length) return;
  ensureFirstHeader(part);
  for (const repeat of ["first", "continuation"] as const)
    part.headerShapes = [
      ...(part.headerShapes ?? []),
      ...templateMotifs(part, policies, colors, fallback, undefined, repeat).map((shape) => ({
        ...shape,
        opacity: shape.opacity * opacity,
      })),
    ];
}
