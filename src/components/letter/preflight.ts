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

/** Inspect painted text through nested clipping boxes, including overflow:clip.
 * Range boxes include unused font descent; canvas ink metrics avoid inventing
 * clipping where the glyph itself is still fully printable.
 */
export function printableTextClips(page: HTMLElement, textArea?: HTMLElement): boolean {
  const doc = page.ownerDocument;
  if (!doc?.createTreeWalker) return false;
  // One synchronous measurement may visit the same clipping ancestor for
  // hundreds of glyph fragments. Cache only within this inspection; the next
  // preflight always reads fresh styles and geometry.
  const styles = new WeakMap<HTMLElement, CSSStyleDeclaration>();
  const boxes = new WeakMap<HTMLElement, DOMRect>();
  const styleFor = (node: HTMLElement) => {
    let style = styles.get(node);
    if (!style) styles.set(node, (style = getComputedStyle(node)));
    return style;
  };
  const boxFor = (node: HTMLElement) => {
    let box = boxes.get(node);
    if (!box) boxes.set(node, (box = node.getBoundingClientRect()));
    return box;
  };
  const visibleNode = (node: HTMLElement) => {
    const style = styleFor(node),
      box = boxFor(node);
    return (
      style.display !== "none" && style.visibility !== "hidden" && (box.width > 0 || box.height > 0)
    );
  };
  const pageRect = page.getBoundingClientRect();
  const textRect = textArea?.getBoundingClientRect();
  const context = doc.createElement("canvas").getContext("2d");
  if (!context) return true;
  const walker = doc.createTreeWalker(page, NodeFilter.SHOW_TEXT);
  const chromeNodes = Array.from(
    page.querySelectorAll<HTMLElement>(
      "[data-letter-integrated-contact], [data-dossier-header], [data-letter-footer], [data-dossier-footer]",
    ),
  );
  const overlays = Array.from(
    page.querySelectorAll<HTMLElement>(
      '[data-letter-image-placement="free"] img, [data-cv-photo], [data-dossier-document="cover"] [data-block-id] img',
    ),
  ).map((node) =>
    page.dataset.dossierDocument === "cover" ? node.closest<HTMLElement>("[data-block-id]")! : node,
  );
  let node: Node | null;
  const painted: Array<Pick<DOMRect, "left" | "right" | "top" | "bottom">> = [];
  while ((node = walker.nextNode())) {
    if (!node.textContent?.trim() || !node.parentElement) continue;
    if (node.parentElement.closest("button, [data-letter-image-placement-controls]")) continue;
    const ancestors: HTMLElement[] = [];
    let hidden = false;
    for (
      let parent: HTMLElement | null = node.parentElement;
      parent;
      parent = parent.parentElement
    ) {
      ancestors.push(parent);
      const style = styleFor(parent);
      if (style.display === "none" || style.visibility === "hidden") hidden = true;
      if (parent === page) break;
    }
    if (hidden) continue;
    const font = styleFor(node.parentElement);
    context.font =
      font.font || `${font.fontStyle} ${font.fontWeight} ${font.fontSize} ${font.fontFamily}`;
    const metrics = context.measureText(node.textContent);
    const range = doc.createRange();
    range.selectNodeContents(node);
    for (const rect of Array.from(range.getClientRects())) {
      if (rect.width <= 0 || rect.height <= 0) continue;
      const height = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
      const scale = height > 0 ? rect.height / height : 0;
      const ink = {
        left: rect.left,
        right: rect.right,
        top: rect.top + (metrics.fontBoundingBoxAscent - metrics.actualBoundingBoxAscent) * scale,
        bottom:
          rect.bottom - (metrics.fontBoundingBoxDescent - metrics.actualBoundingBoxDescent) * scale,
      };
      if (rectOutside(ink, pageRect)) return true;
      if (textRect && textArea?.contains(node) && rectOutside(ink, textRect)) return true;
      if (painted.some((previous) => overlaps(ink, previous))) return true;
      painted.push(ink);
      for (const ancestor of ancestors) {
        if (ancestor === page) break;
        const style = styleFor(ancestor),
          box = boxFor(ancestor);
        if (
          (/hidden|clip|auto|scroll/.test(style.overflowX) &&
            (ink.left < box.left - 1.5 || ink.right > box.right + 1.5)) ||
          (/hidden|clip|auto|scroll/.test(style.overflowY) &&
            (ink.top < box.top - 1.5 || ink.bottom > box.bottom + 1.5))
        )
          return true;
      }
      // Chrome is reserved physical space. Its background box can contain
      // padding; an actual body glyph inside that box must never be accepted.
      if (
        node.parentElement.closest("[data-letter-text-layer], [data-cv-main], [data-cv-sidebar]") ||
        page.dataset.dossierDocument === "cover"
      ) {
        for (const chrome of chromeNodes)
          if (
            chrome &&
            !chrome.contains(node) &&
            visibleNode(chrome) &&
            overlaps(ink, boxFor(chrome))
          )
            return true;
        for (const overlay of overlays)
          if (!overlay.contains(node) && visibleNode(overlay) && overlaps(ink, boxFor(overlay)))
            return true;
      }
    }
  }
  return false;
}

