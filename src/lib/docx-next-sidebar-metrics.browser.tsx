import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { CvCanvas } from "@/components/cv/CvCanvas";
import { resolveCvRubricOptions } from "@/components/cv/citrus-rubric";
import { DEFAULT_CV_PLACEMENTS } from "@/components/cv/types";
import { FONT_STACKS } from "@/components/cover/types";
import { normalizeCvPhotoPlacement } from "@/components/cv/photo-place";
import { normalizeDossierPhotoStyle } from "./dossier-photo";
import { resolveCvPalette } from "@/components/cv/cv-paper";
import { resolveDossierChromeSnapshot } from "./dossier-resolved-chrome";
import {
  DEFAULT_DOSSIER_CHROME_STATE,
  effectiveDossierHeaderModeForOptions,
} from "./dossier-chrome";
import { cvDocumentZoom } from "./docx-next-cv-zoom.browser";
import { isolateMeasurementZoom } from "./docx-next-measurement-host.browser";
import { briefFontTextSupported } from "./docx-next/brief-fonts.browser";
import { interiorMetricsKey } from "./docx-next/interior-metrics";
import { compositeTextColor } from "./docx-next/colors";
import { cvWordLayout } from "./docx-next/layouts";
import type { CvSidebarTextMetrics } from "./docx-next/cv-sidebar-text-metrics";
import type { DossierAppSnapshot } from "./docx-next/source";

