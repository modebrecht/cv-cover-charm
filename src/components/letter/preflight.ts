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

/**
 * Judge the visible letter content, not the text layer's aggregate scrollHeight.
 * The latter can be larger because of flex min-content, probes or transformed
 * descendants even while the actual rendered content stays inside A4.
 */
export function letterRenderedTextLayerOverflows(layer: HTMLElement): boolean {
  const layerRect = layer.getBoundingClientRect();
  if (layerRect.width <= 0 || layerRect.height <= 0) return letterTextLayerOverflows(layer);

  // Export/preflight unit tests deliberately use a lightweight HTMLElement-like
  // metric object. Keep that deterministic fallback while real browser pages use
  // descendant geometry as the final authority.
  if (typeof layer.querySelectorAll !== "function") return letterTextLayerOverflows(layer);

  const meaningful = layer.querySelectorAll<HTMLElement>(
    "[data-letter-section], [data-letter-pdf-text], [data-letter-pdf-richtext], [data-letter-flow-image]",
  );
  let measured = false;
  for (const element of Array.from(meaningful)) {
    if (!visible(element)) continue;
    measured = true;
    const rect = element.getBoundingClientRect();
    if (rectOutside(rect, layerRect)) return true;

    // Width clipping on a real content node is meaningful. Height clipping on
    // auto-sized blocks is normally equal; fixed-size content nodes must not hide text.
    if (element.scrollWidth > element.clientWidth + 1) return true;
    const style = window.getComputedStyle(element);
    if (
      style.overflowY !== "visible" &&
      style.overflowY !== "clip" &&
      element.scrollHeight > element.clientHeight + 1
    ) {
      return true;
    }
  }

  // Empty/mock layers do not expose meaningful descendants, so preserve the
  // deterministic scroll-metric fallback used by non-browser tests.
  return measured ? false : letterTextLayerOverflows(layer);
}

/**
 * Vollständige Seitenprüfung. Nicht nur der Brieftext, sondern auch der
 * integrierte Kontaktkopf, Footer und frei platzierte Bilder gehören zur
 * sichtbaren Wahrheit. Nichts davon darf still ausserhalb oder geclippt sein.
 */
export function letterPageOverflows(page: ParentNode): boolean {
  const layer = page.querySelector<HTMLElement>("[data-letter-text-layer]");
  if (!layer) {
    throw new Error("Motivationsschreiben konnte für die Layoutprüfung nicht vermessen werden");
  }

  const measurablePage = page as ParentNode & {
    getBoundingClientRect?: () => DOMRect;
    querySelectorAll?: <T extends Element = Element>(selectors: string) => NodeListOf<T>;
  };
  if (typeof measurablePage.getBoundingClientRect !== "function") {
    return letterTextLayerOverflows(layer);
  }
  if (letterRenderedTextLayerOverflows(layer)) return true;

  const pageRect = measurablePage.getBoundingClientRect();
  const layerRect = layer.getBoundingClientRect();
  const contact = page.querySelector<HTMLElement>("[data-letter-integrated-contact]");
  const recipient = page.querySelector<HTMLElement>('[data-letter-section="recipient"]');
  const footer = page.querySelector<HTMLElement>("[data-letter-footer]");

  for (const element of [contact, footer]) {
    if (!element) continue;
    if (clipsOwnBox(element) || rectOutside(element.getBoundingClientRect(), pageRect)) return true;
  }

  if (
    contact &&
    recipient &&
    overlaps(contact.getBoundingClientRect(), recipient.getBoundingClientRect())
  ) {
    return true;
  }

  const images = measurablePage.querySelectorAll?.<HTMLElement>("[data-letter-flow-image]") ?? [];
  for (const image of Array.from(images)) {
    const imageRect = image.getBoundingClientRect();
    if (
      clipsOwnBox(image) ||
      rectOutside(imageRect, pageRect) ||
      rectOutside(imageRect, layerRect)
    ) {
      return true;
    }
    if (footer && overlaps(imageRect, footer.getBoundingClientRect())) return true;
  }

  return false;
}
