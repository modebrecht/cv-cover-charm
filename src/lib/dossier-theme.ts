import type { TemplateId } from "@/components/cover/types";
import {
  familyForTemplate,
  getDossierFamily,
  type DossierFamilyId,
} from "@/lib/dossier-family";

export type DossierTheme = {
  typography: {
    fontStack: string;
    nameWeight: number;
    nameTrackingEm: number;
    nameLineHeight: number;
    subtitleWeight: number;
    subtitleTrackingEm: number;
    subtitleLineHeight: number;
    bodyWeight: number;
    bodyLineHeight: number;
    mutedOpacity: number;
  };
  accentTreatment: {
    opacity: number;
  };
  headingStyle: {
    weight: number;
    trackingEm: number;
    uppercase: boolean;
    lineHeight: number;
  };
  lineThicknessMm: number;
  cornerRadiusMm: number;
  spacingDensity: number;
  photoTreatment: {
    contrast: number;
    saturation: number;
  };
  backgroundIntensity: number;
};

const SANS = "'Helvetica Neue', Helvetica, Arial, ui-sans-serif, system-ui, sans-serif";
const EXECUTIVE_SERIF = "'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif";
const EDITORIAL_SERIF = "Georgia, 'Times New Roman', Times, serif";

const CLASSIC: DossierTheme = {
  typography: {
    fontStack: SANS,
    nameWeight: 700,
    nameTrackingEm: -0.015,
    nameLineHeight: 1.03,
    subtitleWeight: 600,
    subtitleTrackingEm: 0.005,
    subtitleLineHeight: 1.26,
    bodyWeight: 400,
    bodyLineHeight: 1.38,
    mutedOpacity: 0.72,
  },
  accentTreatment: { opacity: 0.76 },
  headingStyle: { weight: 700, trackingEm: 0.085, uppercase: true, lineHeight: 1.12 },
  lineThicknessMm: 0.34,
  cornerRadiusMm: 0.7,
  spacingDensity: 1.02,
  photoTreatment: { contrast: 1.01, saturation: 0.94 },
  backgroundIntensity: 0.9,
};

const MODERN: DossierTheme = {
  typography: {
    fontStack: SANS,
    nameWeight: 800,
    nameTrackingEm: -0.035,
    nameLineHeight: 0.99,
    subtitleWeight: 650,
    subtitleTrackingEm: 0.015,
    subtitleLineHeight: 1.22,
    bodyWeight: 400,
    bodyLineHeight: 1.33,
    mutedOpacity: 0.68,
  },
  accentTreatment: { opacity: 0.96 },
  headingStyle: { weight: 800, trackingEm: 0.11, uppercase: true, lineHeight: 1.07 },
  lineThicknessMm: 0.62,
  cornerRadiusMm: 1.25,
  spacingDensity: 0.97,
  photoTreatment: { contrast: 1.03, saturation: 1 },
  backgroundIntensity: 0.96,
};

const EXECUTIVE: DossierTheme = {
  typography: {
    fontStack: EXECUTIVE_SERIF,
    nameWeight: 700,
    nameTrackingEm: -0.025,
    nameLineHeight: 1,
    subtitleWeight: 600,
    subtitleTrackingEm: 0.01,
    subtitleLineHeight: 1.25,
    bodyWeight: 400,
    bodyLineHeight: 1.41,
    mutedOpacity: 0.66,
  },
  accentTreatment: { opacity: 0.72 },
  headingStyle: { weight: 700, trackingEm: 0.055, uppercase: false, lineHeight: 1.13 },
  lineThicknessMm: 0.3,
  cornerRadiusMm: 0.65,
  spacingDensity: 1.08,
  photoTreatment: { contrast: 1.02, saturation: 0.88 },
  backgroundIntensity: 0.86,
};

const EDITORIAL: DossierTheme = {
  typography: {
    fontStack: EDITORIAL_SERIF,
    nameWeight: 700,
    nameTrackingEm: -0.04,
    nameLineHeight: 0.98,
    subtitleWeight: 600,
    subtitleTrackingEm: 0,
    subtitleLineHeight: 1.24,
    bodyWeight: 400,
    bodyLineHeight: 1.42,
    mutedOpacity: 0.7,
  },
  accentTreatment: { opacity: 0.8 },
  headingStyle: { weight: 700, trackingEm: -0.005, uppercase: false, lineHeight: 1.08 },
  lineThicknessMm: 0.28,
  cornerRadiusMm: 0.45,
  spacingDensity: 1.1,
  photoTreatment: { contrast: 1.02, saturation: 0.9 },
  backgroundIntensity: 0.88,
};

