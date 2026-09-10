import type { CSSProperties } from "react";
import { isFreshTemplate } from "./fresh-templates";
import "./fresh-templates.css";
import type { TemplateId } from "./types";

/**
 * Only structural template artwork belongs here.
 *
 * Simple rectangles, lines and circles that users may move/resize live exactly
 * once in template-decorations.ts. Keeping a second copy here caused the same
 * visual element to have two competing geometries (background vs editor block).
 *
 * Fresh dossier templates (Edge through Cove) are the exception only in the
 * structural sense: their CSS systems deliberately reshape one primary plane
 * with two nested color fields. Those fields are not editor primitives and must
 * exist here so the 18 fresh title-page compositions have something to style.
 */
export function CoverBackground({
  template,
  colors,
}: {
  template: TemplateId;
  colors: Record<string, string>;
}) {
  if ((template as string) === "brief") {
    return (
      <div
        data-cover-template="brief"
        className="absolute inset-0 bg-white"
        style={{ backgroundColor: "#ffffff" }}
        aria-hidden="true"
      />
    );
  }

  // Edge–Cove share one stable structural DOM contract. Their individual CSS
  // reshapes these three color-aware fields into each template's own motif.
  // Keep this before legacy fallbacks so Fresh templates never collapse to a
  // plain sheet when no editable template decorations exist.
  if (isFreshTemplate(template)) {
    const paper = colors.bg ?? "#ffffff";
    const primary = colors.primary ?? colors.accent ?? colors.ink ?? paper;
    const secondary = colors.secondary ?? colors.accent ?? primary;
    const accent = colors.accent ?? secondary;

    return (
      <div
        data-cover-template={template}
        data-fresh-cover-background={template}
        className="absolute inset-0 overflow-hidden"
        style={
          {
            backgroundColor: paper,
            "--cover-primary": primary,
            "--cover-secondary": secondary,
            "--cover-accent": accent,
          } as CSSProperties
        }
        aria-hidden="true"
      >
        <div
          data-fresh-cover-field="primary"
          className="absolute"
          style={{
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            backgroundColor: primary,
          }}
        >
          <div
            data-fresh-cover-field="secondary"
            className="absolute"
            style={{
              left: 0,
              top: 0,
              width: "100%",
              height: "100%",
              backgroundColor: secondary,
            }}
          />
          <div
            data-fresh-cover-field="accent"
            className="absolute"
            style={{
              left: 0,
              top: 0,
              width: "100%",
              height: "100%",
              backgroundColor: accent,
            }}
          />
        </div>
      </div>
    );
  }

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

  // Rahmen/Pastell keeps one quiet 12 mm frame as its structural signature.
  // The slim inset top bar is the only editable decoration for this family.
  if (template === "pastell") {
    return (
      <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: colors.bg }}>
        <div
          className="absolute"
          style={{
            inset: "12mm",
            border: `0.4mm solid ${colors.secondary ?? colors.primary}`,
            opacity: 0.35,
          }}
        />
      </div>
    );
  }

  // All remaining legacy templates are composed from the plain page surface
  // plus editable primitives from template-decorations.ts. There is deliberately
  // no second background copy of those primitives here. The color variables are
  // exposed for CV-only archetype adaptations (for example Blockig's narrow rail)
  // without duplicating those editor primitives on the title page.
  return (
    <>
      {template === "freundlich" || template === "colorful" ? (
        <style>{`
          html[data-dossier-template="freundlich"] [data-dossier-document="cv"] [data-cv-page="0"] [data-cv-background="motif"] > div::before {
            content: "";
            position: absolute;
            left: 0;
            right: 0;
            top: 0;
            height: 52mm;
            background: var(--cover-primary);
            pointer-events: none;
          }
          html[data-dossier-template="freundlich"] [data-dossier-document="cv"] [data-cv-page]:not([data-cv-page="0"]) [data-cv-background="motif"] > div::before {
            content: "";
            position: absolute;
            left: 0;
            right: 0;
            top: 0;
            height: 14mm;
            background: var(--cover-primary);
            pointer-events: none;
          }
          html[data-dossier-template="colorful"] [data-dossier-document="cv"] [data-cv-page="0"] [data-cv-background="motif"] > div::before {
            content: "";
            position: absolute;
            left: 0;
            right: 0;
            top: 0;
            height: 40mm;
            background: var(--cover-primary);
            pointer-events: none;
          }
          html[data-dossier-template="colorful"] [data-dossier-document="cv"] [data-cv-page]:not([data-cv-page="0"]) [data-cv-background="motif"] > div::before {
            content: "";
            position: absolute;
            left: 0;
            right: 0;
            top: 0;
            height: 14mm;
            background: var(--cover-primary);
            pointer-events: none;
          }
          html[data-dossier-template="colorful"] [data-dossier-document="cv"] [data-cv-background="motif"] > div::after {
            content: "";
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            height: 8mm;
            background: var(--cover-secondary);
            pointer-events: none;
          }
        `}</style>
      ) : null}
      {template === "blockig" ? (
        <style>{`
          html[data-dossier-template="blockig"] [data-dossier-document="cv"] [data-cv-background="motif"] > div::before {
            content: "";
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 19mm;
            background: var(--cover-primary);
            pointer-events: none;
          }
          html[data-dossier-template="blockig"] [data-dossier-document="cv"] [data-cv-background="motif"] > div::after {
            content: "";
            position: absolute;
            left: 0;
            top: 46mm;
            width: 19mm;
            height: 72mm;
            background: var(--cover-accent);
            opacity: 0.9;
            pointer-events: none;
          }
        `}</style>
      ) : null}
      <div
        data-cover-template={template}
        className="absolute inset-0 overflow-hidden"
        style={
          {
            backgroundColor: colors.bg,
            "--cover-primary": colors.primary ?? colors.accent ?? colors.ink ?? colors.bg,
            "--cover-secondary": colors.secondary ?? colors.accent ?? colors.primary ?? colors.bg,
            "--cover-accent": colors.accent ?? colors.secondary ?? colors.primary ?? colors.bg,
          } as CSSProperties
        }
      />
    </>
  );
}
