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

const STORAGE_KEY = "dossier:family:v1";
const EVENT = "dossier-family-change";

function valid(value: string | null): value is DossierFamilyId {
  return value === "classic" || value === "modern" || value === "executive" || value === "editorial";
}

export function familyForTemplate(template: TemplateId): DossierFamilyId {
  return TEMPLATE_FAMILY[template] ?? "modern";
}

export function templatesForFamily(family: DossierFamilyId): TemplateId[] {
  return (Object.entries(TEMPLATE_FAMILY) as Array<[TemplateId, DossierFamilyId]>)
    .filter(([, value]) => value === family)
    .map(([template]) => template);
}

function readStored(): DossierFamilyId | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return valid(value) ? value : null;
  } catch {
    return null;
  }
}

function apply(family: DossierFamilyId) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.dossierFamily = family;
}

/**
 * Global design-family preference shared by title page and CV.
 *
 * If an older dossier has no family preference yet, its current title-page
 * template decides the initial family so existing work keeps a sensible look.
 */
export function getDossierFamily(fallbackTemplate: TemplateId = "modern"): DossierFamilyId {
  const family = readStored() ?? familyForTemplate(fallbackTemplate);
  apply(family);
  return family;
}

export function setDossierFamily(family: DossierFamilyId) {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, family);
    } catch {
      // The running page still updates through the event and data attribute.
    }
  }
  apply(family);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<DossierFamilyId>(EVENT, { detail: family }));
  }
}

export function subscribeDossierFamily(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const local = () => onChange();
  const storage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    const family = readStored();
    if (family) apply(family);
    onChange();
  };
  window.addEventListener(EVENT, local);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(EVENT, local);
    window.removeEventListener("storage", storage);
  };
}
