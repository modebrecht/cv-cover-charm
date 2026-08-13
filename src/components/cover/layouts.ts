import type {
  Block,
  BlockStyle,
  CoverData,
  CustomField,
  Line,
  TemplateId,
} from "./types";
import { FONT, SHAPE } from "@/default-config";

const base: BlockStyle = {
  x: 20,
  y: 20,
  w: 80,
  size: 11,
  color: "ink",
  align: "left",
  weight: 400,
  italic: false,
  underline: false,
  uppercase: false,
  tracking: 0,
  lineHeight: 1.35,
  opacity: 1,
  font: "sans",
  hidden: false,
  list: "none",
  bg: null,
  padX: 4,
  padY: 1.5,
  bgRadius: 999,
};

const s = (o: Partial<BlockStyle>): BlockStyle => ({ ...base, ...o });

/**
 * Die Vorlagen waren auf Druckgrössen ausgelegt (Labels 7.5pt, Fliesstext 9pt).
 * Weil das Titelblatt fast immer am Bildschirm bzw. als PDF-Anhang gelesen wird,
 * werden kleine Grössen angehoben – Headlines bleiben unverändert.
 * Die Werte stehen in `src/default-config.ts`.
 */
function lift(st: BlockStyle): number {
  const size = st.size;
  if (size >= FONT.HEADLINE_FROM) return size;
  const boost =
    size >= 13 ? FONT.BOOST_MEDIUM : st.tracking >= 0.2 ? FONT.BOOST_TRACKED : FONT.BOOST_SMALL;
  return Math.max(FONT.MIN_SIZE, Math.round((size + boost) * 2) / 2);
}

type Def = { id: string; label: string; kind?: "text" | "photo"; lines: Line[]; style: BlockStyle };

function common(data: CoverData) {
  const kicker = data.kicker.trim();
  const fullName = [data.vorname, data.nachname].filter(Boolean).join(" ");
  const kontakt = [data.adresse, data.plzOrt, data.telefon, data.email].filter(Boolean);
  const empfaenger = [data.lehrbetrieb, data.ansprechperson, data.betriebAdresse].filter(Boolean);
  const ortDatum = [data.ort, data.datum].filter(Boolean).join(", ");
  return { kicker, fullName, kontakt, empfaenger, ortDatum };
}

