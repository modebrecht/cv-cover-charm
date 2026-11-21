import "./legacy-type-scales";
import { FONT_LABELS } from "@/components/cover/types";
import { normalizeActiveTemplateId } from "@/components/cover/fresh-templates";
import { normalizeCvPaperColor } from "./cv-paper";
import type { CvDesign } from "./types";

export const CV_DEFAULT_BG_OPACITY = 0.25;
const DESIGN_MIGRATION_VERSION = 5;
const LEGACY_DEFAULT_BG_OPACITIES = [0.06, 0.12];

export type SavedCvDesign = Omit<CvDesign, "font"> & {
  font?: CvDesign["font"] | null;
};

export function cvDesignForSave(design: CvDesign): SavedCvDesign {
  return { ...design, font: design.font ?? null };
}

/** One saved-design migration for the visible editor and canonical print input. */
export function migrateCvDesign(
  current: CvDesign,
  incoming: SavedCvDesign,
  version?: number,
): CvDesign {
  const merged = {
    ...current,
    ...incoming,
    font: Object.hasOwn(incoming, "font") ? (incoming.font ?? undefined) : current.font,
    template: normalizeActiveTemplateId(incoming.template),
  };
  merged.paperColor = normalizeCvPaperColor(incoming.paperColor);
  if (!merged.font || !(merged.font in FONT_LABELS)) delete merged.font;
  const isOldSave = (version ?? 1) < DESIGN_MIGRATION_VERSION;
  const usedOldDefault = LEGACY_DEFAULT_BG_OPACITIES.some(
    (value) => Math.abs(merged.bgOpacity - value) < 0.001,
  );
  if (isOldSave && usedOldDefault) merged.bgOpacity = CV_DEFAULT_BG_OPACITY;
  return merged;
}
