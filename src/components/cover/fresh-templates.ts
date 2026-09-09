import { familyForTemplate, type DossierFamilyId } from "@/lib/dossier-family";
import {
  FRESH_TEMPLATE_IDS,
  FRESH_TEMPLATE_REGISTRY,
  isFreshTemplateId,
  type FreshTemplateId,
} from "./fresh-template-registry";
import { TEMPLATES, type TemplateDefinition, type TemplateId } from "./types";
import "./gradient-templates.css";
import "./studio-warm-variants.css";
import "./studio-rework.css";
import "./cv-card-refresh.css";
import "./studio-cv-redesign.css";
import "./signature-templates.css";
import "./next-signature-templates.css";
import "./verlauf-pill-fix.css";

export { FRESH_TEMPLATE_IDS, type FreshTemplateId } from "./fresh-template-registry";

/**
 * Runtime registration for Fresh dossier templates 21-38.
 *
 * The persisted TemplateId union remains backwards compatible, so Fresh ids
 * are cast only at this registration boundary. The canonical definitions live
 * in fresh-template-registry.ts, which is safe to import from Node-side tests.
 */
const freshDefinitions: TemplateDefinition[] = FRESH_TEMPLATE_REGISTRY.map((definition) => ({
  id: definition.id as TemplateId,
  name: definition.name,
  description: definition.description,
  slots: definition.slots.map((slot) => ({ ...slot })),
}));

/**
 * Template 39 deliberately reuses the proven Edel composition instead of
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

// Module evaluation happens before the route modules initialise their color
// maps. Guarding by id keeps Vite HMR from registering duplicates.
for (const definition of freshDefinitions) {
  if (!TEMPLATES.some((template) => template.id === definition.id)) TEMPLATES.push(definition);
}
if (!TEMPLATES.some((template) => (template.id as string) === "edelDark")) {
  TEMPLATES.push(edelDarkDefinition);
}

export function isFreshTemplate(template: TemplateId): template is TemplateId & FreshTemplateId {
  return isFreshTemplateId(template as string);
}

/** Compatibility helper; the family itself is owned centrally. */
export function freshFamilyForTemplate(template: TemplateId): DossierFamilyId | null {
  if (!isFreshTemplate(template)) return null;
  return familyForTemplate(template);
}
