import { useSyncExternalStore } from "react";
import { cvPalette, onColorRoles } from "@/components/cv/palette";
import {
  DEFAULT_DOSSIER_CHROME_STATE,
  getDossierChromeState,
  subscribeDossierChrome,
  type DossierChromeContact,
  type DossierChromeOptions,
  type DossierChromeScope,
} from "@/lib/dossier-chrome";

export function DossierHeaderFooterChrome({
  scope,
  template,
  colors,
  contact,
  pageIndex = 0,
  optionsOverride,
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
  optionsOverride?: DossierChromeOptions;
  footerHeightMm?: number;
  footerLabel?: string;
  footerDetails?: string[];
  footerLeft?: string;
  footerRight?: string;
}) {
  const state = useSyncExternalStore(
    subscribeDossierChrome,
    getDossierChromeState,
    () => DEFAULT_DOSSIER_CHROME_STATE,
  );
  const options = optionsOverride ?? (state.sync ? state.shared : state[scope]);
  const headerMode =
    pageIndex === 0
      ? options.headerMode
      : options.headerMode === "none"
        ? "none"
        : "compact";
  const sourcePalette = cvPalette(colors);
  const primary =
    template === "brief"
      ? "#111111"
      : (colors.primary ?? colors.accent ?? colors.secondary ?? sourcePalette.accent);
  const secondary =
    template === "brief"
      ? "#4b5563"
      : (colors.accent ?? colors.secondary ?? sourcePalette.accent);
  const headerRoles = onColorRoles(primary, secondary);
  const footerRoles = onColorRoles(secondary, primary);
  const rightBits = [
    options.headerShowPhone ? contact.phone : "",
    options.headerShowEmail ? contact.email : "",
  ].filter(Boolean);
  const detailsHeight = footerHeightMm ?? 10;
  const letter = scope === "letter";

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
        <div
          data-dossier-compact-header
          className="absolute inset-x-0 top-0"
          style={{ height: "3mm", backgroundColor: primary }}
          aria-hidden="true"
        />
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
              {options.headerShowName && contact.name ? (
                <div className="text-[10pt] font-semibold">{contact.name}</div>
              ) : null}
              {options.headerShowAddress ? (
                <div className="opacity-90">
                  {[contact.address, contact.place].filter(Boolean).join(" · ")}
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
                {footerDetails.map((value) => (
                  <div key={value}>{value}</div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-full min-w-0 flex-1 items-center justify-between gap-[8mm]">
              <span className="truncate">{footerLeft}</span>
              <span className="shrink-0">{footerRight}</span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
