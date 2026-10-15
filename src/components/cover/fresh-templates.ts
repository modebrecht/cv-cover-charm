import { familyForTemplate, type DossierFamilyId } from "@/lib/dossier-family";
import {
  FRESH_TEMPLATE_IDS,
  FRESH_TEMPLATE_REGISTRY,
  isFreshTemplateId,
  type FreshTemplateId,
} from "./fresh-template-registry";
import { TEMPLATES, type TemplateDefinition, type TemplateId } from "./types";
import { ADDITIONAL_TEMPLATE_DEFINITIONS } from "./template-slots";
import { CANONICAL_DOSSIER_PRESENTATION } from "@/lib/dossier-default-presentation";
import "./gradient-templates.css";
import "./studio-warm-variants.css";
import "./warm-4-5.css";
import "./verlauf-2-3.css";
import "./studio-rework.css";
import "./cv-card-refresh.css";
import "./studio-cv-redesign.css";
import "./signature-templates.css";
import "./next-signature-templates.css";
import "./verlauf-pill-fix.css";
import "./templatefix-24-25.css";
import "./templatefix-violet-pulse.css";
import "./templatefix-27-28.css";
import "./templatefix-29-31.css";
import "./templatefix-prism.css";
import "./templatefix-32-36.css";
import "./ribbon-cover-redesign.css";
import "./templatefix-32-36-cv-masthead.css";
import "./templatefix-glow-density.css";
import "./template-diagonal.css";
import "./templatefix-mono-luxe.css";
import "./warm2-redesign.css";
import "./templatefix-studio-pdf-scale.css";
import "./dossier-font-contract.css";
import "./final-pdf-polish.css";

export { FRESH_TEMPLATE_IDS, type FreshTemplateId } from "./fresh-template-registry";

const EDEL_LIGHT_COLORS = {
  bg: "#fcfbf8",
  ink: "#181817",
  accent: "#8d6b2d",
} as const;

const LEGACY_EDEL_DEFAULT = {
  bg: "#12131a",
  ink: "#f2eee6",
  accent: "#c9a24a",
} as const;

/**
 * Edel and Edel Dark are one deliberate light/dark pair. They share the same
 * established geometry, while Edel uses warm-white paper, dark serif type and
 * a readable muted-gold accent. Edel Dark keeps the true charcoal surface.
 */
const edelDefinition = TEMPLATES.find(({ id }) => id === "edel");
if (edelDefinition) {
  edelDefinition.description = "Warmweisses Papier, dunkle Serif, feine Goldlinien";
  edelDefinition.slots = [
    { key: "bg", label: "Papier", default: EDEL_LIGHT_COLORS.bg },
    { key: "ink", label: "Text", default: EDEL_LIGHT_COLORS.ink },
    { key: "accent", label: "Gold", default: EDEL_LIGHT_COLORS.accent },
  ];
}

/**
 * Existing browsers may still carry the untouched historical dark Edel palette
 * in the title-page draft. Migrate only that exact old default. Any deliberate
 * user colour choice stays untouched.
 */
if (typeof window !== "undefined") {
  try {
    const storageKey = "titelblatt:v3";
    const raw = window.localStorage.getItem(storageKey);
    if (raw) {
      const payload = JSON.parse(raw) as {
        colors?: Record<string, Record<string, string> | undefined>;
      };
      const savedEdel = payload.colors?.edel;
      const isLegacyDefault =
        savedEdel?.bg?.toLowerCase() === LEGACY_EDEL_DEFAULT.bg &&
        savedEdel?.ink?.toLowerCase() === LEGACY_EDEL_DEFAULT.ink &&
        savedEdel?.accent?.toLowerCase() === LEGACY_EDEL_DEFAULT.accent;

      if (isLegacyDefault && payload.colors) {
        payload.colors.edel = { ...savedEdel, ...EDEL_LIGHT_COLORS };
        window.localStorage.setItem(storageKey, JSON.stringify(payload));
      }
    }
  } catch {
    // Storage can be unavailable or contain an older malformed draft. The
    // normal route loader already handles those cases safely.
  }
}

/**
 * Runtime registration for the Fresh dossier templates.
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
 * Retired templates must not remain selectable after HMR or old drafts. Keep
 * their ids only at the persisted type boundary; there is no runtime alias or
 * replacement mapping. Frame is intentionally retired outright rather than
 * falling back to Diagonal.
 */
const RETIRED_TEMPLATE_IDS = new Set(["edelBlockig", "sonnig", "frame"]);
for (let index = TEMPLATES.length - 1; index >= 0; index -= 1) {
  if (RETIRED_TEMPLATE_IDS.has(TEMPLATES[index].id as string)) TEMPLATES.splice(index, 1);
}

// Module evaluation happens before the route modules initialise their color
// maps. Guarding by id keeps Vite HMR from registering duplicates.
for (const definition of [...freshDefinitions, ...ADDITIONAL_TEMPLATE_DEFINITIONS]) {
  if (!TEMPLATES.some((template) => template.id === definition.id)) TEMPLATES.push(definition);
}

/**
 * Canonical persisted-template compatibility boundary.
 *
 * Retired and unknown ids resolve to the neutral Brief template. In particular,
 * old `frame` saves must never leave a stale id in one dossier document while
 * the other documents and export adapters already use Brief.
 */
export function normalizeActiveTemplateId(value: unknown): TemplateId {
  if (typeof value !== "string") return CANONICAL_DOSSIER_PRESENTATION.template;
  return (
    TEMPLATES.find((template) => String(template.id) === value)?.id ??
    CANONICAL_DOSSIER_PRESENTATION.template
  );
}

/**
 * CoverBackground only needs to know whether the stable three-field structural
 * scaffold is available. Diagonal uses that scaffold too, but stays outside the
 * historic Fresh registry.
 */
export function isFreshTemplate(template: TemplateId): boolean {
  return isFreshTemplateId(template as string) || (template as string) === "diagonal";
}

/** Compatibility helper; the family itself is owned centrally. */
export function freshFamilyForTemplate(template: TemplateId): DossierFamilyId | null {
  if (!isFreshTemplate(template)) return null;
  return familyForTemplate(template);
}