const THEMES: Record<DossierFamilyId, DossierTheme> = {
  classic: CLASSIC,
  modern: MODERN,
  executive: EXECUTIVE,
  editorial: EDITORIAL,
};

/** One visual contract per premium dossier family. */
export function dossierThemeForFamily(family: DossierFamilyId): DossierTheme {
  return THEMES[family];
}

/** Compatibility helper for code that only knows the title-page template. */
export function dossierThemeFor(template: TemplateId): DossierTheme {
  return dossierThemeForFamily(familyForTemplate(template));
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * Shared long-name rule for title page and CV.
 *
 * It is intentionally based on text length rather than DOM width so preview,
 * measurement and PDF export all make the same decision. The title page may
 * still shrink further with its exact width-fitting logic when necessary.
 */
export function dossierNameScale(name: string): number {
  const normalized = name.trim().replace(/\s+/g, " ");
  const length = normalized.length;
  const longestWord = normalized.split(" ").reduce((max, word) => Math.max(max, word.length), 0);

  let scale =
    length > 38 ? 0.74 : length > 32 ? 0.8 : length > 27 ? 0.86 : length > 22 ? 0.93 : 1;
  if (longestWord > 17) scale *= 0.95;
  return clamp(scale, 0.7, 1);
}

/** Apply the shared family contract as CSS custom properties used by both documents. */
export function applyDossierTheme(
  template: TemplateId,
  familyOverride?: DossierFamilyId,
): DossierTheme {
  const family = familyOverride ?? getDossierFamily(template);
  const theme = dossierThemeForFamily(family);
  if (typeof document === "undefined") return theme;

  const root = document.documentElement;
  const density = theme.spacingDensity;
  root.dataset.dossierTemplate = template;
  root.dataset.dossierFamily = family;
  root.style.setProperty("--dossier-font", theme.typography.fontStack);
  root.style.setProperty("--dossier-name-weight", String(theme.typography.nameWeight));
  root.style.setProperty("--dossier-name-tracking", `${theme.typography.nameTrackingEm}em`);
  root.style.setProperty("--dossier-name-line-height", String(theme.typography.nameLineHeight));
  root.style.setProperty("--dossier-subtitle-weight", String(theme.typography.subtitleWeight));
  root.style.setProperty("--dossier-subtitle-tracking", `${theme.typography.subtitleTrackingEm}em`);
  root.style.setProperty("--dossier-subtitle-line-height", String(theme.typography.subtitleLineHeight));
  root.style.setProperty("--dossier-body-weight", String(theme.typography.bodyWeight));
  root.style.setProperty("--dossier-body-line-height", String(theme.typography.bodyLineHeight));
  root.style.setProperty("--dossier-muted-opacity", String(theme.typography.mutedOpacity));
  root.style.setProperty("--dossier-accent-opacity", String(theme.accentTreatment.opacity));
  root.style.setProperty("--dossier-heading-weight", String(theme.headingStyle.weight));
  root.style.setProperty("--dossier-heading-tracking", `${theme.headingStyle.trackingEm}em`);
  root.style.setProperty("--dossier-heading-line-height", String(theme.headingStyle.lineHeight));
  root.style.setProperty(
    "--dossier-heading-transform",
    theme.headingStyle.uppercase ? "uppercase" : "none",
  );
  root.style.setProperty("--dossier-line-thickness", `${theme.lineThicknessMm}mm`);
  root.style.setProperty("--dossier-corner-radius", `${theme.cornerRadiusMm}mm`);
  root.style.setProperty("--dossier-spacing-density", String(density));
  root.style.setProperty("--dossier-section-gap", `${4 * density}mm`);
  root.style.setProperty("--dossier-section-gap-small", `${1.8 * density}mm`);
  root.style.setProperty("--dossier-entry-gap", `${2.4 * density}mm`);
  root.style.setProperty("--dossier-entry-gap-small", `${1.45 * density}mm`);
  root.style.setProperty("--dossier-header-gap", `${3.4 * density}mm`);
  root.style.setProperty("--dossier-subtitle-gap", `${1.2 * density}mm`);
  root.style.setProperty("--dossier-cover-line-height", String(theme.typography.bodyLineHeight));
  root.style.setProperty("--dossier-photo-contrast", String(theme.photoTreatment.contrast));
  root.style.setProperty("--dossier-photo-saturation", String(theme.photoTreatment.saturation));
  root.style.setProperty("--dossier-background-intensity", String(theme.backgroundIntensity));
  return theme;
}
