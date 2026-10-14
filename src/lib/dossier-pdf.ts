import type { jsPDF as JsPdf } from "jspdf";
import { letterPageOverflows, printableTextClips } from "@/components/letter/preflight";
import { PAGE, PDF } from "@/default-config";
import { addCvTextLayer } from "@/lib/cv-pdf-text";
import { normalizeCssZoomForHtml2Canvas } from "@/lib/html2canvas-export";
import { downloadBlob } from "@/lib/download";
import { registerCabinPdfFonts } from "@/lib/pdf-fonts";
import { fittedPdfHorizontalScale } from "@/lib/pdf-text-width";
import { beginPdfSafetyValidation, type PdfAdvisoryConsent } from "@/lib/pdf-preflight";

export type DossierPdfMeta = {
  title: string;
  author: string;
  subject?: string;
  keywords?: string;
};

type Html2Canvas = (typeof import("html2canvas-pro"))["default"];
type PdfFont = "helvetica" | "times" | "courier" | "Cabin";
type PdfFontStyle = "normal" | "bold" | "italic" | "bolditalic";
type RichTextFragment = { text: string; rect: DOMRect };

const MM_PER_PT = 25.4 / 72;

function pdfFontFor(page: HTMLElement): PdfFont {
  const font = page.dataset.letterFont;
  if (font === "freundlich") return "Cabin";
  if (font === "serif" || font === "times") return "times";
  if (font === "maschine") return "courier";
  return "helvetica";
}

function pdfFontStyle(style: CSSStyleDeclaration): PdfFontStyle {
  const weight = Number.parseInt(style.fontWeight, 10);
  const bold = Number.isFinite(weight) ? weight >= 600 : /bold/i.test(style.fontWeight);
  const italic = style.fontStyle === "italic" || style.fontStyle === "oblique";
  if (bold && italic) return "bolditalic";
  if (bold) return "bold";
  if (italic) return "italic";
  return "normal";
}