function defsFor(template: TemplateId, data: CoverData): Def[] {
  const { kicker, fullName, kontakt, empfaenger, ortDatum } = common(data);
  const font: BlockStyle["font"] = template === "klassisch" ? "serif" : "sans";
  const ink = template === "modern" ? "primary" : "ink";

  if (template === "klassisch") {
    return [
      { id: "eyebrow", label: "Kopfzeile", lines: [data.eyebrow || "Bewerbungsdossier"], style: s({ x: 20, y: 20, w: 90, size: 9, color: "accent", uppercase: true, tracking: 0.35, font }) },
      { id: "ortDatum", label: "Ort / Datum", lines: ortDatum ? [ortDatum] : [], style: s({ x: 100, y: 20, w: 90, size: 9, color: ink, align: "right", italic: true, opacity: 0.75, font }) },
      { id: "foto", label: "Foto", kind: "photo", lines: [], style: s({ x: 81, y: 55, w: 48, ratio: 1.25, radius: 0, color: "accent", font }) },
      { id: "kicker", label: "Über-Titel", lines: kicker ? [kicker] : [], style: s({ x: 20, y: 138, w: 170, size: 10, color: "accent", align: "center", uppercase: true, tracking: 0.3, font }) },
      { id: "beruf", label: "Titel (Beruf)", lines: data.beruf ? [data.beruf] : [], style: s({ x: 25, y: 150, w: 160, size: 24, color: ink, align: "center", italic: true, lineHeight: 1.25, font }) },
      { id: "name", label: "Name", lines: fullName ? [fullName] : [], style: s({ x: 20, y: 188, w: 170, size: 18, color: ink, align: "center", tracking: 0.05, font }) },
      { id: "lehrbeginn", label: "Lehrbeginn", lines: data.lehrbeginn ? [`Lehrbeginn · ${data.lehrbeginn}`] : [], style: s({ x: 20, y: 198, w: 170, size: 10, color: ink, align: "center", italic: true, opacity: 0.75, font }) },
      { id: "kontaktTitel", label: "Titel Kontakt", lines: kontakt.length ? ["Kontakt"] : [], style: s({ x: 20, w: 80, size: 8, color: "accent", uppercase: true, tracking: 0.3, font, above: "kontakt", gap: 1.5 }) },
      { id: "kontakt", label: "Kontaktangaben", lines: [...kontakt, ...(data.geburtsdatum ? [`*${data.geburtsdatum}`] : [])], style: s({ x: 20, w: 80, size: 9, color: ink, opacity: 0.85, font, y: 281, anchorBottom: true }) },
      { id: "anTitel", label: "Titel Empfänger", lines: empfaenger.length ? ["An"] : [], style: s({ x: 110, w: 80, size: 8, color: "accent", align: "right", uppercase: true, tracking: 0.3, font, above: "kontakt", gap: 1.5 }) },
      { id: "empfaenger", label: "Empfänger", lines: empfaenger, style: s({ x: 110, w: 80, size: 9, color: ink, align: "right", opacity: 0.85, font, follows: "anTitel", gap: 1.5 }) },
    ];
  }

  if (template === "modern") {
    return [
      { id: "eyebrow", label: "Kopfzeile", lines: [data.eyebrow || "Bewerbung"], style: s({ x: 33, y: 19.5, w: 80, size: 9, color: "primary", uppercase: true, tracking: 0.35, font }) },
      { id: "ortDatum", label: "Ort / Datum", lines: ortDatum ? [ortDatum] : [], style: s({ x: 110, y: 19.5, w: 80, size: 9, color: "primary", align: "right", opacity: 0.6, font }) },
      { id: "foto", label: "Foto", kind: "photo", lines: [], style: s({ x: 129, y: 41, w: 52, ratio: 1, radius: 999, color: "accent", fill: "bg", font }) },
      { id: "kicker", label: "Über-Titel", lines: kicker ? [kicker] : [], style: s({ x: 20, y: 128, w: 150, size: 10, color: "accent", uppercase: true, weight: 600, tracking: 0.25, font }) },
      // Titel, Name und Badge hängen aneinander: ein zweizeiliger Beruf
      // schiebt den Rest nach unten statt ihn zu überdecken.
      { id: "beruf", label: "Titel (Beruf)", lines: data.beruf ? [data.beruf] : [], style: s({ x: 20, w: 155, size: 36, color: "primary", weight: 700, lineHeight: 1.05, tracking: -0.02, follows: "kicker", gap: 1, font }) },
      { id: "name", label: "Name", lines: fullName ? [fullName] : [], style: s({ x: 20, w: 150, size: 15, color: "primary", weight: 600, tracking: 0.02, follows: "beruf", gap: 8, font }) },
      { id: "lehrbeginn", label: "Lehrbeginn", lines: data.lehrbeginn ? [`Lehrbeginn ${data.lehrbeginn}`] : [], style: s({ x: 20, w: 150, size: 9.5, color: "bg", weight: 600, bg: "accent", padX: 4, padY: 1.6, follows: "name", gap: 3, font }) },
      { id: "kontaktTitel", label: "Titel Kontakt", lines: kontakt.length ? ["Kontakt"] : [], style: s({ x: 20, w: 80, size: 8, color: "accent", uppercase: true, weight: 600, tracking: 0.3, font, above: "kontakt", gap: 1.5 }) },
      { id: "kontakt", label: "Kontaktangaben", lines: [...kontakt, ...(data.geburtsdatum ? [data.geburtsdatum] : [])], style: s({ x: 20, w: 80, size: 9, color: "primary", opacity: 0.85, font, y: 285, anchorBottom: true }) },
      { id: "anTitel", label: "Titel Empfänger", lines: empfaenger.length ? ["Adressiert an"] : [], style: s({ x: 110, w: 80, size: 8, color: "accent", align: "right", uppercase: true, weight: 600, tracking: 0.3, font, above: "kontakt", gap: 1.5 }) },
      { id: "empfaenger", label: "Empfänger", lines: empfaenger, style: s({ x: 110, w: 80, size: 9, color: "primary", align: "right", opacity: 0.85, font, follows: "anTitel", gap: 1.5 }) },
    ];
  }

  if (template === "edel") {
    const f: BlockStyle["font"] = "serif";
    return [
      { id: "eyebrow", label: "Kopfzeile", lines: [data.eyebrow || "Bewerbungsdossier"], style: s({ x: 25, y: 22, w: 90, size: 8.5, color: "accent", uppercase: true, tracking: 0.45, font: f }) },
      { id: "ortDatum", label: "Ort / Datum", lines: ortDatum ? [ortDatum] : [], style: s({ x: 95, y: 22, w: 90, size: 8.5, color: "ink", align: "right", opacity: 0.6, tracking: 0.1, font: f }) },
      { id: "foto", label: "Foto", kind: "photo", lines: [], style: s({ x: 84, y: 52, w: 42, ratio: 1, radius: 999, color: "accent", font: f }) },
      { id: "kicker", label: "Über-Titel", lines: kicker ? [kicker] : [], style: s({ x: 20, y: 122, w: 170, size: 9, color: "accent", align: "center", uppercase: true, tracking: 0.4, font: f }) },
      { id: "beruf", label: "Titel (Beruf)", lines: data.beruf ? [data.beruf] : [], style: s({ x: 20, y: 132, w: 170, size: 30, color: "ink", align: "center", lineHeight: 1.15, tracking: 0.02, font: f }) },
      { id: "name", label: "Name", lines: fullName ? [fullName] : [], style: s({ x: 20, y: 172, w: 170, size: 12, color: "ink", align: "center", uppercase: true, tracking: 0.35, opacity: 0.8, font: f }) },
      { id: "lehrbeginn", label: "Lehrbeginn", lines: data.lehrbeginn ? [`Lehrbeginn · ${data.lehrbeginn}`] : [], style: s({ x: 20, y: 182, w: 170, size: 9.5, color: "accent", align: "center", italic: true, font: f }) },
      { id: "kontaktTitel", label: "Titel Kontakt", lines: kontakt.length ? ["Kontakt"] : [], style: s({ x: 25, w: 80, size: 7.5, color: "accent", uppercase: true, tracking: 0.35, font: f, above: "kontakt", gap: 1.5 }) },
      { id: "kontakt", label: "Kontaktangaben", lines: [...kontakt, ...(data.geburtsdatum ? [`*${data.geburtsdatum}`] : [])], style: s({ x: 25, w: 80, size: 9, color: "ink", opacity: 0.8, font: f, y: 276, anchorBottom: true }) },
      { id: "anTitel", label: "Titel Empfänger", lines: empfaenger.length ? ["An"] : [], style: s({ x: 105, w: 80, size: 7.5, color: "accent", align: "right", uppercase: true, tracking: 0.35, font: f, above: "kontakt", gap: 1.5 }) },
      { id: "empfaenger", label: "Empfänger", lines: empfaenger, style: s({ x: 105, w: 80, size: 9, color: "ink", align: "right", opacity: 0.8, font: f, follows: "anTitel", gap: 1.5 }) },
    ];
  }

  if (template === "colorful") {
    const f: BlockStyle["font"] = "sans";
    return [
      { id: "eyebrow", label: "Kopfzeile", lines: [data.eyebrow || "Bewerbung"], style: s({ x: 18, y: 16, w: 90, size: 10, color: "bg", uppercase: true, weight: 700, tracking: 0.2, font: f }) },
      { id: "ortDatum", label: "Ort / Datum", lines: ortDatum ? [ortDatum] : [], style: s({ x: 102, y: 16, w: 90, size: 10, color: "bg", align: "right", weight: 600, font: f }) },
      { id: "foto", label: "Foto", kind: "photo", lines: [], style: s({ x: 128, y: 48, w: 52, ratio: 1, radius: 999, color: "tertiary", font: f }) },
      { id: "kicker", label: "Über-Titel", lines: kicker ? [kicker] : [], style: s({ x: 18, y: 118, w: 120, size: 10, color: "secondary", uppercase: true, weight: 700, tracking: 0.15, font: f }) },
      { id: "beruf", label: "Titel (Beruf)", lines: data.beruf ? [data.beruf] : [], style: s({ x: 18, y: 126, w: 150, size: 34, color: "ink", weight: 800, lineHeight: 1.05, tracking: -0.02, font: f }) },
      { id: "name", label: "Name", lines: fullName ? [fullName] : [], style: s({ x: 18, y: 172, w: 150, size: 16, color: "primary", weight: 700, font: f }) },
      { id: "lehrbeginn", label: "Lehrbeginn", lines: data.lehrbeginn ? [`Lehrbeginn ${data.lehrbeginn}`] : [], style: s({ x: 18, y: 182, w: 150, size: 10, color: "ink", weight: 600, opacity: 0.75, font: f }) },
      { id: "kontaktTitel", label: "Titel Kontakt", lines: kontakt.length ? ["Kontakt"] : [], style: s({ x: 18, w: 80, size: 8, color: "primary", uppercase: true, weight: 700, tracking: 0.2, font: f, above: "kontakt", gap: 1.5 }) },
      { id: "kontakt", label: "Kontaktangaben", lines: [...kontakt, ...(data.geburtsdatum ? [data.geburtsdatum] : [])], style: s({ x: 18, w: 80, size: 9, color: "ink", opacity: 0.85, font: f, y: 283, anchorBottom: true }) },
      { id: "anTitel", label: "Titel Empfänger", lines: empfaenger.length ? ["Adressiert an"] : [], style: s({ x: 112, w: 80, size: 8, color: "secondary", align: "right", uppercase: true, weight: 700, tracking: 0.2, font: f, above: "kontakt", gap: 1.5 }) },
      { id: "empfaenger", label: "Empfänger", lines: empfaenger, style: s({ x: 112, w: 80, size: 9, color: "ink", align: "right", opacity: 0.85, font: f, follows: "anTitel", gap: 1.5 }) },
    ];
  }

  if (template === "blockig") {
    const f: BlockStyle["font"] = "sans";
    return [
      { id: "eyebrow", label: "Kopfzeile", lines: [data.eyebrow || "Bewerbung"], style: s({ x: 18, y: 18, w: 80, size: 9, color: "bg", uppercase: true, weight: 700, tracking: 0.3, font: f }) },
      { id: "ortDatum", label: "Ort / Datum", lines: ortDatum ? [ortDatum] : [], style: s({ x: 110, y: 18, w: 82, size: 9, color: "ink", align: "right", weight: 600, opacity: 0.7, font: f }) },
      { id: "foto", label: "Foto", kind: "photo", lines: [], style: s({ x: 122, y: 46, w: 60, ratio: 1.2, radius: 0, color: "accent", font: f }) },
      { id: "kicker", label: "Über-Titel", lines: kicker ? [kicker] : [], style: s({ x: 18, y: 130, w: 110, size: 9.5, color: "accent", uppercase: true, weight: 700, tracking: 0.2, font: f }) },
      { id: "beruf", label: "Titel (Beruf)", lines: data.beruf ? [data.beruf] : [], style: s({ x: 18, y: 138, w: 140, size: 32, color: "ink", weight: 800, lineHeight: 1.0, tracking: -0.03, uppercase: true, font: f }) },
      { id: "name", label: "Name", lines: fullName ? [fullName] : [], style: s({ x: 18, y: 186, w: 140, size: 14, color: "primary", weight: 700, uppercase: true, tracking: 0.1, font: f }) },
      { id: "lehrbeginn", label: "Lehrbeginn", lines: data.lehrbeginn ? [`Lehrbeginn ${data.lehrbeginn}`] : [], style: s({ x: 18, y: 195, w: 140, size: 9.5, color: "ink", weight: 600, opacity: 0.7, font: f }) },
      { id: "kontaktTitel", label: "Titel Kontakt", lines: kontakt.length ? ["Kontakt"] : [], style: s({ x: 18, w: 80, size: 8, color: "accent", uppercase: true, weight: 700, tracking: 0.25, font: f, above: "kontakt", gap: 1.5 }) },
      { id: "kontakt", label: "Kontaktangaben", lines: [...kontakt, ...(data.geburtsdatum ? [data.geburtsdatum] : [])], style: s({ x: 18, w: 80, size: 9, color: "ink", opacity: 0.85, font: f, y: 285, anchorBottom: true }) },
      { id: "anTitel", label: "Titel Empfänger", lines: empfaenger.length ? ["Adressiert an"] : [], style: s({ x: 112, w: 80, size: 8, color: "accent", align: "right", uppercase: true, weight: 700, tracking: 0.25, font: f, above: "kontakt", gap: 1.5 }) },
      { id: "empfaenger", label: "Empfänger", lines: empfaenger, style: s({ x: 112, w: 80, size: 9, color: "ink", align: "right", opacity: 0.85, font: f, follows: "anTitel", gap: 1.5 }) },
    ];
  }

  if (template === "edelBlockig") {
    const f: BlockStyle["font"] = "serif";
    return [
      { id: "eyebrow", label: "Kopfzeile", lines: [data.eyebrow || "Bewerbungsdossier"], style: s({ x: 22, y: 20, w: 90, size: 8.5, color: "accent", uppercase: true, tracking: 0.4, font: f }) },
      { id: "ortDatum", label: "Ort / Datum", lines: ortDatum ? [ortDatum] : [], style: s({ x: 98, y: 20, w: 90, size: 8.5, color: "ink", align: "right", opacity: 0.6, font: f }) },
      { id: "foto", label: "Foto", kind: "photo", lines: [], style: s({ x: 22, y: 48, w: 54, ratio: 1.25, radius: 0, color: "accent", font: f }) },
      { id: "kicker", label: "Über-Titel", lines: kicker ? [kicker] : [], style: s({ x: 88, y: 60, w: 100, size: 8.5, color: "accent", uppercase: true, tracking: 0.35, font: f }) },
      { id: "beruf", label: "Titel (Beruf)", lines: data.beruf ? [data.beruf] : [], style: s({ x: 88, y: 68, w: 100, size: 24, color: "ink", lineHeight: 1.15, font: f }) },
      { id: "name", label: "Name", lines: fullName ? [fullName] : [], style: s({ x: 88, y: 104, w: 100, size: 11.5, color: "ink", uppercase: true, tracking: 0.3, opacity: 0.8, font: f }) },
      { id: "lehrbeginn", label: "Lehrbeginn", lines: data.lehrbeginn ? [`Lehrbeginn ${data.lehrbeginn}`] : [], style: s({ x: 88, y: 114, w: 100, size: 9.5, color: "accent", italic: true, font: f }) },
      { id: "kontaktTitel", label: "Titel Kontakt", lines: kontakt.length ? ["Kontakt"] : [], style: s({ x: 22, w: 80, size: 7.5, color: "accent", uppercase: true, tracking: 0.35, font: f, above: "kontakt", gap: 1.5 }) },
      { id: "kontakt", label: "Kontaktangaben", lines: [...kontakt, ...(data.geburtsdatum ? [`*${data.geburtsdatum}`] : [])], style: s({ x: 22, w: 80, size: 9, color: "ink", opacity: 0.8, font: f, y: 285, anchorBottom: true }) },
      { id: "anTitel", label: "Titel Empfänger", lines: empfaenger.length ? ["An"] : [], style: s({ x: 108, w: 80, size: 7.5, color: "accent", align: "right", uppercase: true, tracking: 0.35, font: f, above: "kontakt", gap: 1.5 }) },
      { id: "empfaenger", label: "Empfänger", lines: empfaenger, style: s({ x: 108, w: 80, size: 9, color: "ink", align: "right", opacity: 0.8, font: f, follows: "anTitel", gap: 1.5 }) },
    ];
  }

  if (template === "serioes") {
    const f: BlockStyle["font"] = "sans";
    return [
      { id: "eyebrow", label: "Kopfzeile", lines: [data.eyebrow || "Bewerbungsdossier"], style: s({ x: 25, y: 24, w: 90, size: 8.5, color: "primary", uppercase: true, weight: 600, tracking: 0.25, font: f }) },
      { id: "ortDatum", label: "Ort / Datum", lines: ortDatum ? [ortDatum] : [], style: s({ x: 95, y: 24, w: 90, size: 8.5, color: "ink", align: "right", opacity: 0.7, font: f }) },
      { id: "foto", label: "Foto", kind: "photo", lines: [], style: s({ x: 82, y: 58, w: 46, ratio: 1.2, radius: 0, color: "primary", font: f }) },
      { id: "kicker", label: "Über-Titel", lines: kicker ? [kicker] : [], style: s({ x: 20, y: 130, w: 170, size: 9.5, color: "primary", align: "center", uppercase: true, weight: 600, tracking: 0.2, font: f }) },
      { id: "beruf", label: "Titel (Beruf)", lines: data.beruf ? [data.beruf] : [], style: s({ x: 20, y: 139, w: 170, size: 25, color: "primary", align: "center", weight: 600, lineHeight: 1.15, font: f }) },
      { id: "name", label: "Name", lines: fullName ? [fullName] : [], style: s({ x: 20, y: 172, w: 170, size: 13, color: "ink", align: "center", weight: 500, tracking: 0.05, font: f }) },
      { id: "lehrbeginn", label: "Lehrbeginn", lines: data.lehrbeginn ? [`Lehrbeginn ${data.lehrbeginn}`] : [], style: s({ x: 20, y: 181, w: 170, size: 9.5, color: "ink", align: "center", opacity: 0.7, font: f }) },
      { id: "kontaktTitel", label: "Titel Kontakt", lines: kontakt.length ? ["Kontakt"] : [], style: s({ x: 25, w: 80, size: 8, color: "primary", uppercase: true, weight: 600, tracking: 0.2, font: f, above: "kontakt", gap: 1.5 }) },
      { id: "kontakt", label: "Kontaktangaben", lines: [...kontakt, ...(data.geburtsdatum ? [data.geburtsdatum] : [])], style: s({ x: 25, w: 80, size: 9, color: "ink", opacity: 0.85, font: f, y: 286, anchorBottom: true }) },
      { id: "anTitel", label: "Titel Empfänger", lines: empfaenger.length ? ["Adressiert an"] : [], style: s({ x: 105, w: 80, size: 8, color: "primary", align: "right", uppercase: true, weight: 600, tracking: 0.2, font: f, above: "kontakt", gap: 1.5 }) },
      { id: "empfaenger", label: "Empfänger", lines: empfaenger, style: s({ x: 105, w: 80, size: 9, color: "ink", align: "right", opacity: 0.85, font: f, follows: "anTitel", gap: 1.5 }) },
    ];
  }

  if (template === "human") {
    const f: BlockStyle["font"] = "serif";
    return [
      { id: "eyebrow", label: "Kopfzeile", lines: [data.eyebrow || "Hallo, schön Sie kennenzulernen"], style: s({ x: 20, y: 22, w: 120, size: 10, color: "primary", italic: true, font: f }) },
      { id: "ortDatum", label: "Ort / Datum", lines: ortDatum ? [ortDatum] : [], style: s({ x: 120, y: 22, w: 70, size: 9, color: "ink", align: "right", opacity: 0.65, font: f }) },
      { id: "foto", label: "Foto", kind: "photo", lines: [], style: s({ x: 20, y: 44, w: 50, ratio: 1, radius: 999, color: "primary", font: f }) },
      { id: "kicker", label: "Über-Titel", lines: kicker ? [kicker] : [], style: s({ x: 78, y: 56, w: 110, size: 9.5, color: "primary", uppercase: true, weight: 600, tracking: 0.2, font: f }) },
      { id: "beruf", label: "Titel (Beruf)", lines: data.beruf ? [data.beruf] : [], style: s({ x: 78, y: 64, w: 110, size: 25, color: "ink", lineHeight: 1.15, italic: true, font: f }) },
      { id: "name", label: "Name", lines: fullName ? [fullName] : [], style: s({ x: 20, y: 118, w: 170, size: 17, color: "ink", weight: 600, font: f }) },
      { id: "lehrbeginn", label: "Lehrbeginn", lines: data.lehrbeginn ? [`Ich freue mich auf den Lehrbeginn ${data.lehrbeginn}`] : [], style: s({ x: 20, y: 128, w: 170, size: 10, color: "primary", italic: true, font: f }) },
      { id: "kontaktTitel", label: "Titel Kontakt", lines: kontakt.length ? ["So erreichen Sie mich"] : [], style: s({ x: 20, w: 85, size: 8.5, color: "primary", uppercase: true, weight: 600, tracking: 0.2, font: f, above: "kontakt", gap: 1.5 }) },
      { id: "kontakt", label: "Kontaktangaben", lines: [...kontakt, ...(data.geburtsdatum ? [data.geburtsdatum] : [])], style: s({ x: 20, w: 85, size: 9, color: "ink", opacity: 0.85, font: f, y: 285, anchorBottom: true }) },
      { id: "anTitel", label: "Titel Empfänger", lines: empfaenger.length ? ["Für"] : [], style: s({ x: 110, w: 80, size: 8.5, color: "primary", align: "right", uppercase: true, weight: 600, tracking: 0.2, font: f, above: "kontakt", gap: 1.5 }) },
      { id: "empfaenger", label: "Empfänger", lines: empfaenger, style: s({ x: 110, w: 80, size: 9, color: "ink", align: "right", opacity: 0.85, font: f, follows: "anTitel", gap: 1.5 }) },
    ];
  }

  // Bogen
  if (template === "sonnig") {
    const f: BlockStyle["font"] = "serif";
    return [
      { id: "eyebrow", label: "Kopfzeile", lines: [data.eyebrow || "Bewerbungsdossier"], style: s({ x: 20, y: 12, w: 90, size: 8.5, color: "ink", uppercase: true, tracking: 0.4, opacity: 0.6, font: f }) },
      { id: "ortDatum", label: "Ort / Datum", lines: ortDatum ? [ortDatum] : [], style: s({ x: 100, y: 12, w: 90, size: 8.5, color: "ink", align: "right", opacity: 0.6, font: f }) },
      { id: "foto", label: "Foto", kind: "photo", lines: [], style: s({ x: 82, y: 46, w: 46, ratio: 1, radius: 999, color: "secondary", font: f }) },
      { id: "kicker", label: "Über-Titel", lines: kicker ? [kicker] : [], style: s({ x: 40, y: 108, w: 130, size: 9, color: "bg", align: "center", uppercase: true, tracking: 0.32, opacity: 0.85, font: f }) },
      { id: "beruf", label: "Titel (Beruf)", lines: data.beruf ? [data.beruf] : [], style: s({ x: 38, y: 118, w: 134, size: 25, color: "bg", align: "center", lineHeight: 1.18, font: f }) },
      { id: "name", label: "Name", lines: fullName ? [fullName] : [], style: s({ x: 38, y: 152, w: 134, size: 14, color: "secondary", align: "center", tracking: 0.14, uppercase: true, font: f }) },
      { id: "lehrbeginn", label: "Lehrbeginn", lines: data.lehrbeginn ? [`Lehrbeginn ${data.lehrbeginn}`] : [], style: s({ x: 38, y: 165, w: 134, size: 9.5, color: "bg", align: "center", opacity: 0.8, italic: true, font: f }) },
      { id: "kontaktTitel", label: "Titel Kontakt", lines: kontakt.length ? ["Kontakt"] : [], style: s({ x: 28, w: 70, size: 7.5, color: "primary", uppercase: true, tracking: 0.32, font: f, above: "kontakt", gap: 1.5 }) },
      { id: "kontakt", label: "Kontaktangaben", lines: [...kontakt, ...(data.geburtsdatum ? [`*${data.geburtsdatum}`] : [])], style: s({ x: 28, w: 75, size: 8.5, color: "ink", opacity: 0.85, font: f, y: 285, anchorBottom: true }) },
      { id: "anTitel", label: "Titel Empfänger", lines: empfaenger.length ? ["An"] : [], style: s({ x: 112, w: 70, size: 7.5, color: "primary", align: "right", uppercase: true, tracking: 0.32, font: f, above: "kontakt", gap: 1.5 }) },
      { id: "empfaenger", label: "Empfänger", lines: empfaenger, style: s({ x: 107, w: 75, size: 8.5, color: "ink", align: "right", opacity: 0.85, font: f, follows: "anTitel", gap: 1.5 }) },
    ];
  }

  // Horizont
  if (template === "welle") {
    const f: BlockStyle["font"] = "sans";
    return [
      { id: "eyebrow", label: "Kopfzeile", lines: [data.eyebrow || "Bewerbung"], style: s({ x: 22, y: 28, w: 90, size: 8.5, color: "ink", uppercase: true, tracking: 0.4, opacity: 0.55, font: f }) },
      { id: "ortDatum", label: "Ort / Datum", lines: ortDatum ? [ortDatum] : [], style: s({ x: 98, y: 28, w: 90, size: 8.5, color: "ink", align: "right", opacity: 0.55, font: f }) },
      { id: "kicker", label: "Über-Titel", lines: kicker ? [kicker] : [], style: s({ x: 22, y: 62, w: 108, size: 9, color: "secondary", uppercase: true, weight: 600, tracking: 0.28, font: f }) },
      { id: "beruf", label: "Titel (Beruf)", lines: data.beruf ? [data.beruf] : [], style: s({ x: 22, w: 106, size: 30, color: "ink", weight: 300, lineHeight: 1.12, tracking: -0.01, follows: "kicker", gap: 2, font: f }) },
      { id: "name", label: "Name", lines: fullName ? [fullName] : [], style: s({ x: 22, y: 128, w: 140, size: 13, color: "ink", uppercase: true, weight: 600, tracking: 0.16, font: f }) },
      { id: "lehrbeginn", label: "Lehrbeginn", lines: data.lehrbeginn ? [`Lehrbeginn ${data.lehrbeginn}`] : [], style: s({ x: 22, w: 140, size: 9.5, color: "ink", opacity: 0.6, follows: "name", gap: 2, font: f }) },
      { id: "foto", label: "Foto", kind: "photo", lines: [], style: s({ x: 138, y: 62, w: 48, ratio: 1.25, radius: 0, color: "secondary", font: f }) },
      { id: "kontaktTitel", label: "Titel Kontakt", lines: kontakt.length ? ["Kontakt"] : [], style: s({ x: 22, y: 196, w: 60, size: 7.5, color: "secondary", uppercase: true, weight: 600, tracking: 0.3, font: f }) },
      { id: "kontakt", label: "Kontaktangaben", lines: [...kontakt, ...(data.geburtsdatum ? [data.geburtsdatum] : [])], style: s({ x: 22, y: 202, w: 60, size: 9, color: "bg", lineHeight: 1.5, font: f }) },
      { id: "anTitel", label: "Titel Empfänger", lines: empfaenger.length ? ["Adressiert an"] : [], style: s({ x: 82, y: 196, w: 60, size: 7.5, color: "secondary", uppercase: true, weight: 600, tracking: 0.3, font: f }) },
      { id: "empfaenger", label: "Empfänger", lines: empfaenger, style: s({ x: 82, y: 202, w: 60, size: 9, color: "bg", lineHeight: 1.5, font: f, follows: "anTitel", gap: 1.5 }) },
    ];
  }

  // Kolumne
  if (template === "terracotta") {
    const f: BlockStyle["font"] = "sans";
    return [
      { id: "foto", label: "Foto", kind: "photo", lines: [], style: s({ x: 14, y: 24, w: 34, ratio: 1, radius: 999, color: "secondary", font: f }) },
      { id: "kontaktTitel", label: "Titel Kontakt", lines: kontakt.length ? ["Kontakt"] : [], style: s({ x: 14, y: 72, w: 48, size: 7.5, color: "secondary", uppercase: true, weight: 600, tracking: 0.3, font: f }) },
      { id: "kontakt", label: "Kontaktangaben", lines: [...kontakt, ...(data.geburtsdatum ? [data.geburtsdatum] : [])], style: s({ x: 14, w: 48, size: 8.5, color: "bg", lineHeight: 1.55, follows: "kontaktTitel", gap: 2, font: f }) },
      { id: "anTitel", label: "Titel Empfänger", lines: empfaenger.length ? ["Adressiert an"] : [], style: s({ x: 14, y: 130, w: 48, size: 7.5, color: "secondary", uppercase: true, weight: 600, tracking: 0.3, font: f }) },
      { id: "empfaenger", label: "Empfänger", lines: empfaenger, style: s({ x: 14, w: 48, size: 8.5, color: "bg", lineHeight: 1.55, follows: "anTitel", gap: 2, font: f }) },
      { id: "ortDatum", label: "Ort / Datum", lines: ortDatum ? [ortDatum] : [], style: s({ x: 14, y: 268, w: 48, size: 8, color: "bg", opacity: 0.75, font: f }) },
      { id: "eyebrow", label: "Kopfzeile", lines: [data.eyebrow || "Bewerbungsdossier"], style: s({ x: 82, y: 30, w: 110, size: 8.5, color: "ink", uppercase: true, tracking: 0.4, opacity: 0.55, font: f }) },
      { id: "kicker", label: "Über-Titel", lines: kicker ? [kicker] : [], style: s({ x: 82, y: 118, w: 108, size: 9, color: "primary", uppercase: true, weight: 600, tracking: 0.28, font: f }) },
      { id: "beruf", label: "Titel (Beruf)", lines: data.beruf ? [data.beruf] : [], style: s({ x: 82, w: 106, size: 27, color: "ink", weight: 300, lineHeight: 1.14, follows: "kicker", gap: 2, font: f }) },
      { id: "name", label: "Name", lines: fullName ? [fullName] : [], style: s({ x: 82, y: 200, w: 106, size: 13, color: "ink", uppercase: true, weight: 600, tracking: 0.16, font: f }) },
      { id: "lehrbeginn", label: "Lehrbeginn", lines: data.lehrbeginn ? [`Lehrbeginn ${data.lehrbeginn}`] : [], style: s({ x: 82, w: 106, size: 9.5, color: "ink", opacity: 0.6, follows: "name", gap: 2, font: f }) },
    ];
  }

  // Rahmen
  if (template === "pastell") {
    const f: BlockStyle["font"] = "serif";
    return [
      { id: "eyebrow", label: "Kopfzeile", lines: [data.eyebrow || "Bewerbungsdossier"], style: s({ x: 22, y: 22, w: 90, size: 8.5, color: "ink", uppercase: true, tracking: 0.4, opacity: 0.55, font: f }) },
      { id: "ortDatum", label: "Ort / Datum", lines: ortDatum ? [ortDatum] : [], style: s({ x: 98, y: 22, w: 90, size: 8.5, color: "ink", align: "right", opacity: 0.55, font: f }) },
      { id: "foto", label: "Foto", kind: "photo", lines: [], style: s({ x: 82, y: 44, w: 46, ratio: 1.2, radius: 0, color: "primary", font: f }) },
      { id: "kicker", label: "Über-Titel", lines: kicker ? [kicker] : [], style: s({ x: 30, y: 112, w: 150, size: 9, color: "primary", align: "center", uppercase: true, tracking: 0.32, font: f }) },
      { id: "beruf", label: "Titel (Beruf)", lines: data.beruf ? [data.beruf] : [], style: s({ x: 28, y: 121, w: 154, size: 26, color: "ink", align: "center", lineHeight: 1.18, font: f }) },
      { id: "name", label: "Name", lines: fullName ? [fullName] : [], style: s({ x: 28, y: 158, w: 154, size: 14, color: "ink", align: "center", uppercase: true, tracking: 0.16, font: f }) },
      { id: "lehrbeginn", label: "Lehrbeginn", lines: data.lehrbeginn ? [`Lehrbeginn ${data.lehrbeginn}`] : [], style: s({ x: 28, y: 169, w: 154, size: 9.5, color: "ink", align: "center", italic: true, opacity: 0.65, font: f }) },
      { id: "kontaktTitel", label: "Titel Kontakt", lines: kontakt.length ? ["Kontakt"] : [], style: s({ x: 24, w: 70, size: 7.5, color: "primary", uppercase: true, tracking: 0.32, font: f, above: "kontakt", gap: 1.5 }) },
      { id: "kontakt", label: "Kontaktangaben", lines: [...kontakt, ...(data.geburtsdatum ? [`*${data.geburtsdatum}`] : [])], style: s({ x: 24, w: 75, size: 8.5, color: "ink", opacity: 0.85, font: f, y: 279, anchorBottom: true }) },
      { id: "anTitel", label: "Titel Empfänger", lines: empfaenger.length ? ["An"] : [], style: s({ x: 111, w: 75, size: 7.5, color: "primary", align: "right", uppercase: true, tracking: 0.32, font: f, above: "kontakt", gap: 1.5 }) },
      { id: "empfaenger", label: "Empfänger", lines: empfaenger, style: s({ x: 111, w: 75, size: 8.5, color: "ink", align: "right", opacity: 0.85, font: f, follows: "anTitel", gap: 1.5 }) },
    ];
  }



  if (template === "sonne") {
    const f: BlockStyle["font"] = "sans";
    return [
      { id: "eyebrow", label: "Kopfzeile", lines: [data.eyebrow || "Bewerbung"], style: s({ x: 20, y: 16, w: 80, size: 9, color: "ink", uppercase: true, weight: 700, tracking: 0.3, font: f }) },
      { id: "ortDatum", label: "Ort / Datum", lines: ortDatum ? [ortDatum] : [], style: s({ x: 20, y: 26, w: 80, size: 9, color: "ink", opacity: 0.7, font: f }) },
      { id: "foto", label: "Foto", kind: "photo", lines: [], style: s({ x: 114, y: 16, w: 78, ratio: 1, radius: 999, color: "primary", fill: "bg", weight: 700, font: f }) },
      { id: "name", label: "Name", lines: fullName ? [fullName] : [], style: s({ x: 20, y: 44, w: 84, size: 30, color: "ink", weight: 800, lineHeight: 1.02, tracking: -0.02, font: f }) },
      { id: "kicker", label: "Über-Titel", lines: kicker ? [kicker] : [], style: s({ x: 20, w: 90, size: 9, color: "ink", uppercase: true, weight: 700, tracking: 0.18, opacity: 0.7, follows: "name", gap: 4, font: f }) },
      { id: "beruf", label: "Titel (Beruf)", lines: data.beruf ? [data.beruf] : [], style: s({ x: 20, w: 84, size: 17, color: "ink", weight: 600, lineHeight: 1.15, follows: "kicker", gap: 1, font: f }) },
      { id: "lehrbeginn", label: "Lehrbeginn", lines: data.lehrbeginn ? [`Lehrbeginn ${data.lehrbeginn}`] : [], style: s({ x: 20, y: 134, w: 100, size: 10, color: "ink", weight: 700, bg: "primary", padX: 5, padY: 1.8, font: f }) },
      { id: "kontaktTitel", label: "Titel Kontakt", lines: kontakt.length ? ["Kontakt"] : [], style: s({ x: 20, w: 80, size: 8.5, color: "primary", uppercase: true, weight: 700, tracking: 0.25, above: "kontakt", gap: 1.5, font: f }) },
      { id: "kontakt", label: "Kontaktangaben", lines: [...kontakt, ...(data.geburtsdatum ? [data.geburtsdatum] : [])], style: s({ x: 20, y: 196, w: 80, size: 9, color: "light", opacity: 0.9, anchorBottom: true, font: f }) },
      { id: "anTitel", label: "Titel Empfänger", lines: empfaenger.length ? ["Adressiert an"] : [], style: s({ x: 110, w: 80, size: 8.5, color: "primary", uppercase: true, weight: 700, tracking: 0.25, above: "kontakt", gap: 1.5, font: f }) },
      { id: "empfaenger", label: "Empfänger", lines: empfaenger, style: s({ x: 110, w: 80, size: 9, color: "light", opacity: 0.9, follows: "anTitel", gap: 1.5, font: f }) },
    ];
  }

  if (template === "studio") {
    const f: BlockStyle["font"] = "sans";
    return [
      { id: "foto", label: "Foto", kind: "photo", lines: [], style: s({ x: 12, y: 16, w: 48, ratio: 1.2, radius: 0, color: "primary", fill: "bg", weight: 700, font: f }) },
      { id: "eyebrow", label: "Kopfzeile", lines: [data.eyebrow || "Bewerbungsdossier"], style: s({ x: 84, y: 13, w: 106, size: 8.5, color: "ink", uppercase: true, tracking: 0.35, opacity: 0.6, font: f }) },
      { id: "name", label: "Name", lines: fullName ? [fullName] : [], style: s({ x: 84, y: 31, w: 100, size: 22, color: "ink", weight: 800, uppercase: true, tracking: 0.02, lineHeight: 1.05, font: f }) },
      { id: "beruf", label: "Titel (Beruf)", lines: data.beruf ? [data.beruf] : [], style: s({ x: 84, w: 100, size: 12, color: "ink", tracking: 0.18, opacity: 0.85, follows: "name", gap: 1.5, font: f }) },
      { id: "kicker", label: "Über-Titel", lines: kicker ? [kicker] : [], style: s({ x: 84, y: 90, w: 106, size: 9, color: "primary", uppercase: true, weight: 700, tracking: 0.22, font: f }) },
      { id: "lehrbeginn", label: "Lehrbeginn", lines: data.lehrbeginn ? [`Lehrbeginn ${data.lehrbeginn}`] : [], style: s({ x: 84, w: 100, size: 10, color: "ink", weight: 700, bg: "accent", padX: 5, padY: 1.8, follows: "kicker", gap: 3, font: f }) },
      { id: "ortDatum", label: "Ort / Datum", lines: ortDatum ? [ortDatum] : [], style: s({ x: 84, w: 100, size: 9, color: "ink", opacity: 0.6, follows: "lehrbeginn", gap: 6, font: f }) },
      { id: "kontaktTitel", label: "Titel Kontakt", lines: kontakt.length ? ["Kontakt"] : [], style: s({ x: 12, y: 84, w: 50, size: 8.5, color: "accent", uppercase: true, weight: 700, tracking: 0.22, font: f }) },
      { id: "kontakt", label: "Kontaktangaben", lines: [...kontakt, ...(data.geburtsdatum ? [data.geburtsdatum] : [])], style: s({ x: 12, w: 50, size: 8.5, color: "bg", lineHeight: 1.5, follows: "kontaktTitel", gap: 2, font: f }) },
      { id: "anTitel", label: "Titel Empfänger", lines: empfaenger.length ? ["Adressiert an"] : [], style: s({ x: 84, w: 100, size: 8.5, color: "primary", uppercase: true, weight: 700, tracking: 0.22, above: "empfaenger", gap: 1.5, font: f }) },
      { id: "empfaenger", label: "Empfänger", lines: empfaenger, style: s({ x: 84, y: 276, w: 100, size: 9.5, color: "ink", lineHeight: 1.5, anchorBottom: true, font: f }) },
    ];
  }

  if (template === "neon") {
    const f: BlockStyle["font"] = "sans";
    return [
      { id: "eyebrow", label: "Kopfzeile", lines: [data.eyebrow || "Bewerbung"], style: s({ x: 22, y: 100, w: 90, size: 9, color: "ink", uppercase: true, tracking: 0.4, opacity: 0.65, font: f }) },
      { id: "ortDatum", label: "Ort / Datum", lines: ortDatum ? [ortDatum] : [], style: s({ x: 100, y: 100, w: 88, size: 9, color: "ink", align: "right", opacity: 0.65, font: f }) },
      { id: "name", label: "Name", lines: fullName ? [fullName] : [], style: s({ x: 22, y: 116, w: 166, size: 34, color: "ink", weight: 300, lineHeight: 1.05, tracking: 0.02, font: f }) },
      { id: "kicker", label: "Über-Titel", lines: kicker ? [kicker] : [], style: s({ x: 22, w: 166, size: 9, color: "primary", uppercase: true, weight: 700, tracking: 0.3, follows: "name", gap: 5, font: f }) },
      { id: "beruf", label: "Titel (Beruf)", lines: data.beruf ? [data.beruf] : [], style: s({ x: 22, w: 150, size: 18, color: "ink", weight: 600, lineHeight: 1.15, follows: "kicker", gap: 1, font: f }) },
      { id: "lehrbeginn", label: "Lehrbeginn", lines: data.lehrbeginn ? [`Lehrbeginn ${data.lehrbeginn}`] : [], style: s({ x: 22, w: 150, size: 9.5, color: "ink", weight: 700, bg: "primary", padX: 5, padY: 1.8, follows: "beruf", gap: 5, font: f }) },
      { id: "foto", label: "Foto", kind: "photo", lines: [], style: s({ x: 132, y: 26, w: 50, ratio: 1, radius: 999, color: "ink", fill: "bg", weight: 600, font: f }) },
      { id: "kontaktTitel", label: "Titel Kontakt", lines: kontakt.length ? ["Kontakt"] : [], style: s({ x: 22, w: 78, size: 8.5, color: "primary", uppercase: true, weight: 700, tracking: 0.28, above: "kontakt", gap: 1.5, font: f }) },
      { id: "kontakt", label: "Kontaktangaben", lines: [...kontakt, ...(data.geburtsdatum ? [data.geburtsdatum] : [])], style: s({ x: 22, y: 282, w: 78, size: 9, color: "ink", opacity: 0.85, anchorBottom: true, font: f }) },
      { id: "anTitel", label: "Titel Empfänger", lines: empfaenger.length ? ["Adressiert an"] : [], style: s({ x: 110, w: 78, size: 8.5, color: "primary", align: "right", uppercase: true, weight: 700, tracking: 0.28, above: "kontakt", gap: 1.5, font: f }) },
      { id: "empfaenger", label: "Empfänger", lines: empfaenger, style: s({ x: 110, w: 78, size: 9, color: "ink", align: "right", opacity: 0.85, follows: "anTitel", gap: 1.5, font: f }) },
    ];
  }

  if (template === "konfetti") {
    const f: BlockStyle["font"] = "sans";
    return [
      { id: "eyebrow", label: "Kopfzeile", lines: [data.eyebrow || "Bewerbung"], style: s({ x: 30, y: 20, w: 80, size: 9.5, color: "primary", uppercase: true, weight: 700, tracking: 0.3, font: f }) },
      { id: "ortDatum", label: "Ort / Datum", lines: ortDatum ? [ortDatum] : [], style: s({ x: 100, y: 20, w: 80, size: 9.5, color: "ink", align: "right", opacity: 0.7, font: f }) },
      { id: "foto", label: "Foto", kind: "photo", lines: [], style: s({ x: 76, y: 52, w: 58, ratio: 1, radius: 999, color: "secondary", fill: "bg", weight: 700, font: f }) },
      { id: "name", label: "Name", lines: fullName ? [fullName] : [], style: s({ x: 20, y: 152, w: 170, size: 26, color: "ink", align: "center", weight: 800, lineHeight: 1.05, tracking: -0.01, font: f }) },
      { id: "kicker", label: "Über-Titel", lines: kicker ? [kicker] : [], style: s({ x: 20, w: 170, size: 9.5, color: "tertiary", align: "center", uppercase: true, weight: 700, tracking: 0.2, follows: "name", gap: 4, font: f }) },
      { id: "beruf", label: "Titel (Beruf)", lines: data.beruf ? [data.beruf] : [], style: s({ x: 20, w: 170, size: 18, color: "primary", align: "center", weight: 700, lineHeight: 1.15, follows: "kicker", gap: 1, font: f }) },
      { id: "lehrbeginn", label: "Lehrbeginn", lines: data.lehrbeginn ? [`Lehrbeginn · ${data.lehrbeginn}`] : [], style: s({ x: 20, w: 170, size: 10, color: "bg", align: "center", weight: 700, bg: "secondary", padX: 5, padY: 1.8, follows: "beruf", gap: 5, font: f }) },
      { id: "kontaktTitel", label: "Titel Kontakt", lines: kontakt.length ? ["Kontakt"] : [], style: s({ x: 22, w: 80, size: 8.5, color: "primary", uppercase: true, weight: 700, tracking: 0.25, above: "kontakt", gap: 1.5, font: f }) },
      { id: "kontakt", label: "Kontaktangaben", lines: [...kontakt, ...(data.geburtsdatum ? [data.geburtsdatum] : [])], style: s({ x: 22, y: 282, w: 80, size: 9, color: "ink", opacity: 0.85, anchorBottom: true, font: f }) },
      { id: "anTitel", label: "Titel Empfänger", lines: empfaenger.length ? ["Adressiert an"] : [], style: s({ x: 108, w: 80, size: 8.5, color: "tertiary", align: "right", uppercase: true, weight: 700, tracking: 0.25, above: "kontakt", gap: 1.5, font: f }) },
      { id: "empfaenger", label: "Empfänger", lines: empfaenger, style: s({ x: 108, w: 80, size: 9, color: "ink", align: "right", opacity: 0.85, follows: "anTitel", gap: 1.5, font: f }) },
    ];
  }

  if (template === "verlauf") {
    const f: BlockStyle["font"] = "sans";
    return [
      { id: "eyebrow", label: "Kopfzeile", lines: [data.eyebrow || "Bewerbung"], style: s({ x: 22, y: 20, w: 90, size: 9.5, color: "ink", uppercase: true, weight: 600, tracking: 0.35, opacity: 0.85, font: f }) },
      { id: "ortDatum", label: "Ort / Datum", lines: ortDatum ? [ortDatum] : [], style: s({ x: 98, y: 20, w: 90, size: 9.5, color: "ink", align: "right", opacity: 0.85, font: f }) },
      { id: "foto", label: "Foto", kind: "photo", lines: [], style: s({ x: 78, y: 46, w: 54, ratio: 1, radius: 999, color: "ink", weight: 600, font: f }) },
      { id: "kicker", label: "Über-Titel", lines: kicker ? [kicker] : [], style: s({ x: 20, y: 126, w: 170, size: 9.5, color: "ink", align: "center", uppercase: true, weight: 600, tracking: 0.3, opacity: 0.85, font: f }) },
      { id: "beruf", label: "Titel (Beruf)", lines: data.beruf ? [data.beruf] : [], style: s({ x: 20, w: 170, size: 32, color: "ink", align: "center", weight: 700, lineHeight: 1.05, tracking: -0.02, follows: "kicker", gap: 2, font: f }) },
      { id: "name", label: "Name", lines: fullName ? [fullName] : [], style: s({ x: 20, w: 170, size: 15, color: "ink", align: "center", weight: 500, tracking: 0.1, opacity: 0.9, follows: "beruf", gap: 6, font: f }) },
      { id: "lehrbeginn", label: "Lehrbeginn", lines: data.lehrbeginn ? [`Lehrbeginn ${data.lehrbeginn}`] : [], style: s({ x: 20, w: 170, size: 10, color: "primary", align: "center", weight: 700, bg: "bg", padX: 5, padY: 1.8, follows: "name", gap: 4, font: f }) },
      { id: "kontaktTitel", label: "Titel Kontakt", lines: kontakt.length ? ["Kontakt"] : [], style: s({ x: 22, w: 80, size: 8.5, color: "ink", uppercase: true, weight: 700, tracking: 0.28, opacity: 0.75, above: "kontakt", gap: 1.5, font: f }) },
      { id: "kontakt", label: "Kontaktangaben", lines: [...kontakt, ...(data.geburtsdatum ? [data.geburtsdatum] : [])], style: s({ x: 22, y: 282, w: 80, size: 9, color: "ink", anchorBottom: true, font: f }) },
      { id: "anTitel", label: "Titel Empfänger", lines: empfaenger.length ? ["Adressiert an"] : [], style: s({ x: 108, w: 80, size: 8.5, color: "ink", align: "right", uppercase: true, weight: 700, tracking: 0.28, opacity: 0.75, above: "kontakt", gap: 1.5, font: f }) },
      { id: "empfaenger", label: "Empfänger", lines: empfaenger, style: s({ x: 108, w: 80, size: 9, color: "ink", align: "right", follows: "anTitel", gap: 1.5, font: f }) },
    ];
  }

  if (template === "retro") {
    const f: BlockStyle["font"] = "sans";
    return [
      { id: "eyebrow", label: "Kopfzeile", lines: [data.eyebrow || "Bewerbungsdossier"], style: s({ x: 22, y: 9, w: 90, size: 8.5, color: "ink", uppercase: true, weight: 700, tracking: 0.35, opacity: 0.7, font: f }) },
      { id: "ortDatum", label: "Ort / Datum", lines: ortDatum ? [ortDatum] : [], style: s({ x: 98, y: 9, w: 90, size: 8.5, color: "ink", align: "right", opacity: 0.7, font: f }) },
      { id: "foto", label: "Foto", kind: "photo", lines: [], style: s({ x: 76, y: 36, w: 58, ratio: 1, radius: 999, color: "bg", fill: "primary", weight: 800, font: f }) },
      { id: "kicker", label: "Über-Titel", lines: kicker ? [kicker] : [], style: s({ x: 34, y: 104, w: 142, size: 9, color: "bg", align: "center", uppercase: true, weight: 700, tracking: 0.25, opacity: 0.9, font: f }) },
      { id: "beruf", label: "Titel (Beruf)", lines: data.beruf ? [data.beruf] : [], style: s({ x: 34, w: 142, size: 24, color: "bg", align: "center", weight: 800, lineHeight: 1.1, follows: "kicker", gap: 1, font: f }) },
      { id: "name", label: "Name", lines: fullName ? [fullName] : [], style: s({ x: 20, y: 156, w: 170, size: 22, color: "ink", align: "center", weight: 800, tracking: -0.01, font: f }) },
      { id: "lehrbeginn", label: "Lehrbeginn", lines: data.lehrbeginn ? [`Lehrbeginn · ${data.lehrbeginn}`] : [], style: s({ x: 20, w: 170, size: 10, color: "bg", align: "center", weight: 700, bg: "secondary", padX: 5, padY: 1.8, follows: "name", gap: 4, font: f }) },
      { id: "kontaktTitel", label: "Titel Kontakt", lines: kontakt.length ? ["Kontakt"] : [], style: s({ x: 22, w: 80, size: 8.5, color: "tertiary", uppercase: true, weight: 700, tracking: 0.25, above: "kontakt", gap: 1.5, font: f }) },
      { id: "kontakt", label: "Kontaktangaben", lines: [...kontakt, ...(data.geburtsdatum ? [data.geburtsdatum] : [])], style: s({ x: 22, y: 264, w: 80, size: 9, color: "ink", opacity: 0.85, anchorBottom: true, font: f }) },
      { id: "anTitel", label: "Titel Empfänger", lines: empfaenger.length ? ["Adressiert an"] : [], style: s({ x: 108, w: 80, size: 8.5, color: "tertiary", align: "right", uppercase: true, weight: 700, tracking: 0.25, above: "kontakt", gap: 1.5, font: f }) },
      { id: "empfaenger", label: "Empfänger", lines: empfaenger, style: s({ x: 108, w: 80, size: 9, color: "ink", align: "right", opacity: 0.85, follows: "anTitel", gap: 1.5, font: f }) },
    ];
  }

  // freundlich / "Warm"
  return [
    { id: "eyebrow", label: "Kopfzeile", lines: [data.eyebrow || "Bewerbung"], style: s({ x: 16, y: 14, w: 90, size: 9.5, color: "bg", uppercase: true, weight: 600, tracking: 0.3, font }) },
    { id: "ortDatum", label: "Ort / Datum", lines: ortDatum ? [ortDatum] : [], style: s({ x: 104, y: 14, w: 90, size: 9.5, color: "bg", align: "right", uppercase: true, tracking: 0.3, opacity: 0.9, font }) },
    // Kreis liegt bewusst auf der Kante des Farbbands – deshalb deckende Füllung.
    { id: "foto", label: "Foto", kind: "photo", lines: [], style: s({ x: 75, y: 82, w: 60, ratio: 1, radius: 999, color: "primary", fill: "bg", font }) },
    { id: "name", label: "Name", lines: fullName ? [fullName] : [], style: s({ x: 20, y: 150, w: 170, size: 24, color: "ink", align: "center", weight: 700, font }) },
    {
      id: "beruf",
      label: "Titel (Beruf)",
      lines: data.beruf
        ? [[{ t: `${kicker} ` }, { t: data.beruf, color: "primary", weight: 700 }]]
        : [],
      style: s({ x: 20, w: 170, size: 13, color: "ink", align: "center", lineHeight: 1.3, opacity: 0.9, follows: "name", gap: 2, font }),
    },
    { id: "lehrbeginn", label: "Lehrbeginn", lines: data.lehrbeginn ? [`Lehrbeginn · ${data.lehrbeginn}`] : [], style: s({ x: 20, w: 170, size: 10, color: "ink", align: "center", weight: 700, bg: "secondary", padX: 5, padY: 1.8, follows: "beruf", gap: 4, font }) },
    { id: "kontaktTitel", label: "Titel Kontakt", lines: kontakt.length ? ["Kontakt"] : [], style: s({ x: 20, w: 80, size: 8, color: "primary", uppercase: true, weight: 600, tracking: 0.3, font, above: "kontakt", gap: 1.5 }) },
    { id: "kontakt", label: "Kontaktangaben", lines: [...kontakt, ...(data.geburtsdatum ? [data.geburtsdatum] : [])], style: s({ x: 20, w: 80, size: 9, color: "ink", opacity: 0.85, font, y: 285, anchorBottom: true }) },
    { id: "anTitel", label: "Titel Empfänger", lines: empfaenger.length ? ["Adressiert an"] : [], style: s({ x: 110, w: 80, size: 8, color: "primary", align: "right", uppercase: true, weight: 600, tracking: 0.3, font, above: "kontakt", gap: 1.5 }) },
    { id: "empfaenger", label: "Empfänger", lines: empfaenger, style: s({ x: 110, w: 80, size: 9, color: "ink", align: "right", opacity: 0.85, font, follows: "anTitel", gap: 1.5 }) },
  ];
}

