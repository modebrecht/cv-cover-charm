import type { TemplateId } from "@/components/cover/types";

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
const SERIF = "Georgia, 'Times New Roman', Times, serif";

const BASE: DossierTheme = {
  typography: {
    fontStack: SANS,
    nameWeight: 750,
    nameTrackingEm: -0.025,
    nameLineHeight: 1.02,
    subtitleWeight: 600,
    subtitleTrackingEm: 0.005,
    subtitleLineHeight: 1.25,
    bodyWeight: 400,
    bodyLineHeight: 1.35,
    mutedOpacity: 0.72,
  },
  accentTreatment: {
    opacity: 0.9,
  },
  headingStyle: {
    weight: 750,
    trackingEm: 0.1,
    uppercase: true,
    lineHeight: 1.1,
  },
  lineThicknessMm: 0.5,
  cornerRadiusMm: 1.5,
  spacingDensity: 1,
  photoTreatment: {
    contrast: 1,
    saturation: 1,
  },
  backgroundIntensity: 1,
};

const SERIF_TEMPLATES = new Set<TemplateId>(["klassisch", "edel", "edelBlockig"]);
const SOFT_TEMPLATES = new Set<TemplateId>([
  "freundlich",
  "human",
  "sonnig",
  "welle",
  "terracotta",
  "pastell",
  "sonne",
]);
const STRONG_TEMPLATES = new Set<TemplateId>([
  "modern",
  "colorful",
  "blockig",
  "studio",
  "neon",
  "aurora",
  "verlauf",
  "citrus",
]);

/**
 * One visual contract for the complete application dossier.
 *
 * Template geometry remains independent. These tokens define the shared
 * typographic hierarchy and visual rhythm that both title page and CV consume.
 */
export function dossierThemeFor(template: TemplateId): DossierTheme {
  if (SERIF_TEMPLATES.has(template)) {
    return {
      ...BASE,
      typography: {
        fontStack: SERIF,
        nameWeight: 700,
        nameTrackingEm: -0.03,
        nameLineHeight: 1,
        subtitleWeight: 600,
        subtitleTrackingEm: 0,
        subtitleLineHeight: 1.24,
        bodyWeight: 400,
        bodyLineHeight: 1.38,
        mutedOpacity: 0.7,
      },
      accentTreatment: { opacity: 0.82 },
      headingStyle: { weight: 700, trackingEm: 0.11, uppercase: true, lineHeight: 1.08 },
      lineThicknessMm: 0.38,
      cornerRadiusMm: 0.8,
      spacingDensity: 1.04,
      photoTreatment: { contrast: 1.02, saturation: 0.92 },
      backgroundIntensity: 0.94,
    };
  }

  if (SOFT_TEMPLATES.has(template)) {
    return {
      ...BASE,
      typography: {
        fontStack: SANS,
        nameWeight: 700,
        nameTrackingEm: -0.018,
        nameLineHeight: 1.04,
        subtitleWeight: 600,
        subtitleTrackingEm: 0.01,
        subtitleLineHeight: 1.28,
        bodyWeight: 400,
        bodyLineHeight: 1.4,
        mutedOpacity: 0.74,
      },
      accentTreatment: { opacity: 0.78 },
      headingStyle: { weight: 700, trackingEm: 0.075, uppercase: false, lineHeight: 1.15 },
      lineThicknessMm: 0.46,
      cornerRadiusMm: 2.4,
      spacingDensity: 1.06,
      photoTreatment: { contrast: 0.98, saturation: 0.96 },
      backgroundIntensity: 0.9,
    };
  }

  if (STRONG_TEMPLATES.has(template)) {
    return {
      ...BASE,
      typography: {
        fontStack: SANS,
        nameWeight: 780,
        nameTrackingEm: -0.03,
        nameLineHeight: 0.99,
        subtitleWeight: 620,
        subtitleTrackingEm: 0.015,
        subtitleLineHeight: 1.22,
        bodyWeight: 400,
        bodyLineHeight: 1.34,
        mutedOpacity: 0.68,
      },
      accentTreatment: { opacity: 0.94 },
      headingStyle: { weight: 780, trackingEm: 0.105, uppercase: true, lineHeight: 1.08 },
      lineThicknessMm: 0.58,
      cornerRadiusMm: 1.4,
      spacingDensity: 0.98,
      photoTreatment: { contrast: 1.03, saturation: 1 },
      backgroundIntensity: 0.96,
    };
  }

  return BASE;
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

/** Apply the shared contract as CSS custom properties used by both documents. */
export function applyDossierTheme(template: TemplateId): DossierTheme {
  const theme = dossierThemeFor(template);
  if (typeof document === "undefined") return theme;

  const root = document.documentElement;
  const density = theme.spacingDensity;
  root.dataset.dossierTemplate = template;
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
