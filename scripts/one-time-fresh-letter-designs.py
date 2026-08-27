from pathlib import Path

path = Path("src/components/letter/LetterCanvas.tsx")
text = path.read_text()


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 anchor, found {count}")
    text = text.replace(old, new, 1)


replace_once(
    "const LETTER_LAYOUTS: Record<TemplateId, LetterLayout> = {",
    "const LETTER_LAYOUTS: Record<string, LetterLayout> = {",
    "layout registry",
)

old_tail = '''  citrus: {
    kind: "card",
    left: 28,
    right: 28,
    top: 27,
    bottom: 26,
    cardInsetMm: 12,
  },
};'''
new_tail = '''  citrus: {
    kind: "card",
    left: 28,
    right: 28,
    top: 27,
    bottom: 26,
    cardInsetMm: 12,
  },

  // Fresh dossier designs. The letter variants intentionally use quieter
  // geometry than the cover while keeping a recognisable signature.
  edge: { kind: "quiet", left: 32, right: 23, top: 24, bottom: 22 },
  glow: { kind: "quiet", left: 25, right: 24, top: 27, bottom: 23 },
  frame: {
    kind: "quiet",
    left: 27,
    right: 27,
    top: 26,
    bottom: 24,
    borderInsetMm: 9,
  },
  monoLuxe: {
    kind: "quiet",
    left: 27,
    right: 27,
    top: 27,
    bottom: 24,
    borderInsetMm: 12,
  },
  horizon: { kind: "quiet", left: 25, right: 23, top: 32, bottom: 23 },
  sunrise: { kind: "quiet", left: 25, right: 23, top: 32, bottom: 23 },
  forestFlow: { kind: "quiet", left: 33, right: 23, top: 25, bottom: 23 },
  violetPulse: { kind: "quiet", left: 25, right: 24, top: 29, bottom: 23 },
  studio2: { kind: "quiet", left: 35, right: 23, top: 25, bottom: 23 },
  studio3: { kind: "quiet", left: 34, right: 23, top: 25, bottom: 23 },
  warm2: { kind: "quiet", left: 25, right: 24, top: 27, bottom: 23 },
  warm3: { kind: "quiet", left: 27, right: 24, top: 30, bottom: 23 },
  ledger: { kind: "quiet", left: 33, right: 24, top: 26, bottom: 24 },
  prism: { kind: "quiet", left: 26, right: 25, top: 30, bottom: 24 },
  gallery: { kind: "quiet", left: 36, right: 23, top: 26, bottom: 24 },
  orbit: { kind: "quiet", left: 26, right: 25, top: 28, bottom: 24 },
  ribbon: { kind: "quiet", left: 26, right: 24, top: 33, bottom: 25 },
  cove: { kind: "quiet", left: 26, right: 24, top: 34, bottom: 24 },
};'''
replace_once(old_tail, new_tail, "fresh layouts")