function rgb(cssColor: string): [number, number, number] {
  const values = cssColor
    .match(/[\d.]+/g)
    ?.slice(0, 3)
    .map(Number);
  if (values?.length === 3 && values.every(Number.isFinite)) {
    return [values[0], values[1], values[2]];
  }
  const hex = cssColor.match(/^#([0-9a-f]{6})$/i)?.[1];
  if (hex) {
    return [
      Number.parseInt(hex.slice(0, 2), 16),
      Number.parseInt(hex.slice(2, 4), 16),
      Number.parseInt(hex.slice(4, 6), 16),
    ];
  }
  return [17, 17, 17];
}

function visibleRangeRects(range: Range): DOMRect[] {
  return Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
}

function nextCodePointOffset(text: string, offset: number, end: number): number {
  const codePoint = text.codePointAt(offset);
  if (codePoint === undefined) return Math.min(end, offset + 1);
  return Math.min(end, offset + (codePoint > 0xffff ? 2 : 1));
}

function richTokenFragments(
  node: Node,
  raw: string,
  start: number,
  end: number,
  range: Range,
  style: CSSStyleDeclaration,
): RichTextFragment[] {
  range.setStart(node, start);
  range.setEnd(node, end);
  const tokenRects = visibleRangeRects(range);
  if (tokenRects.length <= 1) {
    const rect = tokenRects[0] ?? range.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return [];
    return [{ text: raw.slice(start, end).replace(/\u00ad/g, ""), rect }];
  }

  const fontSizePx = Number.parseFloat(style.fontSize) || 14;
  const lineTolerancePx = Math.max(0.75, fontSizePx * 0.15);
  const slices: Array<{ start: number; end: number; top: number }> = [];
  let fragmentStart = start;
  let fragmentTop: number | null = null;
  let offset = start;

  while (offset < end) {
    const next = nextCodePointOffset(raw, offset, end);
    range.setStart(node, offset);
    range.setEnd(node, next);
    const charRect = visibleRangeRects(range)[0] ?? range.getBoundingClientRect();
    if (charRect.width > 0 && charRect.height > 0) {
      if (fragmentTop === null) {
        fragmentTop = charRect.top;
      } else if (Math.abs(charRect.top - fragmentTop) > lineTolerancePx) {
        slices.push({ start: fragmentStart, end: offset, top: fragmentTop });
        fragmentStart = offset;
        fragmentTop = charRect.top;
      }
    }
    offset = next;
  }

  if (fragmentTop === null) {
    const first = tokenRects[0];
    return first ? [{ text: raw.slice(start, end).replace(/\u00ad/g, ""), rect: first }] : [];
  }
  slices.push({ start: fragmentStart, end, top: fragmentTop });

  return slices.flatMap((slice, index) => {
    if (slice.start >= slice.end) return [];
    range.setStart(node, slice.start);
    range.setEnd(node, slice.end);
    const rects = visibleRangeRects(range);
    const rect =
      rects.find((candidate) => Math.abs(candidate.top - slice.top) <= lineTolerancePx) ??
      rects[0] ??
      range.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return [];

    const sourceText = raw.slice(slice.start, slice.end);
    const explicitSoftHyphen = sourceText.endsWith("\u00ad");
    let text = sourceText.replace(/\u00ad/g, "");
    const hasFollowingFragment = index < slices.length - 1;
    if (
      hasFollowingFragment &&
      text.trim() &&
      !text.endsWith("-") &&
      (explicitSoftHyphen || style.hyphens === "auto")
    ) {
      text += "-";
    }
    return text ? [{ text, rect }] : [];
  });
}

function addRichLetterText(
  pdf: JsPdf,
  page: HTMLElement,
  root: HTMLElement,
  font: PdfFont,
  mmX: number,
  mmY: number,
  excludeFooter = false,
) {
  const pageRect = page.getBoundingClientRect();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  const emittedListBlocks = new Set<HTMLElement>();
  let node = walker.nextNode();

  while (node) {
    const raw = node.nodeValue ?? "";
    const parent = node.parentElement ?? root;
    const style = window.getComputedStyle(parent);
    if (
      (excludeFooter && parent.closest("[data-dossier-footer]")) ||
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.visibility === "collapse" ||
      parent.closest("script, style, template")
    ) {
      node = walker.nextNode();
      continue;
    }
    const fontSizePx = Number.parseFloat(style.fontSize) || 14;
    const fontSizePt = fontSizePx * (72 / 96);
    const [red, green, blue] = rgb(style.color);

    const listBlock = parent.closest<HTMLElement>("[data-list]");
    if (raw.trim() && listBlock && root.contains(listBlock) && !emittedListBlocks.has(listBlock)) {
      addLetterListMarkers(pdf, page, listBlock, font, mmX, mmY);
      emittedListBlocks.add(listBlock);
    }

    // Preserve rendered source spaces, including boundaries between inline
    // formatting nodes. Readers must not guess word breaks from font advances.
    // Tabs/newlines may collapse to a visible space. Physical line breaks and
    // hidden spaces have no width and are omitted by richTokenFragments.
    for (const match of raw.matchAll(/\s+|\S+/gu)) {
      const token = match[0];
      const start = match.index ?? 0;
      const fragments = richTokenFragments(node, raw, start, start + token.length, range, style);

      for (const fragment of fragments) {
        const x = (fragment.rect.left - pageRect.left) * mmX;
        const top = (fragment.rect.top - pageRect.top) * mmY;
        const baseline = top + fontSizePt * MM_PER_PT * 0.82;
        pdf.setFont(font, pdfFontStyle(style));
        pdf.setFontSize(fontSizePt);
        pdf.setTextColor(red, green, blue);
        const text = fragment.text.trim() ? fragment.text : " ";
        pdf.text(text, x, baseline, {
          horizontalScale: fittedPdfHorizontalScale(pdf, text, fragment.rect.width * mmX),
          renderingMode: "invisible",
        });
      }
    }
    node = walker.nextNode();
  }
}

const LETTER_LIST_MARKERS: Record<string, string> = {
  bullet: "•",
  dash: "–",
  plus: "+",
  dot: "·",
};

function addLetterListMarkers(
  pdf: JsPdf,
  page: HTMLElement,
  root: HTMLElement,
  font: PdfFont,
  mmX: number,
  mmY: number,
) {
  const pageRect = page.getBoundingClientRect();
  const blocks = root.matches("[data-list]")
    ? [root]
    : Array.from(root.querySelectorAll<HTMLElement>(":scope > [data-list]"));
  for (const block of blocks) {
    const marker = LETTER_LIST_MARKERS[block.dataset.list ?? ""];
    if (!marker) continue;
    const rect = block.getBoundingClientRect();
    const style = window.getComputedStyle(block);
    const fontSizePx = Number.parseFloat(style.fontSize) || 14;
    const fontSizePt = fontSizePx * (72 / 96);
    const [red, green, blue] = rgb(style.color);
    const x = (rect.left - pageRect.left + 2) * mmX;
    const top = (rect.top - pageRect.top) * mmY;
    const baseline = top + fontSizePt * MM_PER_PT * 0.82;
    pdf.setFont(font, "normal");
    pdf.setFontSize(fontSizePt);
    pdf.setTextColor(red, green, blue);
    pdf.text(marker, x, baseline, { renderingMode: "invisible" });
  }
}

function addLetterTableBorders(
  pdf: JsPdf,
  page: HTMLElement,
  root: HTMLElement,
  mmX: number,
  mmY: number,
) {
  const pageRect = page.getBoundingClientRect();
  for (const cell of root.querySelectorAll<HTMLElement>("table[data-letter-table] td")) {
    const rect = cell.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    const style = window.getComputedStyle(cell);
    const [red, green, blue] = rgb(style.color);
    const left = (rect.left - pageRect.left) * mmX;
    const right = (rect.right - pageRect.left) * mmX;
    const top = (rect.top - pageRect.top) * mmY;
    const bottom = (rect.bottom - pageRect.top) * mmY;
    pdf.setDrawColor(red, green, blue);
    pdf.setLineWidth(0.16);
    pdf.line(left, top, right, top);
    pdf.line(right, top, right, bottom);
    pdf.line(right, bottom, left, bottom);
    pdf.line(left, bottom, left, top);
  }
}

function addLetterRules(pdf: JsPdf, page: HTMLElement, mmX: number, mmY: number) {
  const pageRect = page.getBoundingClientRect();
  const rules = page.querySelectorAll<HTMLElement>(
    "[data-letter-pdf-rule], [data-letter-pdf-richtext] hr",
  );
  for (const rule of rules) {
    const rect = rule.getBoundingClientRect();
    if (rect.width <= 0) continue;
    const style = window.getComputedStyle(rule);
    const [red, green, blue] = rgb(style.borderTopColor || style.color);
    const x1 = (rect.left - pageRect.left) * mmX;
    const x2 = (rect.right - pageRect.left) * mmX;
    const y = (rect.top - pageRect.top + Math.max(0.5, rect.height / 2)) * mmY;
    pdf.setDrawColor(red, green, blue);
    pdf.setLineWidth(0.22);
    pdf.line(x1, y, x2, y);
  }
}

/** Browserlayout vermessen und eine unsichtbare, durchsuchbare PDF-Textebene ergänzen. */
function addLetterTextLayer(pdf: JsPdf, page: HTMLElement) {
  const pageRect = page.getBoundingClientRect();
  if (pageRect.width <= 0 || pageRect.height <= 0) {
    throw new Error("Motivationsschreiben konnte für den PDF-Text nicht vermessen werden");
  }

  const mmX = 210 / pageRect.width;
  const mmY = 297 / pageRect.height;
  const font = pdfFontFor(page);

  // Integrated contact rows need no export-specific marker to remain searchable.
  // Absolute chrome footers occur early in the component DOM; emit them after
  // the main content. Every other text node retains DOM order and browser geometry.
  addRichLetterText(pdf, page, page, font, mmX, mmY, true);
  for (const footer of page.querySelectorAll<HTMLElement>("[data-dossier-footer]"))
    addRichLetterText(pdf, page, footer, font, mmX, mmY);

  const richBody = page.querySelector<HTMLElement>("[data-letter-pdf-richtext]");
  if (richBody) {
    addLetterTableBorders(pdf, page, richBody, mmX, mmY);
  }
  addLetterRules(pdf, page, mmX, mmY);
}

async function addRasterPage(
  pdf: JsPdf,
  html2canvas: Html2Canvas,
  page: HTMLElement,
  rebuildLetterVectors = false,
) {
  const canvas = await html2canvas(page, {
    scale: PDF.SCALE,
    backgroundColor: "#ffffff",
    useCORS: true,
    width: PAGE.WIDTH,
    height: PAGE.HEIGHT,
    windowWidth: PAGE.WIDTH,
    windowHeight: PAGE.HEIGHT,
    scrollX: 0,
    scrollY: 0,
    onclone: (_clonedDocument, clonedPage) => {
      normalizeCssZoomForHtml2Canvas(clonedPage as HTMLElement);
      if (
        rebuildLetterVectors
          ? letterPageOverflows(clonedPage as HTMLElement)
          : printableTextClips(clonedPage as HTMLElement)
      )
        throw new Error(
          "Die PDF-Rasteransicht enthält abgeschnittenen oder überlappenden Inhalt. Bitte das Layout prüfen.",
        );
      if (rebuildLetterVectors) {
        // Browser/html2canvas owns visible letter typography. Keep glyphs in
        // the raster; only geometry that is intentionally rebuilt as crisp
        // vectors is removed from the clone.
        for (const rule of clonedPage.querySelectorAll<HTMLElement>(
          "[data-letter-pdf-rule], [data-letter-pdf-richtext] hr",
        )) {
          rule.style.setProperty("border-color", "transparent", "important");
          rule.style.setProperty("background", "transparent", "important");
        }
        for (const cell of clonedPage.querySelectorAll<HTMLElement>(
          "[data-letter-pdf-richtext] table[data-letter-table] td",
        )) {
          cell.style.setProperty("border-color", "transparent", "important");
        }
      }
    },
  });
  pdf.addImage(
    canvas.toDataURL("image/jpeg", PDF.QUALITY),
    "JPEG",
    0,
    0,
    210,
    297,
    undefined,
    "FAST",
  );
}

/** Resolve the finished physical motivation-letter pages from the shared document paginator. */
async function resolvedLetterPages(rootOrPage: HTMLElement): Promise<HTMLElement[]> {
  if (rootOrPage.matches?.("[data-letter-page]")) return [rootOrPage];

  for (let frame = 0; frame < 180; frame += 1) {
    const documentRoot = rootOrPage.matches?.("[data-letter-document-root]")
      ? rootOrPage
      : rootOrPage.querySelector<HTMLElement>("[data-letter-document-root]");
    const issue = documentRoot?.dataset.letterPaginationErrorMessage?.trim();
    if (issue) throw new Error(issue);

    const ready = !documentRoot || documentRoot.dataset.letterPaginationReady === "true";
    const pages =
      typeof rootOrPage.querySelectorAll === "function"
        ? Array.from(rootOrPage.querySelectorAll<HTMLElement>("[data-letter-page]"))
        : [];
    if (!pages.length && typeof rootOrPage.querySelector === "function") {
      const single = rootOrPage.querySelector<HTMLElement>("[data-letter-page]");
      if (single) pages.push(single);
    }
    if (ready && pages.length) return pages;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }

  throw new Error("Motivationsschreiben-Seitenumbruch ist noch nicht bereit");
}

function assertLetterPagesFit(pages: HTMLElement[]) {
  const overflowing = pages.find(letterPageOverflows);
  if (!overflowing) return;
  const pageNumber = Number(overflowing.dataset?.letterPageIndex ?? "0") + 1;
  throw new Error(
    `Motivationsschreiben Seite ${pageNumber} enthält Inhalt, der nicht sicher auf die Seite passt.`,
  );
}

/** Titelblatt bleibt Raster; Anschreiben und CV erhalten unsichtbare Such-/Kopiertextlagen. */
export async function downloadCombinedDossierPdf(
  root: HTMLElement,
  fileName: string,
  meta: DossierPdfMeta,
  consent?: PdfAdvisoryConsent,
): Promise<void> {
  if (!root.ownerDocument) {
    const letterRoot = root.querySelector<HTMLElement>("[data-dossier-document='letter']");
    if (letterRoot) assertLetterPagesFit(await resolvedLetterPages(letterRoot));
    throw new Error("Die PDF-Exportansicht konnte nicht vermessen werden.");
  }
  const validate = beginPdfSafetyValidation(root, "dossier", consent);
  await document.fonts?.ready;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const cover = root.querySelector<HTMLElement>("[data-dossier-document='cover']");
  const letterRoot = root.querySelector<HTMLElement>("[data-dossier-document='letter']");
  const cvPages = Array.from(root.querySelectorAll<HTMLElement>("[data-cv-page]"));
  const letterPages = letterRoot ? await resolvedLetterPages(letterRoot) : [];
  if (!cover || !letterPages.length || !cvPages.length) {
    throw new Error(
      "Dossier ist noch nicht vollständig: Titelblatt, Motivationsschreiben und Lebenslauf werden benötigt",
    );
  }
  assertLetterPagesFit(letterPages);

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  await registerCabinPdfFonts(pdf);
  pdf.setProperties({
    title: meta.title,
    author: meta.author,
    subject: meta.subject ?? "Bewerbungsdossier",
    keywords: meta.keywords ?? "Bewerbung, Motivationsschreiben, Lebenslauf, Titelblatt",
    creator: meta.author || "Bewerbungsdossier",
  });

  validate();
  await addRasterPage(pdf, html2canvas, cover);
  for (const letterPage of letterPages) {
    validate();
    pdf.addPage("a4", "portrait");
    await addRasterPage(pdf, html2canvas, letterPage, true);
    addLetterTextLayer(pdf, letterPage);
  }
  for (const cvPage of cvPages) {
    validate();
    pdf.addPage("a4", "portrait");
    // Keep the raster on exactly the same live CSS-zoom geometry that the native
    // CV text layer measures. The former clone normalization fixed raster glyph
    // spacing but shifted decorative rules once text became native.
    await addRasterPage(pdf, html2canvas, cvPage);
    addCvTextLayer(pdf, cvPage);
  }

  validate();
  downloadBlob(pdf.output("blob"), fileName);
}

/** Exportiert sämtliche Seiten des Motivationsschreibens mit echter PDF-Textebene. */
export async function downloadLetterPdf(
  rootOrPage: HTMLElement,
  fileName: string,
  meta: DossierPdfMeta,
  consent?: PdfAdvisoryConsent,
): Promise<void> {
  if (!rootOrPage.ownerDocument) {
    assertLetterPagesFit(await resolvedLetterPages(rootOrPage));
    throw new Error("Die PDF-Exportansicht konnte nicht vermessen werden.");
  }
  const validate = beginPdfSafetyValidation(rootOrPage, "letter", consent);
  await document.fonts?.ready;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const pages = await resolvedLetterPages(rootOrPage);
  if (!pages.length) {
    throw new Error("Motivationsschreiben konnte nicht für den PDF-Export gefunden werden");
  }
  assertLetterPagesFit(pages);

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  await registerCabinPdfFonts(pdf);
  pdf.setProperties({
    title: meta.title,
    author: meta.author,
    subject: meta.subject ?? "Motivationsschreiben",
    keywords: meta.keywords ?? "Bewerbung, Motivationsschreiben, Lehrstelle",
    creator: meta.author || "Motivationsschreiben",
  });

  for (const [index, page] of pages.entries()) {
    validate();
    if (index) pdf.addPage("a4", "portrait");
    await addRasterPage(pdf, html2canvas, page, true);
    addLetterTextLayer(pdf, page);
  }
  validate();
  downloadBlob(pdf.output("blob"), fileName);
}
