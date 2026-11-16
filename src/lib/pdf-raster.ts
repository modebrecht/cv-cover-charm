import type html2canvas from "html2canvas-pro";
import type { Options } from "html2canvas-pro";

/** html2canvas-pro 2.3 paints alphabetic text at Range.top + fontSize.
 * Browser ranges use the actual font ascent, which differs across fallback
 * fonts and weights. Correct only the export canvas's text calls, preserving
 * the source/clone DOM, line wrapping, text decorations and preflight checks.
 */
export async function renderPdfRaster(
  render: typeof html2canvas,
  element: HTMLElement,
  options: Omit<Partial<Options>, "canvas">,
): Promise<HTMLCanvasElement> {
  const canvas = element.ownerDocument.createElement("canvas");
  const bounds = element.getBoundingClientRect();
  const width = options.width ?? Math.ceil(bounds.width);
  const height = options.height ?? Math.ceil(bounds.height);
  const scale = options.scale ?? element.ownerDocument.defaultView?.devicePixelRatio ?? 1;
  canvas.width = Math.floor(width * scale);
  canvas.height = Math.floor(height * scale);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Die PDF-Zeichenfläche konnte nicht erstellt werden.");

  const adjustedY = (text: string, y: number) => {
    if (context.textBaseline !== "alphabetic") return y;
    const size = Number(context.font.match(/(?:^|\s)(\d+(?:\.\d+)?)px(?:\s|\/)/)?.[1]);
    if (!(size > 0)) return y;
    const ascent = context.measureText(text).fontBoundingBoxAscent;
    return Number.isFinite(ascent) && ascent > 0 ? y + ascent - size : y;
  };
  const fill = context.fillText.bind(context);
  const stroke = context.strokeText.bind(context);
  context.fillText = (text, x, y, maxWidth) => {
    if (maxWidth === undefined) fill(text, x, adjustedY(text, y));
    else fill(text, x, adjustedY(text, y), maxWidth);
  };
  context.strokeText = (text, x, y, maxWidth) => {
    if (maxWidth === undefined) stroke(text, x, adjustedY(text, y));
    else stroke(text, x, adjustedY(text, y), maxWidth);
  };
  try {
    return await render(element, { ...options, canvas });
  } finally {
    // Methods were installed on this newly created context only. No canvas
    // prototype or third-party library is modified, even if rendering fails.
    Reflect.deleteProperty(context, "fillText");
    Reflect.deleteProperty(context, "strokeText");
  }
}
