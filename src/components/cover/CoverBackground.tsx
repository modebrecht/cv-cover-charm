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
        <div
          className="absolute"
          style={{
            left: "85mm",
            width: "40mm",
            top: "216mm",
            height: "1px",
            background: colors.accent,
            opacity: 0.6,
          }}
        />
      </div>
    );
  }

  if (template === "modern") {
    return (
      <div className="absolute inset-0" style={{ backgroundColor: colors.bg }}>
        <div
          className="absolute"
          style={{ left: "20mm", top: "21mm", width: "10mm", height: "2mm", background: colors.accent }}
        />
        <div
          className="absolute"
          style={{
            left: "20mm",
            right: "20mm",
            top: "245mm",
            height: "1px",
            background: colors.primary,
            opacity: 0.18,
          }}
        />
      </div>
    );
  }
  if (template === "edel") {
    return (
      <div className="absolute inset-0" style={{ backgroundColor: colors.bg }}>
        <div className="absolute" style={{ inset: "12mm", border: `0.6px solid ${colors.accent}`, opacity: 0.5 }} />
        <div className="absolute" style={{ inset: "15mm", border: `0.4px solid ${colors.accent}`, opacity: 0.25 }} />
        <div
          className="absolute"
          style={{ left: "85mm", width: "40mm", top: "196mm", height: "0.6px", background: colors.accent, opacity: 0.7 }}
        />
      </div>
    );
  }

  if (template === "colorful") {
    return (
      <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: colors.bg }}>
        <div className="absolute left-0 right-0 top-0" style={{ height: "28mm", backgroundColor: colors.primary }} />
        <div
          className="absolute"
          style={{ left: "0mm", top: "28mm", width: "70mm", height: "80mm", backgroundColor: colors.secondary }}
        />
        <div
          className="absolute"
          style={{ left: "70mm", top: "28mm", width: "45mm", height: "80mm", backgroundColor: colors.tertiary }}
        />
        <div
          className="absolute"
          style={{ left: "18mm", top: "112mm", width: "24mm", height: "3mm", backgroundColor: colors.primary }}
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
        <div className="absolute left-0 top-0" style={{ width: "105mm", height: "30mm", backgroundColor: colors.primary }} />
        <div className="absolute" style={{ left: "0mm", top: "46mm", width: "105mm", height: "72mm", backgroundColor: colors.accent, opacity: 0.9 }} />
        <div className="absolute" style={{ left: "18mm", top: "124mm", width: "18mm", height: "2.5mm", backgroundColor: colors.primary }} />
        <div className="absolute" style={{ left: "0mm", top: "236mm", width: "100%", height: "1mm", backgroundColor: colors.primary, opacity: 0.25 }} />
      </div>
    );
  }

  if (template === "edelBlockig") {
    return (
      <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: colors.bg }}>
        <div className="absolute" style={{ left: "0mm", top: "0mm", width: "100%", height: "36mm", backgroundColor: colors.primary }} />
        <div className="absolute" style={{ left: "0mm", top: "36mm", width: "100%", height: "0.6px", backgroundColor: colors.accent, opacity: 0.7 }} />
        <div className="absolute" style={{ left: "78mm", top: "48mm", width: "0.6px", height: "82mm", backgroundColor: colors.accent, opacity: 0.5 }} />
        <div className="absolute" style={{ left: "0mm", top: "232mm", width: "100%", height: "65mm", backgroundColor: colors.primary }} />
        <div className="absolute" style={{ left: "0mm", top: "232mm", width: "100%", height: "0.6px", backgroundColor: colors.accent, opacity: 0.7 }} />
      </div>
    );
  }

  if (template === "serioes") {
    return (
      <div className="absolute inset-0" style={{ backgroundColor: colors.bg }}>
        <div className="absolute left-0 top-0" style={{ width: "100%", height: "6mm", backgroundColor: colors.primary }} />
        <div className="absolute" style={{ left: "20mm", right: "20mm", top: "36mm", height: "0.5px", background: colors.accent }} />
        <div className="absolute" style={{ left: "20mm", right: "20mm", top: "246mm", height: "0.5px", background: colors.accent }} />
        <div className="absolute left-0 bottom-0" style={{ width: "100%", height: "3mm", backgroundColor: colors.primary }} />
      </div>
    );
  }

  if (template === "human") {
    return (
      <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: colors.bg }}>
        <div
          className="absolute"
          style={{ width: "190mm", height: "150mm", borderRadius: "9999px", backgroundColor: colors.secondary, left: "-40mm", top: "-70mm", opacity: 0.85 }}
        />
        <div
          className="absolute"
          style={{ width: "120mm", height: "120mm", borderRadius: "9999px", backgroundColor: colors.secondary, right: "-45mm", bottom: "-45mm", opacity: 0.6 }}
        />
        <div
          className="absolute"
          style={{ left: "20mm", top: "140mm", width: "30mm", height: "1.2mm", borderRadius: "9999px", backgroundColor: colors.primary, opacity: 0.7 }}
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
        <div
          className="absolute"
          style={{
            left: "28mm",
            top: "252mm",
            width: "154mm",
            height: "0.3mm",
            backgroundColor: colors.ink,
            opacity: 0.25,
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
          style={{ width: "62mm", height: "100%", backgroundColor: colors.primary }}
        />
        <div
          className="absolute"
          style={{
            left: "56mm",
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
            left: "78mm",
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
      <div className="absolute left-0 right-0 top-0" style={{ height: "115mm", backgroundColor: colors.primary }}>
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
      <div
        className="absolute"
        style={{
          left: "20mm",
          right: "20mm",
          top: "242mm",
          height: "1px",
          background: colors.primary,
          opacity: 0.2,
        }}
      />
    </div>
  );
}
