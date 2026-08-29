import type { CSSProperties } from "react";
import type { TemplateId } from "./types";

/**
 * Only structural template artwork belongs here.
 *
 * Simple rectangles, lines and circles that users may move/resize live exactly
 * once in template-decorations.ts. Keeping a second copy here caused the same
 * visual element to have two competing geometries (background vs editor block).
 */
export function CoverBackground({
  template,
  colors,
}: {
  template: TemplateId;
  colors: Record<string, string>;
}) {
  // Classic: the inset document frame is structural.
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

  // Editorial/Edel: the two nested document frames are structural; the centre
  // accent line is an editable decoration.
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
      </div>
    );
  }

  // Bogen: clipped arch geometry is intentionally structural.
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

  // Aurora: the large clipped/rounded gradient hero remains structural. The
  // small accent strip and bottom band are editable decorations.
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
      </div>
    );
  }

  // Verlauf: the page-filling gradient is structural; the soft circles are
  // normal editable decorations.
  if (template === "verlauf") {
    return (
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ background: `linear-gradient(160deg, ${colors.primary}, ${colors.secondary})` }}
      />
    );
  }

  // Citrus: both the full-page gradient and the clipped white text card define
  // the template surface and are not normal editor primitives.
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

  // Rahmen/Pastell: keep the large inset frame structural. Band, middle line
  // and lower ellipse are editable decorations.
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
      </div>
    );
  }

  // All remaining templates are composed from the plain page surface plus
  // editable primitives from template-decorations.ts. There is deliberately no
  // second background copy of those primitives here. The color variables are
  // exposed for CV-only archetype adaptations (for example Blockig's 66 mm
  // rail) without duplicating those editor primitives on the title page.
  return (
    <div
      data-cover-template={template}
      className="absolute inset-0 overflow-hidden"
      style={
        {
          backgroundColor: colors.bg,
          "--cover-primary": colors.primary ?? colors.accent ?? colors.ink ?? colors.bg,
          "--cover-accent": colors.accent ?? colors.secondary ?? colors.primary ?? colors.bg,
        } as CSSProperties
      }
    />
  );
}
