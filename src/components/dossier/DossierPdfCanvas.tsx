import { forwardRef } from "react";
import { CoverCanvas } from "@/components/cover/CoverCanvas";
import { CvCanvas } from "@/components/cv/CvCanvas";
import type { CvLayoutWarning } from "@/components/cv/CvCanvas";
import type { CoverPdfDocument, CvPdfDocument } from "@/lib/dossier-pdf-document";

const ignoreSelection = () => {};
const ignoreMove = () => {};

/** Unsichtbarer 1:1-Drucksatz: zuerst Titelblatt, danach sämtliche CV-Seiten. */
export const DossierPdfCanvas = forwardRef<
  HTMLDivElement,
  {
    cover: CoverPdfDocument | null;
    cv: CvPdfDocument | null;
    onCvLayoutWarnings?: (warnings: CvLayoutWarning[]) => void;
    onCvPageCount?: (count: number) => void;
  }
>(function DossierPdfCanvas({ cover, cv, onCvLayoutWarnings, onCvPageCount }, ref) {
  return (
    <div ref={ref}>
      {cover ? (
        <CoverCanvas
          template={cover.template}
          data={cover.data}
          colors={cover.colors}
          blocks={cover.blocks}
          selected={null}
          onSelect={ignoreSelection}
          onMove={ignoreMove}
          fontScale={cover.fontScale}
          editable={false}
        />
      ) : null}
      {cv ? (
        <CvCanvas
          data={cv.data}
          design={cv.design}
          elements={cv.elements}
          elementStyles={cv.elementStyles}
          exportMode
          onLayoutWarnings={onCvLayoutWarnings}
          onPageCount={onCvPageCount}
        />
      ) : null}
    </div>
  );
});