signature = r'''
function FreshLetterSignature({
  template,
  primary,
  secondary,
  accent,
}: {
  template: LetterTemplateId;
  primary: string;
  secondary: string;
  accent: string;
}) {
  switch (template as string) {
    case "edge":
      return (
        <>
          <div className="absolute inset-y-0 left-0 w-[7mm]" style={{ backgroundColor: primary }} />
          <div
            className="absolute inset-y-0 left-[7mm] w-[1.2mm]"
            style={{ backgroundColor: accent, opacity: 0.9 }}
          />
          <div
            className="absolute left-[17mm] top-[19mm] h-[1.2mm] w-[18mm]"
            style={{ backgroundColor: secondary }}
          />
        </>
      );
    case "glow":
      return (
        <>
          <div
            className="absolute right-[-18mm] top-[-18mm] h-[72mm] w-[72mm] rounded-full"
            style={{ backgroundColor: primary, opacity: 0.16 }}
          />
          <div
            className="absolute bottom-[-24mm] left-[-20mm] h-[66mm] w-[66mm] rounded-full"
            style={{ backgroundColor: secondary, opacity: 0.17 }}
          />
          <div
            className="absolute left-[25mm] top-[18mm] h-[1mm] w-[24mm] rounded-full"
            style={{ background: `linear-gradient(90deg, ${primary}, ${accent})` }}
          />
        </>
      );
    case "frame":
      return (
        <>
          <div
            className="absolute left-[9mm] top-[9mm] h-[17mm] w-[2mm]"
            style={{ backgroundColor: accent }}
          />
          <div
            className="absolute bottom-[9mm] right-[9mm] h-[2mm] w-[17mm]"
            style={{ backgroundColor: secondary }}
          />
        </>
      );
    case "monoLuxe":
      return (
        <>
          <div
            className="absolute left-[27mm] right-[27mm] top-[17mm] h-px"
            style={{ backgroundColor: primary, opacity: 0.75 }}
          />
          <div
            className="absolute left-[27mm] top-[15.5mm] h-[4mm] w-[4mm]"
            style={{ backgroundColor: accent }}
          />
          <div
            className="absolute bottom-[16mm] left-[27mm] h-px w-[38mm]"
            style={{ backgroundColor: accent, opacity: 0.75 }}
          />
        </>
      );
    case "horizon":
      return (
        <>
          <div
            className="absolute inset-x-0 top-0 h-[12mm]"
            style={{ background: `linear-gradient(90deg, ${primary}, ${secondary})` }}
          />
          <div
            className="absolute left-[25mm] top-[20mm] h-[1.2mm] w-[24mm] rounded-full"
            style={{ backgroundColor: accent }}
          />
        </>
      );
    case "sunrise":
      return (
        <>
          <div
            className="absolute inset-x-0 top-0 h-[12mm]"
            style={{ background: `linear-gradient(90deg, ${primary}, ${secondary})` }}
          />
          <div
            className="absolute right-[16mm] top-[16mm] h-[20mm] w-[20mm] rounded-full"
            style={{ backgroundColor: accent, opacity: 0.28 }}
          />
        </>
      );
    case "forestFlow":
      return (
        <>
          <div
            className="absolute inset-y-0 left-0 w-[10mm]"
            style={{ backgroundColor: primary }}
          />
          <div
            className="absolute left-[7mm] top-[18mm] h-[30mm] w-[30mm] rounded-full"
            style={{ backgroundColor: secondary, opacity: 0.22 }}
          />
          <div
            className="absolute left-[18mm] top-[22mm] h-[1.2mm] w-[17mm]"
            style={{ backgroundColor: accent }}
          />
        </>
      );
    case "violetPulse":
      return (
        <>
          <div
            className="absolute right-[-30mm] top-[-28mm] h-[78mm] w-[100mm] rotate-[-12deg] rounded-[18mm]"
            style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})`, opacity: 0.2 }}
          />
          <div
            className="absolute left-[25mm] top-[18mm] h-[1.4mm] w-[28mm] rounded-full"
            style={{ backgroundColor: accent }}
          />
        </>
      );
    case "studio2":
      return (
        <>
          <div className="absolute inset-y-0 left-0 w-[13mm]" style={{ backgroundColor: primary }} />
          <div
            className="absolute left-0 top-[21mm] h-[8mm] w-[30mm]"
            style={{ backgroundColor: secondary }}
          />
          <div
            className="absolute left-[19mm] top-[34mm] h-[1.2mm] w-[16mm]"
            style={{ backgroundColor: accent }}
          />
        </>
      );
    case "studio3":
      return (
        <>
          <div className="absolute inset-y-0 left-0 w-[12mm]" style={{ backgroundColor: primary }} />
          <div
            className="absolute left-[12mm] top-0 h-[15mm] w-[54mm]"
            style={{ backgroundColor: secondary, opacity: 0.92 }}
          />
          <div
            className="absolute left-[22mm] top-[21mm] h-[1.3mm] w-[18mm]"
            style={{ backgroundColor: accent }}
          />
        </>
      );
    case "warm2":
      return (
        <>
          <div
            className="absolute right-[-24mm] top-[-24mm] h-[70mm] w-[78mm] rounded-[48%]"
            style={{ backgroundColor: secondary, opacity: 0.28 }}
          />
          <div
            className="absolute right-[24mm] top-[15mm] h-[12mm] w-[12mm] rounded-full"
            style={{ backgroundColor: primary, opacity: 0.42 }}
          />
          <div
            className="absolute left-[25mm] top-[18mm] h-[1.2mm] w-[22mm]"
            style={{ backgroundColor: accent }}
          />
        </>
      );
    case "warm3":
      return (
        <>
          <div
            className="absolute inset-x-0 top-0 h-[9mm]"
            style={{ backgroundColor: primary }}
          />
          <div
            className="absolute right-[-22mm] top-[9mm] h-[52mm] w-[58mm] rounded-bl-[42mm]"
            style={{ backgroundColor: secondary, opacity: 0.32 }}
          />
          <div
            className="absolute left-[27mm] top-[20mm] h-[1.2mm] w-[18mm]"
            style={{ backgroundColor: accent }}
          />
        </>
      );
    case "ledger":
      return (
        <>
          <div
            className="absolute inset-y-[14mm] left-[12mm] w-[9mm]"
            style={{ backgroundColor: secondary, opacity: 0.42 }}
          />
          <div
            className="absolute inset-y-[14mm] left-[22mm] w-px"
            style={{ backgroundColor: primary, opacity: 0.6 }}
          />
          <div
            className="absolute left-[33mm] right-[24mm] top-[18mm] h-px"
            style={{ backgroundColor: accent, opacity: 0.78 }}
          />
        </>
      );
    case "prism":
      return (
        <>
          <div
            className="absolute right-0 top-0 h-[18mm] w-[92mm]"
            style={{ backgroundColor: primary, clipPath: "polygon(18% 0, 100% 0, 100% 100%, 0 100%)" }}
          />
          <div
            className="absolute right-0 top-[18mm] h-[4mm] w-[66mm]"
            style={{ backgroundColor: secondary, clipPath: "polygon(12% 0, 100% 0, 100% 100%, 0 100%)" }}
          />
          <div
            className="absolute left-[26mm] top-[20mm] h-[1.2mm] w-[18mm]"
            style={{ backgroundColor: accent }}
          />
        </>
      );
    case "gallery":
      return (
        <>
          <div className="absolute inset-y-0 left-0 w-[15mm]" style={{ backgroundColor: primary }} />
          <div
            className="absolute left-[5mm] top-[18mm] h-[34mm] w-[23mm] rounded-[8mm]"
            style={{ backgroundColor: secondary }}
          />
          <div
            className="absolute left-[20mm] top-[58mm] h-[6mm] w-[6mm]"
            style={{ backgroundColor: accent }}
          />
        </>
      );
    case "orbit":
      return (
        <>
          <div
            className="absolute right-[-24mm] top-[-24mm] h-[72mm] w-[72mm] rounded-full border-[7mm]"
            style={{ borderColor: primary, opacity: 0.18 }}
          />
          <div
            className="absolute right-[15mm] top-[18mm] h-[18mm] w-[18mm] rounded-full border-[2mm]"
            style={{ borderColor: secondary, opacity: 0.52 }}
          />
          <div
            className="absolute left-[26mm] top-[19mm] h-[1.2mm] w-[20mm]"
            style={{ backgroundColor: accent }}
          />
        </>
      );
    case "ribbon":
      return (
        <>
          <div className="absolute left-0 right-[20mm] top-0 h-[11mm] rounded-br-[9mm]" style={{ backgroundColor: primary }} />
          <div
            className="absolute left-[18mm] right-[48mm] top-[11mm] h-[5mm] rounded-b-[5mm]"
            style={{ backgroundColor: secondary }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-[3mm]"
            style={{ backgroundColor: accent }}
          />
        </>
      );
    case "cove":
      return (
        <>
          <div
            className="absolute left-0 right-0 top-0 h-[14mm] rounded-br-[38mm]"
            style={{ backgroundColor: primary }}
          />
          <div
            className="absolute right-[-14mm] top-[5mm] h-[42mm] w-[56mm] rounded-bl-[34mm]"
            style={{ backgroundColor: secondary, opacity: 0.86 }}
          />
          <div
            className="absolute left-[26mm] top-[21mm] h-[1.3mm] w-[20mm]"
            style={{ backgroundColor: accent }}
          />
        </>
      );
    default:
      return null;
  }
}

'''
replace_once(
    "function LetterBackground({ design }: { design: LetterDesign }) {",
    signature + "function LetterBackground({ design }: { design: LetterDesign }) {",
    "fresh signature component",
)

replace_once(
    '''    >
      {layout.kind === "column" && (''',
    '''    >
      <FreshLetterSignature
        template={template}
        primary={primary}
        secondary={secondary}
        accent={accent}
      />

      {layout.kind === "column" && (''',
    "signature render",
)

path.write_text(text)
