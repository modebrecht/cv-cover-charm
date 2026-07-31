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
