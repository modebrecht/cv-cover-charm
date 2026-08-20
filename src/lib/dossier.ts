import { DEFAULTS } from "@/default-config";
import { buildBlocks } from "@/components/cover/layouts";
import {
  EMPTY_META,
  TEMPLATES,
  type BlockStyle,
  type CoverData,
  type CustomField,
  type TemplateId,
} from "@/components/cover/types";
import type { CvPerson } from "@/components/cv/types";
import {
  DEFAULT_DOSSIER_PHOTO_STYLE,
  dossierPhotoStyleFromBlockStyle,
  normalizeDossierPhotoStyle,
  type DossierPhotoStyle,
} from "@/lib/dossier-photo";

/**
 * Verbindung zwischen Titelblatt und Lebenslauf.
 *
 * Beide sind eigenständige Seiten mit eigenem Speicher – der Lebenslauf liest
 * den Entwurf des Titelblatts nur, er schreibt ihn nie. So kann ein Fehler im
 * Lebenslauf das fertige Titelblatt nicht beschädigen.
 */

const COVER_KEY = "titelblatt:v3";

type StoredCover = {
  template?: string;
  colors?: Record<string, Record<string, string>>;
  layout?: Record<string, Record<string, Partial<BlockStyle>>>;
  photoStyle?: Partial<DossierPhotoStyle>;
  customs?: unknown;
  data?: Record<string, unknown>;
};

export type CoverDraft = {
  template: TemplateId;
  /** Farben der gewählten Vorlage, inklusive eigener Änderungen. */
  colors: Record<string, string>;
  /** Selbst hinzugefügte Formen und Bilder – ohne die Textfelder. */
  elements: CustomField[];
  person: CvPerson;
  /** Read-only transfer snapshot of the title-page applicant photo treatment. */
  photoStyle: DossierPhotoStyle;
};

export type CoverPhotoDraft = {
  foto: string;
  photoStyle: DossierPhotoStyle;
};

function defaultColors(template: TemplateId): Record<string, string> {
  const t = TEMPLATES.find((x) => x.id === template) ?? TEMPLATES[0];
  return Object.fromEntries(t.slots.map((s) => [s.key, s.default]));
}

