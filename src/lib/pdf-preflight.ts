import { letterPageOverflows, printableTextClips } from "@/components/letter/preflight";

export type PdfPreflightStatus = "pending" | "pass" | "advisory" | "blocked";
export type PdfDocumentKind = "letter" | "dossier";
export type PdfPreflightIssue = {
  code: string;
  documentKind: "letter" | "cv" | "cover";
  pageIndex?: number;
  severity: "pending" | "advisory" | "blocked";
  element?: string;
  message: string;
  overridePermitted: boolean;
};
export type PdfPreflightResult = {
  status: PdfPreflightStatus;
  issues: PdfPreflightIssue[];
  /** Current DOM, physical geometry and computed typography; never stored. */
  signature: string;
};

export function pdfContentHash(text: string): string {
  let hash = 2166136261;
  for (const char of text.replace(/\s+/g, ""))
    hash = Math.imul(hash ^ char.codePointAt(0)!, 16777619);
  return (hash >>> 0).toString(16);
}

const outside = (a: DOMRect, b: DOMRect) =>
  a.left < b.left - 1.5 ||
  a.right > b.right + 1.5 ||
  a.top < b.top - 1.5 ||
  a.bottom > b.bottom + 1.5;

function requiredLetterTextIsHidden(sheet: HTMLElement) {
  for (const container of sheet.querySelectorAll<HTMLElement>(
    '[data-letter-pdf-richtext="body"], [data-letter-footer-attachments]',
  )) {
    const walker = sheet.ownerDocument.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (!node.textContent?.trim()) continue;
      for (let parent = node.parentElement; parent; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          Number(style.opacity) === 0 ||
          style.color === "rgba(0, 0, 0, 0)"
        )
          return true;
        if (parent === sheet) break;
      }
    }
  }
  return false;
}

/** Read the same production renderer's semantic text, ignoring only the
 * offscreen probe wrapper. Page-context selectors still apply inside it. */
function semanticText(element: HTMLElement, boundary: HTMLElement): string {
  const walker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const text: string[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    let hidden = false;
    for (let parent = node.parentElement; parent; parent = parent.parentElement) {
      const css = getComputedStyle(parent);
      if (css.display === "none" || css.visibility === "hidden" || Number(css.opacity) === 0)
        hidden = true;
      if (parent === boundary) break;
    }
    if (!hidden) text.push(node.textContent ?? "");
  }
  return text.join("").replace(/\s+/g, "");
}

function missingLetterSemantics(
  letter: HTMLElement,
  sheet: HTMLElement,
  index: number,
  final: boolean,
) {
  const name = `${index === 0 ? "first" : "continuation"}-${final ? "final" : "flow"}`;
  const probe = letter.querySelector<HTMLElement>(`[data-letter-pagination-probe="${name}"]`);
  if (!probe) return ["measurement-source"];
  const missing: string[] = [];
  for (const attribute of [
    "data-letter-pdf-text",
    "data-letter-integrated-contact",
    "data-dossier-continuation-contact",
    "data-dossier-header",
    "data-dossier-footer",
    "data-dossier-field-id",
  ]) {
    const expectedNodes = Array.from(probe.querySelectorAll<HTMLElement>(`[${attribute}]`));
    for (const expected of expectedNodes) {
      const text = semanticText(expected, probe);
      if (!text) continue;
      const value = expected.getAttribute(attribute)!;
      const actual = Array.from(
        sheet.querySelectorAll<HTMLElement>(`[${attribute}="${CSS.escape(value)}"]`),
      );
      if (!actual.some((node) => semanticText(node, sheet) === text))
        missing.push(value || attribute);
    }
  }
  return missing;
}

