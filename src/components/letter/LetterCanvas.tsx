import { useEffect, useRef } from "react";
import { FONT_STACKS } from "@/components/cover/types";
import { cvPalette, onColorRoles } from "@/components/cv/palette";
import { effectiveDossierFont } from "@/lib/dossier-theme";
import {
  letterPageGeometry,
  visibleLetterAttachments,
  type LetterPageGeometry,
} from "./layout-system";
import type { LetterData, LetterDesign, LetterFlowImage } from "./types";
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

function LetterChrome({
  data,
  design,
  geometry,
}: {
  data: LetterData;
  design: LetterDesign;
  geometry: LetterPageGeometry;
}) {
  const mode = geometry.effectiveHeaderMode;
  const footerMode = geometry.effectiveFooterMode;
  const sourcePalette = cvPalette(design.colors);
  const primary =
    design.template === "brief"
      ? "#111111"
      : design.colors.primary ??
        design.colors.accent ??
        design.colors.secondary ??
        sourcePalette.accent;
  const secondary =
    design.template === "brief"
      ? "#4b5563"
      : design.colors.accent ?? design.colors.secondary ?? sourcePalette.accent;
  const headerRoles = onColorRoles(primary, secondary);
  const footerRoles = onColorRoles(secondary, primary);
  const sidebar = geometry.archetype === "sidebar";
  const frame = geometry.archetype === "frame";
  const band = geometry.archetype === "band";
  const contactBits = [
    design.headerShowPhone !== false ? data.absenderTelefon : "",
    design.headerShowEmail !== false ? data.absenderEmail : "",
  ].filter(Boolean);
  const attachments = visibleLetterAttachments(data);
  const accent = geometry.header.compactAccent;
  const pill = geometry.header.compactPill;

  return (
    <div
      data-letter-chrome
      data-letter-header-mode={mode}
      data-letter-reference-kind={geometry.archetype}
      data-letter-fresh-reference={geometry.freshTemplate ? "true" : "false"}
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {mode === "compact" ? (
        <>
          {sidebar && geometry.header.sidebarWidth > 0 ? (
            <div
              className="absolute inset-y-0 left-0"
              style={{ width: `${geometry.header.sidebarWidth}mm`, backgroundColor: primary }}
            />
          ) : null}

          {band && geometry.header.compactTopBandHeight > 0 ? (
            <div
              className="absolute inset-x-0 top-0"
              style={{
                height: `${geometry.header.compactTopBandHeight}mm`,
                backgroundColor: primary,
              }}
            />
          ) : null}

          {frame && pill ? (
            <div
              className="absolute rounded-full"
              style={{
                left: `${pill.left}mm`,
                top: `${pill.top}mm`,
                width: `${pill.width}mm`,
                height: `${pill.height}mm`,
                backgroundColor: primary,
                opacity: 0.2,
              }}
            />
          ) : null}

          {geometry.header.compactLineTop > 0 ? (
            <div
              className="absolute h-px"
              style={{
                left: `${geometry.content.left}mm`,
                right: `${geometry.content.right}mm`,
                top: `${geometry.header.compactLineTop}mm`,
                backgroundColor: primary,
                opacity: 0.72,
              }}
            />
          ) : null}

          <div
            className="absolute"
            style={{
              left: `${accent.left}mm`,
              top: `${accent.top}mm`,
              width: `${accent.width}mm`,
              height: `${accent.height}mm`,
              backgroundColor: sidebar || band ? secondary : primary,
            }}
          />
        </>
      ) : null}

      {mode === "contact" ? (
        <>
          <div
            className="absolute inset-x-0 top-0"
            style={{ height: `${geometry.header.contactHeight}mm`, backgroundColor: primary }}
          />
          {sidebar && geometry.header.sidebarWidth > 0 ? (
            <div
              className="absolute inset-y-0 left-0"
              style={{ width: `${geometry.header.sidebarWidth}mm`, backgroundColor: primary }}
            />
          ) : null}
          <div
            data-letter-integrated-contact
            className="absolute flex items-center justify-between gap-[8mm] text-[8.5pt] leading-[1.28]"
            style={{
              left: `${geometry.header.contactLeft}mm`,
              right: `${geometry.header.contactRight}mm`,
              top: `${geometry.header.contactTop}mm`,
              minHeight: `${geometry.header.contactMinHeight}mm`,
              color: headerRoles.ink,
            }}
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

      {footerMode === "compact" ? (
        <div
          data-letter-footer="compact"
          data-letter-footer-height-mm={geometry.footer.height}
          className="absolute inset-x-0 bottom-0"
          style={{
            height: `${geometry.footer.height}mm`,
            backgroundColor: secondary,
            opacity: design.template === "brief" ? 0.75 : 0.92,
          }}
        />
      ) : null}

      {footerMode === "attachments" ? (
        <div
          data-letter-footer="attachments"
          data-letter-footer-height-mm={geometry.footer.height}
          className="absolute inset-x-0 bottom-0 text-[8.5pt] leading-[1.3]"
          style={{
            left: 0,
            right: 0,
            height: `${geometry.footer.height}mm`,
            paddingLeft: `${geometry.footer.contentLeft}mm`,
            paddingRight: `${geometry.footer.contentRight}mm`,
            paddingTop: `${geometry.footer.paddingY}mm`,
            paddingBottom: `${geometry.footer.paddingY}mm`,
            backgroundColor: secondary,
            color: footerRoles.ink,
          }}
        >
          {geometry.footer.showAttachments ? (
            <div data-letter-footer-attachments className="flex h-full items-start gap-[8mm]">
              <div data-letter-pdf-text="attachments-heading" className="shrink-0 font-semibold">
                Beilagen:
              </div>
              <div data-letter-pdf-text="attachments-body" className="min-w-0 flex-1">
                <Lines values={attachments} />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
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
  const geometry = letterPageGeometry(data, design);
  const contentWidthMm = geometry.content.width;
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
  const senderIntegrated = geometry.effectiveHeaderMode === "contact";
  const beilagen = visibleLetterAttachments(data);
  const showBeilagen = data.showBeilagen !== false && beilagen.length > 0;
  const showBeilagenInBody = showBeilagen && geometry.requestedFooterMode !== "attachments";
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
      data-letter-header-mode={geometry.effectiveHeaderMode}
      data-letter-requested-header-mode={geometry.requestedHeaderMode}
      data-letter-footer-mode={geometry.effectiveFooterMode}
      data-letter-requested-footer-mode={geometry.requestedFooterMode}
      data-letter-layout-archetype={geometry.archetype}
      data-letter-page-index={geometry.pageIndex}
      data-letter-final-page={geometry.finalPage ? "true" : "false"}
      data-letter-font={design.fontOverride ?? design.font}
      data-letter-font-source={
        design.template === "brief" ? "standalone" : design.fontOverride ? "override" : "family"
      }
      className="relative h-[1123px] w-[794px] overflow-hidden bg-white shadow-xl"
      style={{ color: palette.ink, fontFamily, backgroundColor: palette.paper }}
      aria-label={ariaLabel}
    >
      <LetterChrome data={data} design={design} geometry={geometry} />
      <div
        ref={textLayerRef}
        data-letter-text-layer
        data-letter-content-box={`${geometry.content.left},${geometry.content.top},${geometry.content.right},${geometry.content.bottom}`}
        className="absolute flex flex-col"
        style={{
          left: `${geometry.content.left}mm`,
          right: `${geometry.content.right}mm`,
          top: `${geometry.content.top}mm`,
          bottom: `${geometry.content.bottom}mm`,
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

            {showBeilagenInBody ? (
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
