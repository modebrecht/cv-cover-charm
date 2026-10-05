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
    .map((policy, index) => {
      const hasFill = !!(policy.fillSlot || policy.fillColor);
      if (
        (policy.fillSlot && policy.fillColor) ||
        (policy.fillColor && !/^[0-9A-F]{6}$/.test(policy.fillColor)) ||
        (!hasFill && !(policy.stroke && policy.stroke.widthMm > 0)) ||
        (!hasFill && (policy.endSlot || policy.radialFade || policy.gradientStops))
      )
        throw new Error(
          "DOCX Next motif requires a fill or visible outline; gradients require a fill.",
        );
      return {
        kind: "decorative-shape",
        ...(policy.paintLayer !== undefined ? { paintLayer: policy.paintLayer } : {}),
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
        ...(policy.cornerRadiiMm ? { cornerRadiiMm: policy.cornerRadiiMm } : {}),
        opacity: policy.opacity ?? 1,
        ...(hasFill
          ? {
              fill: {
                color: policy.fillColor ?? color(colors[policy.fillSlot!], fallback),
                ...(policy.gradientStops
                  ? {
                      stops: policy.gradientStops.map((stop) => ({
                        color: color(colors[stop.slot], fallback),
                        offsetPct: stop.offsetPct,
                      })),
                      angleDeg: policy.angleDeg ?? 135,
                    }
                  : {}),
                ...(policy.radialFade ? { radialFade: policy.radialFade } : {}),
                ...(policy.endSlot
                  ? {
                      endColor: color(colors[policy.endSlot], fallback),
                      angleDeg: policy.angleDeg ?? 135,
                    }
                  : {}),
              },
            }
          : {}),
        stroke: {
          color: policy.stroke ? color(colors[policy.stroke.slot], fallback) : fallback,
          widthMm: policy.stroke?.widthMm ?? 0,
        },
      };
    });
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
  const explicitLayers = policies.filter((policy) => policy.paintLayer !== undefined);
  if (explicitLayers.length) {
    if (explicitLayers.length !== policies.length)
      throw new Error("DOCX Next page paint must declare every layer or none");
    const topLayer = Math.max(...explicitLayers.map((policy) => policy.paintLayer!));
    // Authored foreground geometry stays above the declared page background.
    part.headerShapes = part.headerShapes?.map((shape, index) => ({
      ...shape,
      paintLayer: shape.paintLayer ?? topLayer + index + 1,
    }));
  }
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
