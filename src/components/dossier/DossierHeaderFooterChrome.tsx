import { cvPalette, onColorRoles } from "@/components/cv/palette";
import type {
  DossierChromeContact,
  DossierChromeOptions,
  DossierChromeScope,
} from "@/lib/dossier-chrome";

export function DossierHeaderFooterChrome({
  scope,
  template,
  colors,
  contact,
  pageIndex = 0,
  options,
  footerHeightMm,
  footerLabel,
  footerDetails = [],
  footerLeft,
  footerRight,
}: {
  scope: DossierChromeScope;
  template: string;
  colors: Record<string, string>;
  contact: DossierChromeContact;
  pageIndex?: number;
  options: DossierChromeOptions;
  footerHeightMm?: number;
  footerLabel?: string;
  footerDetails?: string[];
  footerLeft?: string;
  footerRight?: string;
}) {
  const resolvedContact = contact;
  const headerMode =
    pageIndex === 0 ? options.headerMode : options.headerMode === "none" ? "none" : "compact";
  const sourcePalette = cvPalette(colors);
  const primary =
    template === "brief"
      ? "#111111"
      : (colors.primary ?? colors.accent ?? colors.secondary ?? sourcePalette.accent);
  const secondary =
    template === "brief" ? "#4b5563" : (colors.accent ?? colors.secondary ?? sourcePalette.accent);
  const headerRoles = onColorRoles(primary, secondary);
  const footerRoles = onColorRoles(secondary, primary);
  const rightBits = [
    options.headerShowPhone ? resolvedContact.phone : "",
    options.headerShowEmail ? resolvedContact.email : "",
  ].filter(Boolean);
  const cvContinuation = scope === "cv" && pageIndex > 0 && headerMode === "compact";
  const cvContinuationBits = [
    options.headerShowAddress ? resolvedContact.place : "",
    options.headerShowEmail ? resolvedContact.email : "",
    options.headerShowPhone ? resolvedContact.phone : "",
  ].filter(Boolean);
  const detailsHeight = footerHeightMm ?? 10;
  const letter = scope === "letter";
  const resolvedFooterLeft = footerLeft;
  const cvPageNumberFooter =
    scope === "cv" && footerRight ? /^seite\s+\d+$/i.test(footerRight.trim()) : false;
  const resolvedFooterRight = cvPageNumberFooter ? undefined : footerRight;

  return (
    <div
      data-dossier-chrome={scope}
      data-dossier-header-mode={headerMode}
      data-dossier-footer-mode={options.footerMode}
      data-letter-chrome={letter ? "" : undefined}
      data-letter-header-mode={letter ? headerMode : undefined}
      className="pointer-events-none absolute inset-0 z-[3] overflow-hidden"
    >
      {headerMode === "compact" ? (
        cvContinuation ? (
          <div
            data-dossier-compact-header
            data-cv-continuation-header
            className="absolute inset-x-0 top-0 flex items-center gap-[7mm]"
            style={{
              height: "8mm",
              padding: "0 12mm",
              boxSizing: "border-box",
              backgroundColor: primary,
              color: headerRoles.ink,
              fontSize: "7.6pt",
              lineHeight: 1.1,
            }}
          >
            {options.headerShowName && resolvedContact.name ? (
              <div className="max-w-[38%] shrink-0 truncate font-semibold">
                {resolvedContact.name}
              </div>
            ) : null}
            {cvContinuationBits.length ? (
              <div
                data-cv-continuation-contact
                className="min-w-0 flex-1 truncate text-right opacity-95"
              >
                {cvContinuationBits.join(" · ")}
              </div>
            ) : null}
          </div>
        ) : (
          <div
            data-dossier-compact-header
            className="absolute inset-x-0 top-0"
            style={{ height: "3mm", backgroundColor: primary }}
            aria-hidden="true"
          />
        )
      ) : null}

      {headerMode === "contact" ? (
        <>
          <div
            data-dossier-contact-header-background
            className="absolute inset-x-0 top-0"
            style={{ height: "22mm", backgroundColor: primary }}
            aria-hidden="true"
          />
          <div
            data-dossier-integrated-contact
            data-letter-integrated-contact={letter ? "" : undefined}
            className="absolute flex items-center justify-between gap-[8mm] text-[8.5pt] leading-[1.28]"
            style={{
              left: "24mm",
              right: "23mm",
              top: "3.1mm",
              minHeight: "15mm",
              color: headerRoles.ink,
            }}
          >
            <div className="min-w-0 flex-1" style={{ overflowWrap: "anywhere" }}>
              {options.headerShowName && resolvedContact.name ? (
                <div className="text-[10pt] font-semibold">{resolvedContact.name}</div>
              ) : null}
              {options.headerShowAddress ? (
                <div className="opacity-90">
                  {[resolvedContact.address, resolvedContact.place].filter(Boolean).join(" · ")}
                </div>
              ) : null}
            </div>
            {rightBits.length ? (
              <div
                className="min-w-0 max-w-[48%] shrink-0 text-right opacity-95"
                style={{ overflowWrap: "anywhere" }}
              >
                {rightBits.map((value) => (
                  <div key={value}>{value}</div>
                ))}
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {options.footerMode === "compact" ? (
        <div
          data-dossier-footer="compact"
          data-letter-footer={letter ? "compact" : undefined}
          data-letter-footer-height-mm={letter ? 2.4 : undefined}
          className="absolute inset-x-0 bottom-0"
          style={{
            height: "2.4mm",
            backgroundColor: secondary,
            opacity: template === "brief" ? 0.75 : 0.92,
          }}
          aria-hidden="true"
        />
      ) : null}

      {options.footerMode === "details" ? (
        <div
          data-dossier-footer="details"
          data-dossier-footer-height-mm={detailsHeight}
          data-letter-footer={letter ? "attachments" : undefined}
          data-letter-footer-height-mm={letter ? detailsHeight : undefined}
          className="absolute inset-x-0 bottom-0 flex items-start gap-[8mm] text-[8.5pt] leading-[1.3]"
          style={{
            height: `${detailsHeight}mm`,
            padding: "2.2mm 23mm 2.2mm 24mm",
            boxSizing: "border-box",
            backgroundColor: secondary,
            color: footerRoles.ink,
          }}
        >
          {footerLabel && footerDetails.length ? (
            <div
              data-letter-footer-attachments={letter ? "" : undefined}
              className="flex h-full min-w-0 flex-1 items-start gap-[8mm]"
            >
              <div
                data-letter-pdf-text={letter ? "attachments-heading" : undefined}
                className="shrink-0 font-semibold"
              >
                {footerLabel}
              </div>
              <div
                data-letter-pdf-text={letter ? "attachments-body" : undefined}
                className="min-w-0 flex-1"
                style={{ overflowWrap: "anywhere" }}
              >
                <div>
                  {footerDetails.map((value) => (
                    <div key={value}>{value}</div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-w-0 flex-1 items-center justify-between gap-[8mm]">
              <span className="truncate">{resolvedFooterLeft}</span>
              {resolvedFooterRight ? <span className="shrink-0">{resolvedFooterRight}</span> : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
