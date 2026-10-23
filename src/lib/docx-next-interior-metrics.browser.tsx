import { cvReadingFlowZoom } from "./docx-next-cv-zoom.browser";
import { isolateMeasurementZoom } from "./docx-next-measurement-host.browser";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { DossierHeaderFooterChrome } from "@/components/dossier/DossierHeaderFooterChrome";
import { FONT_STACKS } from "@/components/cover/types";
import { resolveDossierChromeSnapshot } from "./dossier-resolved-chrome";
import {
  interiorMetricsKey,
  type HeaderMeasurement,
  type InteriorTextMetrics,
} from "./docx-next/interior-metrics";
import type { DossierAppSnapshot } from "./docx-next/source";
import { compositeTextColor } from "./docx-next/colors";
import { effectiveDossierFont } from "./dossier-theme";
import { CvCanvas, resolveCvChromeContact } from "@/components/cv/CvCanvas";
import { dossierContactFromCv } from "./dossier-contact-data";
import { resolveCvRubricOptions } from "@/components/cv/citrus-rubric";
import { cvContentBox, cvFrameFor } from "@/components/cv/archetype";
import { letterPageGeometry } from "@/components/letter/layout-system";
import { briefFontTextSupported } from "./docx-next/brief-fonts.browser";

const mm = (px: number) => (px * 25.4) / 96;
const rgb = (value: string) => {
  const n = value.match(/[\d.]+/g)?.map(Number);
  if (!n || n.length < 3) throw Error("DOCX Next: Ungültige Headerfarbe.");
  return n
    .slice(0, 3)
    .map((v) => Math.round(v).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
};

/** Render the actual Web chrome from the captured saved inputs. No PDF canvas,
 * screenshot text, cached rectangles, synthetic font substitution or model XML. */
export async function captureInteriorTextMetrics(
  source: DossierAppSnapshot,
  profile: string,
  capture: { headersOnly?: true } = {},
): Promise<InteriorTextMetrics> {
  if (
    source.cover.template !== "modern" ||
    source.letter.design.template !== "modern" ||
    source.cv.design.template !== "modern"
  )
    throw Error("DOCX Next: Dieser Innenlayout-Test ist nur für Modern freigegeben.");
  if (!source.settings.chrome)
    throw Error("DOCX Next: Gespeicherte Kopfzeileneinstellungen fehlen.");
  if (source.cv.design.font !== "sans")
    throw Error(
      "DOCX Next: Header-/Rubriktest unterstützt nur ausdrücklich gespeichertes Sans im Lebenslauf; Cabin wird nicht durch Arial ersetzt.",
    );
  const resolved = resolveDossierChromeSnapshot(source, source.settings.chrome);
  if (
    resolved.cv.options.headerMode === "contact" &&
    JSON.stringify(
      resolveCvChromeContact(dossierContactFromCv(source.cv.data), resolved.cv.contact),
    ) !== JSON.stringify(resolved.cv.contact)
  )
    throw Error(
      "DOCX Next: Abweichende CV-Kontaktdaten benötigen eine eigene Header-Prüfung; die gespeicherten Werte werden nicht überschrieben.",
    );
  if (
    [resolved.letter, resolved.cv].some((p) => p.options.headerMode === "contact") &&
    [resolved.letter, resolved.cv].some((p) => p.options.headerMode !== "contact")
  )
    throw Error(
      "DOCX Next: Dieser Test benötigt Kontakt-Header in beiden Dossierteilen; gemischte Modi sind noch nicht geprüft.",
    );
  const result: InteriorTextMetrics = {
    version: 1,
    sourceKey: interiorMetricsKey(source),
    profile,
    headers: {},
  };
  const canvas = document.createElement("canvas").getContext("2d");
  if (!canvas) throw Error("DOCX Next: Header-Schriftmessung nicht verfügbar.");
  for (const scope of ["letter", "cv"] as const) {
    const { options, contact, content } = resolved[scope];
    if (options.headerMode !== "contact") continue;
    if (
      Object.values(content).some((v) => v?.trim()) ||
      options.footerMode !== "compact" ||
      options.headerGradientColor ||
      options.footerGradientColor
    )
      throw Error(
        "DOCX Next: Header-Test unterstützt Kontakt und leeren kompakten Fuss ohne Verlauf.",
      );
    const override = scope === "letter" ? source.letter.design.senderTypography?.font : undefined;
    if ((override ?? options.textFont ?? "sans") !== "sans")
      throw Error("DOCX Next: Nicht unterstützte Header-Schrift. Bitte Sans verwenden.");
    const measurements: HeaderMeasurement[] = [];
    for (const pageIndex of [0, 1]) {
      const host = document.createElement("div");
      host.style.cssText =
        "position:fixed;left:-20000px;top:0;width:210mm;height:297mm;pointer-events:none;opacity:1";
      document.body.append(host);
      isolateMeasurementZoom(host);
      const root = createRoot(host);
      try {
        flushSync(() =>
          root.render(
            <div
              data-dossier-document={scope}
              data-cv-template="modern"
              style={{
                "--dossier-font":
                  scope === "cv"
                    ? FONT_STACKS.sans
                    : effectiveDossierFont(
                        source.letter.design.template,
                        source.letter.design.fontOverride,
                      ),
                fontFamily:
                  scope === "cv"
                    ? FONT_STACKS.sans
                    : effectiveDossierFont(
                        source.letter.design.template,
                        source.letter.design.fontOverride,
                      ),
              } as React.CSSProperties}
            >
              <div
                data-cv-page={pageIndex}
                style={{ position: "relative", width: "210mm", height: "297mm" }}
              >
                <DossierHeaderFooterChrome
                  scope={scope}
                  template="modern"
                  colors={source[scope].design.colors}
                  options={options}
                  contact={contact}
                  documentContent={content}
                  pageIndex={pageIndex}
                  headerFontOverride={override}
                />
              </div>
            </div>,
          ),
        );
        await document.fonts.ready;
        const sheet = host.querySelector<HTMLElement>("[data-cv-page]")!;
        const base = sheet.getBoundingClientRect();
        const background = host.querySelector<HTMLElement>(
          "[data-dossier-contact-header-background], [data-dossier-continuation-contact-header]",
        );
        const inkBox = host.querySelector<HTMLElement>(
          "[data-dossier-integrated-contact], [data-dossier-continuation-contact]",
        );
        const footer = host.querySelector<HTMLElement>('[data-dossier-footer="compact"]');
        if (!background || !inkBox || !footer)
          throw Error("DOCX Next: Kontakt-Header ist nicht messbar.");
        const bs = getComputedStyle(background),
          fs = getComputedStyle(footer);
        const capture: HeaderMeasurement = {
          heightMm: mm(background.getBoundingClientRect().height),
          bodyTopMm:
            scope === "cv"
              ? cvContentBox(
                  cvFrameFor(source.cv.design.template),
                  pageIndex,
                  "classic",
                  source.cv.design.sidebarPct,
                  options,
                  {
                    pageMargins: source.settings.margins?.cv ?? null,
                    continuationTopMarginMm: source.settings.cvContinuationTopMarginMm ?? null,
                  },
                ).top
              : letterPageGeometry(source.letter.data, source.letter.design, {
                  pageIndex,
                  chromeOptions: options,
                  pageMargins: source.settings.margins?.letter ?? null,
                }).content.top,
          background: rgb(bs.backgroundColor),
          borderColor: rgb(bs.borderBottomColor),
          borderMm: mm(parseFloat(bs.borderBottomWidth)),
          footer: {
            heightMm: mm(footer.getBoundingClientRect().height),
            background: rgb(fs.backgroundColor),
            borderColor: rgb(fs.borderTopColor),
            borderMm: mm(parseFloat(fs.borderTopWidth)),
            opacity: Number(fs.opacity),
          },
          frames: [],
          icons: [],
        };
        const suffix = pageIndex ? "continuation" : "first";
        const walker = document.createTreeWalker(inkBox, NodeFilter.SHOW_TEXT);
        let textNode: Node | null,
          index = 0;
        while ((textNode = walker.nextNode())) {
          const text = textNode.textContent ?? "";
          if (!text.trim()) continue;
          if (!briefFontTextSupported(text))
            throw Error("DOCX Next: Nicht unterstützte Schriftzeichen im Header.");
          const el = textNode.parentElement!,
            s = getComputedStyle(el);
          const field = el.closest<HTMLElement>("[data-dossier-contact-field]")?.dataset
            .dossierContactField;
          if (field && text !== contact[field as keyof typeof contact])
            throw Error("DOCX Next: Headerinhalt stimmt nicht mit gespeicherten Daten überein.");
          const range = document.createRange();
          range.selectNodeContents(textNode);
          const rects = range.getClientRects();
          if (rects.length !== 1)
            throw Error("DOCX Next: Mehrzeiliges Kontaktfeld benötigt eine eigene Word-Prüfung.");
          const r = rects[0];
          const weight = Number(s.fontWeight);
          const sizePt = Math.round(parseFloat(s.fontSize) * 0.75 * 2) / 2;
          if (s.fontStyle !== "normal" || ![400, 500, 600, 700].includes(weight))
            throw Error("DOCX Next: Nicht unterstützte Header-Typografie.");
          const probe = "MWil 0123456789 ÄÖÜäöü";
          canvas.font = `${weight} 48px ${s.fontFamily}`;
          const actual = canvas.measureText(probe).width;
          canvas.font = `${weight} 48px ${FONT_STACKS.sans}`;
          if (Math.abs(actual - canvas.measureText(probe).width) > 0.001)
            throw Error("DOCX Next: Browser-Ersatzschrift im Header ist nicht unterstützt.");
          const trackingPt = Math.round((parseFloat(s.letterSpacing) || 0) * 0.75 * 20) / 20;
          canvas.font = `${weight >= 600 ? 700 : 400} ${(sizePt * 96) / 72}px ${FONT_STACKS.sans}`;
          const wordWidth =
            mm(canvas.measureText(text).width) + (trackingPt * text.length * 25.4) / 72;
          const xMm = mm(r.x - base.x),
            yMm = mm(r.y - base.y);
          const widthMm =
            (Math.ceil((Math.max(mm(r.width), wordWidth) * 1440) / 25.4 + 1) * 25.4) / 1440;
          const linePt = parseFloat(s.lineHeight) * 0.75;
          if (yMm < 0 || yMm + (linePt * 25.4) / 72 > capture.heightMm + 0.1 || xMm + widthMm > 210)
            throw Error("DOCX Next: Headertext überschreitet seine Fläche.");
          let opacity = 1;
          for (let n: HTMLElement | null = el; n && n !== inkBox.parentElement; n = n.parentElement)
            opacity *= Number(getComputedStyle(n).opacity);
          const id = `${scope}.header.${suffix}.${field ?? `separator:${index}`}`;
          index++;
          capture.frames.push({
            kind: "paragraph-frame",
            id: id + ".frame",
            xMm,
            yMm,
            widthMm,
            paragraphs: [
              {
                kind: "paragraph",
                id,
                role: "contact",
                runs: [
                  {
                    id: id + ".value",
                    ...(field
                      ? {
                          fieldId:
                            scope === "letter" ? `letter.sender.${field}` : `cv.person.${field}`,
                        }
                      : {}),
                    text,
                    style: {
                      font: "Arial",
                      sizePt,
                      color: compositeTextColor(rgb(s.color), capture.background, opacity),
                      bold: weight >= 600,
                      italic: false,
                      underline: false,
                      trackingPt,
                    },
                  },
                ],
                align: "left",
                beforeMm: 0,
                afterMm: 0,
                lineHeight: linePt / sizePt,
                minimumLineHeightPt: linePt,
                keepNext: false,
                keepLines: true,
              },
            ],
          });
        }
        // One native frame per actual Web line prevents importer coalescing of
        // adjacent frames. Measured tab stops preserve each field's own x.
        const rows: (typeof capture.frames)[] = [];
        for (const frame of capture.frames) {
          const row = rows.find((row) => Math.abs(row[0].yMm - frame.yMm) < 0.1);
          if (row) row.push(frame);
          else rows.push([frame]);
        }
        capture.frames = rows.map((row, i) => {
          row.sort((a, b) => a.xMm - b.xMm);
          const first = row[0],
            id = `${scope}.header.${suffix}.row:${i}`;
          const paragraph = {
            ...first.paragraphs[0],
            id,
            tabStopsMm: row.slice(1).map((f) => f.xMm - first.xMm),
            fieldControls: true,
            runs: row.flatMap((f, j) => [
              ...(j
                ? [{ id: id + `.tab:${j}`, text: "\t", style: f.paragraphs[0].runs[0].style }]
                : []),
              ...f.paragraphs[0].runs,
            ]),
          };
          const contentRight =
            mm(inkBox.getBoundingClientRect().right - base.x) -
            mm(parseFloat(getComputedStyle(inkBox).paddingRight));
          if (Math.max(...row.map((f) => f.xMm + f.widthMm)) > contentRight)
            throw Error("DOCX Next: Gemessene Kontaktzeile überschreitet den Headerbereich.");
          return {
            ...first,
            id: id + ".frame",
            // The authored header content region owns the frame width; text
            // advances/tab stops never turn the frame into a tight text box.
            widthMm: contentRight - first.xMm,
            paragraphs: [paragraph],
          };
        });
        for (const [i, svg] of Array.from(inkBox.querySelectorAll("svg")).entries()) {
          const r = svg.getBoundingClientRect(),
            s = getComputedStyle(svg),
            clone = svg.cloneNode(true) as SVGElement;
          clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
          clone.setAttribute("stroke", s.color);
          clone.setAttribute("width", "96");
          clone.setAttribute("height", "96");
          clone.removeAttribute("style");
          const image = new Image();
          image.src =
            "data:image/svg+xml;base64," +
            btoa(unescape(encodeURIComponent(new XMLSerializer().serializeToString(clone))));
          await image.decode();
          const c = document.createElement("canvas");
          c.width = c.height = 128;
          const ctx = c.getContext("2d")!;
          let opacity = 1;
          for (
            let el: Element | null = svg;
            el && el !== inkBox.parentElement;
            el = el.parentElement
          )
            opacity *= Number(getComputedStyle(el).opacity);
          ctx.globalAlpha = opacity;
          ctx.drawImage(image, 0, 0, 128, 128);
          capture.icons.push({
            kind: "image",
            id: `${scope}.header.${suffix}.icon:${i}`,
            source: c.toDataURL("image/png"),
            alt: "",
            widthMm: mm(r.width),
            maxHeightMm: mm(r.height),
            placement: "free",
            coordinateOrigin: "page",
            xMm: mm(r.x - base.x),
            yMm: mm(r.y - base.y),
            gapMm: 0,
          });
        }
        measurements.push(capture);
      } finally {
        flushSync(() => root.unmount());
        host.remove();
      }
    }
    result.headers[scope] = { first: measurements[0], continuation: measurements[1] };
  }
  if (capture.headersOnly) return result;
  {
    const hasPills = resolveCvRubricOptions(source.cv.design).pill;
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;left:-20000px;top:0;width:210mm;pointer-events:none";
    document.body.append(host);
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
            chromeOptions={resolved.cv.options}
            chromeContact={resolved.cv.contact}
            manageGlobalTemplateScope={false}
            exportMode
          />,
        ),
      );
      await document.fonts.ready;
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      result.cvFlowScale = cvReadingFlowZoom(host);
      if (hasPills) result.rubrics = {};
      for (const el of hasPills
        ? Array.from(
            host.querySelectorAll<HTMLElement>(
              "[data-cv-page] [data-cv-section-title][data-dossier-field-id]",
            ),
          )
        : []) {
        const id = el.dataset.dossierFieldId!;
        if (result.rubrics?.[id]) continue;
        const style = getComputedStyle(el),
          r = el.getBoundingClientRect();
        const text = el.textContent ?? "";
        if (!briefFontTextSupported(text))
          throw Error("DOCX Next: Nicht unterstützte Schriftzeichen in Rubrik.");
        const range = document.createRange();
        range.selectNodeContents(el);
        if (range.getClientRects().length !== 1)
          throw Error("DOCX Next: Mehrzeilige Rubrik benötigt eine eigene Word-Prüfung.");
        const weight = Number(style.fontWeight),
          sizePt = Math.round(parseFloat(style.fontSize) * 0.75 * 2) / 2;
        if (style.fontStyle !== "normal" || ![400, 500, 600, 700, 800, 900].includes(weight))
          throw Error("DOCX Next: Rubriktest unterstützt nur normale Sans-Typografie.");
        const trackingPt = Math.round((parseFloat(style.letterSpacing) || 0) * 0.75 * 20) / 20;
        const shown = style.textTransform === "uppercase" ? text.toUpperCase() : text;
        canvas.font = `${weight} 48px ${style.fontFamily}`;
        const a = canvas.measureText(shown).width;
        canvas.font = `${weight >= 600 ? 700 : 400} 48px ${FONT_STACKS.sans}`;
        if (Math.abs(a - canvas.measureText(shown).width) > 0.001)
          throw Error("DOCX Next: Browser-Ersatzschrift in Rubrik ist nicht unterstützt.");
        canvas.font = `${weight >= 600 ? 700 : 400} ${(sizePt * 96) / 72}px ${FONT_STACKS.sans}`;
        const px = mm(parseFloat(style.paddingLeft)),
          py = mm(parseFloat(style.paddingTop));
        const wordWidth =
          mm(canvas.measureText(shown).width) + (trackingPt * text.length * 25.4) / 72;
        const widthMm =
          (Math.ceil((Math.max(mm(r.width), wordWidth + 2 * px) * 1440) / 25.4 + 1) * 25.4) / 1440;
        const linePt = parseFloat(style.lineHeight) * 0.75;
        const ink = rgb(style.color);
        const rule = el.parentElement?.querySelector<HTMLElement>("[data-cv-accent='section']"),
          rs = rule ? getComputedStyle(rule) : null;
        result.rubrics![id] = {
          text,
          style: {
            font: "Arial",
            sizePt,
            color: ink,
            bold: weight >= 600,
            italic: false,
            underline: style.textDecorationLine.includes("underline"),
            allCaps: style.textTransform === "uppercase",
            trackingPt,
          },
          lineHeightPt: linePt,
          surface: {
            widthMm,
            rowWidthMm: widthMm,
            heightMm: (linePt * 25.4) / 72 + 2 * py,
            paddingXMm: px,
            paddingYMm: py,
            ink,
            outlineMm: 0.2,
            ...(rs
              ? {
                  rule: {
                    color: rgb(rs.backgroundColor),
                    gapMm: 2.2,
                    heightMm: mm(parseFloat(rs.height)),
                    opacity: Number(rs.opacity),
                  },
                }
              : {}),
          },
        };
      }
      if (hasPills && !Object.keys(result.rubrics ?? {}).length)
        throw Error("DOCX Next: Rubrik-Messwerte nicht verfügbar.");

      // Capture effective, physical Web typography without reading editor zoom or
      // persisting DOM measurements in the user's semantic snapshot.
      result.textRoles = {};
      const elements = Array.from(
        host.querySelectorAll<HTMLElement>(
          "[data-cv-page] [data-cv-name], [data-cv-page] [data-dossier-field-id]",
        ),
      );
      for (const el of elements) {
        const id = el.hasAttribute("data-cv-name") ? "cv.person.name" : el.dataset.dossierFieldId;
        if (!id || result.textRoles[id]) continue;
        const text = (el.textContent ?? "").trim();
        if (!text || !briefFontTextSupported(text)) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
        const css = getComputedStyle(el);
        const sizePx = parseFloat(css.fontSize);
        const linePx = parseFloat(css.lineHeight);
        const weight = Number(css.fontWeight);
        if (
          !Number.isFinite(sizePx) ||
          !Number.isFinite(linePx) ||
          !Number.isFinite(weight) ||
          css.fontStyle !== "normal"
        )
          continue;
        // Do not silently treat an unsupported variable/foreign face as Arial.
        canvas.font = weight + " 48px " + css.fontFamily;
        const browserWidth = canvas.measureText(text).width;
        canvas.font = (weight >= 600 ? 700 : 400) + " 48px " + FONT_STACKS.sans;
        if (Math.abs(browserWidth - canvas.measureText(text).width) > 0.01) continue;
        const trackingPx = parseFloat(css.letterSpacing);
        const marginPx = parseFloat(css.marginBottom);
        result.textRoles[id] = {
          text,
          style: {
            font: "Arial",
            sizePt: sizePx * 0.75,
            color: rgb(css.color),
            bold: weight >= 600,
            italic: false,
            underline: css.textDecorationLine.includes("underline"),
            allCaps: css.textTransform === "uppercase",
            ...(Number.isFinite(trackingPx) ? { trackingPt: trackingPx * 0.75 } : {}),
          },
          lineHeightPt: linePx * 0.75,
          ...(Number.isFinite(marginPx) && marginPx > 0 ? { afterMm: mm(marginPx) } : {}),
        };
      }
    } finally {
      flushSync(() => root.unmount());
      host.remove();
    }
  }
  return result;
}
