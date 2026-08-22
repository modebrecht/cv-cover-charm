import { forwardRef } from "react";
import type { Block, BlockStyle, CoverData, TemplateId } from "./types";
import { CoverBackground } from "./CoverBackground";
import { BlockLayer, type Point } from "./BlockLayer";
import { PAGE } from "@/default-config";

/** Ganzzahlige Blattmasse – siehe PAGE in default-config. */
const { WIDTH: PAGE_W, HEIGHT: PAGE_H } = PAGE;

export type { Point };
export { crop, photoRadius } from "./BlockLayer";

type Props = {
  template: TemplateId;
  data: CoverData;
  colors: Record<string, string>;
  blocks: Block[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, patch: Partial<BlockStyle>) => void;
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
  { template, data, colors, blocks, selected, onSelect, onMove, ...rest },
  ref,
) {
  const { editable = true, drawing = false } = rest;
  return (
    <div
      ref={ref}
      data-dossier-document="cover"
      className="relative overflow-hidden shadow-2xl"
      style={{
        width: `${PAGE_W}px`,
        height: `${PAGE_H}px`,
        backgroundColor: colors.bg ?? "#ffffff",
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
        data={data}
        {...rest}
      />
    </div>
  );
});
