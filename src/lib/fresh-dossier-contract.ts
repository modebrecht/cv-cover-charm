import {
  FRESH_TEMPLATE_IDS,
  type FreshTemplateId,
} from "@/components/cover/fresh-template-registry";
import { TEMPLATES, type TemplateId } from "@/components/cover/types";
import { freshLetterSpec } from "@/components/letter/fresh-letter-system";
import { familyForTemplate, type DossierFamilyId } from "@/lib/dossier-family";
import { effectiveDossierFont } from "@/lib/dossier-theme";

export type FreshDossierIdentity = {
  id: FreshTemplateId;
  name: string;
  palette: Record<string, string>;
  family: DossierFamilyId;
  fontStack: string;
  coverRole: "expressive";
  letterRole: "restrained";
  cvRole: "information";
  letterArchetype: "fresh" | "sidebar" | "band" | "frame";
};

function identityFor(id: FreshTemplateId): FreshDossierIdentity {
  const definition = TEMPLATES.find((template) => (template.id as string) === id);
  const letter = freshLetterSpec(id);

  if (!definition || !letter) {
    throw new Error(`Fresh dossier identity is incomplete for ${id}`);
  }

  const template = id as TemplateId;
  return {
    id,
    name: definition.name,
    palette: Object.fromEntries(definition.slots.map((slot) => [slot.key, slot.default])),
    family: familyForTemplate(template),
    fontStack: effectiveDossierFont(template),
    coverRole: "expressive",
    letterRole: "restrained",
    cvRole: "information",
    letterArchetype: letter.archetype,
  };
}

/**
 * Cross-document identity for Fresh templates 21-42.
 *
 * This deliberately does not duplicate renderer geometry. It binds each Fresh
 * template to the existing canonical palette, dossier typography and restrained
 * motivation-letter archetype so cover, letter and CV can be verified as one
 * dossier without forcing identical full-page geometry on all three documents.
 */
export const FRESH_DOSSIER_IDENTITIES = Object.fromEntries(
  FRESH_TEMPLATE_IDS.map((id) => [id, identityFor(id)]),
) as Record<FreshTemplateId, FreshDossierIdentity>;

export function freshDossierIdentity(id: FreshTemplateId): FreshDossierIdentity {
  return FRESH_DOSSIER_IDENTITIES[id];
}
