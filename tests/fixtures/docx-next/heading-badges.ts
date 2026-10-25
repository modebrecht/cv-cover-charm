import {
  buildDossierDocModel,
  type DossierAppSnapshot,
} from "../../../src/lib/docx-next/build-model";
import {
  BRIEF,
  NEXT_TEMPLATES,
  type TemplateDefinition,
} from "../../../src/lib/docx-next/templates";

/** Isolated QA descriptor: never registered in application or production export routing. */
export function headingBadgeModel(source: DossierAppSnapshot, enabled: boolean) {
  const id = "qa-heading-badges";
  const registry = NEXT_TEMPLATES as Record<string, TemplateDefinition>;
  if (registry[id]) throw new Error("Heading badge fixture is already active");
  const input = structuredClone(source);
  input.cover.template = id as typeof input.cover.template;
  input.letter.design.template = id as typeof input.letter.design.template;
  input.cv.design.template = id as typeof input.cv.design.template;
  registry[id] = { ...BRIEF, id, cv: { ...BRIEF.cv, headingBadge: enabled } };
  try {
    return buildDossierDocModel(input);
  } finally {
    delete registry[id];
  }
}
