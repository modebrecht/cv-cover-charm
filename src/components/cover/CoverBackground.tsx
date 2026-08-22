import type { TemplateId } from "./types";

export function CoverBackground({
  template,
  colors,
}: {
  template: TemplateId;
  colors: Record<string, string>;
}) {
  if (template === "klassisch") {
    return (
      <div className="absolute inset-0" style={{ backgroundColor: colors.bg }}>
        <div
          className="absolute"
          style={{ inset: "10mm", border: `1px solid ${colors.ink}`, opacity: 0.15 }}
        />
      </div>
    );
  }

  if (template === "modern") {
    return (
      <div className="absolute inset-0" style={{ backgroundColor: colors.bg }}>
        <div
          className="absolute"
          style={{
            left: "20mm",
            top: "21mm",
            width: "10mm",
            height: "2mm",
            background: colors.accent,
          }}
        />
        {/* weiche Fläche, damit die obere Seitenhälfte nicht leer wirkt */}
        <div
          className="absolute"
          style={{
            left: "112mm",
            top: "24mm",
            width: "86mm",
            height: "86mm",
            borderRadius: "9999px",
            background: colors.accent,
            opacity: 0.1,
          }}
        />
      </div>
    );
  }
  if (template === "edel") {
    return (
      <div className="absolute inset-0" style={{ backgroundColor: colors.bg }}>
        <div
          className="absolute"
          style={{ inset: "12mm", border: `0.6px solid ${colors.accent}`, opacity: 0.5 }}
        />
        <div
          className="absolute"
          style={{ inset: "15mm", border: `0.4px solid ${colors.accent}`, opacity: 0.25 }}
        />
        <div
          className="absolute"
          style={{
            left: "85mm",
            width: "40mm",
            top: "196mm",
            height: "0.6px",
            background: colors.accent,
            opacity: 0.7,
          }}
        />
      </div>
    );
  }

  if (template === "colorful") {
    return (
      <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: colors.bg }}>
        <div
          className="absolute left-0 right-0 top-0"
          style={{ height: "28mm", backgroundColor: colors.primary }}
        />
        <div
          className="absolute"
          style={{
            left: "0mm",
            top: "28mm",
            width: "70mm",
            height: "80mm",
            backgroundColor: colors.secondary,
          }}
        />
        <div
          className="absolute"
          style={{
            left: "70mm",
            top: "28mm",
            width: "45mm",
            height: "80mm",
            backgroundColor: colors.tertiary,
          }}
        />
        <div
          className="absolute"
          style={{
            left: "18mm",
            top: "112mm",
            width: "24mm",
            height: "3mm",
            backgroundColor: colors.primary,
          }}
        />
        <div
          className="absolute left-0 bottom-0"
          style={{ width: "100%", height: "8mm", backgroundColor: colors.secondary }}
        />
      </div>
    );
  }

  if (template === "blockig") {
    return (
      <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: colors.bg }}>
        <div
          className="absolute left-0 top-0"
          style={{ width: "105mm", height: "30mm", backgroundColor: colors.primary }}
        />
        <div
          className="absolute"
          style={{
            left: "0mm",
            top: "46mm",
            width: "105mm",
            height: "72mm",
            backgroundColor: colors.accent,
            opacity: 0.9,
          }}
        />
        <div
          className="absolute"
          style={{
            left: "18mm",
            top: "124mm",
            width: "18mm",
            height: "2.5mm",
            backgroundColor: colors.primary,
          }}
        />
      </div>
    );
  }

  if (template === "edelBlockig") {
    return (
      <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: colors.bg }}>
        <div
          className="absolute"
          style={{
            left: "0mm",
            top: "0mm",
            width: "100%",
            height: "36mm",
            backgroundColor: colors.primary,
          }}
        />
        <div
          className="absolute"
          style={{
            left: "0mm",
            top: "36mm",
            width: "100%",
            height: "0.6px",
            backgroundColor: colors.accent,
            opacity: 0.7,
          }}
        />
        <div
          className="absolute"
          style={{
            left: "78mm",
            top: "48mm",
            width: "0.6px",
            height: "82mm",
            backgroundColor: colors.accent,
            opacity: 0.5,
          }}
        />
        <div
          className="absolute"
          style={{
            left: "0mm",
            top: "232mm",
            width: "100%",
            height: "65mm",
            backgroundColor: colors.primary,
          }}
        />
      </div>
    );
  }

  if (template === "serioes") {
    return (
      <div className="absolute inset-0" style={{ backgroundColor: colors.bg }}>
        <div
          className="absolute left-0 top-0"
          style={{ width: "100%", height: "6mm", backgroundColor: colors.primary }}
        />
        <div
          className="absolute"
          style={{
            left: "20mm",
            right: "20mm",
            top: "36mm",
            height: "0.5px",
            background: colors.accent,
          }}
        />
        <div
          className="absolute left-0 bottom-0"
          style={{ width: "100%", height: "3mm", backgroundColor: colors.primary }}
        />
      </div>
    );
  }

  if (template === "human") {
    return (
      <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: colors.bg }}>
        <div
          className="absolute"
          style={{
            width: "190mm",
            height: "150mm",
            borderRadius: "9999px",
            backgroundColor: colors.secondary,
            left: "-40mm",
            top: "-70mm",
            opacity: 0.85,
          }}
        />
        <div
          className="absolute"
          style={{
            width: "120mm",
            height: "120mm",
            borderRadius: "9999px",
            backgroundColor: colors.secondary,
            right: "-45mm",
            bottom: "-45mm",
            opacity: 0.6,
          }}
        />
        <div
          className="absolute"
          style={{
            left: "20mm",
            top: "140mm",
            width: "30mm",
            height: "1.2mm",
            borderRadius: "9999px",
            backgroundColor: colors.primary,
            opacity: 0.7,
          }}
        />
      </div>
    );
  }

  // Bogen – grosser eleganter Bogen
  if (template === "sonnig") {
    return (
      <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: colors.bg }}>
        <div
          className="absolute"
          style={{
            left: "28mm",
            top: "22mm",
            width: "154mm",
            height: "168mm",
            borderTopLeftRadius: "77mm",
            borderTopRightRadius: "77mm",
            backgroundColor: colors.primary,
          }}
        />
        <div
          className="absolute"
          style={{
            left: "34mm",
            top: "28mm",
            width: "142mm",
            height: "156mm",
            borderTopLeftRadius: "71mm",
            borderTopRightRadius: "71mm",
            border: `0.4mm solid ${colors.secondary}`,
            opacity: 0.75,
          }}
        />
      </div>
    );
  }

  // Horizont – ruhige Bandaufteilung
  if (template === "welle") {
    return (
      <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: colors.bg }}>
        <div
          className="absolute left-0 right-0"
          style={{ top: "180mm", bottom: 0, backgroundColor: colors.primary }}
        />
        <div
          className="absolute"
          style={{
            left: "0mm",
            top: "176mm",
            width: "100%",
            height: "0.6mm",
            backgroundColor: colors.secondary,
          }}
        />
        <div
          className="absolute"
          style={{
            left: "22mm",
            top: "22mm",
            width: "24mm",
            height: "0.8mm",
            backgroundColor: colors.secondary,
          }}
        />
      </div>
    );
  }

  // Kolumne – vertikale Farbspalte
  if (template === "terracotta") {
    return (
      <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: colors.bg }}>
        <div
          className="absolute left-0 top-0"
          style={{ width: "70mm", height: "100%", backgroundColor: colors.primary }}
        />
        <div
          className="absolute"
          style={{
            left: "66mm",
            top: 0,
            width: "1.2mm",
            height: "100%",
            backgroundColor: colors.secondary,
            opacity: 0.9,
          }}
        />
        <div
          className="absolute"
          style={{
            left: "82mm",
            top: "190mm",
            width: "30mm",
            height: "0.4mm",
            backgroundColor: colors.primary,
            opacity: 0.5,
          }}
        />
      </div>
    );
  }

  // Sonne – gelbes Kopfband, Foto sitzt im dunklen Kreis
  if (template === "sonne") {
    return (
      <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: colors.bg }}>
        <div
          className="absolute left-0 right-0 top-0"
          style={{ height: "118mm", backgroundColor: colors.primary }}
        />
        <div
          className="absolute"
          style={{
            left: "104mm",
            top: "6mm",
            width: "98mm",
            height: "98mm",
            borderRadius: "9999px",
            backgroundColor: colors.bg,
          }}
        />
        {/* grosse Kurve unten rechts */}
        <div
          className="absolute"
          style={{
            left: "96mm",
            top: "196mm",
            width: "180mm",
            height: "180mm",
            borderRadius: "9999px",
            backgroundColor: colors.primary,
          }}
        />
      </div>
    );
  }

  // Studio – dunkle Spalte links, Farbband mit dem Namen
  if (template === "studio") {
    return (
      <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: colors.bg }}>
        <div
          className="absolute left-0 top-0"
          style={{ width: "72mm", height: "100%", backgroundColor: colors.primary }}
        />
        <div
          className="absolute"
          style={{
            left: "72mm",
            top: "24mm",
            right: 0,
            height: "38mm",
            backgroundColor: colors.accent,
          }}
        />
        <div
          className="absolute"
          style={{
            left: "84mm",
            top: "84mm",
            width: "26mm",
            height: "1.4mm",
            backgroundColor: colors.accent,
          }}
        />
        {/* weiche Fläche gegen die Leere in der Mitte der Hauptspalte */}
        <div
          className="absolute"
          style={{
            left: "112mm",
            top: "128mm",
            width: "92mm",
            height: "92mm",
            borderRadius: "9999px",
            backgroundColor: colors.accent,
            opacity: 0.22,
          }}
        />
        <div
          className="absolute left-0 bottom-0"
          style={{ left: "72mm", right: 0, height: "6mm", backgroundColor: colors.accent }}
        />
      </div>
    );
  }

  // Neon – dunkler Grund mit Verlaufsblasen
  if (template === "neon") {
    const blob = `linear-gradient(135deg, ${colors.secondary}, ${colors.primary})`;
    return (
      <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: colors.bg }}>
        <div
          className="absolute"
          style={{
            left: "-45mm",
            top: "-40mm",
            width: "150mm",
            height: "130mm",
            borderRadius: "9999px",
            background: blob,
            opacity: 0.95,
          }}
        />
        <div
          className="absolute"
          style={{
            left: "126mm",
            top: "138mm",
            width: "112mm",
            height: "108mm",
            borderRadius: "9999px",
            background: blob,
            opacity: 0.8,
          }}
        />
        <div
          className="absolute"
          style={{
            left: "20mm",
            top: "196mm",
            width: "36mm",
            height: "36mm",
            borderRadius: "9999px",
            background: blob,
            opacity: 0.5,
          }}
        />
      </div>
    );
  }

  // Aurora – Verlaufsband oben, heller Körper darunter
  if (template === "aurora") {
    return (
      <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: colors.bg }}>
        <div
          className="absolute left-0 right-0 top-0"
          style={{
            height: "128mm",
            background: `linear-gradient(115deg, ${colors.primary}, ${colors.secondary})`,
            borderBottomRightRadius: "60mm",
          }}
        />
        <div
          className="absolute"
          style={{
            left: "20mm",
            top: "150mm",
            width: "26mm",
            height: "1.6mm",
            borderRadius: "9999px",
            background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
          }}
        />
        <div
          className="absolute left-0 bottom-0"
          style={{
            width: "100%",
            height: "5mm",
            background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
          }}
        />
      </div>
    );
  }

  // Verlauf – ganzflächiger Farbverlauf
  if (template === "verlauf") {
    return (
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ background: `linear-gradient(160deg, ${colors.primary}, ${colors.secondary})` }}
      >
        <div
          className="absolute"
          style={{
            left: "-30mm",
            top: "168mm",
            width: "150mm",
            height: "150mm",
            borderRadius: "9999px",
            backgroundColor: colors.bg,
            opacity: 0.1,
          }}
        />
        <div
          className="absolute"
          style={{
            left: "128mm",
            top: "-24mm",
            width: "110mm",
            height: "110mm",
            borderRadius: "9999px",
            backgroundColor: colors.bg,
            opacity: 0.12,
          }}
        />
      </div>
    );
  }

  // Citrus – warmer Verlauf mit weisser Textkarte
  if (template === "citrus") {
    return (
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ background: `linear-gradient(155deg, ${colors.primary}, ${colors.secondary})` }}
      >
        <div
          className="absolute"
          style={{
            left: "14mm",
            top: "50mm",
            width: "182mm",
            height: "233mm",
            borderRadius: "10mm",
            backgroundColor: colors.bg,
          }}
        />
      </div>
    );
  }

  // Rahmen – feine Linien, luftig
  if (template === "pastell") {
    return (
      <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: colors.bg }}>
        <div
          className="absolute"
          style={{
            inset: "12mm",
            border: `0.4mm solid ${colors.primary}`,
            opacity: 0.35,
          }}
        />
        <div
          className="absolute left-0 right-0"
          style={{ top: 0, height: "8mm", backgroundColor: colors.primary }}
        />
        <div
          className="absolute"
          style={{
            left: "12mm",
            right: "12mm",
            top: "150mm",
            height: "0.3mm",
            backgroundColor: colors.primary,
            opacity: 0.3,
          }}
        />
        <div
          className="absolute"
          style={{
            left: "-30mm",
            bottom: "-60mm",
            width: "160mm",
            height: "120mm",
            borderRadius: "9999px",
            backgroundColor: colors.secondary,
            opacity: 0.5,
          }}
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: colors.bg }}>
      <div
        className="absolute left-0 right-0 top-0"
        style={{ height: "115mm", backgroundColor: colors.primary }}
      >
        <div
          className="absolute"
          style={{
            width: "160mm",
            height: "160mm",
            borderRadius: "9999px",
            backgroundColor: colors.secondary,
            right: "-40mm",
            top: "-40mm",
            opacity: 0.9,
          }}
        />
        <div
          className="absolute"
          style={{
            width: "80mm",
            height: "80mm",
            borderRadius: "9999px",
            backgroundColor: colors.secondary,
            left: "-25mm",
            bottom: "-25mm",
            opacity: 0.55,
          }}
        />
      </div>
    </div>
  );
}
