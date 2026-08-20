import { DEFAULTS } from "@/default-config";
import {
  TEMPLATES,
  type BlockStyle,
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

/**
 * Den gespeicherten Titelblatt-Entwurf lesen. Gibt `null` zurück, wenn keiner
 * da oder er unlesbar ist – dann gibt es schlicht nichts zu übernehmen.
 */
export function readCoverDraft(): CoverDraft | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(COVER_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const p = JSON.parse(raw) as {
      template?: string;
      colors?: Record<string, Record<string, string>>;
      layout?: Record<string, Record<string, Partial<BlockStyle>>>;
      photoStyle?: Partial<DossierPhotoStyle>;
      customs?: unknown;
      data?: Record<string, unknown>;
    };
    const template = (TEMPLATES.find((t) => t.id === p.template)?.id ??
      DEFAULTS.TEMPLATE) as TemplateId;
    const d = p.data ?? {};

    // Nur Formen und Bilder – Textfelder gehören zum Titelblatt, nicht hierher.
    const elements = Array.isArray(p.customs)
      ? (p.customs as Record<string, unknown>[]).filter((c) => {
          const kind = c.kind ?? (c.shape ? "shape" : "text");
          return kind === "shape" || kind === "image";
        })
      : [];

    // New saves carry an explicit normalized snapshot. Old saves fall back to
    // the photo block overrides, so M5.3 remains migration-safe.
    const photoStyle = p.photoStyle
      ? normalizeDossierPhotoStyle(p.photoStyle)
      : dossierPhotoStyleFromBlockStyle(p.layout?.[template]?.foto);

    return {
      template,
      colors: { ...defaultColors(template), ...(p.colors?.[template] ?? {}) },
      elements: elements as CustomField[],
      person: {
        vorname: str(d.vorname),
        nachname: str(d.nachname),
        adresse: str(d.adresse),
        plzOrt: str(d.plzOrt),
        telefon: str(d.telefon),
        email: str(d.email),
        geburtsdatum: str(d.geburtsdatum),
        nationalitaet: "",
        untertitel: "",
        foto: typeof d.foto === "string" && d.foto.startsWith("data:") ? d.foto : null,
      },
      photoStyle,
    };
  } catch {
    return null;
  }
}

/** Gibt es überhaupt Angaben zur Person im Titelblatt? */
export function personFilled(p: CvPerson): boolean {
  return !!(p.vorname || p.nachname || p.adresse || p.plzOrt || p.telefon || p.email);
}
