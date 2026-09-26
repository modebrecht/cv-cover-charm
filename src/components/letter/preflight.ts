import type { LetterData } from "./types";

export type LetterReadiness = {
  started: boolean;
  readyToSend: boolean;
  missing: string[];
};

const filled = (value: string | undefined): boolean => !!value?.trim();

/** Standard-Anrede und -Gruss allein bedeuten noch nicht, dass der Brief begonnen wurde. */
export function letterHasStarted(data: LetterData): boolean {
  return [
    data.absenderName,
    data.absenderAdresse,
    data.absenderPlzOrt,
    data.absenderTelefon,
    data.absenderEmail,
    data.empfaengerFirma,
    data.empfaengerName,
    data.empfaengerAdresse,
    data.empfaengerPlzOrt,
    data.ort,
    data.datum,
    data.betreff,
    data.text,
    data.unterschrift,
  ].some(filled);
}

/**
 * Versandbereitschaft ist absichtlich strenger als "hat Inhalt". Die Felder
 * hier sind die kleinste sinnvolle Menge für ein adressiertes Motivationsschreiben;
 * optionale Kontaktwege oder eine konkrete Ansprechperson dürfen fehlen.
 */
export function letterReadiness(data: LetterData): LetterReadiness {
  const missing: string[] = [];
  if (!filled(data.absenderName)) missing.push("Absendername");
  if (!filled(data.empfaengerFirma) && !filled(data.empfaengerName)) {
    missing.push("Lehrbetrieb oder Ansprechperson");
  }
  if (!filled(data.datum)) missing.push("Datum");
  if (!filled(data.betreff)) missing.push("Betreff");
  if (!filled(data.text)) missing.push("Brieftext");

  return {
    started: letterHasStarted(data),
    readyToSend: missing.length === 0,
    missing,
  };
}

export type LetterTextLayerMetrics = Pick<HTMLElement, "scrollHeight" | "clientHeight">;

/**
 * Low-level scroll metric retained for non-DOM callers and regression tests.
 * A real rendered page uses visible content bounds instead because flex/layout
 * internals can inflate scrollHeight even when every visible glyph still fits.
 */
export function letterTextLayerOverflows(layer: LetterTextLayerMetrics | null): boolean {
  return !!layer && layer.scrollHeight > layer.clientHeight + 1;
}

const clipsOwnBox = (element: HTMLElement): boolean =>
  element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1;

function rectOutside(
  inner: Pick<DOMRect, "left" | "right" | "top" | "bottom">,
  outer: Pick<DOMRect, "left" | "right" | "top" | "bottom">,
  tolerance = 1.5,
): boolean {
  return (
    inner.left < outer.left - tolerance ||
    inner.right > outer.right + tolerance ||
    inner.top < outer.top - tolerance ||
    inner.bottom > outer.bottom + tolerance
  );
}

function overlaps(
  first: Pick<DOMRect, "left" | "right" | "top" | "bottom">,
  second: Pick<DOMRect, "left" | "right" | "top" | "bottom">,
  tolerance = 1.5,
): boolean {
  return !(
    first.right <= second.left + tolerance ||
    first.left >= second.right - tolerance ||
    first.bottom <= second.top + tolerance ||
    first.top >= second.bottom - tolerance
  );
}

function visible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 || rect.height > 0;
}

function semanticLabel(element: HTMLElement): string {
  return (
    element.dataset.letterSection ??
    element.dataset.letterPdfText ??
    element.dataset.letterPdfRichtext ??
    element.tagName.toLowerCase()
  );
}

export function letterRenderedTextLayerOverflowReason(layer: HTMLElement): string | null {
  const layerRect = layer.getBoundingClientRect();
  if (layerRect.width <= 0 || layerRect.height <= 0) {
    return letterTextLayerOverflows(layer) ? "text-layer:scroll-overflow" : null;
  }

  if (typeof layer.querySelectorAll !== "function") {
    return letterTextLayerOverflows(layer) ? "text-layer:scroll-overflow" : null;
  }

  const meaningful = layer.querySelectorAll<HTMLElement>(
    "[data-letter-section], [data-letter-pdf-text], [data-letter-pdf-richtext]",
  );
  let measured = false;
  for (const element of Array.from(meaningful)) {
    if (!visible(element)) continue;
    measured = true;
    const label = semanticLabel(element);
    const rect = element.getBoundingClientRect();
    if (rectOutside(rect, layerRect)) return `text:${label}:outside-layer`;

    if (element.scrollWidth > element.clientWidth + 1) return `text:${label}:width-clipped`;
    const style = window.getComputedStyle(element);
    if (
      style.overflowY !== "visible" &&
      style.overflowY !== "clip" &&
      element.scrollHeight > element.clientHeight + 1
    ) {
      return `text:${label}:height-clipped`;
    }
  }

  return measured
    ? null
    : letterTextLayerOverflows(layer)
      ? "text-layer:scroll-overflow"
      : null;
}

