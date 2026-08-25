import { FONT_STACKS, type TemplateId } from "@/components/cover/types";
import { cvFrameFor } from "@/components/cv/archetype";
import { cvPalette } from "@/components/cv/palette";
import type { LetterData, LetterDesign } from "./types";

function color(colors: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    if (colors[key]) return colors[key];
  }
  return "#111111";
}

function letterGeometry(template: TemplateId) {
  const frame = cvFrameFor(template);
  if (frame.id === "column") {
    return { left: 32, right: 22, top: 22, bottom: 20, column: 18, band: 0, card: 0, border: 0 };
  }
  if (frame.id === "band") {
    const band = Math.max(8, Math.min(20, Math.round(frame.headFirstMm * 0.36)));
    return { left: 24, right: 22, top: band + 15, bottom: 20, column: 0, band, card: 0, border: 0 };
  }
  if (frame.id === "card") {
    return { left: 27, right: 27, top: 25, bottom: 24, column: 0, band: 0, card: 12, border: 0 };
  }
  const border = frame.borderInsetMm > 0 ? Math.min(12, frame.borderInsetMm) : 0;
  return { left: 24, right: 22, top: 22, bottom: 20, column: 0, band: 0, card: 0, border };
}

function LetterBackground({ design }: { design: LetterDesign }) {
  const { template, colors } = design;
  const geo = letterGeometry(template);
  const palette = cvPalette(colors);
  const primary = color(colors, "primary", "accent", "ink");
  const accent = color(colors, "accent", "secondary", "primary", "ink");

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ backgroundColor: palette.paper }}
      aria-hidden="true"
    >
      {geo.column > 0 && (
        <>
          <div
            className="absolute inset-y-0 left-0"
            style={{ width: `${geo.column}mm`, backgroundColor: primary }}
          />
          <div
            className="absolute left-0 top-[32mm]"
            style={{
              width: `${geo.column}mm`,
              height: "7mm",
              backgroundColor: accent,
              opacity: 0.9,
            }}
          />
        </>
      )}
      {geo.band > 0 && (
        <>
          <div
            className="absolute inset-x-0 top-0"
            style={{ height: `${geo.band}mm`, backgroundColor: primary }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-[3mm]"
            style={{ backgroundColor: accent }}
          />
        </>
      )}
      {geo.card > 0 && (
        <>
          <div
            className="absolute inset-0"
            style={{ backgroundColor: primary, opacity: 0.92 }}
          />
          <div
            className="absolute"
            style={{
              inset: `${geo.card}mm`,
              borderRadius: "5mm",
              backgroundColor: palette.paper,
            }}
          />
        </>
      )}
      {geo.border > 0 && (
        <>
          <div
            className="absolute"
            style={{
              inset: `${geo.border}mm`,
              border: `0.5px solid ${accent}`,
              opacity: 0.45,
            }}
          />
          {template === "edel" && (
            <div
              className="absolute"
              style={{
                inset: `${geo.border + 3}mm`,
                border: `0.35px solid ${accent}`,
                opacity: 0.25,
              }}
            />
          )}
        </>
      )}
      {geo.column === 0 && geo.band === 0 && geo.card === 0 && geo.border === 0 && (
        <div
          className="absolute bottom-0 left-0 h-[3mm] w-full"
          style={{ backgroundColor: accent, opacity: 0.7 }}
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

export function LetterCanvas({ data, design }: { data: LetterData; design: LetterDesign }) {
  const geo = letterGeometry(design.template);
  const palette = cvPalette(design.colors);
  const fontFamily = FONT_STACKS[design.font];

  return (
    <article
      className="relative h-[297mm] w-[210mm] overflow-hidden bg-white shadow-xl"
      style={{ color: palette.ink, fontFamily, backgroundColor: palette.paper }}
      aria-label="Vorschau Anschreiben"
    >
      <LetterBackground design={design} />
      <div
        className="absolute flex flex-col"
        style={{
          left: `${geo.left}mm`,
          right: `${geo.right}mm`,
          top: `${geo.top}mm`,
          bottom: `${geo.bottom}mm`,
          fontSize: "10.5pt",
          lineHeight: 1.48,
        }}
      >
        <div className="flex min-h-[26mm] justify-between gap-8 text-[9.5pt] leading-[1.45]">
          <Lines
            values={[
              data.absenderName,
              data.absenderAdresse,
              data.absenderPlzOrt,
              data.absenderTelefon,
              data.absenderEmail,
            ]}
          />
          <div className="min-w-[45mm] text-right" style={{ color: palette.muted }}>
            <Lines
              values={[
                data.ort && data.datum ? `${data.ort}, ${data.datum}` : data.ort || data.datum,
              ]}
              align="right"
            />
          </div>
        </div>

        <div className="mt-[7mm] min-h-[29mm] text-[10pt] leading-[1.45]">
          <Lines
            values={[
              data.empfaengerFirma,
              data.empfaengerName,
              data.empfaengerAdresse,
              data.empfaengerPlzOrt,
            ]}
          />
        </div>

        <div className="mt-[7mm]">
          <div
            className="mb-[8mm] border-b pb-[2.5mm] text-[12pt] font-semibold leading-tight"
            style={{ borderColor: palette.accent }}
          >
            {data.betreff || "Bewerbung um eine Lehrstelle als …"}
          </div>

          <p className="mb-[5mm]">{data.anrede || "Guten Tag"}</p>

          <div className="whitespace-pre-line text-[10.5pt] leading-[1.55]">
            {data.text ||
              "Hier entsteht dein persönliches Anschreiben. Erkläre, weshalb du dich für diesen Beruf und diesen Lehrbetrieb interessierst und was du mitbringst."}
          </div>

          <div className="mt-[9mm]">
            <div>{data.gruss || "Freundliche Grüsse"}</div>
            <div className="mt-[9mm] font-medium">{data.unterschrift || data.absenderName}</div>
          </div>
        </div>
      </div>
    </article>
  );
}
