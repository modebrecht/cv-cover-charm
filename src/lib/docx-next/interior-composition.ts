import type { DossierAppSnapshot } from "./source";
import type { DocumentPart, DecorativeShape } from "./model";
import { interiorMetricsKey, type InteriorTextMetrics } from "./interior-metrics";
import type { DossierChromeContact, DossierChromeOptions } from "@/lib/dossier-chrome";

/** Reuses fixed-page native paragraphs and the existing decorative page asset.
 * No browser services, HTML, PDF pagination or renderer markup enters here. */
export function composeMeasuredHeaders(
  part: DocumentPart,
  source: DossierAppSnapshot,
  metrics: InteriorTextMetrics,
  contact: DossierChromeContact,
  options: DossierChromeOptions,
) {
  if (
    metrics.version !== 1 ||
    metrics.sourceKey !== interiorMetricsKey(source) ||
    !metrics.profile.startsWith("brief-sans-v1;")
  )
    throw Error("DOCX Next: Header-Messwerte fehlen oder sind veraltet.");
  if (part.id === "cover")
    throw Error("DOCX Next: Kontakt-Header darf das Deckblatt nicht verändern.");
  const values = metrics.headers[part.id];
  if (!values) throw Error("DOCX Next: Frische Header-Messwerte sind nicht verfügbar.");
  part.header = [];
  part.firstHeader = [];
  part.footer = [];
  part.page.headerDistanceMm = 0;
  part.chrome.borderColor = undefined;
  part.artwork = part.artwork.filter(
    (a) => ![`${part.id}.artwork.header`, `${part.id}.artwork.footer`].includes(a.id),
  );
  part.pagePaintComposition = "single-asset";
  part.headerFrames = [];
  part.headerImages = [];
  const paint = (
    id: string,
    repeat: "first" | "continuation",
    yMm: number,
    heightMm: number,
    fill: string,
    opacity = 1,
  ) => {
    if (heightMm <= 0) return;
    const shape: DecorativeShape = {
      kind: "decorative-shape",
      id,
      repeat,
      semanticText: false,
      shape: "rect",
      xMm: 0,
      yMm,
      widthMm: part.page.widthMm,
      heightMm,
      radiusMm: 0,
      opacity,
      fill: { color: fill },
      stroke: { color: "000000", widthMm: 0 },
    };
    part.headerShapes = [...(part.headerShapes ?? []), shape];
  };
  for (const repeat of ["first", "continuation"] as const) {
    const m = values[repeat],
      prefix = `${part.id}.measured.${repeat}`;
    if (
      ![
        m.heightMm,
        m.bodyTopMm,
        m.borderMm,
        m.footer.heightMm,
        m.footer.borderMm,
        m.footer.opacity,
      ].every(Number.isFinite) ||
      m.heightMm <= 0 ||
      m.borderMm < 0 ||
      m.borderMm > m.heightMm ||
      m.bodyTopMm < m.heightMm ||
      m.bodyTopMm > 120 ||
      m.footer.opacity < 0 ||
      m.footer.opacity > 1
    )
      throw Error("DOCX Next: Ungültige gemessene Headergeometrie.");
    paint(prefix + ".header", repeat, 0, m.heightMm - m.borderMm, m.background);
    paint(prefix + ".header-edge", repeat, m.heightMm - m.borderMm, m.borderMm, m.borderColor);
    paint(
      prefix + ".footer",
      repeat,
      297 - m.footer.heightMm + m.footer.borderMm,
      m.footer.heightMm - m.footer.borderMm,
      m.footer.background,
      m.footer.opacity,
    );
    paint(
      prefix + ".footer-edge",
      repeat,
      297 - m.footer.heightMm,
      m.footer.borderMm,
      m.footer.borderColor,
      m.footer.opacity,
    );
    const expected = new Map(
      Object.entries(contact)
        .filter(
          ([key, value]) =>
            value.trim() &&
            (key === "name"
              ? options.headerShowName
              : key === "phone"
                ? options.headerShowPhone
                : key === "email"
                  ? options.headerShowEmail
                  : options.headerShowAddress),
        )
        .map(([key, value]) => [
          part.id === "letter" ? `letter.sender.${key}` : `cv.person.${key}`,
          value,
        ]),
    );
    // Reduced continuations intentionally omit address/place, as the Web does.
    if (
      repeat === "continuation" &&
      options.headerDifferentFirstPage !== false &&
      options.headerContinuationMode === undefined
    ) {
      expected.delete(`${part.id === "letter" ? "letter.sender" : "cv.person"}.address`);
      expected.delete(`${part.id === "letter" ? "letter.sender" : "cv.person"}.place`);
    }
    const seen = new Set<string>();
    for (const frame of m.frames) {
      if (
        frame.surface ||
        frame.paragraphs.length !== 1 ||
        frame.paragraphs[0].runs.some(
          (r) =>
            r.style.font !== "Arial" || /[\r\n]/.test(r.text) || (!!r.fieldId && /\t/.test(r.text)),
        )
      )
        throw Error("DOCX Next: Nicht unterstützte Header-Messwerte.");
      for (const run of frame.paragraphs[0].runs) {
        if (run.fieldId) {
          if (seen.has(run.fieldId) || expected.get(run.fieldId) !== run.text)
            throw Error("DOCX Next: Header-Messinhalt ist veraltet oder unvollständig.");
          seen.add(run.fieldId);
        } else if (!/^[\t ·/|]*$/.test(run.text))
          throw Error("DOCX Next: Nicht unterstützter Headertrenner.");
      }
      part.headerFrames.push({ ...structuredClone(frame), repeat });
    }
    if (seen.size !== expected.size)
      throw Error("DOCX Next: Header-Messinhalt ist veraltet oder unvollständig.");
    part.headerImages.push(...m.icons.map((icon) => ({ ...structuredClone(icon), repeat })));
  }
  // Reuse the existing first-page-lead primitive, sourced from the Web's pure
  // margin policies. It does not import Web page fragments or page counts.
  const firstTop = values.first.bodyTopMm,
    continuationTop = values.continuation.bodyTopMm;
  if (firstTop < continuationTop)
    throw Error("DOCX Next: Grössere Folgekopfzeile benötigt eine eigene Word-Geometrieprüfung.");
  part.page.margins.top = continuationTop;
  if (firstTop > continuationTop) {
    const id = part.id === "cv" ? "cv.firstPageLead" : `${part.id}.measured.firstPageLead`;
    part.blocks.unshift({ kind: "spacer", id, heightMm: firstTop - continuationTop });
  }
  if (part.id === "cv")
    part.layout.pagination = {
      firstTopMarginMm: firstTop,
      continuationTopMarginMm: continuationTop,
      firstPageLeadMm: firstTop - continuationTop,
    };
}
