import { cvPalette } from "@/components/cv/palette";
import type { DossierChromeScope, DossierChromeState } from "./dossier-chrome";
import { automaticBorderColor } from "./dossier-chrome-colors";

type ChromeDesign = { template: string; colors: Record<string, string> };

/** The bounded Modern contact-header contract resolves automatic colours once.
 * Letter is the shared visual authority, matching the existing chrome migration.
 * Explicit shared colours win. No saved document/theme values are rewritten.
 * Compact chrome and other template families retain their reviewed treatment. */
export function resolveSynchronizedContactChrome(
  designs: { letter?: ChromeDesign | null; cv?: ChromeDesign | null },
  state: DossierChromeState,
  scope: DossierChromeScope,
) {
  const options = state.sync ? state.shared : state[scope];
  if (
    !state.sync ||
    options.headerMode !== "contact" ||
    designs.letter?.template !== "modern" ||
    designs.cv?.template !== "modern"
  )
    return options;

  const colors = designs.letter.colors;
  const palette = cvPalette(colors);
  const headerBackground =
    options.headerBackgroundColor ??
    colors.primary ??
    colors.accent ??
    colors.secondary ??
    palette.accent;
  const footerBackground =
    options.footerBackgroundColor ?? colors.accent ?? colors.secondary ?? palette.accent;
  return {
    ...options,
    headerBackgroundColor: headerBackground,
    footerBackgroundColor: footerBackground,
    borderColor:
      options.borderColor ??
      automaticBorderColor({
        colors,
        headerBackground,
        headerGradient: options.headerGradientColor,
        footerBackground,
        footerGradient: options.footerGradientColor,
        palette,
      }),
  };
}
