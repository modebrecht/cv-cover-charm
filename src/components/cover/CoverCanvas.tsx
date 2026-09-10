import { forwardRef, useLayoutEffect } from "react";
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

  // Fresh cover CSS historically scopes itself through html[data-dossier-template].
  // The visible editor already establishes that route-level scope, but the hidden
  // combined-PDF canvas can be mounted from another route. Keep the actual cover
  // template active while this canvas exists so Edge-Cove do not rasterise as a
  // flat primary-colour page. M14 will remove this global CSS dependency entirely.
  useLayoutEffect(() => {
    const root = document.documentElement;
    const previous = root.dataset.dossierTemplate;
    root.dataset.dossierTemplate = template as string;

    return () => {
      if (previous === undefined) delete root.dataset.dossierTemplate;
      else root.dataset.dossierTemplate = previous;
    };
  }, [template]);

  // Die Titelblatt-Route trägt eine bewusst gewählte globale Schrift bereits
  // in alle Standardblöcke ein. Ein von der Familienvorgabe abweichender
  // gemeinsamer Block-Font ist deshalb der laufende Dossier-Override. Ohne
  // Override entscheidet ausschliesslich die zentrale Dossier-Familie.
  const liveFont = sharedDossierBlockFont(blocks);
  const inferredOverride =
    liveFont && liveFont !== dossierDefaultFontKey(template) ? liveFont : null;
  const resolvedOverride = fontOverride === undefined ? inferredOverride : fontOverride;
  const dossierFont = effectiveDossierFont(template, resolvedOverride);
  const paper = colors.bg ?? "#ffffff";
  const primary = colors.primary ?? colors.accent ?? colors.ink ?? paper;
  const secondary = colors.secondary ?? colors.accent ?? primary;
  const accent = colors.accent ?? secondary;
  const ink = colors.ink ?? "#111111";

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
        backgroundColor: paper,
        ["--dossier-font" as string]: dossierFont,
        // Palette roles live on the common cover ancestor so acceptance CSS can
        // repair contrast without freezing a template to one hard-coded colour.
        ["--cover-paper" as string]: paper,
        ["--cover-primary" as string]: primary,
        ["--cover-secondary" as string]: secondary,
        ["--cover-accent" as string]: accent,
        ["--cover-ink" as string]: ink,
        // Photo initials are not a semantic text role, but still belong to the
        // dossier type system. Keep one unshadowed token for that renderer edge.
        ["--dossier-resolved-font" as string]: dossierFont,
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
