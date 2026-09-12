import type { DossierChromeOptions, DossierHeaderMode } from "@/lib/dossier-chrome";

/**
 * Most dossier templates read better with the quiet 3 mm signature band. Only
 * templates whose design genuinely benefits from an integrated contact masthead
 * opt into contact by default.
 *
 * `freundlich` (Warm 1) is intentionally not listed here: its visually rich
 * 52 mm contact-like masthead is implemented by the dedicated Warm compact
 * renderer. Switching that template to the generic contact mode would bypass
 * the good Warm composition.
 */
const CONTACT_HEADER_DEFAULT_TEMPLATES = new Set([
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
 * already carry substantial visual height, so they need much less additional
 * whitespace than the compact signature band. The value is written only when a
 * template is selected; users remain free to change it afterwards.
 */
export function defaultHeaderGapMmForTemplate(template: string): number {
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
