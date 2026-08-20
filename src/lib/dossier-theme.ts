import type { TemplateId } from "@/components/cover/types";

export type DossierTheme = {
  typography: {
    fontStack: string;
    nameWeight: number;
    bodyWeight: number;
  };
  accentTreatment: {
    opacity: number;
  };
  headingStyle: {
    weight: number;
    trackingEm: number;
    uppercase: boolean;
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
    bodyWeight: 400,
  },
  accentTreatment: {
    opacity: 0.9,
  },
  headingStyle: {
    weight: 750,
    trackingEm: 0.1,
    uppercase: true,
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
 * M5.2 deliberately keeps template-specific geometry intact. These tokens are
 * the shared visual DNA consumed by both title page and CV; later milestones
 * can expose families/editing without having to touch either renderer again.
 */
export function dossierThemeFor(template: TemplateId): DossierTheme {
  if (SERIF_TEMPLATES.has(template)) {
    return {
      ...BASE,
      typography: { fontStack: SERIF, nameWeight: 700, bodyWeight: 400 },
      accentTreatment: { opacity: 0.82 },
      headingStyle: { weight: 700, trackingEm: 0.11, uppercase: true },
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
      typography: { fontStack: SANS, nameWeight: 700, bodyWeight: 400 },
      accentTreatment: { opacity: 0.78 },
      headingStyle: { weight: 700, trackingEm: 0.075, uppercase: false },
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
      typography: { fontStack: SANS, nameWeight: 780, bodyWeight: 400 },
      accentTreatment: { opacity: 0.94 },
      headingStyle: { weight: 780, trackingEm: 0.105, uppercase: true },
      lineThicknessMm: 0.58,
      cornerRadiusMm: 1.4,
      spacingDensity: 0.98,
      photoTreatment: { contrast: 1.03, saturation: 1 },
      backgroundIntensity: 0.96,
    };
  }

  return BASE;
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
  root.style.setProperty("--dossier-body-weight", String(theme.typography.bodyWeight));
  root.style.setProperty("--dossier-accent-opacity", String(theme.accentTreatment.opacity));
  root.style.setProperty("--dossier-heading-weight", String(theme.headingStyle.weight));
  root.style.setProperty("--dossier-heading-tracking", `${theme.headingStyle.trackingEm}em`);
  root.style.setProperty(
    "--dossier-heading-transform",
    theme.headingStyle.uppercase ? "uppercase" : "none",
  );
  root.style.setProperty("--dossier-line-thickness", `${theme.lineThicknessMm}mm`);
  root.style.setProperty("--dossier-corner-radius", `${theme.cornerRadiusMm}mm`);
  root.style.setProperty("--dossier-spacing-density", String(density));
  root.style.setProperty("--dossier-section-gap", `${4 * density}mm`);
  root.style.setProperty("--dossier-section-gap-small", `${1.8 * density}mm`);
  root.style.setProperty("--dossier-cover-line-height", String(1.3 * density));
  root.style.setProperty("--dossier-photo-contrast", String(theme.photoTreatment.contrast));
  root.style.setProperty("--dossier-photo-saturation", String(theme.photoTreatment.saturation));
  root.style.setProperty("--dossier-background-intensity", String(theme.backgroundIntensity));
  return theme;
}
