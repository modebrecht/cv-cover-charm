import { FONT_STACKS } from "@/components/cover/types";
import { cvPalette, onColorRoles } from "@/components/cv/palette";
import {
  dossierFooterVisualHeightMmForOptions,
  dossierHeaderVisualHeightMmForOptions,
  type DossierChromeContact,
  type DossierChromeOptions,
  type DossierChromeScope,
} from "@/lib/dossier-chrome";

function surfaceBackground(first: string, second: string | null): string {
  return second ? `linear-gradient(90deg, ${first}, ${second})` : first;
}

function normalizedHex(value: string | null | undefined): string | null {
  if (!value) return null;
  const color = value.trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(color) ? color : null;
}

function automaticBorderColor({
  colors,
  headerBackground,
  headerGradient,
  footerBackground,
  footerGradient,
  palette,
}: {
  colors: Record<string, string>;
  headerBackground: string;
  headerGradient: string | null;
  footerBackground: string;
  footerGradient: string | null;
  palette: ReturnType<typeof cvPalette>;
}): string {
  const occupied = new Set(
    [headerBackground, headerGradient, footerBackground, footerGradient]
      .map(normalizedHex)
      .filter((value): value is string => value !== null),
  );
  const candidates = [
    colors.cvHeading,
    colors.accent,
    colors.secondary,
    colors.primary,
    palette.accent,
    palette.ink,
    palette.muted,
    "#94a3b8",
    "#cbd5e1",
  ];
  for (const candidate of candidates) {
    const normalized = normalizedHex(candidate);
    if (normalized && !occupied.has(normalized)) return normalized;
  }
  return "#94a3b8";
}

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
  const headerMode = options.headerMode;
  const continuationContact = pageIndex > 0 && headerMode === "contact";
  const sourcePalette = cvPalette(colors);
  const primary =
    template === "brief"
      ? "#111111"
      : (colors.primary ?? colors.accent ?? colors.secondary ?? sourcePalette.accent);
  const secondary =
    template === "brief" ? "#4b5563" : (colors.accent ?? colors.secondary ?? sourcePalette.accent);
  const headerBackground = options.headerBackgroundColor ?? primary;
  const footerBackground = options.footerBackgroundColor ?? secondary;
  const headerRoles = onColorRoles(headerBackground, options.headerGradientColor ?? secondary);
  const footerRoles = onColorRoles(footerBackground, options.footerGradientColor ?? primary);
  const headerSurface = surfaceBackground(headerBackground, options.headerGradientColor);
  const footerSurface = surfaceBackground(footerBackground, options.footerGradientColor);
  const borderColor =
    options.borderColor ??
    automaticBorderColor({
      colors,
      headerBackground,
      headerGradient: options.headerGradientColor,
      footerBackground,
      footerGradient: options.footerGradientColor,
      palette: sourcePalette,
    });
  const borderStyle = options.borderEnabled
    ? `${options.borderWidthMm}mm solid ${borderColor}`
    : undefined;
  const textFontFamily = options.textFont ? FONT_STACKS[options.textFont] : undefined;
  const headerVisualHeight = dossierHeaderVisualHeightMmForOptions(options, pageIndex);
  const compactFooterHeight = dossierFooterVisualHeightMmForOptions(options);
  const detailsHeight = options.footerHeightMm ?? footerHeightMm ?? 10;
  const letter = scope === "letter";
  const warmLetterOwnsFirstPageHeader =
    letter && template === "freundlich" && pageIndex === 0 && headerMode === "compact";
  const resolvedFooterLeft = footerLeft;
  const cvPageNumberFooter =
    scope === "cv" && footerRight ? /^seite\s+\d+$/i.test(footerRight.trim()) : false;
  const resolvedFooterRight = cvPageNumberFooter ? undefined : footerRight;
  const contactRows = [
    options.headerShowName && resolvedContact.name
      ? { key: "name", value: resolvedContact.name, strong: true }
      : null,
    options.headerShowAddress && resolvedContact.address
      ? { key: "address", value: resolvedContact.address, strong: false }
      : null,
    options.headerShowAddress && resolvedContact.place
      ? { key: "place", value: resolvedContact.place, strong: false }
      : null,
    options.headerShowPhone && resolvedContact.phone
      ? { key: "phone", value: resolvedContact.phone, strong: false }
      : null,
    options.headerShowEmail && resolvedContact.email
      ? { key: "email", value: resolvedContact.email, strong: false }
      : null,
  ].filter((row): row is { key: string; value: string; strong: boolean } => row !== null);
  const continuationBits = [
    options.headerShowName ? resolvedContact.name : "",
    options.headerShowAddress ? resolvedContact.place : "",
    options.headerShowEmail ? resolvedContact.email : "",
    options.headerShowPhone ? resolvedContact.phone : "",
  ].filter(Boolean);
  const footerValues = [resolvedFooterLeft, resolvedFooterRight].filter(
    (value): value is string => !!value?.trim(),
  );
  const stackedHeader = options.headerTextLayout === "stacked";

  return (
    <div
      data-dossier-chrome={scope}
      data-dossier-header-mode={headerMode}
      data-dossier-footer-mode={options.footerMode}
      data-dossier-header-text-layout={options.headerTextLayout}
      data-dossier-footer-text-layout={options.footerTextLayout}
      data-dossier-border-enabled={options.borderEnabled ? "true" : "false"}
      data-dossier-border-color={borderColor}
      data-dossier-border-width-mm={options.borderWidthMm}
      data-dossier-chrome-font={options.textFont ?? "template"}
      data-letter-chrome={letter ? "" : undefined}
      data-letter-header-mode={letter ? headerMode : undefined}
      className="pointer-events-none absolute inset-0 z-[3] overflow-hidden"
      style={{ fontFamily: textFontFamily }}
    >
      {headerMode === "compact" && !warmLetterOwnsFirstPageHeader ? (
        <div
          data-dossier-compact-header
          data-dossier-header-height-mm={headerVisualHeight}
          className="absolute inset-x-0 top-0"
          style={{
            height: `${headerVisualHeight}mm`,
            boxSizing: "border-box",
            background: headerSurface,
            borderBottom: borderStyle,
          }}
          aria-hidden="true"
        />
      ) : null}

      {warmLetterOwnsFirstPageHeader && options.borderEnabled ? (
        <div
          data-dossier-header-border
          className="absolute inset-x-0"
          style={{
            top: `${Math.max(0, headerVisualHeight - options.borderWidthMm)}mm`,
            height: `${options.borderWidthMm}mm`,
            background: borderColor,
          }}
          aria-hidden="true"
        />
      ) : null}

      {headerMode === "contact" ? (
        continuationContact ? (
          <div
            data-dossier-continuation-contact-header
            data-dossier-header-height-mm={headerVisualHeight}
            data-cv-continuation-header={scope === "cv" ? "" : undefined}
            data-letter-continuation-header={letter ? "" : undefined}
            className="absolute inset-x-0 top-0 flex items-center"
            style={{
              height: `${headerVisualHeight}mm`,
              padding: "0 12mm",
              boxSizing: "border-box",
              background: headerSurface,
              borderBottom: borderStyle,
              color: headerRoles.ink,
              fontSize: "7.6pt",
              lineHeight: 1.1,
            }}
          >
            <div
              data-dossier-continuation-contact
              className="min-w-0 flex-1 truncate text-center opacity-95"
            >
              {continuationBits.join(" · ")}
            </div>
          </div>
        ) : (
          <>
            <div
              data-dossier-contact-header-background
              data-dossier-header-height-mm={headerVisualHeight}
              className="absolute inset-x-0 top-0"
              style={{
                height: `${headerVisualHeight}mm`,
                boxSizing: "border-box",
                background: headerSurface,
                borderBottom: borderStyle,
              }}
              aria-hidden="true"
            />
            <div
              data-dossier-integrated-contact
              data-letter-integrated-contact={letter ? "" : undefined}
              className="absolute inset-x-0 top-0 flex"
              style={{
                height: `${headerVisualHeight}mm`,
                padding: stackedHeader ? "1mm 23mm 1mm 24mm" : "2mm 23mm 2mm 24mm",
                boxSizing: "border-box",
                color: headerRoles.ink,
                fontSize: stackedHeader ? "8pt" : "8.5pt",
                lineHeight: stackedHeader ? 1.08 : 1.18,
                overflow: "hidden",
              }}
            >
              {stackedHeader ? (
                <div className="my-auto min-w-0" style={{ overflowWrap: "anywhere" }}>
                  {contactRows.map((row) => (
                    <div
                      key={row.key}
                      className={row.strong ? "font-semibold" : "opacity-95"}
                      style={row.strong ? { fontSize: "9.5pt", marginBottom: "0.2mm" } : undefined}
                    >
                      {row.value}
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="my-auto min-w-0 flex-1 text-center opacity-95"
                  style={{ overflowWrap: "anywhere" }}
                >
                  {contactRows.map((row) => row.value).join(" · ")}
                </div>
              )}
            </div>
          </>
        )
      ) : null}

      {options.footerMode === "compact" ? (
        <div
          data-dossier-footer="compact"
          data-dossier-footer-height-mm={compactFooterHeight}
          data-letter-footer={letter ? "compact" : undefined}
          data-letter-footer-height-mm={letter ? compactFooterHeight : undefined}
          className="absolute inset-x-0 bottom-0"
          style={{
            height: `${compactFooterHeight}mm`,
            boxSizing: "border-box",
            background: footerSurface,
            borderTop: borderStyle,
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
          className="absolute inset-x-0 bottom-0 text-[8.5pt] leading-[1.3]"
          style={{
            height: `${detailsHeight}mm`,
            padding: "2.2mm 23mm 2.2mm 24mm",
            boxSizing: "border-box",
            background: footerSurface,
            borderTop: borderStyle,
            color: footerRoles.ink,
            overflow: "hidden",
          }}
        >
          {footerLabel && footerDetails.length ? (
            options.footerTextLayout === "inline" ? (
              <div
                data-letter-footer-attachments={letter ? "" : undefined}
                className="flex h-full min-w-0 items-center gap-[3mm]"
              >
                <span
                  data-letter-pdf-text={letter ? "attachments-heading" : undefined}
                  className="shrink-0 font-semibold"
                >
                  {footerLabel}
                </span>
                <div
                  data-letter-pdf-text={letter ? "attachments-body" : undefined}
                  className="min-w-0 opacity-95"
                  style={{ overflowWrap: "anywhere" }}
                >
                  <div className="min-w-0">
                    {footerDetails.map((value, index) => (
                      <div key={value} className="inline">
                        {index ? " · " : ""}
                        {value}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div
                data-letter-footer-attachments={letter ? "" : undefined}
                className="flex h-full min-w-0 items-start gap-[8mm]"
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
            )
          ) : options.footerTextLayout === "stacked" ? (
            <div className="flex h-full min-w-0 flex-col justify-center">
              {footerValues.map((value) => (
                <div key={value} className="truncate">
                  {value}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-full min-w-0 items-center justify-between gap-[8mm]">
              <span className="min-w-0 truncate">{footerValues.join(" · ")}</span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
