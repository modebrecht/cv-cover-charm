import type {
  Block,
  BlockStyle,
  CoverData,
  CustomField,
  TemplateId,
} from "./types";

const base: BlockStyle = {
  x: 20,
  y: 20,
  w: 80,
  size: 11,
  color: "ink",
  align: "left",
  weight: 400,
  italic: false,
  uppercase: false,
  tracking: 0,
  lineHeight: 1.35,
  opacity: 1,
  font: "sans",
  hidden: false,
};

const s = (o: Partial<BlockStyle>): BlockStyle => ({ ...base, ...o });

type Def = { id: string; label: string; kind?: "text" | "photo"; lines: string[]; style: BlockStyle };

function common(data: CoverData) {
  const fullName = [data.vorname, data.nachname].filter(Boolean).join(" ");
  const kontakt = [data.adresse, data.plzOrt, data.telefon, data.email].filter(Boolean);
  const empfaenger = [data.lehrbetrieb, data.ansprechperson, data.betriebAdresse].filter(Boolean);
  const ortDatum = [data.ort, data.datum].filter(Boolean).join(", ");
  return { fullName, kontakt, empfaenger, ortDatum };
}

function defsFor(template: TemplateId, data: CoverData): Def[] {
  const { fullName, kontakt, empfaenger, ortDatum } = common(data);
  const font: BlockStyle["font"] = template === "klassisch" ? "serif" : "sans";
  const ink = template === "modern" ? "primary" : "ink";

  if (template === "klassisch") {
    return [
      { id: "eyebrow", label: "Kopfzeile", lines: ["Bewerbungsdossier"], style: s({ x: 20, y: 20, w: 90, size: 9, color: "accent", uppercase: true, tracking: 0.35, font }) },
      { id: "ortDatum", label: "Ort / Datum", lines: ortDatum ? [ortDatum] : [], style: s({ x: 100, y: 20, w: 90, size: 9, color: ink, align: "right", italic: true, opacity: 0.75, font }) },
      { id: "foto", label: "Foto", kind: "photo", lines: [], style: s({ x: 81, y: 55, w: 48, ratio: 1.25, radius: 0, color: "accent", font }) },
      { id: "kicker", label: "Über-Titel", lines: ["Bewerbung um eine Lehrstelle als"], style: s({ x: 20, y: 138, w: 170, size: 10, color: "accent", align: "center", uppercase: true, tracking: 0.3, font }) },
      { id: "beruf", label: "Titel (Beruf)", lines: data.beruf ? [data.beruf] : [], style: s({ x: 25, y: 150, w: 160, size: 24, color: ink, align: "center", italic: true, lineHeight: 1.25, font }) },
      { id: "name", label: "Name", lines: fullName ? [fullName] : [], style: s({ x: 20, y: 188, w: 170, size: 18, color: ink, align: "center", tracking: 0.05, font }) },
      { id: "lehrbeginn", label: "Lehrbeginn", lines: data.lehrbeginn ? [`Lehrbeginn · ${data.lehrbeginn}`] : [], style: s({ x: 20, y: 198, w: 170, size: 10, color: ink, align: "center", italic: true, opacity: 0.75, font }) },
      { id: "kontaktTitel", label: "Titel Kontakt", lines: kontakt.length ? ["Kontakt"] : [], style: s({ x: 20, y: 255, w: 80, size: 8, color: "accent", uppercase: true, tracking: 0.3, font }) },
      { id: "kontakt", label: "Kontaktangaben", lines: [...kontakt, ...(data.geburtsdatum ? [`*${data.geburtsdatum}`] : [])], style: s({ x: 20, y: 260, w: 80, size: 9, color: ink, opacity: 0.85, font }) },
      { id: "anTitel", label: "Titel Empfänger", lines: empfaenger.length ? ["An"] : [], style: s({ x: 110, y: 255, w: 80, size: 8, color: "accent", align: "right", uppercase: true, tracking: 0.3, font }) },
      { id: "empfaenger", label: "Empfänger", lines: empfaenger, style: s({ x: 110, y: 260, w: 80, size: 9, color: ink, align: "right", opacity: 0.85, font }) },
    ];
  }

  if (template === "modern") {
    return [
      { id: "eyebrow", label: "Kopfzeile", lines: ["Bewerbung"], style: s({ x: 33, y: 20, w: 80, size: 9, color: "primary", uppercase: true, tracking: 0.35, font }) },
      { id: "ortDatum", label: "Ort / Datum", lines: ortDatum ? [ortDatum] : [], style: s({ x: 110, y: 20, w: 80, size: 9, color: "primary", align: "right", opacity: 0.6, font }) },
      { id: "foto", label: "Foto", kind: "photo", lines: [], style: s({ x: 84, y: 55, w: 42, ratio: 1, radius: 999, color: "accent", font }) },
      { id: "kicker", label: "Über-Titel", lines: ["Bewerbung um eine Lehrstelle als"], style: s({ x: 20, y: 118, w: 170, size: 10, color: "accent", align: "center", uppercase: true, weight: 600, tracking: 0.25, font }) },
      { id: "beruf", label: "Titel (Beruf)", lines: data.beruf ? [data.beruf] : [], style: s({ x: 15, y: 128, w: 180, size: 36, color: "primary", align: "center", weight: 700, lineHeight: 1.05, tracking: -0.02, font }) },
      { id: "name", label: "Name", lines: fullName ? [fullName] : [], style: s({ x: 20, y: 168, w: 170, size: 13, color: "primary", align: "center", opacity: 0.85, tracking: 0.08, font }) },
      { id: "lehrbeginn", label: "Lehrbeginn", lines: data.lehrbeginn ? [`Lehrbeginn ${data.lehrbeginn}`] : [], style: s({ x: 20, y: 180, w: 170, size: 9.5, color: "accent", align: "center", weight: 600, font }) },
      { id: "kontaktTitel", label: "Titel Kontakt", lines: kontakt.length ? ["Kontakt"] : [], style: s({ x: 20, y: 253, w: 80, size: 8, color: "accent", uppercase: true, weight: 600, tracking: 0.3, font }) },
      { id: "kontakt", label: "Kontaktangaben", lines: [...kontakt, ...(data.geburtsdatum ? [data.geburtsdatum] : [])], style: s({ x: 20, y: 259, w: 80, size: 9, color: "primary", opacity: 0.85, font }) },
      { id: "anTitel", label: "Titel Empfänger", lines: empfaenger.length ? ["Adressiert an"] : [], style: s({ x: 110, y: 253, w: 80, size: 8, color: "accent", align: "right", uppercase: true, weight: 600, tracking: 0.3, font }) },
      { id: "empfaenger", label: "Empfänger", lines: empfaenger, style: s({ x: 110, y: 259, w: 80, size: 9, color: "primary", align: "right", opacity: 0.85, font }) },
    ];
  }

  if (template === "edel") {
    const f: BlockStyle["font"] = "serif";
    return [
      { id: "eyebrow", label: "Kopfzeile", lines: ["Bewerbungsdossier"], style: s({ x: 25, y: 22, w: 90, size: 8.5, color: "accent", uppercase: true, tracking: 0.45, font: f }) },
      { id: "ortDatum", label: "Ort / Datum", lines: ortDatum ? [ortDatum] : [], style: s({ x: 95, y: 22, w: 90, size: 8.5, color: "ink", align: "right", opacity: 0.6, tracking: 0.1, font: f }) },
      { id: "foto", label: "Foto", kind: "photo", lines: [], style: s({ x: 84, y: 52, w: 42, ratio: 1, radius: 999, color: "accent", font: f }) },
      { id: "kicker", label: "Über-Titel", lines: ["Bewerbung um eine Lehrstelle als"], style: s({ x: 20, y: 122, w: 170, size: 9, color: "accent", align: "center", uppercase: true, tracking: 0.4, font: f }) },
      { id: "beruf", label: "Titel (Beruf)", lines: data.beruf ? [data.beruf] : [], style: s({ x: 20, y: 132, w: 170, size: 30, color: "ink", align: "center", lineHeight: 1.15, tracking: 0.02, font: f }) },
      { id: "name", label: "Name", lines: fullName ? [fullName] : [], style: s({ x: 20, y: 172, w: 170, size: 12, color: "ink", align: "center", uppercase: true, tracking: 0.35, opacity: 0.8, font: f }) },
      { id: "lehrbeginn", label: "Lehrbeginn", lines: data.lehrbeginn ? [`Lehrbeginn · ${data.lehrbeginn}`] : [], style: s({ x: 20, y: 182, w: 170, size: 9.5, color: "accent", align: "center", italic: true, font: f }) },
      { id: "kontaktTitel", label: "Titel Kontakt", lines: kontakt.length ? ["Kontakt"] : [], style: s({ x: 25, y: 252, w: 80, size: 7.5, color: "accent", uppercase: true, tracking: 0.35, font: f }) },
      { id: "kontakt", label: "Kontaktangaben", lines: [...kontakt, ...(data.geburtsdatum ? [`*${data.geburtsdatum}`] : [])], style: s({ x: 25, y: 258, w: 80, size: 9, color: "ink", opacity: 0.8, font: f }) },
      { id: "anTitel", label: "Titel Empfänger", lines: empfaenger.length ? ["An"] : [], style: s({ x: 105, y: 252, w: 80, size: 7.5, color: "accent", align: "right", uppercase: true, tracking: 0.35, font: f }) },
      { id: "empfaenger", label: "Empfänger", lines: empfaenger, style: s({ x: 105, y: 258, w: 80, size: 9, color: "ink", align: "right", opacity: 0.8, font: f }) },
    ];
  }

  if (template === "colorful") {
    const f: BlockStyle["font"] = "sans";
    return [
      { id: "eyebrow", label: "Kopfzeile", lines: ["Bewerbung"], style: s({ x: 18, y: 16, w: 90, size: 10, color: "bg", uppercase: true, weight: 700, tracking: 0.2, font: f }) },
      { id: "ortDatum", label: "Ort / Datum", lines: ortDatum ? [ortDatum] : [], style: s({ x: 102, y: 16, w: 90, size: 10, color: "bg", align: "right", weight: 600, font: f }) },
      { id: "foto", label: "Foto", kind: "photo", lines: [], style: s({ x: 128, y: 48, w: 52, ratio: 1, radius: 999, color: "tertiary", font: f }) },
      { id: "kicker", label: "Über-Titel", lines: ["Bewerbung um eine Lehrstelle als"], style: s({ x: 18, y: 118, w: 120, size: 10, color: "secondary", uppercase: true, weight: 700, tracking: 0.15, font: f }) },
      { id: "beruf", label: "Titel (Beruf)", lines: data.beruf ? [data.beruf] : [], style: s({ x: 18, y: 126, w: 150, size: 34, color: "ink", weight: 800, lineHeight: 1.05, tracking: -0.02, font: f }) },
      { id: "name", label: "Name", lines: fullName ? [fullName] : [], style: s({ x: 18, y: 172, w: 150, size: 16, color: "primary", weight: 700, font: f }) },
      { id: "lehrbeginn", label: "Lehrbeginn", lines: data.lehrbeginn ? [`Lehrbeginn ${data.lehrbeginn}`] : [], style: s({ x: 18, y: 182, w: 150, size: 10, color: "ink", weight: 600, opacity: 0.75, font: f }) },
      { id: "kontaktTitel", label: "Titel Kontakt", lines: kontakt.length ? ["Kontakt"] : [], style: s({ x: 18, y: 248, w: 80, size: 8, color: "primary", uppercase: true, weight: 700, tracking: 0.2, font: f }) },
      { id: "kontakt", label: "Kontaktangaben", lines: [...kontakt, ...(data.geburtsdatum ? [data.geburtsdatum] : [])], style: s({ x: 18, y: 254, w: 80, size: 9, color: "ink", opacity: 0.85, font: f }) },
      { id: "anTitel", label: "Titel Empfänger", lines: empfaenger.length ? ["Adressiert an"] : [], style: s({ x: 112, y: 248, w: 80, size: 8, color: "secondary", align: "right", uppercase: true, weight: 700, tracking: 0.2, font: f }) },
      { id: "empfaenger", label: "Empfänger", lines: empfaenger, style: s({ x: 112, y: 254, w: 80, size: 9, color: "ink", align: "right", opacity: 0.85, font: f }) },
    ];
  }

  if (template === "blockig") {
    const f: BlockStyle["font"] = "sans";
    return [
      { id: "eyebrow", label: "Kopfzeile", lines: ["Bewerbung"], style: s({ x: 18, y: 18, w: 80, size: 9, color: "bg", uppercase: true, weight: 700, tracking: 0.3, font: f }) },
      { id: "ortDatum", label: "Ort / Datum", lines: ortDatum ? [ortDatum] : [], style: s({ x: 110, y: 18, w: 82, size: 9, color: "ink", align: "right", weight: 600, opacity: 0.7, font: f }) },
      { id: "foto", label: "Foto", kind: "photo", lines: [], style: s({ x: 122, y: 46, w: 60, ratio: 1.2, radius: 0, color: "accent", font: f }) },
      { id: "kicker", label: "Über-Titel", lines: ["Bewerbung um eine Lehrstelle als"], style: s({ x: 18, y: 130, w: 110, size: 9.5, color: "accent", uppercase: true, weight: 700, tracking: 0.2, font: f }) },
      { id: "beruf", label: "Titel (Beruf)", lines: data.beruf ? [data.beruf] : [], style: s({ x: 18, y: 138, w: 140, size: 32, color: "ink", weight: 800, lineHeight: 1.0, tracking: -0.03, uppercase: true, font: f }) },
      { id: "name", label: "Name", lines: fullName ? [fullName] : [], style: s({ x: 18, y: 186, w: 140, size: 14, color: "primary", weight: 700, uppercase: true, tracking: 0.1, font: f }) },
      { id: "lehrbeginn", label: "Lehrbeginn", lines: data.lehrbeginn ? [`Lehrbeginn ${data.lehrbeginn}`] : [], style: s({ x: 18, y: 195, w: 140, size: 9.5, color: "ink", weight: 600, opacity: 0.7, font: f }) },
      { id: "kontaktTitel", label: "Titel Kontakt", lines: kontakt.length ? ["Kontakt"] : [], style: s({ x: 18, y: 246, w: 80, size: 8, color: "accent", uppercase: true, weight: 700, tracking: 0.25, font: f }) },
      { id: "kontakt", label: "Kontaktangaben", lines: [...kontakt, ...(data.geburtsdatum ? [data.geburtsdatum] : [])], style: s({ x: 18, y: 252, w: 80, size: 9, color: "ink", opacity: 0.85, font: f }) },
      { id: "anTitel", label: "Titel Empfänger", lines: empfaenger.length ? ["Adressiert an"] : [], style: s({ x: 112, y: 246, w: 80, size: 8, color: "accent", align: "right", uppercase: true, weight: 700, tracking: 0.25, font: f }) },
      { id: "empfaenger", label: "Empfänger", lines: empfaenger, style: s({ x: 112, y: 252, w: 80, size: 9, color: "ink", align: "right", opacity: 0.85, font: f }) },
    ];
  }

  if (template === "edelBlockig") {
    const f: BlockStyle["font"] = "serif";
    return [
      { id: "eyebrow", label: "Kopfzeile", lines: ["Bewerbungsdossier"], style: s({ x: 22, y: 20, w: 90, size: 8.5, color: "accent", uppercase: true, tracking: 0.4, font: f }) },
      { id: "ortDatum", label: "Ort / Datum", lines: ortDatum ? [ortDatum] : [], style: s({ x: 98, y: 20, w: 90, size: 8.5, color: "ink", align: "right", opacity: 0.6, font: f }) },
      { id: "foto", label: "Foto", kind: "photo", lines: [], style: s({ x: 22, y: 48, w: 54, ratio: 1.25, radius: 0, color: "accent", font: f }) },
      { id: "kicker", label: "Über-Titel", lines: ["Bewerbung um eine Lehrstelle als"], style: s({ x: 88, y: 60, w: 100, size: 8.5, color: "accent", uppercase: true, tracking: 0.35, font: f }) },
      { id: "beruf", label: "Titel (Beruf)", lines: data.beruf ? [data.beruf] : [], style: s({ x: 88, y: 68, w: 100, size: 24, color: "ink", lineHeight: 1.15, font: f }) },
      { id: "name", label: "Name", lines: fullName ? [fullName] : [], style: s({ x: 88, y: 104, w: 100, size: 11.5, color: "ink", uppercase: true, tracking: 0.3, opacity: 0.8, font: f }) },
      { id: "lehrbeginn", label: "Lehrbeginn", lines: data.lehrbeginn ? [`Lehrbeginn ${data.lehrbeginn}`] : [], style: s({ x: 88, y: 114, w: 100, size: 9.5, color: "accent", italic: true, font: f }) },
      { id: "kontaktTitel", label: "Titel Kontakt", lines: kontakt.length ? ["Kontakt"] : [], style: s({ x: 22, y: 244, w: 80, size: 7.5, color: "accent", uppercase: true, tracking: 0.35, font: f }) },
      { id: "kontakt", label: "Kontaktangaben", lines: [...kontakt, ...(data.geburtsdatum ? [`*${data.geburtsdatum}`] : [])], style: s({ x: 22, y: 250, w: 80, size: 9, color: "ink", opacity: 0.8, font: f }) },
      { id: "anTitel", label: "Titel Empfänger", lines: empfaenger.length ? ["An"] : [], style: s({ x: 108, y: 244, w: 80, size: 7.5, color: "accent", align: "right", uppercase: true, tracking: 0.35, font: f }) },
      { id: "empfaenger", label: "Empfänger", lines: empfaenger, style: s({ x: 108, y: 250, w: 80, size: 9, color: "ink", align: "right", opacity: 0.8, font: f }) },
    ];
  }

  if (template === "serioes") {
    const f: BlockStyle["font"] = "sans";
    return [
      { id: "eyebrow", label: "Kopfzeile", lines: ["Bewerbungsdossier"], style: s({ x: 25, y: 24, w: 90, size: 8.5, color: "primary", uppercase: true, weight: 600, tracking: 0.25, font: f }) },
      { id: "ortDatum", label: "Ort / Datum", lines: ortDatum ? [ortDatum] : [], style: s({ x: 95, y: 24, w: 90, size: 8.5, color: "ink", align: "right", opacity: 0.7, font: f }) },
      { id: "foto", label: "Foto", kind: "photo", lines: [], style: s({ x: 82, y: 58, w: 46, ratio: 1.2, radius: 0, color: "primary", font: f }) },
      { id: "kicker", label: "Über-Titel", lines: ["Bewerbung um eine Lehrstelle als"], style: s({ x: 20, y: 130, w: 170, size: 9.5, color: "primary", align: "center", uppercase: true, weight: 600, tracking: 0.2, font: f }) },
      { id: "beruf", label: "Titel (Beruf)", lines: data.beruf ? [data.beruf] : [], style: s({ x: 20, y: 139, w: 170, size: 25, color: "primary", align: "center", weight: 600, lineHeight: 1.15, font: f }) },
      { id: "name", label: "Name", lines: fullName ? [fullName] : [], style: s({ x: 20, y: 172, w: 170, size: 13, color: "ink", align: "center", weight: 500, tracking: 0.05, font: f }) },
      { id: "lehrbeginn", label: "Lehrbeginn", lines: data.lehrbeginn ? [`Lehrbeginn ${data.lehrbeginn}`] : [], style: s({ x: 20, y: 181, w: 170, size: 9.5, color: "ink", align: "center", opacity: 0.7, font: f }) },
      { id: "kontaktTitel", label: "Titel Kontakt", lines: kontakt.length ? ["Kontakt"] : [], style: s({ x: 25, y: 254, w: 80, size: 8, color: "primary", uppercase: true, weight: 600, tracking: 0.2, font: f }) },
      { id: "kontakt", label: "Kontaktangaben", lines: [...kontakt, ...(data.geburtsdatum ? [data.geburtsdatum] : [])], style: s({ x: 25, y: 260, w: 80, size: 9, color: "ink", opacity: 0.85, font: f }) },
      { id: "anTitel", label: "Titel Empfänger", lines: empfaenger.length ? ["Adressiert an"] : [], style: s({ x: 105, y: 254, w: 80, size: 8, color: "primary", align: "right", uppercase: true, weight: 600, tracking: 0.2, font: f }) },
      { id: "empfaenger", label: "Empfänger", lines: empfaenger, style: s({ x: 105, y: 260, w: 80, size: 9, color: "ink", align: "right", opacity: 0.85, font: f }) },
    ];
  }

  if (template === "human") {
    const f: BlockStyle["font"] = "serif";
    return [
      { id: "eyebrow", label: "Kopfzeile", lines: ["Hallo, schön Sie kennenzulernen"], style: s({ x: 20, y: 22, w: 120, size: 10, color: "primary", italic: true, font: f }) },
      { id: "ortDatum", label: "Ort / Datum", lines: ortDatum ? [ortDatum] : [], style: s({ x: 120, y: 22, w: 70, size: 9, color: "ink", align: "right", opacity: 0.65, font: f }) },
      { id: "foto", label: "Foto", kind: "photo", lines: [], style: s({ x: 20, y: 44, w: 50, ratio: 1, radius: 999, color: "primary", font: f }) },
      { id: "kicker", label: "Über-Titel", lines: ["Bewerbung um eine Lehrstelle als"], style: s({ x: 78, y: 56, w: 110, size: 9.5, color: "primary", uppercase: true, weight: 600, tracking: 0.2, font: f }) },
      { id: "beruf", label: "Titel (Beruf)", lines: data.beruf ? [data.beruf] : [], style: s({ x: 78, y: 64, w: 110, size: 25, color: "ink", lineHeight: 1.15, italic: true, font: f }) },
      { id: "name", label: "Name", lines: fullName ? [fullName] : [], style: s({ x: 20, y: 118, w: 170, size: 17, color: "ink", weight: 600, font: f }) },
      { id: "lehrbeginn", label: "Lehrbeginn", lines: data.lehrbeginn ? [`Ich freue mich auf den Lehrbeginn ${data.lehrbeginn}`] : [], style: s({ x: 20, y: 128, w: 170, size: 10, color: "primary", italic: true, font: f }) },
      { id: "kontaktTitel", label: "Titel Kontakt", lines: kontakt.length ? ["So erreichen Sie mich"] : [], style: s({ x: 20, y: 246, w: 85, size: 8.5, color: "primary", uppercase: true, weight: 600, tracking: 0.2, font: f }) },
      { id: "kontakt", label: "Kontaktangaben", lines: [...kontakt, ...(data.geburtsdatum ? [data.geburtsdatum] : [])], style: s({ x: 20, y: 252, w: 85, size: 9, color: "ink", opacity: 0.85, font: f }) },
      { id: "anTitel", label: "Titel Empfänger", lines: empfaenger.length ? ["Für"] : [], style: s({ x: 110, y: 246, w: 80, size: 8.5, color: "primary", align: "right", uppercase: true, weight: 600, tracking: 0.2, font: f }) },
      { id: "empfaenger", label: "Empfänger", lines: empfaenger, style: s({ x: 110, y: 252, w: 80, size: 9, color: "ink", align: "right", opacity: 0.85, font: f }) },
    ];
  }

  // freundlich
  return [
    { id: "eyebrow", label: "Kopfzeile", lines: ["Bewerbung"], style: s({ x: 16, y: 14, w: 90, size: 9.5, color: "bg", uppercase: true, weight: 500, tracking: 0.3, font }) },
    { id: "ortDatum", label: "Ort / Datum", lines: ortDatum ? [ortDatum] : [], style: s({ x: 104, y: 14, w: 90, size: 9.5, color: "bg", align: "right", uppercase: true, tracking: 0.3, opacity: 0.85, font }) },
    { id: "kicker", label: "Über-Titel", lines: ["Bewerbung um eine Lehrstelle als"], style: s({ x: 16, y: 42, w: 150, size: 10, color: "bg", uppercase: true, weight: 600, tracking: 0.25, opacity: 0.9, font }) },
    { id: "beruf", label: "Titel (Beruf)", lines: data.beruf ? [data.beruf] : [], style: s({ x: 16, y: 50, w: 130, size: 30, color: "bg", weight: 700, lineHeight: 1.1, font }) },
    { id: "foto", label: "Foto", kind: "photo", lines: [], style: s({ x: 82, y: 92, w: 46, ratio: 1, radius: 999, color: "primary", font }) },
    { id: "name", label: "Name", lines: fullName ? [fullName] : [], style: s({ x: 20, y: 148, w: 170, size: 20, color: "ink", align: "center", weight: 600, font }) },
    { id: "lehrbeginn", label: "Lehrbeginn", lines: data.lehrbeginn ? [`Lehrbeginn ${data.lehrbeginn}`] : [], style: s({ x: 20, y: 160, w: 170, size: 10, color: "primary", align: "center", weight: 500, font }) },
    { id: "kontaktTitel", label: "Titel Kontakt", lines: kontakt.length ? ["Kontakt"] : [], style: s({ x: 20, y: 250, w: 80, size: 8, color: "primary", uppercase: true, weight: 600, tracking: 0.3, font }) },
    { id: "kontakt", label: "Kontaktangaben", lines: [...kontakt, ...(data.geburtsdatum ? [data.geburtsdatum] : [])], style: s({ x: 20, y: 256, w: 80, size: 9, color: "ink", opacity: 0.85, font }) },
    { id: "anTitel", label: "Titel Empfänger", lines: empfaenger.length ? ["Adressiert an"] : [], style: s({ x: 110, y: 250, w: 80, size: 8, color: "primary", align: "right", uppercase: true, weight: 600, tracking: 0.3, font }) },
    { id: "empfaenger", label: "Empfänger", lines: empfaenger, style: s({ x: 110, y: 256, w: 80, size: 9, color: "ink", align: "right", opacity: 0.85, font }) },
  ];
}

export function customDefaultStyle(template: TemplateId, index: number): BlockStyle {
  return s({
    x: 20,
    y: 210 + index * 10,
    w: 90,
    size: 11,
    color: template === "modern" ? "primary" : "ink",
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
    style: { ...d.style, ...(overrides[d.id] ?? {}) },
  }));

  customs.forEach((c, i) => {
    blocks.push({
      id: c.id,
      label: c.label || "Eigenes Feld",
      kind: "text",
      lines: c.text ? c.text.split("\n") : [],
      style: { ...customDefaultStyle(template, i), ...(overrides[c.id] ?? {}) },
    });
  });

  return blocks;
}

export function resolveColor(value: string, colors: Record<string, string>) {
  return colors[value] ?? value;
}
