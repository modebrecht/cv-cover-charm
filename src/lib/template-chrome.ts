import type { DossierChromeOptions } from "@/lib/dossier-chrome";

/**
 * Template-owned chrome exceptions.
 *
 * Most templates use the shared contact-header default. Modern deliberately
 * uses a compact mirrored cap/footer pair: dark surface on both page edges,
 * with the pink accent as the inner hairline. This is part of the template's
 * visual identity, not a user-entered chrome customization.
 */
export function resolveTemplateChromeOptions(
  template: string,
  colors: Record<string, string>,
  options: DossierChromeOptions,
): DossierChromeOptions {
  if (template !== "modern") return options;

  const primary = colors.primary ?? colors.ink ?? "#111827";
  const accent = colors.accent ?? colors.secondary ?? "#f43f5e";

  return {
    ...options,
    headerMode: "compact",
    headerHeightMm: 3,
    headerBackgroundColor: primary,
    headerGradientColor: null,
    footerMode: "compact",
    footerHeightMm: 3,
    footerBackgroundColor: primary,
    footerGradientColor: null,
    borderEnabled: true,
    borderColor: accent,
    borderWidthMm: 0.6,
  };
}
