import { useEffect, useRef } from "react";
import { FONT_STACKS } from "@/components/cover/types";
import { cvPalette } from "@/components/cv/palette";
import { effectiveDossierFont } from "@/lib/dossier-theme";
import { letterLayoutFor } from "@/components/dossier/DossierSheetBackground";
import {
  DEFAULT_LETTER_BEILAGEN,
  type LetterData,
  type LetterDesign,
  type LetterFlowImage,
} from "./types";
import { letterRichHtml, plainTextToRichHtml } from "./rich-text";
import { LetterFlowImages } from "./LetterFlowImages";

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

function contrastInk(color: string): string {
  const match = color.trim().match(/^#([0-9a-f]{6})$/i);
  if (!match) return "#ffffff";
  const value = Number.parseInt(match[1], 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.58 ? "#111111" : "#ffffff";
}

function letterContentLayout(design: LetterDesign) {
  const reference = letterLayoutFor(design.template);
  const headerMode = design.headerMode ?? "compact";
  const sidebar = reference.kind === "column";
  const card = reference.kind === "card";

  return {
    left: sidebar ? 30 : card ? 27 : 24,
    right: card ? 27 : 23,
    top: headerMode === "contact" ? 27 : headerMode === "none" ? 18 : 21,
    bottom: 17,
    kind: reference.kind,
  };
}

function LetterChrome({ data, design }: { data: LetterData; design: LetterDesign }) {
  const mode = design.headerMode ?? "compact";
  const reference = letterLayoutFor(design.template);
  const sourcePalette = cvPalette(design.colors);
  const primary = design.template === "brief" ? "#111111" : sourcePalette.accent;
  const secondary = design.template === "brief" ? "#4b5563" : sourcePalette.heading;
  const headerInk = contrastInk(primary);
  const sidebar = reference.kind === "column";
  const card = reference.kind === "card";
  const band = reference.kind === "band";
  const contactBits = [
    design.headerShowPhone !== false ? data.absenderTelefon : "",
    design.headerShowEmail !== false ? data.absenderEmail : "",
  ].filter(Boolean);

  return (
    <div
      data-letter-chrome
      data-letter-header-mode={mode}
      data-letter-reference-kind={reference.kind}
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {mode === "compact" ? (
        <>
          {sidebar ? (
            <>
              <div className="absolute inset-y-0 left-0 w-[6mm]" style={{ backgroundColor: primary }} />
              <div
                className="absolute left-[13mm] top-[14mm] h-[1.2mm] w-[24mm]"
                style={{ backgroundColor: secondary }}
              />
            </>
          ) : card ? (
            <>
              <div
                className="absolute right-[18mm] top-[11mm] h-[7mm] w-[32mm] rounded-full"
                style={{ backgroundColor: primary, opacity: 0.2 }}
              />
              <div
                className="absolute left-[24mm] top-[15mm] h-[1.2mm] w-[24mm]"
                style={{ backgroundColor: primary }}
              />
            </>
          ) : band ? (
            <>
              <div className="absolute inset-x-0 top-0 h-[5mm]" style={{ backgroundColor: primary }} />
              <div
                className="absolute left-[24mm] top-[12mm] h-[1.1mm] w-[22mm]"
                style={{ backgroundColor: secondary }}
              />
            </>
          ) : (
            <>
              <div
                className="absolute left-[24mm] right-[23mm] top-[13mm] h-[1px]"
                style={{ backgroundColor: primary, opacity: 0.72 }}
              />
              <div
                className="absolute left-[24mm] top-[11.8mm] h-[3mm] w-[10mm]"
                style={{ backgroundColor: secondary }}
              />
            </>
          )}
        </>
      ) : null}

      {mode === "contact" ? (
        <>
          <div className="absolute inset-x-0 top-0 h-[18mm]" style={{ backgroundColor: primary }} />
          {sidebar ? (
            <div className="absolute inset-y-0 left-0 w-[6mm]" style={{ backgroundColor: primary }} />
          ) : null}
          <div
            data-letter-integrated-contact
            className="absolute left-[24mm] right-[23mm] top-[3.1mm] flex min-h-[11mm] items-center justify-between gap-[8mm] text-[8.5pt] leading-[1.28]"
            style={{ color: headerInk }}
          >
            <div className="min-w-0">
              {design.headerShowName !== false && data.absenderName ? (
                <div className="truncate text-[10pt] font-semibold">{data.absenderName}</div>
              ) : null}
              {design.headerShowAddress !== false ? (
                <div className="truncate opacity-90">
                  {[data.absenderAdresse, data.absenderPlzOrt].filter(Boolean).join(" · ")}
                </div>
              ) : null}
            </div>
            {contactBits.length ? (
              <div className="shrink-0 text-right opacity-95">
                {contactBits.map((value) => (
                  <div key={value}>{value}</div>
                ))}
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      <div
        data-letter-footer="compact"
        className="absolute inset-x-0 bottom-0 h-[2.4mm]"
        style={{ backgroundColor: secondary, opacity: design.template === "brief" ? 0.75 : 0.92 }}
      />
    </div>
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
  const layout = letterContentLayout(design);
  const contentWidthMm = 210 - layout.left - layout.right;
  const sourcePalette = cvPalette(design.colors);
  const palette = {
    ink: "#111111",
    muted: "#4b5563",
    accent: design.template === "brief" ? "#111111" : sourcePalette.accent,
    paper: "#ffffff",
  };
  const fontFamily =
    design.template === "brief"
      ? FONT_STACKS[design.font]
      : effectiveDossierFont(design.template, design.fontOverride);
  const senderAlign = design.senderAlign ?? "left";
  const recipientAlign = design.recipientAlign ?? "left";
  const dateAlign = design.dateAlign ?? "left";
  const headerMode = design.headerMode ?? "compact";
  const senderIntegrated = headerMode === "contact";
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
      data-letter-header-mode={headerMode}
      data-letter-font={design.fontOverride ?? design.font}
      data-letter-font-source={
        design.template === "brief" ? "standalone" : design.fontOverride ? "override" : "family"
      }
      className="relative h-[1123px] w-[794px] overflow-hidden bg-white shadow-xl"
      style={{ color: palette.ink, fontFamily, backgroundColor: palette.paper }}
      aria-label={ariaLabel}
    >
      <LetterChrome data={data} design={design} />
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
        {!senderIntegrated ? (
          <>
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
          </>
        ) : null}

        <div
          data-letter-section="recipient"
          className={`${senderIntegrated ? "mt-[1mm]" : "mt-[6mm]"} min-h-[24mm] text-[10pt] leading-[1.45]`}
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
