import { forwardRef } from "react";
import type { CoverData, TemplateId } from "./types";
import { Klassisch } from "./Klassisch";
import { Modern } from "./Modern";
import { Freundlich } from "./Freundlich";

type Props = {
  template: TemplateId;
  data: CoverData;
  colors: Record<string, string>;
};

export const CoverPreview = forwardRef<HTMLDivElement, Props>(function CoverPreview(
  { template, data, colors },
  ref,
) {
  return (
    <div
      ref={ref}
      className="overflow-hidden bg-white shadow-2xl"
      style={{
        width: "210mm",
        height: "297mm",
        // ensure fonts fall back cleanly for html2canvas
      }}
    >
      {template === "klassisch" && <Klassisch data={data} colors={colors} />}
      {template === "modern" && <Modern data={data} colors={colors} />}
      {template === "freundlich" && <Freundlich data={data} colors={colors} />}
    </div>
  );
});
