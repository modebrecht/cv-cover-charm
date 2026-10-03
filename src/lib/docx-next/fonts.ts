import type { FontKey } from "@/components/cover/types";
/** Explicit Word-oriented mappings. No implicit mapping of unknown keys. */
export const WORD_FONTS: Record<FontKey, { font: string; fallback: string; reason: string }> = {
  sans: { font: "Arial", fallback: "Liberation Sans", reason: "Portable sans serif" },
  serif: { font: "Georgia", fallback: "Liberation Serif", reason: "Preserve serif design" },
  times: { font: "Times New Roman", fallback: "Liberation Serif", reason: "Native Word serif" },
  humanist: { font: "Verdana", fallback: "DejaVu Sans", reason: "Preserve humanist width" },
  freundlich: {
    font: "Trebuchet MS",
    fallback: "Liberation Sans",
    reason: "Documented Cabin substitute until embedding rights and unavailable-font QA pass",
  },
  schmal: {
    font: "Arial Narrow",
    fallback: "Liberation Sans Narrow",
    reason: "Preserve condensed design",
  },
  maschine: {
    font: "Courier New",
    fallback: "Liberation Mono",
    reason: "Preserve monospaced metrics",
  },
  plakativ: { font: "Impact", fallback: "DejaVu Sans", reason: "Preserve display face" },
};
export function wordFont(key: FontKey | null | undefined, fallback: string) {
  return key ? WORD_FONTS[key].font : fallback;
}