/**
 * Judge the visible letter text, not the text layer's aggregate scrollHeight.
 * Images are validated separately below because freely positioned images may
 * intentionally leave the text content box while still remaining printable on A4.
 */
export function letterRenderedTextLayerOverflows(layer: HTMLElement): boolean {
  const layerRect = layer.getBoundingClientRect();
  if (layerRect.width <= 0 || layerRect.height <= 0) return letterTextLayerOverflows(layer);

  // Export/preflight unit tests deliberately use a lightweight HTMLElement-like
  // metric object. Keep that deterministic fallback while real browser pages use
  // descendant geometry as the final authority.
  if (typeof layer.querySelectorAll !== "function") return letterTextLayerOverflows(layer);
  // A semantic box can include hundreds of pixels of unused trailing height.
  // The rendered glyphs and nested clipping ancestors are authoritative;
  // printable images retain their independent page/text-area checks below.
  return layer.ownerDocument ? printableTextClips(layer) : letterTextLayerOverflows(layer);
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
  if (!layer.ownerDocument && letterRenderedTextLayerOverflows(layer)) return true;
  // One glyph walk enforces both the printable text area and physical A4.
  // All clipping ancestors, overlaps and the existing tolerances remain intact.
  if (printableTextClips(page as HTMLElement, layer.ownerDocument ? layer : undefined)) return true;

  const pageRect = measurablePage.getBoundingClientRect();
  const layerRect = layer.getBoundingClientRect();
  const contact = page.querySelector<HTMLElement>("[data-letter-integrated-contact]");
  const recipient = page.querySelector<HTMLElement>('[data-letter-section="recipient"]');
  const footer =
    page.querySelector<HTMLElement>("[data-letter-footer], [data-dossier-footer]") ??
    page.querySelector<HTMLElement>("[data-letter-footer]");

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

    // Free images are positioned from the text box coordinate system, but users
    // may deliberately place them in the surrounding printable page area. Flow
    // images, on the other hand, must stay inside the text layer they wrap.
    if (rectOutside(imageRect, pageRect) || (!free && rectOutside(imageRect, layerRect))) {
      return true;
    }
    for (
      let ancestor = printableImage.parentElement;
      ancestor && ancestor !== page;
      ancestor = ancestor.parentElement
    ) {
      const style = getComputedStyle(ancestor),
        box = ancestor.getBoundingClientRect();
      if (
        (/hidden|clip|auto|scroll/.test(style.overflowX) &&
          (imageRect.left < box.left - 1.5 || imageRect.right > box.right + 1.5)) ||
        (/hidden|clip|auto|scroll/.test(style.overflowY) &&
          (imageRect.top < box.top - 1.5 || imageRect.bottom > box.bottom + 1.5))
      )
        return true;
    }
    if (footer && overlaps(imageRect, footer.getBoundingClientRect())) return true;
  }

  return false;
}
