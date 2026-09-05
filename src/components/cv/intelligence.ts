import type { ShapeKind, TemplateId } from "@/components/cover/types";
import { setCurrentCvChromeContact } from "@/lib/dossier-chrome";
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
  shapeFactor: number;
  modernMainWash: number;
  sidebarTint: number;
};

/**
 * M5.6: visual intensity belongs to the design family, not to the CV layout or
 * to an individual title-page variation. Layout only decides available space.
 */
const FAMILY_POLICY: Record<DossierFamilyId, FamilyPolicy> = {
  classic: { shapeFactor: 0.56, modernMainWash: 0.96, sidebarTint: 0.075 },
  modern: { shapeFactor: 0.34, modernMainWash: 0.975, sidebarTint: 0.055 },
  executive: { shapeFactor: 0.42, modernMainWash: 0.97, sidebarTint: 0.06 },
  editorial: { shapeFactor: 0.4, modernMainWash: 0.97, sidebarTint: 0.062 },
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * Der Regler steuert die **Zierde** – Motive, Formen, Verläufe. Die tragenden
 * Flächen einer Bauform (Spalte, Band, Kartengrund) gehören nicht dazu: sie
 * bleiben voll deckend, sonst wäre die Vorlage nicht wiederzuerkennen.
 *
 * Früher wurde der eingestellte Wert erst mit einem Familienfaktor
 * multipliziert und dann noch gekappt. Beides zusammen ergab eine Obergrenze
 * von rund 2–3 % Deckkraft, die schon *unterhalb* der Voreinstellung lag – der
 * Regler hat damit über seinen ganzen Weg nichts mehr verändert und das Blatt
 * blieb weiss. Der eingestellte Wert wird darum jetzt unverändert verwendet.
 */
export function cvVisualPolicy(
  template: TemplateId,
  _layout: CvLayoutId,
  requestedOpacity: number,
): CvVisualPolicy {
  const policy = FAMILY_POLICY[getDossierFamily(template)];

  return {
    backgroundOpacity: clamp(requestedOpacity, 0, 1),
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
  // CvCanvas ruft diese Funktion bei jeder Änderung des CV-Datensatzes auf.
  // Damit kann der gemeinsame Dossier-Header dieselben aktuellen Kontaktdaten
  // rendern, ohne einen zweiten CV-Speicher oder eine Route-spezifische Kopie.
  setCurrentCvChromeContact(data.person ?? {});

  // Ein Stand aus einer älteren Fassung kann einzelne Felder gar nicht haben.
  // Das ist nur eine Schätzung der Dichte – dafür darf die Seite nicht
  // abstürzen, also wird hier fehlender Inhalt als leer gelesen.
  const len = (value: unknown) => (typeof value === "string" ? value.length : 0);
  const list = <T>(value: T[] | undefined): T[] => (Array.isArray(value) ? value : []);

  const languageScore = list(data.sprachen).reduce(
    (sum, s) => sum + 1.5 + (len(s?.name) + len(s?.niveau)) / 38,
    0,
  );
  const strengthScore = list(data.staerken).reduce((sum, v) => sum + 1 + len(v) / 34, 0);
  const hobbyScore = list(data.hobbys).reduce((sum, v) => sum + 0.9 + len(v) / 38, 0);
  const contactScore =
    [data.person.adresse, data.person.plzOrt, data.person.telefon, data.person.email]
      .filter(Boolean)
      .join("").length /
      32 +
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
