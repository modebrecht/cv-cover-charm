import { TEMPLATES, type ColorSlot, type TemplateDefinition, type TemplateId } from "./types";
import { FRESH_TEMPLATE_REGISTRY } from "./fresh-template-registry";

/**
 * Diagonal is the surviving geometric corner template. It is a standalone
 * dossier style with two equal, same-colour diagonal masses and a quiet paper
 * centre.
 */
const diagonalDefinition: TemplateDefinition = {
  id: "diagonal" as TemplateId,
  name: "Diagonal",
  description: "Klare blaue Diagonalen, modern und editorial",
  slots: [
    { key: "bg", label: "Papier", default: "#f8fafc" },
    { key: "primary", label: "Fläche", default: "#156082" },
    { key: "secondary", label: "Akzent", default: "#0f4c5c" },
    { key: "accent", label: "Akzent 2", default: "#2b7a9b" },
    { key: "ink", label: "Text", default: "#172033" },
  ],
};

/**
 * Edel Dark deliberately reuses the proven Edel composition instead of
 * entering the Fresh geometry system. Its extra `sheet` slot is semantic:
 * title page and text-heavy interior pages can share a genuinely dark surface
 * without changing the established light-interior Edel template.
 */
const edelDarkDefinition: TemplateDefinition = {
  id: "edelDark" as TemplateId,
  name: "Edel Dark",
  description: "Vollflächiges Anthrazit, warmes Weiss und feine Goldlinien",
  slots: [
    { key: "bg", label: "Hintergrund", default: "#171716" },
    { key: "sheet", label: "Innenfläche", default: "#171716" },
    { key: "ink", label: "Text", default: "#f3eee5" },
    { key: "accent", label: "Gold", default: "#c7a35a" },
  ],
};

/** Declarative palette metadata, available without browser registration or stylesheets. */
export const ADDITIONAL_TEMPLATE_DEFINITIONS: readonly TemplateDefinition[] = [
  diagonalDefinition,
  edelDarkDefinition,
];

/** Same slot keys used for authored custom-element defaults, independent of UI module loading. */
export function coverTemplateSlots(template: string): ColorSlot[] {
  const definition =
    FRESH_TEMPLATE_REGISTRY.find((item) => item.id === template) ??
    ADDITIONAL_TEMPLATE_DEFINITIONS.find((item) => item.id === template) ??
    TEMPLATES.find((item) => item.id === template);
  if (!definition) throw new Error(`Unknown cover template palette: ${template}`);
  return definition.slots.map((slot) => ({ ...slot }));
}
