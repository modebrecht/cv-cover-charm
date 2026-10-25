import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { CvCanvas } from "@/components/cv/CvCanvas";
import { cvSectionLayout, cvSectionOrder } from "@/components/cv/types";
import { FONT_STACKS } from "@/components/cover/types";
import { resolveDossierChromeSnapshot } from "./dossier-resolved-chrome";
import type { DossierAppSnapshot } from "./docx-next/source";
import { interiorMetricsKey, type CvPersonalHeaderMetrics } from "./docx-next/interior-metrics";
import { briefFontTextSupported } from "./docx-next/brief-fonts.browser";

const mm = (px: number) => (px * 25.4) / 96;

/** Measure the actual Web header's columns and text roles at the app boundary.
 * No PDF renderer, page screenshots, template-name geometry or fixed row heights.
 */
export async function captureCvPersonalHeaderMetrics(
  source: DossierAppSnapshot,
  profile: string,
): Promise<CvPersonalHeaderMetrics | undefined> {
  const personLayout = cvSectionLayout(source.cv.data, "person");
  if (
    source.settings.cvLayout !== "classic" ||
    source.cv.design.useElements ||
    cvSectionOrder(source.cv.data)[0] !== "person" ||
    personLayout.page !== 1 ||
    personLayout.width !== "full" ||
    personLayout.positioning !== "flow" ||
    personLayout.packing !== "rows"
  )
    return;
  if (source.cv.data.person.foto || source.cv.design.personalInfoAligned === false) return;
  if (source.cv.design.font !== "sans") return;
  if (!source.settings.chrome || !profile.startsWith("brief-sans-v1;"))
    throw Error("DOCX Next: Persönliche Angaben benötigen frische Sans-Messwerte.");
  const chrome = resolveDossierChromeSnapshot(source, source.settings.chrome).cv;
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-20000px;top:0;width:210mm;pointer-events:none";
  document.body.append(host);
  const root = createRoot(host);
  try {
    flushSync(() =>
      root.render(
        <CvCanvas
          data={source.cv.data}
          design={source.cv.design}
          elements={source.cv.elements}
          elementStyles={source.cv.elementStyles}
          chromeOptions={chrome.options}
          chromeContact={chrome.contact}
          manageGlobalTemplateScope={false}
          exportMode
        />,
      ),
    );
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    const header = host.querySelector<HTMLElement>("[data-cv-header]");
    const grid = header?.querySelector<HTMLElement>("[data-cv-contact-grid]");
    if (!header || !grid || getComputedStyle(grid).display !== "grid") return;
    // Bounding rectangles include editor preview transforms. CSS grid tracks
    // retain physical document geometry; exporting transformed widths wrapped
    // labels even though their unscaled Web text fitted on one line.
    const gridCss = getComputedStyle(grid);
    const firstTrackPx = parseFloat(gridCss.gridTemplateColumns);
    const columnGapPx = parseFloat(gridCss.columnGap) || 0;
    if (!Number.isFinite(firstTrackPx) || firstTrackPx <= 0) return;
    const value = Array.from(
      grid.querySelectorAll<HTMLElement>("[data-cv-contact-value], [data-cv-personal-value]"),
    ).find((el) => el.getBoundingClientRect().left > grid.getBoundingClientRect().left + 1);
    if (!value) return;
    const personalGap = grid.querySelector("[data-cv-contact-grid-gap]");
    const result: CvPersonalHeaderMetrics = {
      version: 1,
      sourceKey: interiorMetricsKey(source),
      profile,
      valueOffsetMm: mm(firstTrackPx + columnGapPx),
      personalGapMm: personalGap ? mm(parseFloat(getComputedStyle(personalGap).height) || 0) : 0,
      contactTopGapMm: Math.max(0, mm(parseFloat(gridCss.marginTop) || 0)),
      paragraphs: {},
    };
    const canvas = document.createElement("canvas").getContext("2d");
    if (!canvas) throw Error("DOCX Next: Schriftmessung für persönliche Angaben fehlt.");
    const capture = (id: string, el: HTMLElement | null) => {
      if (!el) return;
      const css = getComputedStyle(el),
        text = el.textContent ?? "";
      if (!briefFontTextSupported(text))
        throw Error("DOCX Next: Nicht unterstützte persönliche Schriftzeichen.");
      const weight = Number(css.fontWeight);
      canvas.font = `${weight} 48px ${css.fontFamily}`;
      const actual = canvas.measureText(text).width;
      canvas.font = `${weight >= 600 ? 700 : 400} 48px ${FONT_STACKS.sans}`;
      if (Math.abs(actual - canvas.measureText(text).width) > 0.001)
        throw Error("DOCX Next: Nicht unterstützte Ersatzschrift in persönlichen Angaben.");
      const channels = css.color
        .match(/[\d.]+/g)
        ?.slice(0, 3)
        .map(Number);
      if (!channels || channels.length !== 3)
        throw Error("DOCX Next: Ungültige persönliche Textfarbe.");
      const sizePt = parseFloat(css.fontSize) * 0.75;
      result.paragraphs[id] = {
        style: {
          font: "Arial",
          sizePt,
          color: channels
            .map((v) => Math.round(v).toString(16).padStart(2, "0"))
            .join("")
            .toUpperCase(),
          bold: weight >= 600,
          italic: css.fontStyle === "italic",
          underline: css.textDecorationLine.includes("underline"),
          trackingPt: (parseFloat(css.letterSpacing) || 0) * 0.75,
        },
        lineHeightPt: parseFloat(css.lineHeight) * 0.75,
        afterMm: mm(parseFloat(css.marginBottom) || 0),
      };
    };
    for (const el of grid.querySelectorAll<HTMLElement>("[data-dossier-field-id]")) {
      const id = el.dataset.dossierFieldId!;
      capture(id, el);
      if (el.hasAttribute("data-cv-personal-value"))
        capture(id + ".label", el.previousElementSibling as HTMLElement);
    }
    return result;
  } finally {
    flushSync(() => root.unmount());
    host.remove();
  }
}