/** Vorgabe, wenn es noch kein Titelblatt gibt. */
export function emptyCoverDraft(): CoverDraft {
  const template = DEFAULTS.TEMPLATE;
  return {
    template,
    colors: defaultColors(template),
    elements: [],
    person: {
      vorname: "",
      nachname: "",
      adresse: "",
      plzOrt: "",
      telefon: "",
      email: "",
      geburtsdatum: "",
      nationalitaet: "",
      untertitel: "",
      foto: null,
    },
    photoStyle: DEFAULT_DOSSIER_PHOTO_STYLE,
  };
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

function coverDataFromRaw(d: Record<string, unknown>): CoverData {
  return {
    meta: { ...EMPTY_META },
    kicker: str(d.kicker),
    eyebrow: str(d.eyebrow),
    beruf: str(d.beruf),
    lehrbeginn: str(d.lehrbeginn),
    vorname: str(d.vorname),
    nachname: str(d.nachname),
    adresse: str(d.adresse),
    plzOrt: str(d.plzOrt),
    telefon: str(d.telefon),
    email: str(d.email),
    geburtsdatum: str(d.geburtsdatum),
    lehrbetrieb: str(d.lehrbetrieb),
    ansprechperson: str(d.ansprechperson),
    betriebAdresse: str(d.betriebAdresse),
    ort: str(d.ort),
    datum: str(d.datum),
    labelKontakt: str(d.labelKontakt),
    labelEmpfaenger: str(d.labelEmpfaenger),
    foto: typeof d.foto === "string" && d.foto.startsWith("data:") ? d.foto : null,
  };
}

function coverPhotoStyle(
  p: Pick<StoredCover, "layout" | "photoStyle">,
  template: TemplateId,
  templateDef: (typeof TEMPLATES)[number],
  coverData: CoverData,
): DossierPhotoStyle {
  // Transitional saves may already carry a normalized snapshot.
  if (p.photoStyle) return normalizeDossierPhotoStyle(p.photoStyle);

  const photoOverride = p.layout?.[template]?.foto;

  // M5.3 writes the complete shared photo geometry whenever form/radius is
  // changed. Read that current storage representation directly instead of
  // rebuilding unrelated title-page geometry just to transfer the photo.
  if (
    photoOverride &&
    (typeof photoOverride.ratio === "number" || typeof photoOverride.radius === "number")
  ) {
    return dossierPhotoStyleFromBlockStyle(photoOverride);
  }

  // Older saves can contain crop-only overrides. Merge those with the actual
  // template default through the renderer so the original photo shape survives.
  try {
    const renderedPhoto = buildBlocks(
      template,
      coverData,
      [],
      p.layout?.[template] ?? {},
      templateDef.slots,
    ).find((block) => block.kind === "photo");
    return dossierPhotoStyleFromBlockStyle(renderedPhoto?.style);
  } catch {
    // A damaged/partial legacy layout must not make otherwise valid applicant
    // data unreadable. Preserve whatever photo treatment can still be recovered.
    return photoOverride
      ? dossierPhotoStyleFromBlockStyle(photoOverride)
      : DEFAULT_DOSSIER_PHOTO_STYLE;
  }
}

function readStoredCover(): StoredCover | null {
  try {
    const raw = window.localStorage.getItem(COVER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredCover;
  } catch {
    return null;
  }
}

/**
 * Minimal read-only path used by the CV photo copy action. It intentionally
 * ignores colours, custom elements and all other title-page state.
 */
export function readCoverPhoto(): CoverPhotoDraft | null {
  if (typeof window === "undefined") return null;
  const p = readStoredCover();
  if (!p) return null;

  const d = p.data ?? {};
  const foto = typeof d.foto === "string" && d.foto.startsWith("data:") ? d.foto : null;
  if (!foto) return null;

  const template = typeof p.template === "string" ? p.template : DEFAULTS.TEMPLATE;
  const photoOverride = p.layout?.[template]?.foto;
  const photoStyle = p.photoStyle
    ? normalizeDossierPhotoStyle(p.photoStyle)
    : photoOverride
      ? dossierPhotoStyleFromBlockStyle(photoOverride)
      : DEFAULT_DOSSIER_PHOTO_STYLE;

  return { foto, photoStyle };
}

/**
 * Den gespeicherten Titelblatt-Entwurf lesen. Gibt `null` zurück, wenn keiner
 * da oder er unlesbar ist – dann gibt es schlicht nichts zu übernehmen.
 */
export function readCoverDraft(): CoverDraft | null {
  if (typeof window === "undefined") return null;
  const p = readStoredCover();
  if (!p) return null;

  try {
    const templateDef = TEMPLATES.find((t) => t.id === p.template) ?? TEMPLATES[0];
    const template = templateDef.id;
    const d = p.data ?? {};
    const coverData = coverDataFromRaw(d);

    // Nur Formen und Bilder – Textfelder gehören zum Titelblatt, nicht hierher.
    const elements = Array.isArray(p.customs)
      ? (p.customs as Record<string, unknown>[]).filter((c) => {
          const kind = c.kind ?? (c.shape ? "shape" : "text");
          return kind === "shape" || kind === "image";
        })
      : [];

    return {
      template,
      colors: { ...defaultColors(template), ...(p.colors?.[template] ?? {}) },
      elements: elements as CustomField[],
      person: {
        vorname: coverData.vorname,
        nachname: coverData.nachname,
        adresse: coverData.adresse,
        plzOrt: coverData.plzOrt,
        telefon: coverData.telefon,
        email: coverData.email,
        geburtsdatum: coverData.geburtsdatum,
        nationalitaet: "",
        untertitel: "",
        foto: coverData.foto,
      },
      photoStyle: coverPhotoStyle(p, template, templateDef, coverData),
    };
  } catch {
    return null;
  }
}

/** Gibt es überhaupt Angaben zur Person im Titelblatt? */
export function personFilled(p: CvPerson): boolean {
  return !!(p.vorname || p.nachname || p.adresse || p.plzOrt || p.telefon || p.email);
}