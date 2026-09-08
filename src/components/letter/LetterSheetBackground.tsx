import { DossierSheetBackground } from "@/components/dossier/DossierSheetBackground";
import { cvPalette } from "@/components/cv/palette";
import type { LetterTemplateId } from "./types";

function pick(colors: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    if (colors[key]) return colors[key];
  }
  return "#111111";
}

function QuietColumnBackground({
  template,
  colors,
}: {
  template: "blockig" | "terracotta" | "studio";
  colors: Record<string, string>;
}) {
  const palette = cvPalette(colors);
  const primary = pick(colors, "primary", "accent", "secondary", "ink");
  const secondary = pick(colors, "secondary", "accent", "primary", "ink");
  const accent = pick(colors, "accent", "secondary", "primary", "ink");

  return (
    <div
      data-dossier-sheet-background={template}
      data-letter-background-variant="quiet-column"
      className="absolute inset-0 overflow-hidden"
      style={{ backgroundColor: palette.paper }}
      aria-hidden="true"
    >
      {template === "blockig" ? (
        <>
          <div
            data-letter-safe-rail
            className="absolute inset-y-0 left-0 w-[19mm]"
            style={{ backgroundColor: primary }}
          />
          <div
            className="absolute left-0 top-[48mm] h-[22mm] w-[19mm]"
            style={{ backgroundColor: accent, opacity: 0.92 }}
          />
          <div
            className="absolute left-[4mm] top-[82mm] h-[2.2mm] w-[10mm]"
            style={{ backgroundColor: secondary }}
          />
        </>
      ) : null}

      {template === "terracotta" ? (
        <>
          <div
            data-letter-safe-rail
            className="absolute inset-y-0 left-0 w-[17mm]"
            style={{ backgroundColor: primary }}
          />
          <div
            className="absolute left-[6mm] top-[20mm] h-[38mm] w-px"
            style={{ backgroundColor: secondary, opacity: 0.82 }}
          />
        </>
      ) : null}

      {template === "studio" ? (
        <>
          <div
            data-letter-safe-rail
            className="absolute inset-y-0 left-0 w-[20mm]"
            style={{ backgroundColor: primary }}
          />
          <div
            className="absolute left-0 top-[20mm] h-[14mm] w-[20mm]"
            style={{ backgroundColor: accent }}
          />
          <div
            className="absolute left-[6mm] top-[43mm] h-[2mm] w-[8mm]"
            style={{ backgroundColor: secondary }}
          />
        </>
      ) : null}
    </div>
  );
}

/**
 * Motivation letters keep the template identity but never reuse the large CV
 * column geometry in the reading area. The three legacy column templates are
 * rendered with their intentionally quieter letter signatures; every other
 * template continues to use the shared dossier background unchanged.
 */
export function LetterSheetBackground({
  template,
  colors,
  pageIndex = 0,
}: {
  template: LetterTemplateId;
  colors: Record<string, string>;
  pageIndex?: number;
}) {
  if (template === "blockig" || template === "terracotta" || template === "studio") {
    return <QuietColumnBackground template={template} colors={colors} />;
  }

  return <DossierSheetBackground template={template} colors={colors} pageIndex={pageIndex} />;
}