const mm = (px: number) => (px * 25.4) / 96;
const number = (value: string) => (Number.isFinite(parseFloat(value)) ? parseFloat(value) : 0);
function rgb(value: string): string {
  const parts = value.match(/[\d.]+/g)?.map(Number);
  if (!parts || parts.length < 3 || (parts[3] !== undefined && parts[3] !== 1))
    throw Error("DOCX Next: Nicht unterstützte Sidebar-Farbe.");
  return parts
    .slice(0, 3)
    .map((n) => Math.round(n).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function solidSurface(el: HTMLElement) {
  const css = getComputedStyle(el);
  if (css.backgroundImage !== "none" || css.mixBlendMode !== "normal" || css.filter !== "none")
    throw Error("DOCX Next: Sidebar-Fläche benötigt eine geprüfte Vollfarbe.");
  return { color: rgb(css.backgroundColor), opacity: Number(css.opacity) };
}

function sidebarColor(el: HTMLElement): string {
  const base = solidSurface(el),
    css = getComputedStyle(el);
  if (
    base.opacity !== 1 ||
    [css.borderLeftWidth, css.borderRightWidth, css.borderTopWidth, css.borderBottomWidth].some(
      (v) => number(v) !== 0,
    )
  )
    throw Error("DOCX Next: Sidebar-Flächenrahmen ist nicht geprüft.");
  const tint = el.querySelector<HTMLElement>("[data-cv-sidebar-tint]");
  if (!tint || getComputedStyle(tint).display === "none") return base.color;
  const s = getComputedStyle(tint);
  if (s.backgroundImage !== "none" || s.mixBlendMode !== "normal" || s.filter !== "none")
    throw Error("DOCX Next: Sidebar-Tönung ist nicht geprüft.");
  const rgba = s.backgroundColor.match(/[\d.]+/g)?.map(Number);
  if (!rgba || rgba.length < 3) throw Error("DOCX Next: Sidebar-Tönung fehlt.");
  const color = rgba
    .slice(0, 3)
    .map((n) => Math.round(n).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return compositeTextColor(color, base.color, (rgba[3] ?? 1) * Number(s.opacity));
}

/** Measure effective authored text styles, never positions, page counts or fragments. */
export async function captureCvSidebarTextMetrics(
  source: DossierAppSnapshot,
  profile: string,
): Promise<CvSidebarTextMetrics> {
  if (
    cvWordLayout(source.settings.cvLayout) !== "sidebar" ||
    source.cv.design.font !== "sans" ||
    !profile.startsWith("brief-sans-v1;")
  )
    throw Error("DOCX Next: Sidebar-Schriftprüfung benötigt einen gespeicherten Sans-Entwurf.");
  const resolved = resolveDossierChromeSnapshot(
    source,
    source.settings.chrome ?? DEFAULT_DOSSIER_CHROME_STATE,
  );
  const { options, contact, content } = resolved.cv;
  const contactHeaders = options.headerMode === "contact";
  const rubric = resolveCvRubricOptions(source.cv.design);
  if (rubric.pill || rubric.horizontalMm !== 0 || rubric.contentIndentMm !== 0)
    throw Error(
      "DOCX Next: Sidebar-Schriftprüfung unterstützt nur unverrückte Rubriken ohne Pills.",
    );
  const bodyAlignment = source.settings.cvAlignment ?? "left";
  if (bodyAlignment !== "left" && bodyAlignment !== "justify")
    throw Error("DOCX Next: Sidebar-Schriftprüfung unterstützt linksbündigen Text und Blocksatz.");
  if (
    !["compact", "contact"].includes(options.headerMode) ||
    effectiveDossierHeaderModeForOptions(options, 1) !== options.headerMode ||
    options.footerMode !== "compact" ||
    Object.values(content).some((v) => v?.trim()) ||
    options.headerGradientColor ||
    options.footerGradientColor
  )
    throw Error(
      "DOCX Next: Sidebar-Schriftprüfung benötigt kompakte oder gemessene Kontaktköpfe und einen leeren kompakten Fuss ohne Verlauf.",
    );
  const result: CvSidebarTextMetrics = {
    version: 3,
    sourceKey: interiorMetricsKey(source),
    profile,
    ...(contactHeaders ? { contactHeaders: true as const } : {}),
    fields: {},
    headings: {},
    entries: {},
    headerAfterMm: 0,
    surfaces: { first: null!, continuation: null! },
    compactChrome: { header: null!, footer: null! },
  };
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-20000px;top:0;width:210mm;pointer-events:none";
  document.body.append(host);
  // Keep the isolated measuring surface at physical scale 1. Browser previews
  // can zoom ancestors; Chrome otherwise quantizes used border/track widths at
  // that display scale. Authored zoom inside the CV page remains untouched.
  isolateMeasurementZoom(host);
  const root = createRoot(host);
  try {
    flushSync(() =>
      root.render(
        <CvCanvas
          data={source.cv.data}
          design={source.cv.design}
          elements={source.cv.elements}
          elementStyles={source.cv.elementStyles}
          chromeOptions={options}
          chromeContact={contact}
          manageGlobalTemplateScope={false}
          exportMode
          presentation={{
            layoutChoice: "modern",
            infoPosition: source.settings.sidebarSide === "right" ? "mirrored" : "standard",
            placements: {
              ...DEFAULT_CV_PLACEMENTS,
              ...source.settings.placements,
            },
            photoStyle: normalizeDossierPhotoStyle(source.settings.cvPhotoStyle),
            photoPlacement: normalizeCvPhotoPlacement(source.settings.cvPhotoPlacement),
            sectionGapMm: source.settings.cvSectionGapMm ?? null,
            documentTitleMarginTopPx: source.settings.cvDocumentTitleMarginTopPx ?? 0,
            continuationTopMarginMm: source.settings.cvContinuationTopMarginMm ?? null,
            pageMargins: source.settings.margins?.cv ?? null,
            bodyAlignment,
          }}
        />,
      ),
    );
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    const canvas = document.createElement("canvas").getContext("2d");
    if (!canvas) throw Error("DOCX Next: Sidebar-Schriftmessung nicht verfügbar.");
    const paper = resolveCvPalette(source.cv.design).paper.replace("#", "").toUpperCase();
    const normalFactors = new Map<string, number>();
    const normalFactor = (css: CSSStyleDeclaration, weight: number) => {
      const font = `${css.fontStyle} ${weight >= 600 ? 700 : 400} 2048px ${FONT_STACKS.sans}`;
      if (!normalFactors.has(font)) {
        const probe = document.createElement("span");
        probe.style.cssText =
          "position:fixed;left:-100000px;top:0;display:block;white-space:nowrap;margin:0;padding:0;border:0;zoom:1";
        probe.style.font = font;
        probe.style.lineHeight = "normal";
        probe.textContent = "Hg";
        host.append(probe);
        const factor = probe.getBoundingClientRect().height / 2048;
        probe.remove();
        if (!Number.isFinite(factor) || factor < 1 || factor > 2)
          throw Error("DOCX Next: Natürliche Sidebar-Zeilenhöhe ist nicht geprüft.");
        normalFactors.set(font, factor);
      }
      return normalFactors.get(font)!;
    };
    // Original complete measurement rows take precedence over visible page fragments.
    const fields = [
      ...host.querySelectorAll<HTMLElement>(
        "[data-cv-measure-page] [data-cv-name], [data-cv-measure-page] [data-dossier-field-id], [data-cv-page] [data-cv-name], [data-cv-page] [data-dossier-field-id]",
      ),
    ].sort(
      (a, b) =>
        Number(!!b.closest("[data-cv-measure-page]")) -
        Number(!!a.closest("[data-cv-measure-page]")),
    );
    for (const el of fields) {
      if (!el.closest("[data-cv-main], [data-cv-sidebar]")) continue;
      const id = el.hasAttribute("data-cv-name") ? "cv.person.name" : el.dataset.dossierFieldId!;
      if (result.fields[id]) continue;
      const text = (el.textContent ?? "").trim();
      if (!text) continue;
      if (!briefFontTextSupported(text))
        throw Error(`DOCX Next: Nicht unterstützte Schriftzeichen (${id}).`);
      const css = getComputedStyle(el),
        zoom = cvDocumentZoom(el);
      const sizePx = parseFloat(css.fontSize),
        linePx = parseFloat(css.lineHeight),
        weight = Number(css.fontWeight);
      if (
        ![sizePx, linePx, weight, zoom].every(Number.isFinite) ||
        !["normal", "italic"].includes(css.fontStyle)
      )
        throw Error(`DOCX Next: Nicht unterstützte Sidebar-Typografie (${id}).`);
      const shown = css.textTransform === "uppercase" ? text.toUpperCase() : text;
      canvas.font = `${css.fontStyle} ${weight} 48px ${css.fontFamily}`;
      const sourceWidth = canvas.measureText(shown).width;
      canvas.font = `${css.fontStyle} ${weight >= 600 ? 700 : 400} 48px ${FONT_STACKS.sans}`;
      if (Math.abs(sourceWidth - canvas.measureText(shown).width) > 0.01)
        throw Error(`DOCX Next: Sidebar-Ersatzschrift ist nicht geprüft (${id}).`);
      let opacity = 1;
      for (
        let node: HTMLElement | null = el;
        node && !node.matches("[data-cv-page], [data-cv-measure-page]");
        node = node.parentElement
      )
        opacity *= Number(getComputedStyle(node).opacity);
      const style = {
        font: "Arial",
        sizePt: sizePx * 0.75 * zoom,
        color: compositeTextColor(rgb(css.color), paper, opacity),
        bold: weight >= 600,
        italic: css.fontStyle === "italic",
        underline: css.textDecorationLine.includes("underline"),
        allCaps: css.textTransform === "uppercase",
        trackingPt: number(css.letterSpacing) * 0.75 * zoom,
        kerning: css.fontKerning !== "none",
      };
      let beforeMm = mm(number(css.marginTop) + number(css.paddingTop)) * zoom;
      // Inherited group top margins belong to their first semantic field once.
      for (
        let node = el.parentElement;
        node &&
        !node.matches(
          "[data-cv-entry], [data-cv-main], [data-cv-sidebar], [data-cv-section], [data-cv-header]",
        );
        node = node.parentElement
      )
        if (node.querySelector("[data-dossier-field-id]") === el)
          beforeMm += mm(number(getComputedStyle(node).marginTop)) * cvDocumentZoom(node);
      result.fields[id] = {
        text,
        style,
        documentScale: zoom,
        lineHeightPt: linePx * 0.75 * zoom,
        normalLineHeightFactor: normalFactor(css, weight),
        beforeMm,
        afterMm: mm(number(css.marginBottom)) * zoom,
      };
      const marker = el
        .closest("[data-cv-entry]")
        ?.querySelector<HTMLElement>("[data-cv-list-marker]");
      if (marker) {
        const s = getComputedStyle(marker);
        canvas.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
        result.fields[id].listIndentMm =
          mm(
            canvas.measureText(marker.textContent ?? "").width +
              number(getComputedStyle(marker.parentElement!).columnGap),
          ) * zoom;
        result.fields[id].listMarkerStyle = {
          color: rgb(s.color),
          bold: Number(s.fontWeight) >= 600,
        };
      }
      if (el.hasAttribute("data-cv-section-title")) {
        const section = el.closest<HTMLElement>("[data-cv-section]")!,
          s = getComputedStyle(section);
        const rule = el.parentElement?.querySelector<HTMLElement>("[data-cv-accent='section']");
        const ruleCss = rule ? getComputedStyle(rule) : null;
        const rowCss = getComputedStyle(el.parentElement!);
        const below =
          rowCss.flexWrap === "wrap" &&
          ruleCss !== null &&
          number(ruleCss.width) >= number(rowCss.width) - 0.5;
        canvas.font = `${css.fontStyle} ${weight >= 600 ? 700 : 400} ${sizePx}px ${FONT_STACKS.sans}`;
        result.headings[id] = {
          beforeMm: mm(number(s.marginTop)) * zoom,
          afterMm: mm(number(s.marginBottom)) * zoom,
          ...(ruleCss && ruleCss.display !== "none"
            ? {
                rule: {
                  ...(below ? { placement: "below" as const } : {}),
                  textWidthMm: mm(number(css.width)) * zoom,
                  gapMm: mm(number(below ? rowCss.rowGap : rowCss.columnGap)) * zoom,
                  heightMm: mm(number(ruleCss.height)) * zoom,
                  color: rgb(ruleCss.backgroundColor),
                  opacity: Number(ruleCss.opacity),
                },
              }
            : {}),
        };
      }
    }
    const measurement = host.querySelector<HTMLElement>("[data-cv-measure-page]")!;
    for (const entry of [
      ...measurement.querySelectorAll<HTMLElement>("[data-cv-entry]"),
      ...host.querySelectorAll<HTMLElement>("[data-cv-page] [data-cv-sidebar] [data-cv-entry]"),
    ]) {
      if (entry.hasAttribute("data-dossier-field-id")) continue;
      const first = entry.querySelector<HTMLElement>("[data-dossier-field-id]");
      const id = first?.dataset.dossierFieldId?.replace(/\.[^.]+$/, "");
      if (!id?.startsWith("cv.entry.") || result.entries[id]) continue;
      const css = getComputedStyle(entry),
        zoom = cvDocumentZoom(entry);
      const date = entry.querySelector<HTMLElement>("[data-cv-rail][data-cv-date]");
      result.entries[id] = {
        afterMm: mm(number(css.marginBottom)) * zoom,
        ...(date
          ? {
              dateRail: {
                widthMm: mm(number(getComputedStyle(date).width)) * zoom,
                gapMm: mm(number(css.columnGap)) * zoom,
              },
            }
          : {}),
      };
    }
    const header = measurement.querySelector<HTMLElement>("[data-cv-header]");
    if (header)
      result.headerAfterMm =
        mm(number(getComputedStyle(header).marginBottom)) * cvDocumentZoom(header);
    const references = measurement.querySelector<HTMLElement>("[data-cv-reference-grid]");
    if (references)
      result.referenceGapMm =
        mm(number(getComputedStyle(references).columnGap)) * cvDocumentZoom(references);
    const pages = host.querySelectorAll<HTMLElement>("[data-cv-page]");
    for (const [index, repeat] of ["first", "continuation"].entries()) {
      const page = pages[Math.min(index, pages.length - 1)];
      const rail = page?.querySelector<HTMLElement>("[data-cv-sidebar]");
      const plane = page?.querySelector<HTMLElement>("[data-cv-surface]");
      if (!rail || !plane) throw Error("DOCX Next: Sidebar-Flächen fehlen.");
      result.surfaces[repeat as "first" | "continuation"] = {
        sidebarColor: sidebarColor(rail),
        readingPlane: solidSurface(plane),
      };
    }
    for (const zone of ["header", "footer"] as const) {
      const el = host.querySelector<HTMLElement>(
        zone === "header"
          ? contactHeaders
            ? "[data-cv-page] [data-dossier-contact-header-background]"
            : "[data-cv-page] [data-dossier-compact-header]"
          : "[data-cv-page] [data-dossier-footer='compact']",
      );
      if (!el) throw Error("DOCX Next: Kompakte Sidebar-Zone fehlt.");
      const css = getComputedStyle(el);
      const border = zone === "header" ? css.borderBottomWidth : css.borderTopWidth;
      result.compactChrome[zone] = {
        heightMm: mm(number(css.height)),
        color: rgb(css.backgroundColor),
        borderMm: mm(number(border)),
        borderColor: rgb(zone === "header" ? css.borderBottomColor : css.borderTopColor),
      };
    }
    if (!result.fields["cv.person.name"]) throw Error("DOCX Next: Sidebar-Schriftwerte fehlen.");
    return result;
  } finally {
    flushSync(() => root.unmount());
    host.remove();
  }
}
