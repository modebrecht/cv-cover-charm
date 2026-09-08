import type { DossierFamilyId } from "@/lib/dossier-family";
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

// Module evaluation happens before the route modules initialise their color
// maps. Guarding by id keeps Vite HMR from registering duplicates.
for (const definition of freshDefinitions) {
  if (!TEMPLATES.some((template) => template.id === definition.id)) TEMPLATES.push(definition);
}

export function isFreshTemplate(template: TemplateId): template is TemplateId & FreshTemplateId {
  return isFreshTemplateId(template as string);
}

/** Typography family used by the shared dossier-theme CSS variables. */
export function freshFamilyForTemplate(template: TemplateId): DossierFamilyId | null {
  switch (template as string) {
    case "edge":
    case "glow":
    case "horizon":
    case "sunrise":
    case "violetPulse":
    case "studio2":
    case "studio3":
    case "warm2":
    case "warm3":
    case "ledger":
    case "prism":
    case "gallery":
    case "orbit":
    case "ribbon":
    case "cove":
      return "modern";
    case "frame":
    case "forestFlow":
      return "executive";
    case "monoLuxe":
      return "editorial";
    default:
      return null;
  }
}
