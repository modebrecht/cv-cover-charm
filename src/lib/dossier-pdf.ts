import type { jsPDF as JsPdf } from "jspdf";
import { PAGE, PDF } from "@/default-config";
import { downloadBlob } from "@/lib/download";

export type DossierPdfMeta = {
  title: string;
  author: string;
  subject?: string;
  keywords?: string;
};

type Html2Canvas = (typeof import("html2canvas-pro"))["default"];
type PdfFont = "helvetica" | "times" | "courier";
type PdfFontStyle = "normal" | "bold" | "italic" | "bolditalic";

const MM_PER_PT = 25.4 / 72;

function pdfFontFor(page: HTMLElement): PdfFont {
  const font = page.dataset.letterFont;
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

function letterText(element: HTMLElement): string {
  return (element.innerText || element.textContent || "")
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "")
    .trim();
}

function wrapLetterText(pdf: JsPdf, text: string, widthMm: number): string[] {
  const lines: string[] = [];
  for (const logicalLine of text.split("\n")) {
    if (!logicalLine.trim()) {
      lines.push("");
      continue;
    }
    const wrapped = pdf.splitTextToSize(logicalLine, Math.max(1, widthMm));
    lines.push(...(Array.isArray(wrapped) ? wrapped : [String(wrapped)]));
  }
  return lines;
}

/**
 * Der Browser bleibt die Layout-Engine des Anschreibens. Seine Blockpositionen
 * werden in A4-Millimeter übersetzt; nur die Glyphen zeichnet jsPDF selbst.
 * So bleiben Design und Abstände nah an der Vorschau, der Brieftext ist im PDF
 * aber echter, durchsuchbarer Text statt Bestandteil eines Screenshotss.
 */
function addLetterTextLayer(pdf: JsPdf, page: HTMLElement) {
  const pageRect = page.getBoundingClientRect();
  if (pageRect.width <= 0 || pageRect.height <= 0) {
    throw new Error("Anschreiben konnte für den PDF-Text nicht vermessen werden");
  }

  const mmX = 210 / pageRect.width;
  const mmY = 297 / pageRect.height;
  const font = pdfFontFor(page);

  for (const element of page.querySelectorAll<HTMLElement>("[data-letter-pdf-text]")) {
    const text = letterText(element);
    if (!text) continue;

    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    const fontSizePx = Number.parseFloat(style.fontSize) || 14;
    const fontSizePt = fontSizePx * (72 / 96);
    const lineHeightPx = Number.parseFloat(style.lineHeight);
    const lineHeightFactor =
      Number.isFinite(lineHeightPx) && lineHeightPx > 0 ? lineHeightPx / fontSizePx : 1.2;
    const [red, green, blue] = rgb(style.color);
    const left = (rect.left - pageRect.left) * mmX;
    const top = (rect.top - pageRect.top) * mmY;
    const width = rect.width * mmX;
    const align =
      style.textAlign === "right" ? "right" : style.textAlign === "center" ? "center" : "left";
    const x = align === "right" ? left + width : align === "center" ? left + width / 2 : left;
    const baseline = top + fontSizePt * MM_PER_PT * 0.82;

    pdf.setFont(font, pdfFontStyle(style));
    pdf.setFontSize(fontSizePt);
    pdf.setTextColor(red, green, blue);
    pdf.text(wrapLetterText(pdf, text, width), x, baseline, {
      align,
      lineHeightFactor,
    });
  }
}

async function addRasterPage(
  pdf: JsPdf,
  html2canvas: Html2Canvas,
  page: HTMLElement,
  hideLetterText = false,
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
    onclone: hideLetterText
      ? (clonedDocument) => {
          for (const node of clonedDocument.querySelectorAll<HTMLElement>(
            "[data-letter-text-layer], [data-letter-text-layer] *",
          )) {
            node.style.setProperty("color", "transparent", "important");
            node.style.setProperty("-webkit-text-fill-color", "transparent", "important");
            node.style.setProperty("text-shadow", "none", "important");
          }
        }
      : undefined,
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

/**
 * Erstellt eine Hybrid-PDF: Titelblatt und CV bleiben WYSIWYG-Rasterseiten;
 * das Anschreiben behält seinen grafischen Hintergrund, erhält aber eine
 * echte PDF-Textebene für alle Briefinhalte.
 */
export async function downloadCombinedDossierPdf(
  root: HTMLElement,
  fileName: string,
  meta: DossierPdfMeta,
): Promise<void> {
  await document.fonts?.ready;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const cover = root.querySelector<HTMLElement>("[data-dossier-document='cover']");
  const letterRoot = root.querySelector<HTMLElement>("[data-dossier-document='letter']");
  const letter = letterRoot?.querySelector<HTMLElement>("[data-letter-page]") ?? letterRoot;
  const cvPages = Array.from(root.querySelectorAll<HTMLElement>("[data-cv-page]"));
  if (!cover || !letter || !cvPages.length) {
    throw new Error(
      "Dossier ist noch nicht vollständig: Titelblatt, Anschreiben und Lebenslauf werden benötigt",
    );
  }

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  pdf.setProperties({
    title: meta.title,
    author: meta.author,
    subject: meta.subject ?? "Bewerbungsdossier",
    keywords: meta.keywords ?? "Bewerbung, Anschreiben, Lebenslauf, Titelblatt",
    creator: meta.author || "Bewerbungsdossier",
  });

  await addRasterPage(pdf, html2canvas, cover);

  pdf.addPage("a4", "portrait");
  await addRasterPage(pdf, html2canvas, letter, true);
  addLetterTextLayer(pdf, letter);

  for (const cvPage of cvPages) {
    pdf.addPage("a4", "portrait");
    await addRasterPage(pdf, html2canvas, cvPage);
  }

  downloadBlob(pdf.output("blob"), fileName);
}
