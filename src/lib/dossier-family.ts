import type { TemplateId } from "@/components/cover/types";

export type DossierFamilyId = "classic" | "modern" | "executive" | "editorial";

export type DossierFamily = {
  id: DossierFamilyId;
  name: string;
  description: string;
  traits: string;
  /** Preferred title-page geometry when the family itself is chosen. */
  coverTemplate: TemplateId;
};

export const DOSSIER_FAMILIES: DossierFamily[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Konservativ, klar und zurückhaltend",
    traits: "clean · restrained",
    coverTemplate: "serioes",
  },
  {
    id: "modern",
    name: "Modern",
    description: "Zeitgemäss, geometrisch und hierarchisch",
    traits: "geometric · strong",
    coverTemplate: "modern",
  },
  {
    id: "executive",
    name: "Executive",
    description: "Elegant, hochwertig und unaufdringlich",
    traits: "premium · understated",
    coverTemplate: "pastell",
  },
  {
    id: "editorial",
    name: "Editorial",
    description: "Typografisch, anspruchsvoll und markant",
    traits: "typographic · distinctive",
    coverTemplate: "klassisch",
  },
];

const TEMPLATE_FAMILY: Record<TemplateId, DossierFamilyId> = {
  klassisch: "editorial",
  modern: "modern",
  freundlich: "editorial",
  edel: "executive",
  colorful: "modern",
  blockig: "modern",
  edelBlockig: "executive",
  serioes: "classic",
  human: "editorial",
  sonnig: "executive",
  welle: "executive",
  terracotta: "executive",
  pastell: "executive",
  sonne: "modern",
  studio: "modern",
  neon: "modern",
  aurora: "modern",
  verlauf: "modern",
  citrus: "modern",
};

export function familyForTemplate(template: TemplateId): DossierFamilyId {
  return TEMPLATE_FAMILY[template] ?? "modern";
}

export function templatesForFamily(family: DossierFamilyId): TemplateId[] {
  return (Object.entries(TEMPLATE_FAMILY) as Array<[TemplateId, DossierFamilyId]>)
    .filter(([, value]) => value === family)
    .map(([template]) => template);
}

function apply(family: DossierFamilyId) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.dossierFamily = family;
}

/**
 * Schriftbild-Familie eines Dossiers – **abgeleitet aus der Vorlage**.
 *
 * Früher war die Familie eine eigene, gespeicherte Wahl. Sie filterte im
 * Vorlagen-Picker die Liste, sodass nur ein Teil der Vorlagen erreichbar war,
 * und ein Wechsel der Familie tauschte die gewählte Vorlage stillschweigend
 * aus. Zwei Regler für dieselbe Sache, die sich gegenseitig überschrieben.
 *
 * Jetzt gibt es eine Quelle: die Vorlage. Ein früher gespeicherter Wert wird
 * absichtlich nicht mehr gelesen, sonst überstimmte er die Vorlage weiterhin.
 */
export function getDossierFamily(template: TemplateId = "modern"): DossierFamilyId {
  const family = familyForTemplate(template);
  apply(family);
  return family;
}
