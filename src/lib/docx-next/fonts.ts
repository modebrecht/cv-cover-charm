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
    reason:
      "Nonembedded Cabin substitute; local OFL/fsType allow embedding but embedded-font Word acceptance is pending",
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
  if (!key) return fontDefinition(fallback).name;
  if (!Object.hasOwn(WORD_FONTS, key)) throw new Error(`DOCX Next unsupported font key ${key}`);
  return WORD_FONTS[key].font;
}

export type FontDefinition = {
  name: string;
  fallback: string;
  family: "roman" | "swiss" | "modern" | "decorative";
  pitch: "fixed" | "variable";
};
const DEFINITIONS: readonly FontDefinition[] = Object.entries(WORD_FONTS).flatMap(
  ([key, value]) => {
    const family =
      key === "serif" || key === "times"
        ? "roman"
        : key === "maschine"
          ? "modern"
          : key === "plakativ"
            ? "decorative"
            : "swiss";
    const pitch = key === "maschine" ? "fixed" : "variable";
    return [{ name: value.font, fallback: value.fallback, family, pitch }];
  },
);
export function fontDefinition(name: string): FontDefinition {
  const primary = DEFINITIONS.find((font) => font.name === name);
  if (primary) return primary;
  const alternative = DEFINITIONS.find((font) => font.fallback === name);
  if (alternative) return { ...alternative, name, fallback: alternative.name };
  throw new Error(`DOCX Next unsupported font family ${name}`);
}
export type FontPolicy = { availableFonts?: readonly string[]; embedding?: "disabled" };
export type FontSelection = {
  requested: string;
  selected: string;
  fallback: string;
  reason: "requested" | "unavailable";
};
export type FontPolicyResult = {
  embedding: "disabled";
  availability: "target-application" | "supplied";
  selections: FontSelection[];
};
/** Pure selection before rendering. No browser measurement, fetch or font embedding. */
export function createFontResolver(policy: FontPolicy = {}) {
  if (policy.embedding !== undefined && policy.embedding !== "disabled")
    throw new Error("DOCX Next unsupported font embedding policy");
  if (policy.availableFonts?.some((name) => typeof name !== "string" || !name.trim()))
    throw new Error("DOCX Next invalid available font list");
  const available = policy.availableFonts
    ? new Set(policy.availableFonts.map((name) => name.trim().toLowerCase()))
    : undefined;
  const selections = new Map<string, FontSelection>();
  const resolve = (name: string) => {
    const definition = fontDefinition(name);
    const missing = available && !available.has(name.toLowerCase());
    const selected = missing ? definition.fallback : name;
    if (available && !available.has(selected.toLowerCase()))
      throw new Error(`DOCX Next no available font for ${name}; expected ${definition.fallback}`);
    selections.set(name, {
      requested: name,
      selected,
      fallback: definition.fallback,
      reason: missing ? "unavailable" : "requested",
    });
    return selected;
  };
  return {
    resolve,
    result: (): FontPolicyResult => ({
      embedding: "disabled",
      availability: available ? "supplied" : "target-application",
      selections: [...selections.values()].sort((a, b) =>
        a.requested < b.requested ? -1 : a.requested > b.requested ? 1 : 0,
      ),
    }),
  };
}