/**
 * Judge the visible letter text, not the text layer's aggregate scrollHeight.
 * Images are validated separately below because freely positioned images may
 * intentionally leave the text content box while still remaining printable on A4.
 */
export function letterRenderedTextLayerOverflows(layer: HTMLElement): boolean {
  return letterRenderedTextLayerOverflowReason(layer) !== null;
}

/**
 * Return the exact physical reason a rendered letter page is unsafe. The public
 * boolean wrapper below intentionally stays stable for production callers while
 * DOCX/browser QA can surface a precise reason instead of a generic blocker.
 */
export function letterPageOverflowReason(page: ParentNode): string | null {
  const layer = page.querySelector<HTMLElement>("[data-letter-text-layer]");
  if (!layer) {
    throw new Error("Motivationsschreiben konnte für die Layoutprüfung nicht vermessen werden");
  }

  const measurablePage = page as ParentNode & {
    getBoundingClientRect?: () => DOMRect;
    querySelectorAll?: <T extends Element = Element>(selectors: string) => NodeListOf<T>;
  };
  if (typeof measurablePage.getBoundingClientRect !== "function") {
    return letterTextLayerOverflows(layer) ? "text-layer:scroll-overflow" : null;
  }

  const textReason = letterRenderedTextLayerOverflowReason(layer);
  if (textReason) return textReason;

  const pageRect = measurablePage.getBoundingClientRect();
  const layerRect = layer.getBoundingClientRect();
  const contact = page.querySelector<HTMLElement>("[data-letter-integrated-contact]");
  const recipient = page.querySelector<HTMLElement>('[data-letter-section="recipient"]');
  const footer = page.querySelector<HTMLElement>("[data-letter-footer]");

  for (const [label, element] of [
    ["contact", contact],
    ["footer", footer],
  ] as const) {
    if (!element) continue;
    if (clipsOwnBox(element)) return `${label}:clipped`;
    if (rectOutside(element.getBoundingClientRect(), pageRect)) return `${label}:outside-page`;
  }

  if (
    contact &&
    recipient &&
    overlaps(contact.getBoundingClientRect(), recipient.getBoundingClientRect())
  ) {
    return "contact:recipient-overlap";
  }

  const images = measurablePage.querySelectorAll?.<HTMLElement>("[data-letter-flow-image]") ?? [];
  for (const image of Array.from(images)) {
    const imageLike = image as HTMLElement & {
      querySelector?: <T extends Element = Element>(selector: string) => T | null;
      dataset?: DOMStringMap;
    };
    const printableImage =
      typeof imageLike.querySelector === "function"
        ? (imageLike.querySelector<HTMLElement>("img") ?? image)
        : image;
    const imageRect = printableImage.getBoundingClientRect();
    const free = imageLike.dataset?.letterImagePlacement === "free";

    if (rectOutside(imageRect, pageRect)) return "image:outside-page";
    if (!free && rectOutside(imageRect, layerRect)) return "flow-image:outside-text-layer";
    if (footer && overlaps(imageRect, footer.getBoundingClientRect())) return "image:footer-overlap";
  }

  return null;
}

/**
 * Vollständige Seitenprüfung. Nicht nur der Brieftext, sondern auch der
 * integrierte Kontaktkopf, Footer und frei platzierte Bilder gehören zur
 * sichtbaren Wahrheit. Nichts davon darf still ausserhalb oder geclippt sein.
 */
export function letterPageOverflows(page: ParentNode): boolean {
  const reason = letterPageOverflowReason(page);
  if (
    reason &&
    typeof Element !== "undefined" &&
    page instanceof Element &&
    page.closest("[data-docx-v2-letter-measurement]")
  ) {
    throw new Error(`DOCX V2 letter physical overflow: ${reason}`);
  }
  return reason !== null;
}
