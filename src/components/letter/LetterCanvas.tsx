import { FONT_STACKS, type TemplateId } from "@/components/cover/types";
import { cvPalette, onColorRoles } from "@/components/cv/palette";
import type { LetterData, LetterDesign } from "./types";
import { letterRichHtml, plainTextToRichHtml } from "./rich-text";

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
const LETTER_LAYOUTS: Record<TemplateId, LetterLayout> = {
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
};

function layoutFor(template: TemplateId): LetterLayout {
  return LETTER_LAYOUTS[template] ?? LETTER_LAYOUTS.klassisch;
}

function color(colors: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    if (colors[key]) return colors[key];
  }
  return "#111111";
}

function LetterBackground({ design }: { design: LetterDesign }) {
  const { template, colors } = design;
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
        <>
          <div
            className="absolute left-[24mm] top-[18mm] h-[2mm] w-[10mm]"
            style={{ backgroundColor: accent }}
          />
          <div
            className="absolute right-[-20mm] top-[14mm] h-[62mm] w-[62mm] rounded-full"
            style={{ backgroundColor: accent, opacity: 0.07 }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-[4mm]"
            style={{ backgroundColor: primary }}
          />
        </>
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
}: {
  data: LetterData;
  design: LetterDesign;
  exportMode?: boolean;
}) {
  const layout = layoutFor(design.template);
  const palette = cvPalette(design.colors);
  const fontFamily = FONT_STACKS[design.font];
  const senderAlign = design.senderAlign ?? "left";
  const recipientAlign = design.recipientAlign ?? "left";
  const dateAlign = design.dateAlign ?? "left";
  const bodyColumns = design.bodyColumns ?? 1;
  const placeholder =
    "Hier entsteht dein persönliches Anschreiben. Erkläre, weshalb du dich für diesen Beruf und diesen Lehrbetrieb interessierst und was du mitbringst.";
  const bodyHtml = data.richTextHtml?.trim()
    ? letterRichHtml(data.richTextHtml, data.text)
    : data.text
      ? plainTextToRichHtml(data.text)
      : exportMode
        ? ""
        : plainTextToRichHtml(placeholder);

  return (
    <article
      data-letter-page
      data-letter-font={design.font}
      className="relative h-[1123px] w-[794px] overflow-hidden shadow-xl"
      style={{ color: palette.ink, fontFamily, backgroundColor: palette.paper }}
      aria-label="Vorschau Anschreiben"
    >
      <LetterBackground design={design} />
      <div
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
          <div
            data-letter-pdf-text="subject"
            className="mb-[8mm] border-b pb-[2.5mm] text-[12pt] font-semibold leading-tight"
            style={{ borderColor: palette.accent }}
          >
            {data.betreff || (exportMode ? "" : "Bewerbung um eine Lehrstelle als …")}
          </div>

          <p data-letter-pdf-text="salutation" className="mb-[5mm]">
            {data.anrede || (exportMode ? "" : "Guten Tag")}
          </p>

          <div
            data-letter-pdf-richtext="body"
            data-letter-columns={bodyColumns}
            className="text-[10.5pt] leading-[1.55] [&_div]:min-h-[1.55em] [&_p]:min-h-[1.55em] [&_hr]:my-[5mm] [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-current [&_hr]:opacity-50"
            style={{ columnCount: bodyColumns, columnGap: bodyColumns > 1 ? "6mm" : undefined }}
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
        </div>
      </div>
    </article>
  );
}
