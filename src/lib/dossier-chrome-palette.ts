import type { DossierChromeScope, DossierChromeState } from "./dossier-chrome";
import { resolveTemplateChromeOptions } from "./template-chrome";

type ChromeDesign = { template: string; colors: Record<string, string> };

/** Resolve the visual authority before document rendering. With sync enabled,
 * Letter owns automatic colours (as in the original chrome migration); a lone
 * CV uses its own design. Saved overrides remain intent, not palette defaults.
 * The palette is ephemeral provenance, never a write to either saved design.
 */
export function resolveDossierChromePalette(
  designs: { letter?: ChromeDesign | null; cv?: ChromeDesign | null },
  state: DossierChromeState,
  scope: DossierChromeScope,
) {
  const options = state.sync ? state.shared : state[scope];
  const design = (state.sync ? (designs.letter ?? designs.cv) : designs[scope]) ?? {
    template: "brief",
    colors: {},
  };
  return resolveTemplateChromeOptions(design.template, design.colors, {
    ...options,
    resolvedPalette: { template: design.template, colors: { ...design.colors } },
  });
}
