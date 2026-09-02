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

/** Dieselbe Überlaufregel wird von Editor, Dossier-Review und PDF-Gate verwendet. */
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

/**
 * Vollständige Ein-Seiten-Prüfung. Nicht nur der Brieftext, sondern auch der
 * integrierte Kontaktkopf, Footer und frei platzierte Bilder gehören zur
 * sichtbaren Wahrheit. Nichts davon darf still ausserhalb oder geclippt sein.
 */
export function letterPageOverflows(page: ParentNode): boolean {
  const layer = page.querySelector<HTMLElement>("[data-letter-text-layer]");
  if (!layer) {
    throw new Error("Motivationsschreiben konnte für die Layoutprüfung nicht vermessen werden");
  }
  if (letterTextLayerOverflows(layer)) return true;

  const measurablePage = page as ParentNode & {
    getBoundingClientRect?: () => DOMRect;
    querySelectorAll?: <T extends Element = Element>(selectors: string) => NodeListOf<T>;
  };
  if (typeof measurablePage.getBoundingClientRect !== "function") return false;

  const pageRect = measurablePage.getBoundingClientRect();
  const layerRect = layer.getBoundingClientRect();
  const contact = page.querySelector<HTMLElement>("[data-letter-integrated-contact]");
  const recipient = page.querySelector<HTMLElement>('[data-letter-section="recipient"]');
  const footer = page.querySelector<HTMLElement>("[data-letter-footer]");

  for (const element of [contact, footer]) {
    if (!element) continue;
    if (clipsOwnBox(element) || rectOutside(element.getBoundingClientRect(), pageRect)) return true;
  }

  if (contact && recipient && overlaps(contact.getBoundingClientRect(), recipient.getBoundingClientRect())) {
    return true;
  }

  const images = measurablePage.querySelectorAll?.<HTMLElement>("[data-letter-flow-image]") ?? [];
  for (const image of Array.from(images)) {
    const imageRect = image.getBoundingClientRect();
    if (clipsOwnBox(image) || rectOutside(imageRect, pageRect) || rectOutside(imageRect, layerRect)) {
      return true;
    }
    if (footer && overlaps(imageRect, footer.getBoundingClientRect())) return true;
  }

  return false;
}
