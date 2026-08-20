import type { ShapeKind, TemplateId } from "@/components/cover/types";
import { getDossierFamily, type DossierFamilyId } from "@/lib/dossier-family";
import { dossierNameScale } from "@/lib/dossier-theme";
import type { CvData } from "./types";
import type { CvLayoutId } from "./layout";

export type CvVisualPolicy = {
  /** Tatsächlich verwendete Hintergrunddeckkraft nach Familienkorrektur. */
  backgroundOpacity: number;
  /** Basisfaktor für zusätzlich übernommene Titelblatt-Formen. */
  shapeFactor: number;
  /** Weissabdeckung des Hauptbereichs im Zweispalten-Renderer. */
  modernMainWash: number;
  /** Deckkraft der leichten Sidebar-Tönung. */
  sidebarTint: number;
};

type FamilyPolicy = {
  backgroundFactor: number;
  classicMax: number;
  modernMax: number;
  shapeFactor: number;
  modernMainWash: number;
  sidebarTint: number;
};

/**
 * M5.6: visual intensity belongs to the design family, not to the CV layout or
 * to an individual title-page variation. Layout only decides available space.
 */
const FAMILY_POLICY: Record<DossierFamilyId, FamilyPolicy> = {
  classic: {
    backgroundFactor: 0.92,
    classicMax: 0.06,
    modernMax: 0.032,
    shapeFactor: 0.56,
    modernMainWash: 0.96,
    sidebarTint: 0.075,
  },
  modern: {
    backgroundFactor: 0.58,
    classicMax: 0.045,
    modernMax: 0.022,
    shapeFactor: 0.34,
    modernMainWash: 0.975,
    sidebarTint: 0.055,
  },
  executive: {
    backgroundFactor: 0.76,
    classicMax: 0.052,
    modernMax: 0.026,
    shapeFactor: 0.42,
    modernMainWash: 0.97,
    sidebarTint: 0.06,
  },
  editorial: {
    backgroundFactor: 0.7,
    classicMax: 0.05,
    modernMax: 0.025,
    shapeFactor: 0.4,
    modernMainWash: 0.97,
    sidebarTint: 0.062,
  },
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

/**
 * Der Transparenzregler bleibt die Nutzerabsicht. Die Dossier-Familie bestimmt
 * nur, wie kräftig Motive/Shapes im Lebenslauf auftreten dürfen. `template`
 * dient ausschliesslich als Fallback für ältere Dossiers ohne Familienwahl.
 */
export function cvVisualPolicy(
  template: TemplateId,
  layout: CvLayoutId,
  requestedOpacity: number,
): CvVisualPolicy {
  const family = getDossierFamily(template);
  const policy = FAMILY_POLICY[family];
  const max = layout === "modern" ? policy.modernMax : policy.classicMax;
  const backgroundOpacity = clamp(requestedOpacity * policy.backgroundFactor, 0, max);

  return {
    backgroundOpacity,
    shapeFactor: policy.shapeFactor,
    modernMainWash: policy.modernMainWash,
    sidebarTint: policy.sidebarTint,
  };
}

/** Grosse Dekoformen werden automatisch stärker zurückgenommen. */
export function shapeSizeFactor(widthMm: number, shape?: ShapeKind): number {
  if (shape === "line") return 0.85;
  if (widthMm >= 90) return 0.28;
  if (widthMm >= 65) return 0.4;
  if (widthMm >= 42) return 0.58;
  if (widthMm >= 25) return 0.78;
  return 1;
}

/**
 * Lange Namen nutzen dieselbe Skalierung wie das Titelblatt. Nur die
 * Ausgangsgrösse unterscheidet sich wegen des verfügbaren Layout-Rasters.
 */
export function smartNameSize(name: string, layout: CvLayoutId): number {
  const base = layout === "modern" ? 30 : 27;
  return Math.round(base * dossierNameScale(name) * 2) / 2;
}

export type SidebarPlan = {
  compact: boolean;
  veryCompact: boolean;
  /** Bei sehr viel Inhalt kommen Stärken/Hobbys in die Hauptspalte statt abgeschnitten zu werden. */
  moveOptionalToMain: boolean;
};

/**
 * Grobe Inhaltsdichte statt DOM-Messung: stabil im Preview und PDF und billig
 * genug für jeden Tastendruck. Lange Texte zählen stärker als kurze Einträge.
 */
export function sidebarPlan(data: CvData): SidebarPlan {
  const languageScore = data.sprachen.reduce(
    (sum, s) => sum + 1.5 + (s.name.length + s.niveau.length) / 38,
    0,
  );
  const strengthScore = data.staerken.reduce((sum, v) => sum + 1 + v.length / 34, 0);
  const hobbyScore = data.hobbys.reduce((sum, v) => sum + 0.9 + v.length / 38, 0);
  const contactScore =
    [data.person.adresse, data.person.plzOrt, data.person.telefon, data.person.email]
      .filter(Boolean)
      .join("").length / 32 +
    (data.person.geburtsdatum ? 0.8 : 0) +
    (data.person.nationalitaet ? 0.6 : 0) +
    (data.person.foto ? 3.2 : 0);

  const score = languageScore + strengthScore + hobbyScore + contactScore;
  return {
    compact: score > 16,
    veryCompact: score > 22,
    moveOptionalToMain: score > 27,
  };
}

/** CSS-Alpha als zweistellige Hex-Komponente. */
export function alphaHex(alpha: number): string {
  return Math.round(clamp(alpha, 0, 1) * 255)
    .toString(16)
    .padStart(2, "0");
}