/** One safety policy for menu eligibility, explicit consent and final export. */
export function inspectPdfPreflight(
  root: HTMLElement | null,
  kind: PdfDocumentKind,
): PdfPreflightResult {
  const issues: PdfPreflightIssue[] = [];
  // This cache belongs to one synchronous inspection, never to a saved state
  // or consent. Every subsequent guard re-reads current computed styles.
  const styles = new WeakMap<HTMLElement, CSSStyleDeclaration>();
  const styleFor = (node: HTMLElement) => {
    let style = styles.get(node);
    if (!style) styles.set(node, (style = getComputedStyle(node)));
    return style;
  };
  const add = (
    code: string,
    severity: PdfPreflightIssue["severity"],
    message: string,
    documentKind: PdfPreflightIssue["documentKind"] = "letter",
    pageIndex?: number,
    element?: string,
  ) =>
    issues.push({
      code,
      severity,
      message,
      documentKind,
      pageIndex,
      element,
      // The Letter has a complete body/image contract plus semantic source
      // probes. Cover and CV lack an equivalent full source contract (including
      // sidebar/free elements), so combined uncertainty cannot be consented away.
      overridePermitted: severity === "advisory" && kind === "letter",
    });
  if (!root || !root.isConnected)
    return {
      status: "pending",
      issues: [
        {
          code: "render-pending",
          severity: "pending",
          documentKind: "letter",
          message: "Die Exportansicht wird noch vorbereitet.",
          overridePermitted: false,
        },
      ],
      signature: "pending",
    };
  const letter = root.matches("[data-letter-document-root]")
    ? root
    : root.querySelector<HTMLElement>("[data-letter-document-root]");
  const pages = root.matches("[data-letter-page]")
    ? [root]
    : Array.from(
        root.querySelectorAll<HTMLElement>("[data-letter-document-pages] [data-letter-page]"),
      );
  const cover =
    kind === "dossier" ? root.querySelector<HTMLElement>('[data-dossier-document="cover"]') : null;
  const cvPages =
    kind === "dossier" ? Array.from(root.querySelectorAll<HTMLElement>("[data-cv-page]")) : [];
  const physical = [...(cover ? [cover] : []), ...pages, ...cvPages];
  if (!letter && !root.matches("[data-letter-page]"))
    add(
      "document-structure",
      "blocked",
      "Die kanonische Briefstruktur fehlt. Bitte die Exportansicht erneut öffnen.",
    );
  if (!pages.length || (letter && letter.dataset.letterPaginationReady !== "true"))
    add(
      "pagination-pending",
      "pending",
      "Der Seitenumbruch wird noch vermessen. Bitte kurz warten.",
    );
  if (letter?.dataset.letterPaginationError)
    add(
      "pagination-unsafe",
      "blocked",
      letter.dataset.letterPaginationErrorMessage || "Der Seitenumbruch ist nicht sicher.",
    );
  if (letter && pages.length !== Number(letter.dataset.letterPageCount))
    add(
      "page-count-mismatch",
      "blocked",
      "Die Briefseiten sind nicht vollständig. Bitte den Seitenumbruch abwarten.",
    );
  if (kind === "dossier") {
    const actualOrder = Array.from(
      root.querySelectorAll<HTMLElement>(
        '[data-dossier-document="cover"], [data-letter-document-pages] [data-letter-page], [data-cv-page]',
      ),
    );
    if (
      actualOrder.length !== physical.length ||
      actualOrder.some((sheet, index) => sheet !== physical[index])
    )
      add(
        "document-order",
        "blocked",
        "Die Dossierseiten sind nicht vollständig oder in der falschen Reihenfolge.",
      );
    if (!cover || !cvPages.length)
      add(
        "missing-document",
        "blocked",
        "Titelblatt, Brief und Lebenslauf müssen vollständig vorhanden sein.",
      );
    if (root.dataset.dossierCvReady !== "true")
      add("cv-pending", "pending", "Der Lebenslauf wird noch vermessen.", "cv");
    if (
      root.dataset.dossierCvReady === "true" &&
      cvPages.length !== Number(root.dataset.dossierCvPageCount)
    )
      add(
        "cv-page-count-mismatch",
        "blocked",
        "Die Lebenslaufseiten sind nicht vollständig.",
        "cv",
      );
  }
  // A provisional fallback can contain the entire long source before the
  // paginator splits it. Scanning its glyphs here delays that very measurement
  // and cannot authorize export. Settled pages are always fully inspected.
  if (issues.some((issue) => issue.severity === "pending" || issue.severity === "blocked")) {
    return {
      status: issues.some((issue) => issue.severity === "blocked") ? "blocked" : "pending",
      issues,
      signature: JSON.stringify(issues),
    };
  }
  const requiredFonts = new Map<string, string>();
  for (const sheet of physical) {
    const walker = root.ownerDocument.createTreeWalker(sheet, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (!node.textContent?.trim() || !node.parentElement) continue;
      let hidden = false;
      for (
        let parent: HTMLElement | null = node.parentElement;
        parent;
        parent = parent.parentElement
      ) {
        const css = styleFor(parent);
        if (css.display === "none" || css.visibility === "hidden") {
          hidden = true;
          break;
        }
        if (parent === sheet) break;
      }
      if (hidden) continue;
      const style = styleFor(node.parentElement);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const font =
        style.font ||
        `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      requiredFonts.set(font, (requiredFonts.get(font) ?? "") + node.textContent);
    }
  }
  if (
    root.ownerDocument.fonts &&
    [...requiredFonts].some(([font, text]) => !root.ownerDocument.fonts.check(font, text))
  )
    add(
      "fonts-pending",
      "pending",
      "Schriften für den Drucksatz werden noch geladen. Bitte kurz warten.",
    );
  for (const face of root.ownerDocument.fonts ?? [])
    if (
      face.status === "error" &&
      [...requiredFonts.keys()].some((font) => font.includes(face.family.replace(/["']/g, "")))
    )
      add(
        "font-missing",
        "blocked",
        "Eine Schrift für den Drucksatz konnte nicht geladen werden. Wähle eine andere Schrift oder lade die Ansicht neu.",
      );
  for (const sheet of physical) {
    const documentKind = sheet.hasAttribute("data-letter-page")
      ? "letter"
      : sheet.hasAttribute("data-cv-page")
        ? "cv"
        : "cover";
    const pageIndex =
      documentKind === "letter"
        ? pages.indexOf(sheet)
        : documentKind === "cv"
          ? cvPages.indexOf(sheet)
          : 0;
    const rect = sheet.getBoundingClientRect();
    if (
      rect.width <= 0 ||
      rect.height <= 0 ||
      Math.abs(rect.width / rect.height - 794 / 1123) > 0.005
    )
      add(
        "page-geometry",
        "blocked",
        `Seite ${pageIndex + 1}: Die A4-Seitengeometrie ist ungültig.`,
        documentKind,
        pageIndex,
      );
    for (const image of sheet.querySelectorAll<HTMLImageElement>("img")) {
      if (!image.complete)
        add(
          "image-pending",
          "pending",
          `Seite ${pageIndex + 1}: Ein Bild wird noch geladen.`,
          documentKind,
          pageIndex,
          "image",
        );
      else if (!image.naturalWidth)
        add(
          "image-missing",
          "blocked",
          `Seite ${pageIndex + 1}: Ein Bild konnte nicht geladen werden. Ersetze oder entferne es.`,
          documentKind,
          pageIndex,
          "image",
        );
    }
    if (documentKind === "letter") {
      if (letter) {
        const missing = missingLetterSemantics(
          letter,
          sheet,
          pageIndex,
          pageIndex === pages.length - 1,
        );
        if (missing.length)
          add(
            "semantic-content-missing",
            "blocked",
            `Motivationsschreiben Seite ${pageIndex + 1}: Erforderliche Angaben sind im Drucksatz nicht vollständig (${missing.join(", ")}). Bitte die Ansicht erneut prüfen.`,
            documentKind,
            pageIndex,
            missing.join(","),
          );
      }
      if (requiredLetterTextIsHidden(sheet))
        add(
          "content-hidden",
          "blocked",
          `Motivationsschreiben Seite ${pageIndex + 1}: Erforderlicher Text ist unsichtbar. Prüfe Brieftext, Beilagen und Textfarben.`,
          documentKind,
          pageIndex,
          "body/attachments",
        );
      if (letterPageOverflows(sheet))
        add(
          "physical-overflow",
          "blocked",
          `Motivationsschreiben Seite ${pageIndex + 1} enthält Inhalt, der abgeschnitten wird oder Kopf/Fuss überlappt. Passe Bildgrösse, Abstände oder Inhalt an.`,
          documentKind,
          pageIndex,
          "text/chrome/image",
        );
      if (
        letter &&
        (Number(sheet.dataset.letterPageIndex) !== pageIndex ||
          sheet.dataset.letterFinalPage !== String(pageIndex === pages.length - 1))
      )
        add(
          "page-structure",
          "blocked",
          `Briefseite ${pageIndex + 1}: Die Seitenfolge ist ungültig.`,
          documentKind,
          pageIndex,
        );
    } else {
      if (printableTextClips(sheet))
        add(
          "physical-overflow",
          "blocked",
          `${documentKind === "cv" ? "Lebenslauf" : "Titelblatt"} Seite ${pageIndex + 1}: Text wird abgeschnitten oder überlappt.`,
          documentKind,
          pageIndex,
          "text",
        );
      const imageAndFreeBoxes =
        documentKind === "cv"
          ? Array.from(
              sheet.querySelectorAll<HTMLElement>(
                "[data-cv-free-section], [data-cv-elements] [data-block-id], [data-cv-photo]",
              ),
            )
          : // Cover photos deliberately crop/zoom inside their frame. Validate
            // that printable frame, rather than the oversized source image.
            Array.from(sheet.querySelectorAll<HTMLImageElement>("[data-block-id] img")).map(
              (image) => image.closest<HTMLElement>("[data-block-id]")!,
            );
      for (const node of imageAndFreeBoxes)
        if (outside(node.getBoundingClientRect(), rect))
          add(
            "physical-overflow",
            "blocked",
            `${documentKind === "cv" ? "Lebenslauf" : "Titelblatt"} Seite ${pageIndex + 1}: Ein freies Element oder Foto liegt ausserhalb der Seite.`,
            documentKind,
            pageIndex,
            "free-element/image",
          );
    }
  }
  if (letter?.dataset.letterContentHash && letter.dataset.letterPaginationReady === "true") {
    const bodyText = pages
      .map(
        (sheet) =>
          sheet.querySelector<HTMLElement>('[data-letter-pdf-richtext="body"]')?.innerText ?? "",
      )
      .join("");
    if (pdfContentHash(bodyText) !== letter.dataset.letterContentHash)
      add(
        "content-missing",
        "blocked",
        "Der Brieftext ist im Drucksatz nicht vollständig. Bitte den Brief erneut prüfen.",
      );
    const expected = JSON.parse(letter.dataset.letterRequiredImages ?? "[]") as string[];
    const actual = pages.flatMap((sheet) =>
      Array.from(
        sheet.querySelectorAll<HTMLElement>("[data-letter-flow-image]"),
        (node) => node.dataset.letterFlowImage,
      ),
    );
    if (JSON.stringify([...expected].sort()) !== JSON.stringify(actual.sort()))
      add("image-content-missing", "blocked", "Ein erforderliches Briefbild fehlt im Drucksatz.");
  }
  const warning = letter?.dataset.letterPaginationWarning;
  // Only the measured complete fallback from a failed capacity probe is
  // defensible. Oversized images/blocks and unknown algorithm codes stay hard.
  if (warning)
    add(
      warning === "measurement-failed" ? "measurement-advisory" : "pagination-unsafe",
      warning === "measurement-failed" ? "advisory" : "blocked",
      warning === "measurement-failed"
        ? kind === "letter"
          ? `Briefseite 1: Die Umbruchmessung war uneindeutig. Der vollständige Drucksatz passt sichtbar; bitte die Vorschau prüfen.`
          : `Briefseite 1: Die Umbruchmessung war uneindeutig. Für das Gesamtdossier ist diese Warnung nicht übersteuerbar. Bitte die Ansicht erneut öffnen oder Abstände/Inhalt anpassen und die neue Messung abwarten.`
        : letter?.dataset.letterPaginationWarningMessage || "Die Seitenaufteilung ist unsicher.",
      "letter",
      0,
    );
  const status = issues.some((i) => i.severity === "blocked")
    ? "blocked"
    : issues.some((i) => i.severity === "pending")
      ? "pending"
      : issues.some((i) => i.severity === "advisory")
        ? "advisory"
        : "pass";
  const geometry = physical
    .flatMap((sheet) => [
      sheet,
      ...Array.from(
        sheet.querySelectorAll<HTMLElement>(
          "[data-letter-text-layer], [data-letter-pdf-text], [data-letter-pdf-richtext], [data-letter-pdf-richtext] *, [data-letter-chrome] *, [data-dossier-field-id], [data-dossier-header], [data-dossier-footer], [data-cv-main], [data-cv-sidebar], [data-cv-entry], [data-cv-body], [data-cv-photo], [data-block-id], [data-block-id] *, img",
        ),
      ),
    ])
    .map((node) => {
      const r = node.getBoundingClientRect(),
        s = styleFor(node);
      return [
        r.left,
        r.top,
        r.width,
        r.height,
        s.font,
        s.lineHeight,
        s.letterSpacing,
        s.color,
        s.backgroundColor,
        s.backgroundImage,
        s.opacity,
        s.border,
        s.padding,
        s.margin,
        s.transform,
        s.clipPath,
        s.filter,
        s.objectFit,
        s.objectPosition,
        s.textDecoration,
        s.wordSpacing,
        s.display,
        s.visibility,
        s.overflowX,
        s.overflowY,
      ];
    });
  const signature = JSON.stringify([
    physical.map((p) => p.outerHTML),
    geometry,
    letter?.dataset,
    root.dataset.dossierCvReady,
    root.dataset.dossierCvPageCount,
    issues,
  ]);
  return { status, issues, signature };
}

declare const consentBrand: unique symbol;
export type PdfAdvisoryConsent = { readonly [consentBrand]: true };
const consents = new WeakMap<
  PdfAdvisoryConsent,
  { root: HTMLElement; kind: PdfDocumentKind; signature: string }
>();

/** Called only from an explicit secondary download action. One-use DOM lease. */
export function createPdfAdvisoryConsent(
  root: HTMLElement,
  kind: PdfDocumentKind,
): PdfAdvisoryConsent {
  const result = inspectPdfPreflight(root, kind);
  if (result.status !== "advisory" || !result.issues.every((issue) => issue.overridePermitted))
    throw new Error("Ein Override ist nur für eine vollständig geprüfte Layoutwarnung verfügbar.");
  const consent = Object.freeze({}) as PdfAdvisoryConsent;
  consents.set(consent, { root, kind, signature: result.signature });
  return consent;
}

export function beginPdfSafetyValidation(
  root: HTMLElement,
  kind: PdfDocumentKind,
  consent?: PdfAdvisoryConsent,
): () => void {
  const approved = consent ? consents.get(consent) : undefined;
  if (consent) consents.delete(consent);
  const initial = inspectPdfPreflight(root, kind);
  const validate = () => {
    const current = inspectPdfPreflight(root, kind);
    if (current.status === "blocked" || current.status === "pending")
      throw new Error(
        current.issues.find((i) => i.severity === current.status)?.message ||
          "Die PDF-Ansicht ist noch nicht sicher.",
      );
    if (current.signature !== initial.signature)
      throw new Error(
        "Inhalt oder Layout wurde während des PDF-Exports verändert. Bitte erneut herunterladen.",
      );
    if (
      consent &&
      (!approved ||
        approved.root !== root ||
        approved.kind !== kind ||
        approved.signature !== current.signature)
    )
      throw new Error(
        "Die Layoutbestätigung ist abgelaufen. Bitte den aktuellen Stand erneut prüfen.",
      );
    if (current.status === "advisory" && !approved)
      throw new Error(
        current.issues[0]?.message || "Bitte die Layoutwarnung ausdrücklich bestätigen.",
      );
  };
  validate();
  return validate;
}

/** Observes the canonical renderer, not an independent pagination model. */
export function observePdfPreflight(
  getRoot: () => HTMLElement | null,
  kind: PdfDocumentKind,
  onResult: (result: PdfPreflightResult) => void,
) {
  let frame = 0,
    previous = "",
    cancelled = false;
  const resizeObserver = new ResizeObserver(() => schedule());
  let observedRoot: HTMLElement | null = null;
  const measure = () => {
    frame = 0;
    if (cancelled) return;
    const root = getRoot();
    if (root !== observedRoot) {
      resizeObserver.disconnect();
      observedRoot = root;
      if (root) resizeObserver.observe(root);
    }
    const result = inspectPdfPreflight(root, kind),
      key = JSON.stringify(result);
    if (key !== previous) {
      previous = key;
      onResult(result);
    }
  };
  const schedule = () => {
    if (!frame && !cancelled) frame = requestAnimationFrame(measure);
  };
  const observer = new MutationObserver((records) => {
    const root = getRoot();
    if (!root || root !== observedRoot) {
      schedule();
      return;
    }
    if (
      records.some((record) => {
        // Global styles and inherited ancestor attributes can change the print
        // layout. Unrelated UI widgets and html2canvas's own iframe cannot.
        if (document.head?.contains(record.target) || root.contains(record.target)) return true;
        if (
          record.type === "attributes" &&
          record.target instanceof Element &&
          record.target.contains(root)
        )
          return true;
        const targetElement =
          record.target instanceof Element ? record.target : record.target.parentElement;
        if (targetElement?.closest("style")) return true;
        return [...record.addedNodes, ...record.removedNodes].some(
          (node) =>
            node instanceof Element &&
            (node.matches('style,link[rel="stylesheet"]') ||
              !!node.querySelector('style,link[rel="stylesheet"]')),
        );
      })
    )
      schedule();
  });
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    characterData: true,
  });
  const resourceChanged = (event: Event) => {
    const target = event.target;
    if (
      target instanceof Element &&
      (getRoot()?.contains(target) || target.matches('link[rel="stylesheet"]'))
    )
      schedule();
  };
  document.addEventListener("load", resourceChanged, true);
  document.addEventListener("error", resourceChanged, true);
  document.fonts?.addEventListener("loading", schedule);
  document.fonts?.addEventListener("loadingdone", schedule);
  document.fonts?.addEventListener("loadingerror", schedule);
  window.addEventListener("resize", schedule);
  void document.fonts?.ready.then(schedule);
  measure();
  return () => {
    cancelled = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    resizeObserver.disconnect();
    document.removeEventListener("load", resourceChanged, true);
    document.removeEventListener("error", resourceChanged, true);
    document.fonts?.removeEventListener("loading", schedule);
    document.fonts?.removeEventListener("loadingdone", schedule);
    document.fonts?.removeEventListener("loadingerror", schedule);
    window.removeEventListener("resize", schedule);
  };
}