export function customDefaultStyle(
  template: TemplateId,
  index: number,
  field?: CustomField,
): BlockStyle {
  const color = template === "modern" ? "primary" : "ink";
  if (field?.shape) {
    const outlineOnly = field.shape === "line" || field.shape === "path";
    return s({
      // in einem meist freien Bereich ablegen; verschoben wird per Maus
      x: 85,
      y: 205 + index * 6,
      w: field.shape === "line" ? 60 : SHAPE.SIZE,
      ratio: field.shape === "line" ? 0 : 1,
      color: "accent",
      fill: outlineOnly ? null : "accent",
      strokeWidth: SHAPE.STROKE_WIDTH,
      bgRadius: 0,
      opacity: outlineOnly ? 1 : 0.9,
    });
  }
  return s({
    x: 20,
    y: 210 + index * 12,
    w: 90,
    size: 12,
    color,
    font: template === "klassisch" ? "serif" : "sans",
  });
}

export type StyleOverrides = Record<string, Partial<BlockStyle>>;

export function buildBlocks(
  template: TemplateId,
  data: CoverData,
  customs: CustomField[],
  overrides: StyleOverrides,
): Block[] {
  const defs = defsFor(template, data);
  const blocks: Block[] = defs.map((d) => ({
    id: d.id,
    label: d.label,
    kind: d.kind ?? "text",
    lines: d.lines,
    style: {
      ...d.style,
      size: lift(d.style),
      // Lange Berufsbezeichnungen ("Fachmann/-frau Betreuung EFZ Fachrichtung …")
      // dürfen nicht in den Namen darunter laufen.
      maxLines: d.style.maxLines ?? (d.id === "beruf" ? 3 : d.id === "name" ? 2 : undefined),
      ...(overrides[d.id] ?? {}),
    },
  }));

  customs.forEach((c, i) => {
    blocks.push({
      id: c.id,
      label: c.label || (c.shape ? "Form" : "Eigenes Feld"),
      kind: c.shape ? "shape" : "text",
      shape: c.shape,
      path: c.path,
      lines: !c.shape && c.text ? c.text.split("\n") : [],
      style: { ...customDefaultStyle(template, i, c), ...(overrides[c.id] ?? {}) },
    });
  });

  return blocks;
}

export function resolveColor(value: string, colors: Record<string, string>) {
  return colors[value] ?? value;
}
