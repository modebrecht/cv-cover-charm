import type { DossierFamilyId } from "@/lib/dossier-family";
import { TEMPLATES, type TemplateDefinition, type TemplateId } from "./types";

/**
 * Fresh dossier templates introduced after the original template union.
 *
 * The persisted data model keeps TemplateId backwards compatible, so these
 * runtime definitions deliberately cast their ids. Every consumer resolves
 * templates through the shared TEMPLATES array, therefore registration here
 * makes colors, import/export and both document editors understand them without
 * invalidating older drafts.
 */
export const FRESH_TEMPLATE_IDS = ["edge", "glow", "frame", "monoLuxe"] as const;
export type FreshTemplateId = (typeof FRESH_TEMPLATE_IDS)[number];

const freshDefinitions: TemplateDefinition[] = [
  {
    id: "edge" as TemplateId,
    name: "Edge",
    description: "Klare Seitenkante, viel Ruhe, präzise Akzente",
    slots: [
      { key: "bg", label: "Papier", default: "#f7f7f4" },
      { key: "primary", label: "Kante", default: "#182433" },
      { key: "secondary", label: "Signal", default: "#4da3ff" },
      { key: "accent", label: "Akzent", default: "#2f7de1" },
      { key: "ink", label: "Text", default: "#18202a" },
    ],
  },
  {
    id: "glow" as TemplateId,
    name: "Glow",
    description: "Weiche Farbräume, modern und freundlich",
    slots: [
      { key: "bg", label: "Papier", default: "#f7f9ff" },
      { key: "primary", label: "Glow 1", default: "#6d5dfb" },
      { key: "secondary", label: "Glow 2", default: "#7dd3fc" },
      { key: "accent", label: "Akzent", default: "#14b8a6" },
      { key: "ink", label: "Text", default: "#172033" },
    ],
  },
  {
    id: "frame" as TemplateId,
    name: "Frame",
    description: "Geometrischer Rahmen, ruhig und markant",
    slots: [
      { key: "bg", label: "Papier", default: "#f6f3ed" },
      { key: "primary", label: "Rahmen", default: "#26352f" },
      { key: "secondary", label: "Kontrast", default: "#d8894a" },
      { key: "accent", label: "Akzent", default: "#b96b32" },
      { key: "ink", label: "Text", default: "#1e2722" },
    ],
  },
  {
    id: "monoLuxe" as TemplateId,
    name: "Mono Luxe",
    description: "Reduziert, typografisch, mit feinem Metallakzent",
    slots: [
      { key: "bg", label: "Papier", default: "#f8f6f1" },
      { key: "primary", label: "Schwarz", default: "#171717" },
      { key: "secondary", label: "Metall", default: "#b08d57" },
      { key: "accent", label: "Akzent", default: "#8e6f42" },
      { key: "ink", label: "Text", default: "#171717" },
    ],
  },
];

// Module evaluation happens before the route modules initialise their color
// maps. Guarding by id keeps Vite HMR from registering duplicates.
for (const definition of freshDefinitions) {
  if (!TEMPLATES.some((template) => template.id === definition.id)) TEMPLATES.push(definition);
}

export function isFreshTemplate(template: TemplateId): template is TemplateId & FreshTemplateId {
  return (FRESH_TEMPLATE_IDS as readonly string[]).includes(template as string);
}

/** Typography family used by the shared dossier-theme CSS variables. */
export function freshFamilyForTemplate(template: TemplateId): DossierFamilyId | null {
  switch (template as string) {
    case "edge":
      return "modern";
    case "glow":
      return "modern";
    case "frame":
      return "executive";
    case "monoLuxe":
      return "editorial";
    default:
      return null;
  }
}
