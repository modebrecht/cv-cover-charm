import { useEffect, useRef } from "react";
import { FONT_STACKS, type TemplateId } from "@/components/cover/types";
import { cvPalette, onColorRoles } from "@/components/cv/palette";
import { effectiveDossierFont } from "@/lib/dossier-theme";
import {
  DEFAULT_LETTER_BEILAGEN,
  type LetterData,
  type LetterDesign,
  type LetterFlowImage,
  type LetterTemplateId,
} from "./types";
import { letterRichHtml, plainTextToRichHtml } from "./rich-text";
import { LetterFlowImages } from "./LetterFlowImages";

type LetterLayout = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  kind: "quiet" | "column" | "band" | "card";
  columnMm?: number;
  bandMm?: number;
  footMm?: number;
  cardInsetMm?: number;
  borderInsetMm?: number;
};

/**
 * Anschreiben sind textlastiger als CV und Titelblatt. Jede Vorlage behält
 * deshalb nur ihr Wiedererkennungsmerkmal; grosse Flächen werden bewusst
 * kleiner, damit der Brief ruhig und druckbar bleibt.
 */
const LETTER_LAYOUTS: Record<string, LetterLayout> = {
  klassisch: {
    kind: "quiet",
    left: 25,
    right: 25,
    top: 24,
    bottom: 22,
    borderInsetMm: 10,
  },
  modern: { kind: "quiet", left: 24, right: 22, top: 24, bottom: 22 },
  freundlich: {
    kind: "band",
    left: 24,
    right: 22,
    top: 31,
    bottom: 22,
    bandMm: 14,
    footMm: 3,
  },
  edel: {
    kind: "quiet",
    left: 27,
    right: 27,
    top: 25,
    bottom: 24,
    borderInsetMm: 12,
  },
  colorful: {
    kind: "band",
    left: 24,
    right: 22,
    top: 30,
    bottom: 22,
    bandMm: 13,
    footMm: 4,
  },
  blockig: {
    kind: "column",
    left: 35,
    right: 22,
    top: 24,
    bottom: 22,
    columnMm: 19,
  },
  edelBlockig: {
    kind: "band",
    left: 25,
    right: 23,
    top: 31,
    bottom: 25,
    bandMm: 14,
    footMm: 7,
  },
  serioes: {
    kind: "band",
    left: 24,
    right: 22,
    top: 25,
    bottom: 22,
    bandMm: 6,
    footMm: 3,
  },
  human: { kind: "quiet", left: 25, right: 23, top: 24, bottom: 22 },
  sonnig: { kind: "quiet", left: 25, right: 23, top: 24, bottom: 22 },
  welle: {
    kind: "band",
    left: 25,
    right: 23,
    top: 24,
    bottom: 31,
    bandMm: 0,
    footMm: 15,
  },
  terracotta: {
    kind: "column",
    left: 34,
    right: 22,
    top: 24,
    bottom: 22,
    columnMm: 17,
  },
  pastell: {
    kind: "quiet",
    left: 26,
    right: 26,
    top: 25,
    bottom: 23,
    borderInsetMm: 11,
  },
  sonne: {
    kind: "band",
    left: 25,
    right: 23,
    top: 32,
    bottom: 24,
    bandMm: 15,
    footMm: 4,
  },
  studio: {
    kind: "column",
    left: 36,
    right: 22,
    top: 25,
    bottom: 23,
    columnMm: 20,
  },
  neon: {
    kind: "card",
    left: 28,
    right: 28,
    top: 27,
    bottom: 26,
    cardInsetMm: 12,
  },
  aurora: {
    kind: "band",
    left: 25,
    right: 23,
    top: 33,
    bottom: 24,
    bandMm: 16,
    footMm: 3,
  },
  verlauf: {
    kind: "card",
    left: 28,
    right: 28,
    top: 27,
    bottom: 26,
    cardInsetMm: 12,
  },
  citrus: {
    kind: "card",
    left: 28,
    right: 28,
    top: 27,
    bottom: 26,
    cardInsetMm: 12,
  },

  // Fresh dossier designs. The letter variants intentionally use quieter
  // geometry than the cover while keeping a recognisable signature.
  edge: { kind: "quiet", left: 32, right: 23, top: 24, bottom: 22 },
  glow: { kind: "quiet", left: 25, right: 24, top: 27, bottom: 23 },
  frame: {
    kind: "quiet",
    left: 27,
    right: 27,
    top: 26,
    bottom: 24,
    borderInsetMm: 9,
  },
  monoLuxe: {
    kind: "quiet",
    left: 27,
    right: 27,
    top: 27,
    bottom: 24,
    borderInsetMm: 12,
  },
  horizon: { kind: "quiet", left: 25, right: 23, top: 32, bottom: 23 },
  sunrise: { kind: "quiet", left: 25, right: 23, top: 32, bottom: 23 },
  forestFlow: { kind: "quiet", left: 33, right: 23, top: 25, bottom: 23 },
  violetPulse: { kind: "quiet", left: 25, right: 24, top: 29, bottom: 23 },
  studio2: { kind: "quiet", left: 35, right: 23, top: 25, bottom: 23 },
  studio3: { kind: "quiet", left: 34, right: 23, top: 25, bottom: 23 },
  warm2: { kind: "quiet", left: 25, right: 24, top: 27, bottom: 23 },
  warm3: { kind: "quiet", left: 27, right: 24, top: 30, bottom: 23 },
  ledger: { kind: "quiet", left: 33, right: 24, top: 26, bottom: 24 },
  prism: { kind: "quiet", left: 26, right: 25, top: 30, bottom: 24 },
  gallery: { kind: "quiet", left: 36, right: 23, top: 26, bottom: 24 },
  orbit: { kind: "quiet", left: 26, right: 25, top: 28, bottom: 24 },
  ribbon: { kind: "quiet", left: 26, right: 24, top: 33, bottom: 25 },
  cove: { kind: "quiet", left: 26, right: 24, top: 34, bottom: 24 },
};

