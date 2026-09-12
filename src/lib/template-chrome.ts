import type { DossierChromeOptions, DossierHeaderMode } from "@/lib/dossier-chrome";

/**
 * Most dossier templates read better with the quiet 3 mm signature band. Only
 * templates whose design genuinely benefits from an integrated contact masthead
 * opt into contact by default.
 *
 * `freundlich` (Warm 1) intentionally stays out of this set. Its dedicated
 * compact renderer owns the reviewed 52 mm teal / mustard first-page masthead,
 * while the CV keeps the quiet Warm continuation edge. Routing Warm through the
 * generic contact masthead creates a second, visually unrelated header system.
 *
 * `aurora` owns a deep cyan/violet first-page field. Its reviewed gallery
 * composition uses the shared contact masthead as the clean cyan sender strip;
 * Compact would drop normal black sender text into the decorative gradient.
 */
const CONTACT_HEADER_DEFAULT_TEMPLATES = new Set([
  "aurora",
  "horizon",
  "violetPulse",
  "studio",
  "studio2",
  "studio3",
  "warm2",
  "warm3",
  // Retired but still render-compatible; keep family behaviour coherent.
  "warm4",
  "warm5",
  "verlauf",
  "verlauf2",
  "verlauf3",
  "prism",
]);

const AUTO_GRADIENT_CONTACT_TEMPLATES = new Set([
  "horizon",
  "violetPulse",
  "verlauf",
  "verlauf2",
  "verlauf3",
  "prism",
]);

/**
 * Header mode chosen when a template is selected for the first time.
 *
 * This is a default, not a renderer override: users can still switch any
 * template to contact / compact / none afterwards through the shared controls.
 */
export function defaultHeaderModeForTemplate(template: string): DossierHeaderMode {
  return CONTACT_HEADER_DEFAULT_TEMPLATES.has(template) ? "contact" : "compact";
}

/**
 * Default whitespace after the selected template header. Contact mastheads
 * already carry substantial visual height, so they normally need much less
 * additional whitespace than the compact signature band. Aurora is the
 * exception: its reviewed deep first-page field relies on the original 12 mm
 * flow clearance so recipient text starts below the decorative masthead.
 * Values are written only when a template is selected; users remain free to
 * change them afterwards.
 */
export function defaultHeaderGapMmForTemplate(template: string): number {
  if (template === "aurora") return 12;
  return defaultHeaderModeForTemplate(template) === "contact" ? 4 : 12;
}

/**
 * Template-owned chrome styling without disabling the shared chrome controls.
 * Explicit user colours always win: template-derived contact gradients are only
 * supplied while both header colour controls remain on "Wie Vorlage".
 */
export function resolveTemplateChromeOptions(
  template: string,
  colors: Record<string, string>,
  options: DossierChromeOptions,
): DossierChromeOptions {
  const primary = colors.primary ?? colors.ink ?? "#334155";
  const secondary = colors.secondary ?? colors.accent ?? primary;

  if (
    options.headerMode === "contact" &&
    AUTO_GRADIENT_CONTACT_TEMPLATES.has(template) &&
    options.headerBackgroundColor === null &&
    options.headerGradientColor === null
  ) {
    return {
      ...options,
      headerBackgroundColor: primary,
      headerGradientColor: secondary,
    };
  }

  if (template !== "modern") return options;
  if (options.headerMode !== "compact" || options.footerMode !== "compact") return options;

  const accent = colors.accent ?? colors.secondary ?? "#f43f5e";

  return {
    ...options,
    // Keep the canonical mode and geometry values untouched. Only the visual
    // treatment changes while both compact zones are active.
    headerBackgroundColor: primary,
    headerGradientColor: null,
    footerBackgroundColor: primary,
    footerGradientColor: null,
    borderEnabled: true,
    borderColor: accent,
    borderWidthMm: 0.6,
  };
}
