import type { DossierChromeOptions } from "@/lib/dossier-chrome";

/**
 * Template-owned chrome styling without disabling the shared chrome controls.
 *
 * Modern's compact state is a deliberate mirrored pair: dark top/bottom caps
 * with the pink accent as the inner edge. Contact / none / details remain fully
 * user-selectable; the template must never overwrite those mode choices.
 */
export function resolveTemplateChromeOptions(
  template: string,
  colors: Record<string, string>,
  options: DossierChromeOptions,
): DossierChromeOptions {
  if (template !== "modern") return options;
  if (options.headerMode !== "compact" || options.footerMode !== "compact") return options;

  const primary = colors.primary ?? colors.ink ?? "#111827";
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