function layoutFor(template: LetterTemplateId): LetterLayout {
  if (template === "brief") {
    return { kind: "quiet", left: 25, right: 25, top: 24, bottom: 22 };
  }
  return LETTER_LAYOUTS[template] ?? LETTER_LAYOUTS.klassisch;
}

function color(colors: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    if (colors[key]) return colors[key];
  }
  return "#111111";
}

function FreshLetterSignature({
  template,
  primary,
  secondary,
  accent,
}: {
  template: LetterTemplateId;
  primary: string;
  secondary: string;
  accent: string;
}) {
  switch (template as string) {
    case "edge":
      return (
        <>
          <div className="absolute inset-y-0 left-0 w-[7mm]" style={{ backgroundColor: primary }} />
          <div
            className="absolute inset-y-0 left-[7mm] w-[1.2mm]"
            style={{ backgroundColor: accent, opacity: 0.9 }}
          />
          <div
            className="absolute left-[17mm] top-[19mm] h-[1.2mm] w-[18mm]"
            style={{ backgroundColor: secondary }}
          />
        </>
      );
    case "glow":
      return (
        <>
          <div
            className="absolute right-[-18mm] top-[-18mm] h-[72mm] w-[72mm] rounded-full"
            style={{ backgroundColor: primary, opacity: 0.16 }}
          />
          <div
            className="absolute bottom-[-24mm] left-[-20mm] h-[66mm] w-[66mm] rounded-full"
            style={{ backgroundColor: secondary, opacity: 0.17 }}
          />
          <div
            className="absolute left-[25mm] top-[18mm] h-[1mm] w-[24mm] rounded-full"
            style={{ background: `linear-gradient(90deg, ${primary}, ${accent})` }}
          />
        </>
      );
    case "frame":
      return (
        <>
          <div
            className="absolute left-[9mm] top-[9mm] h-[17mm] w-[2mm]"
            style={{ backgroundColor: accent }}
          />
          <div
            className="absolute bottom-[9mm] right-[9mm] h-[2mm] w-[17mm]"
            style={{ backgroundColor: secondary }}
          />
        </>
      );
    case "monoLuxe":
      return (
        <>
          <div
            className="absolute left-[27mm] right-[27mm] top-[17mm] h-px"
            style={{ backgroundColor: primary, opacity: 0.75 }}
          />
          <div
            className="absolute left-[27mm] top-[15.5mm] h-[4mm] w-[4mm]"
            style={{ backgroundColor: accent }}
          />
          <div
            className="absolute bottom-[16mm] left-[27mm] h-px w-[38mm]"
            style={{ backgroundColor: accent, opacity: 0.75 }}
          />
        </>
      );
    case "horizon":
      return (
        <>
          <div
            className="absolute inset-x-0 top-0 h-[12mm]"
            style={{ background: `linear-gradient(90deg, ${primary}, ${secondary})` }}
          />
          <div
            className="absolute left-[25mm] top-[20mm] h-[1.2mm] w-[24mm] rounded-full"
            style={{ backgroundColor: accent }}
          />
        </>
      );
    case "sunrise":
      return (
        <>
          <div
            className="absolute inset-x-0 top-0 h-[12mm]"
            style={{ background: `linear-gradient(90deg, ${primary}, ${secondary})` }}
          />
          <div
            className="absolute right-[16mm] top-[16mm] h-[20mm] w-[20mm] rounded-full"
            style={{ backgroundColor: accent, opacity: 0.28 }}
          />
        </>
      );
    case "forestFlow":
      return (
        <>
          <div
            className="absolute inset-y-0 left-0 w-[10mm]"
            style={{ backgroundColor: primary }}
          />
          <div
            className="absolute left-[7mm] top-[18mm] h-[30mm] w-[30mm] rounded-full"
            style={{ backgroundColor: secondary, opacity: 0.22 }}
          />
          <div
            className="absolute left-[18mm] top-[22mm] h-[1.2mm] w-[17mm]"
            style={{ backgroundColor: accent }}
          />
        </>
      );
    case "violetPulse":
      return (
        <>
          <div
            className="absolute right-[-30mm] top-[-28mm] h-[78mm] w-[100mm] rotate-[-12deg] rounded-[18mm]"
            style={{
              background: `linear-gradient(135deg, ${primary}, ${secondary})`,
              opacity: 0.2,
            }}
          />
          <div
            className="absolute left-[25mm] top-[18mm] h-[1.4mm] w-[28mm] rounded-full"
            style={{ backgroundColor: accent }}
          />
        </>
      );
    case "studio2":
      return (
        <>
          <div
            className="absolute inset-y-0 left-0 w-[13mm]"
            style={{ backgroundColor: primary }}
          />
          <div
            className="absolute left-0 top-[21mm] h-[8mm] w-[30mm]"
            style={{ backgroundColor: secondary }}
          />
          <div
            className="absolute left-[19mm] top-[34mm] h-[1.2mm] w-[16mm]"
            style={{ backgroundColor: accent }}
          />
        </>
      );
    case "studio3":
      return (
        <>
          <div
            className="absolute inset-y-0 left-0 w-[12mm]"
            style={{ backgroundColor: primary }}
          />
          <div
            className="absolute left-[12mm] top-0 h-[15mm] w-[54mm]"
            style={{ backgroundColor: secondary, opacity: 0.92 }}
          />
          <div
            className="absolute left-[22mm] top-[21mm] h-[1.3mm] w-[18mm]"
            style={{ backgroundColor: accent }}
          />
        </>
      );
    case "warm2":
      return (
        <>
          <div
            className="absolute right-[-24mm] top-[-24mm] h-[70mm] w-[78mm] rounded-[48%]"
            style={{ backgroundColor: secondary, opacity: 0.28 }}
          />
          <div
            className="absolute right-[24mm] top-[15mm] h-[12mm] w-[12mm] rounded-full"
            style={{ backgroundColor: primary, opacity: 0.42 }}
          />
          <div
            className="absolute left-[25mm] top-[18mm] h-[1.2mm] w-[22mm]"
            style={{ backgroundColor: accent }}
          />
        </>
      );
    case "warm3":
      return (
        <>
          <div className="absolute inset-x-0 top-0 h-[9mm]" style={{ backgroundColor: primary }} />
          <div
            className="absolute right-[-22mm] top-[9mm] h-[52mm] w-[58mm] rounded-bl-[42mm]"
            style={{ backgroundColor: secondary, opacity: 0.32 }}
          />
          <div
            className="absolute left-[27mm] top-[20mm] h-[1.2mm] w-[18mm]"
            style={{ backgroundColor: accent }}
          />
        </>
      );
    case "ledger":
      return (
        <>
          <div
            className="absolute inset-y-[14mm] left-[12mm] w-[9mm]"
            style={{ backgroundColor: secondary, opacity: 0.42 }}
          />
          <div
            className="absolute inset-y-[14mm] left-[22mm] w-px"
            style={{ backgroundColor: primary, opacity: 0.6 }}
          />
          <div
            className="absolute left-[33mm] right-[24mm] top-[18mm] h-px"
            style={{ backgroundColor: accent, opacity: 0.78 }}
          />
        </>
      );
    case "prism":
      return (
        <>
          <div
            className="absolute right-0 top-0 h-[18mm] w-[92mm]"
            style={{
              backgroundColor: primary,
              clipPath: "polygon(18% 0, 100% 0, 100% 100%, 0 100%)",
            }}
          />
          <div
            className="absolute right-0 top-[18mm] h-[4mm] w-[66mm]"
            style={{
              backgroundColor: secondary,
              clipPath: "polygon(12% 0, 100% 0, 100% 100%, 0 100%)",
            }}
          />
          <div
            className="absolute left-[26mm] top-[20mm] h-[1.2mm] w-[18mm]"
            style={{ backgroundColor: accent }}
          />
        </>
      );
    case "gallery":
      return (
        <>
          <div
            className="absolute inset-y-0 left-0 w-[15mm]"
            style={{ backgroundColor: primary }}
          />
          <div
            className="absolute left-[5mm] top-[18mm] h-[34mm] w-[23mm] rounded-[8mm]"
            style={{ backgroundColor: secondary }}
          />
          <div
            className="absolute left-[20mm] top-[58mm] h-[6mm] w-[6mm]"
            style={{ backgroundColor: accent }}
          />
        </>
      );
    case "orbit":
      return (
        <>
          <div
            className="absolute right-[-24mm] top-[-24mm] h-[72mm] w-[72mm] rounded-full border-[7mm]"
            style={{ borderColor: primary, opacity: 0.18 }}
          />
          <div
            className="absolute right-[15mm] top-[18mm] h-[18mm] w-[18mm] rounded-full border-[2mm]"
            style={{ borderColor: secondary, opacity: 0.52 }}
          />
          <div
            className="absolute left-[26mm] top-[19mm] h-[1.2mm] w-[20mm]"
            style={{ backgroundColor: accent }}
          />
        </>
      );
    case "ribbon":
      return (
        <>
          <div
            className="absolute left-0 right-[20mm] top-0 h-[11mm] rounded-br-[9mm]"
            style={{ backgroundColor: primary }}
          />
          <div
            className="absolute left-[18mm] right-[48mm] top-[11mm] h-[5mm] rounded-b-[5mm]"
            style={{ backgroundColor: secondary }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-[3mm]"
            style={{ backgroundColor: accent }}
          />
        </>
      );
    case "cove":
      return (
        <>
          <div
            className="absolute left-0 right-0 top-0 h-[14mm] rounded-br-[38mm]"
            style={{ backgroundColor: primary }}
          />
          <div
            className="absolute right-[-14mm] top-[5mm] h-[42mm] w-[56mm] rounded-bl-[34mm]"
            style={{ backgroundColor: secondary, opacity: 0.86 }}
          />
          <div
            className="absolute left-[26mm] top-[21mm] h-[1.3mm] w-[20mm]"
            style={{ backgroundColor: accent }}
          />
        </>
      );
    default:
      return null;
  }
}

function LetterBackground({ design }: { design: LetterDesign }) {
  const { template, colors } = design;
  if (template === "brief") {
    return (
      <div
        data-letter-background="brief"
        className="absolute inset-0 bg-white"
        aria-hidden="true"
      />
    );
  }

  const layout = layoutFor(template);
  const palette = cvPalette(colors);
  const primary = color(colors, "primary", "accent", "secondary", "ink");
  const secondary = color(colors, "secondary", "accent", "primary", "ink");
  const accent = color(colors, "accent", "secondary", "primary", "ink");
  const primaryRoles = onColorRoles(primary, accent);

  if (layout.kind === "card") {
    const inset = layout.cardInsetMm ?? 12;
    const cardBackground = template === "citrus" ? color(colors, "bg") : palette.paper;
    return (
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        {template === "neon" && (
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at 18% 18%, ${primary} 0, transparent 34%), radial-gradient(circle at 82% 78%, ${secondary} 0, transparent 34%), ${color(colors, "bg")}`,
            }}
          />
        )}
        {template === "verlauf" && (
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(145deg, ${primary}, ${secondary})` }}
          />
        )}
        {template === "citrus" && (
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(160deg, ${primary}, ${secondary})` }}
          />
        )}
        <div
          className="absolute shadow-sm"
          style={{
            inset: `${inset}mm`,
            borderRadius: template === "citrus" ? "8mm" : "6mm",
            backgroundColor: cardBackground,
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ backgroundColor: palette.paper }}
      aria-hidden="true"
    >
      <FreshLetterSignature
        template={template}
        primary={primary}
        secondary={secondary}
        accent={accent}
      />

      {layout.kind === "column" && (
        <div
          className="absolute inset-y-0 left-0"
          style={{ width: `${layout.columnMm ?? 18}mm`, backgroundColor: primary }}
        />
      )}

      {template === "studio" && (
        <div
          className="absolute left-0 top-[24mm] h-[10mm]"
          style={{
            width: "30mm",
            backgroundColor: accent,
            color: primaryRoles.ink,
          }}
        />
      )}

      {template === "blockig" && (
        <>
          <div
            className="absolute left-0 top-[48mm] h-[28mm] w-[25mm]"
            style={{ backgroundColor: accent, opacity: 0.9 }}
          />
          <div
            className="absolute left-[7mm] top-[88mm] h-[2.5mm] w-[13mm]"
            style={{ backgroundColor: primary }}
          />
        </>
      )}

      {template === "terracotta" && (
        <div
          className="absolute left-[6mm] top-[20mm] h-[38mm] w-[1px]"
          style={{ backgroundColor: secondary, opacity: 0.75 }}
        />
      )}

      {layout.kind === "band" && (layout.bandMm ?? 0) > 0 && (
        <div
          className="absolute inset-x-0 top-0"
          style={{ height: `${layout.bandMm}mm`, backgroundColor: primary }}
        />
      )}

      {(layout.footMm ?? 0) > 0 && (
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            height: `${layout.footMm}mm`,
            backgroundColor: template === "sonne" ? primary : accent,
          }}
        />
      )}

      {template === "aurora" && (
        <div
          className="absolute inset-x-0 top-0 h-[16mm]"
          style={{ background: `linear-gradient(90deg, ${primary}, ${secondary})` }}
        />
      )}

      {template === "freundlich" && (
        <>
          <div
            className="absolute right-[-14mm] top-[-13mm] h-[39mm] w-[39mm] rounded-full"
            style={{ backgroundColor: secondary, opacity: 0.65 }}
          />
          <div
            className="absolute right-[10mm] top-[8mm] h-[8mm] w-[8mm] rounded-full"
            style={{ backgroundColor: accent, opacity: 0.75 }}
          />
        </>
      )}

      {template === "sonne" && (
        <div
          className="absolute right-[12mm] top-[5mm] h-[24mm] w-[24mm] rounded-full"
          style={{ backgroundColor: accent, opacity: 0.26 }}
        />
      )}

      {template === "welle" && (
        <>
          <div
            className="absolute inset-x-0 bottom-0 h-[15mm]"
            style={{ backgroundColor: primary }}
          />
          <div
            className="absolute bottom-[13mm] left-0 h-[5mm] w-[62%] rounded-tr-[100%]"
            style={{ backgroundColor: secondary, opacity: 0.8 }}
          />
        </>
      )}

      {template === "human" && (
        <>
          <div
            className="absolute right-[-31mm] top-[-22mm] h-[78mm] w-[98mm] rounded-[50%]"
            style={{ backgroundColor: secondary, opacity: 0.35 }}
          />
          <div
            className="absolute bottom-[16mm] left-[-18mm] h-[34mm] w-[55mm] rounded-[50%]"
            style={{ backgroundColor: primary, opacity: 0.08 }}
          />
        </>
      )}

      {template === "sonnig" && (
        <div
          className="absolute right-[-25mm] top-[-28mm] h-[72mm] w-[72mm] rounded-full border-[8mm]"
          style={{ borderColor: primary, opacity: 0.18 }}
        />
      )}

      {template === "modern" && (
        <div
          className="absolute right-[-20mm] top-[14mm] h-[62mm] w-[62mm] rounded-full"
          style={{ backgroundColor: accent, opacity: 0.07 }}
        />
      )}

      {template === "serioes" && (
        <div
          className="absolute left-[24mm] right-[22mm] top-[22mm] h-px"
          style={{ backgroundColor: accent, opacity: 0.75 }}
        />
      )}

      {layout.borderInsetMm && (
        <>
          <div
            className="absolute"
            style={{
              inset: `${layout.borderInsetMm}mm`,
              border: `0.55px solid ${accent}`,
              opacity: template === "klassisch" ? 0.3 : 0.46,
            }}
          />
          {template === "edel" && (
            <div
              className="absolute"
              style={{
                inset: `${layout.borderInsetMm + 3}mm`,
                border: `0.35px solid ${accent}`,
                opacity: 0.28,
              }}
            />
          )}
        </>
      )}

      {template === "pastell" && (
        <div
          className="absolute inset-x-[11mm] top-[11mm] h-[6mm] rounded-sm"
          style={{ backgroundColor: secondary, opacity: 0.58 }}
        />
      )}
    </div>
  );
}

function Lines({
  values,
  align = "left",
}: {
  values: Array<string | undefined>;
  align?: "left" | "right";
}) {
  const visible = values.filter((value): value is string => !!value?.trim());
  if (!visible.length) return null;
  return (
    <div style={{ textAlign: align }}>
      {visible.map((value, index) => (
        <div key={`${value}-${index}`}>{value}</div>
      ))}
    </div>
  );
}

function Separator({ color, marker }: { color: string; marker: string }) {
  return (
    <hr
      data-letter-pdf-rule={marker}
      className="my-[4mm] border-0 border-t"
      style={{ borderColor: color, opacity: 0.72 }}
    />
  );
}

export function LetterCanvas({
  data,
  design,
  exportMode = false,
  onOverflowChange,
  onImageChange,
  onImageRemove,
  ariaLabel = "Vorschau Motivationsschreiben",
}: {
  data: LetterData;
  design: LetterDesign;
  exportMode?: boolean;
  onOverflowChange?: (overflow: boolean) => void;
  onImageChange?: (id: string, patch: Partial<LetterFlowImage>) => void;
  onImageRemove?: (id: string) => void;
  ariaLabel?: string;
}) {
  const layout = layoutFor(design.template);
  const contentWidthMm = 210 - layout.left - layout.right;
  const palette =
    design.template === "brief"
      ? { ink: "#111111", muted: "#4b5563", accent: "#111111", paper: "#ffffff" }
      : cvPalette(design.colors);
  const fontFamily =
    design.template === "brief"
      ? FONT_STACKS[design.font]
      : effectiveDossierFont(design.template, design.fontOverride);
  const senderAlign = design.senderAlign ?? "left";
  const recipientAlign = design.recipientAlign ?? "left";
  const dateAlign = design.dateAlign ?? "left";
  const beilagen = DEFAULT_LETTER_BEILAGEN.map(
    (fallback, index) => data.beilagen?.[index] ?? fallback,
  ).filter((value) => value.trim());
  const showBeilagen = data.showBeilagen !== false && beilagen.length > 0;
  const placeholder =
    "Hier entsteht dein persönliches Motivationsschreiben. Erkläre, weshalb du dich für diesen Beruf und diesen Lehrbetrieb interessierst und was du mitbringst.";
  const bodyHtml = data.richTextHtml?.trim()
    ? letterRichHtml(data.richTextHtml, data.text)
    : data.text
      ? plainTextToRichHtml(data.text)
      : exportMode
        ? ""
        : plainTextToRichHtml(placeholder);
  const textLayerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!onOverflowChange) return;
    const textLayer = textLayerRef.current;
    if (!textLayer) return;

    const measure = () => onOverflowChange(textLayer.scrollHeight > textLayer.clientHeight + 1);
    const frame = requestAnimationFrame(() => requestAnimationFrame(measure));
    const observer = new ResizeObserver(measure);
    observer.observe(textLayer);
    void document.fonts?.ready.then(measure);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [bodyHtml, data, design, onOverflowChange]);

  return (
    <article
      data-letter-page
      data-letter-template={design.template}
      data-letter-font={design.fontOverride ?? design.font}
      data-letter-font-source={design.template === "brief" ? "standalone" : design.fontOverride ? "override" : "family"}
      className="relative h-[1123px] w-[794px] overflow-hidden shadow-xl"
      style={{ color: palette.ink, fontFamily, backgroundColor: palette.paper }}
      aria-label={ariaLabel}
    >
      <LetterBackground design={design} />
      <div
        ref={textLayerRef}
        data-letter-text-layer
        className="absolute flex flex-col"
        style={{
          left: `${layout.left}mm`,
          right: `${layout.right}mm`,
          top: `${layout.top}mm`,
          bottom: `${layout.bottom}mm`,
          fontSize: "10.5pt",
          lineHeight: 1.48,
        }}
      >
        <div
          data-letter-section="sender"
          className="text-[9.5pt] leading-[1.45]"
          style={{ textAlign: senderAlign }}
        >
          <div data-letter-pdf-text="sender">
            <Lines
              values={[
                data.absenderName,
                data.absenderAdresse,
                data.absenderPlzOrt,
                data.absenderTelefon,
                data.absenderEmail,
              ]}
              align={senderAlign}
            />
          </div>
        </div>

        {design.ruleAfterSender ? <Separator color={palette.accent} marker="sender" /> : null}

        <div
          data-letter-section="recipient"
          className="mt-[6mm] min-h-[24mm] text-[10pt] leading-[1.45]"
          style={{ textAlign: recipientAlign }}
        >
          <div data-letter-pdf-text="recipient">
            <Lines
              values={[
                data.empfaengerFirma,
                data.empfaengerName,
                data.empfaengerAdresse,
                data.empfaengerPlzOrt,
              ]}
              align={recipientAlign}
            />
          </div>
        </div>

        {design.ruleAfterRecipient ? <Separator color={palette.accent} marker="recipient" /> : null}

        <div
          data-letter-section="date"
          data-letter-pdf-text="date"
          className="mt-[4mm] text-[9.5pt] leading-[1.45]"
          style={{ color: palette.muted, textAlign: dateAlign }}
        >
          <Lines
            values={[
              data.ort && data.datum ? `${data.ort}, ${data.datum}` : data.ort || data.datum,
            ]}
            align={dateAlign}
          />
        </div>

        <div className="mt-[7mm]">
          <div data-letter-pdf-text="subject" className="text-[12pt] font-semibold leading-tight">
            {data.betreff || (exportMode ? "" : "Bewerbung um eine Lehrstelle als …")}
          </div>
          {design.ruleAfterSubject ? (
            <Separator color={palette.accent} marker="subject" />
          ) : (
            <div className="h-[8mm]" aria-hidden="true" />
          )}

          <div data-letter-flow-zone>
            <p data-letter-pdf-text="salutation" className="mb-[5mm]">
              {data.anrede || (exportMode ? "" : "Guten Tag")}
            </p>

            <LetterFlowImages
              images={data.images ?? []}
              contentWidthMm={contentWidthMm}
              exportMode={exportMode}
              onChange={onImageChange}
              onRemove={onImageRemove}
            />

            <div
              data-letter-pdf-richtext="body"
            className="text-[10.5pt] leading-[1.55] [&_div]:min-h-[1.55em] [&_p]:min-h-[1.55em] [&_hr]:my-[5mm] [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-current [&_hr]:opacity-50"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />

          <div className="mt-[9mm]">
            <div data-letter-pdf-text="closing">
              {data.gruss || (exportMode ? "" : "Freundliche Grüsse")}
            </div>
            <div data-letter-pdf-text="signature" className="mt-[9mm] font-medium">
              {data.unterschrift || data.absenderName}
            </div>
          </div>

            {showBeilagen ? (
              <div className="mt-[9mm] text-[10pt] leading-[1.45]">
                <div data-letter-pdf-text="attachments-heading" className="font-semibold">
                  Beilagen:
                </div>
                <div data-letter-pdf-text="attachments-body" className="mt-[1.5mm]">
                  <Lines values={beilagen} />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
