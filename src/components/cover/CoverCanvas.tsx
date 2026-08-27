import { forwardRef } from "react";
import type { Block, BlockStyle, CoverData, FontKey, TemplateId } from "./types";
import { CoverBackground } from "./CoverBackground";
import { BlockLayer, type Point } from "./BlockLayer";
import { PAGE } from "@/default-config";
import { dossierDefaultFontKey, effectiveDossierFont } from "@/lib/dossier-theme";

/** Ganzzahlige Blattmasse – siehe PAGE in default-config. */
const { WIDTH: PAGE_W, HEIGHT: PAGE_H } = PAGE;

export type { Point };
export { crop, photoRadius } from "./BlockLayer";

const DOSSIER_TEXT_IDS = new Set([
  "name",
  "beruf",
  "eyebrow",
  "kicker",
  "kontaktTitel",
  "anTitel",
  "beilagenTitel",
  "ortDatum",
  "lehrbeginn",
  "kontakt",
  "empfaenger",
  "beilagen",
]);

function sharedDossierBlockFont(blocks: Block[]): FontKey | null {
  const fonts = new Set(
    blocks
      .filter((block) => block.kind === "text" && DOSSIER_TEXT_IDS.has(block.id))
      .map((block) => block.style.font),
  );
  if (fonts.size !== 1) return null;
  return [...fonts][0];
}

type Props = {
  template: TemplateId;
  data: CoverData;
  colors: Record<string, string>;
  blocks: Block[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, patch: Partial<BlockStyle>) => void;
  /** Explizite gemeinsame Dossier-Schrift; null = Vorlage/Familie. */
  fontOverride?: FontKey | null;
  /** Globale Schriftskalierung (1 = Vorlagen-Standard). */
  fontScale?: number;
  editable?: boolean;
  /** Zeichenmodus: Ziehen erzeugt eine Freihandform statt zu verschieben. */
  drawing?: boolean;
  onDrawn?: (points: Point[]) => void;
};

/**
 * Das A4-Titelblatt: Hintergrund der Vorlage, darüber die bedienbare Ebene.
 *
 * Zeichnen, Auswählen und Verschieben stecken in `BlockLayer`, weil der
 * Lebenslauf dieselbe Bedienung braucht.
 */
export const CoverCanvas = forwardRef<HTMLDivElement, Props>(function CoverCanvas(
  { template, data, colors, blocks, selected, onSelect, onMove, fontOverride, ...rest },
  ref,
) {
  const { editable = true, drawing = false } = rest;

  // Die Titelblatt-Route trägt eine bewusst gewählte globale Schrift bereits
  // in alle Standardblöcke ein. Ein von der Familienvorgabe abweichender
  // gemeinsamer Block-Font ist deshalb der laufende Dossier-Override. Ohne
  // Override entscheidet ausschliesslich die zentrale Dossier-Familie.
  const liveFont = sharedDossierBlockFont(blocks);
  const inferredOverride =
    liveFont && liveFont !== dossierDefaultFontKey(template) ? liveFont : null;
  const resolvedOverride = fontOverride === undefined ? inferredOverride : fontOverride;
  const dossierFont = effectiveDossierFont(template, resolvedOverride);

  return (
    <div
      ref={ref}
      data-dossier-document="cover"
      data-cover-template={template}
      data-dossier-font-source={resolvedOverride ? "override" : "family"}
      className="relative overflow-hidden shadow-2xl"
      style={{
        width: `${PAGE_W}px`,
        height: `${PAGE_H}px`,
        backgroundColor: colors.bg ?? "#ffffff",
        ["--dossier-font" as string]: dossierFont,
      }}
      onPointerDown={(e) => {
        if (drawing) return;
        if (editable && !(e.target as HTMLElement).closest("[data-block-id]")) {
          onSelect(null);
        }
      }}
    >
      <CoverBackground template={template} colors={colors} />
      <BlockLayer
        blocks={blocks}
        colors={colors}
        selected={selected}
        onSelect={onSelect}
        onMove={onMove}
        dossierFont={dossierFont}
        data={data}
        {...rest}
      />
    </div>
  );
});
