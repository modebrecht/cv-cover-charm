import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { FONT_STACKS } from "@/components/cover/types";
import { cvPalette } from "@/components/cv/palette";
import { DossierHeaderFooterChrome } from "@/components/dossier/DossierHeaderFooterChrome";
import {
  DEFAULT_DOSSIER_CHROME_STATE,
  getDossierChromeState,
  subscribeDossierChrome,
  type DossierChromeOptions,
} from "@/lib/dossier-chrome";
import { effectiveDossierFont } from "@/lib/dossier-theme";
import { letterPageGeometry, visibleLetterAttachments } from "./layout-system";
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

function chromeFromDesign(design: LetterDesign): DossierChromeOptions {
  return {
    headerMode: design.headerMode ?? "compact",
    headerShowName: design.headerShowName !== false,
    headerShowAddress: design.headerShowAddress !== false,
    headerShowPhone: design.headerShowPhone !== false,
    headerShowEmail: design.headerShowEmail !== false,
    footerMode:
      design.footerMode === "attachments"
        ? "details"
        : design.footerMode === "none"
          ? "none"
          : "compact",
  };
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
  const chromeState = useSyncExternalStore(
    subscribeDossierChrome,
    getDossierChromeState,
    () => DEFAULT_DOSSIER_CHROME_STATE,
  );
  const liveBrowser =
    typeof window !== "undefined" &&
    typeof window.addEventListener === "function" &&
    typeof window.document !== "undefined";
  const chrome = liveBrowser
    ? chromeState.sync
      ? chromeState.shared
      : chromeState.letter
    : chromeFromDesign(design);
  const effectiveDesign = useMemo<LetterDesign>(
    () => ({
      ...design,
      headerMode: chrome.headerMode,
      headerShowName: chrome.headerShowName,
      headerShowAddress: chrome.headerShowAddress,
      headerShowPhone: chrome.headerShowPhone,
      headerShowEmail: chrome.headerShowEmail,
      footerMode:
        chrome.footerMode === "details"
          ? "attachments"
          : chrome.footerMode === "none"
            ? "none"
            : "compact",
    }),
    [chrome, design],
  );
  const geometry = letterPageGeometry(data, effectiveDesign);
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
  }, [bodyHtml, data, effectiveDesign, onOverflowChange]);

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
      <DossierHeaderFooterChrome
        scope="letter"
        template={design.template}
        colors={design.colors}
        contact={{
          name: data.absenderName,
          address: data.absenderAdresse,
          place: data.absenderPlzOrt,
          phone: data.absenderTelefon,
          email: data.absenderEmail,
        }}
        pageIndex={geometry.pageIndex}
        optionsOverride={chrome}
        footerHeightMm={geometry.footer.height}
        footerLabel="Beilagen:"
        footerDetails={geometry.footer.showAttachments ? beilagen : []}
      />

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
