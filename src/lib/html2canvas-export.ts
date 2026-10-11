const JPEG_DATA_URL = /^data:image\/jpe?g(?:;|,)/i;
const JPEG_HEADER_SCAN_BYTES = 64 * 1024;
const ICC_MARKER = "ICC_PROFILE";
const normalizedJpegCache = new Map<string, string>();

export const PDF_RASTER_CANVAS_EVENT = "cv-cover-charm:pdf-raster-canvas";

/**
 * Opt-in diagnostic at the exact html2canvas -> jsPDF boundary. Browser tests
 * and local investigations can inspect or save the raw raster without changing
 * normal exports or trying to patch a canvas prototype in html2canvas' iframe.
 */
export function emitPdfRasterCanvasDiagnostic(canvas: HTMLCanvasElement, page: HTMLElement) {
  if (typeof window === "undefined") return;
  if (document.documentElement.dataset.pdfRasterDiagnostics !== "true") return;
  window.dispatchEvent(
    new CustomEvent(PDF_RASTER_CANVAS_EVENT, {
      detail: { canvas, page },
    }),
  );
}

/**
 * Canvas-generated JPEGs are already browser-normalized and do not carry the
 * embedded ICC chunk that triggered the black-photo rasterization seen in
 * legacy/imported dossiers. Scan only the small JPEG header area so an old
 * multi-megabyte JSON photo does not have to be fully decoded just to decide
 * whether the compatibility guard is needed.
 */
export function jpegDataUrlHasIccProfile(src: string) {
  if (!JPEG_DATA_URL.test(src)) return false;
  const comma = src.indexOf(",");
  if (comma < 0) return false;

  const meta = src.slice(0, comma);
  const body = src.slice(comma + 1);
  try {
    if (/;base64/i.test(meta)) {
      const compact = body.replace(/\s/g, "");
      const maxChars = Math.ceil(JPEG_HEADER_SCAN_BYTES / 3) * 4;
      let chunk = compact.slice(0, maxChars);
      chunk = chunk.slice(0, chunk.length - (chunk.length % 4));
      if (!chunk) return false;
      return atob(chunk).includes(ICC_MARKER);
    }

    // URI-encoded JPEG data URLs are unusual here, but keep the detector safe
    // for imported hand-written JSON instead of assuming base64 unconditionally.
    return decodeURIComponent(body.slice(0, JPEG_HEADER_SCAN_BYTES * 3)).includes(ICC_MARKER);
  } catch {
    return false;
  }
}

function loadedLiveImageForClone(image: HTMLImageElement, src: string) {
  const frameElement = image.ownerDocument.defaultView?.frameElement;
  const liveDocument = frameElement?.ownerDocument;
  if (!liveDocument || liveDocument === image.ownerDocument) return null;

  for (const candidate of liveDocument.querySelectorAll<HTMLImageElement>("img")) {
    const candidateSrc = candidate.getAttribute("src") ?? candidate.src;
    if (candidateSrc !== src) continue;
    if (!candidate.complete || candidate.naturalWidth <= 0 || candidate.naturalHeight <= 0)
      continue;
    return candidate;
  }
  return null;
}

/**
 * html2canvas-pro arbeitet beim PDF-Export mit einem geklonten Dokument.
 * Einige ältere/importierte JPEG-Data-URLs enthalten ein eingebettetes
 * ICC-Farbprofil. Genau diese Bilder werden im Wegwerf-Clone einmal über den
 * Browser-Canvas in die bereits sichtbare RGB-Darstellung normalisiert.
 *
 * Neue Uploads laufen bereits durch readPhoto() und haben dieses Profil nicht
 * mehr. Sie werden hier bewusst NICHT nochmals als JPEG komprimiert. Für ein
 * mehrfach verwendetes Legacy-Foto wird das normalisierte Ergebnis gecacht.
 *
 * Wichtig: Der Clone kann beim onclone-Hook noch kein naturalWidth haben,
 * obwohl dasselbe Foto im Live-Dokument längst dekodiert und sichtbar ist.
 * Dann wird genau dieses bereits geladene Original als Rasterquelle benutzt.
 */
export function normalizeDataUrlJpegsForHtml2Canvas(root: HTMLElement) {
  const images: HTMLImageElement[] = [];
  if (root.tagName === "IMG") images.push(root as HTMLImageElement);
  images.push(...root.querySelectorAll<HTMLImageElement>("img"));

  for (const image of images) {
    const src = image.getAttribute("src") ?? image.src;
    if (!JPEG_DATA_URL.test(src)) continue;

    const cached = normalizedJpegCache.get(src);
    if (cached) {
      image.src = cached;
      continue;
    }

    // Avoid a second lossy JPEG pass for normal uploads. The compatibility
    // re-encode is only needed for legacy ICC-bearing JPEG data URLs.
    if (!jpegDataUrlHasIccProfile(src)) continue;

    const rasterSource =
      image.complete && image.naturalWidth > 0 && image.naturalHeight > 0
        ? image
        : loadedLiveImageForClone(image, src);
    if (!rasterSource) continue;

    try {
      const canvas = image.ownerDocument.createElement("canvas");
      canvas.width = rasterSource.naturalWidth;
      canvas.height = rasterSource.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(rasterSource, 0, 0, canvas.width, canvas.height);
      const normalized = canvas.toDataURL("image/jpeg", 0.94);
      if (!normalized || normalized === "data:,") continue;

      normalizedJpegCache.set(src, normalized);
      image.src = normalized;
    } catch {
      // PDF-Export nie wegen eines optionalen Kompatibilitäts-Guards stoppen.
      // html2canvas erhält im Fehlerfall einfach das ursprüngliche Bild.
    }
  }
}

/**
 * Combined dossier exports can contain different templates at the same time.
 * Cover/Letter legacy CSS still reads html[data-dossier-template], so scope that
 * global selector only inside html2canvas' throw-away clone. The live document
 * keeps the editor route's own template and can no longer be hijacked by a
 * hidden renderer immediately before capture. CV identity and layout already
 * exist locally before pagination; its capture must not supply missing identity.
 */
export function scopeDossierTemplateForHtml2Canvas(root: HTMLElement) {
  if (root.closest('[data-dossier-document="cv"]')) return;
  const scope = root.closest<HTMLElement>("[data-dossier-template]");
  const template = scope?.dataset.dossierTemplate?.trim();
  if (!template) return;
  root.ownerDocument.documentElement.dataset.dossierTemplate = template;
}

/**
 * html2canvas-pro measures text ranges after CSS `zoom` has already affected
 * their coordinates and then applies the same zoom again while painting the
 * stacking context. Words therefore drift into the following spaces.
 *
 * CSS transforms do not have that problem because html2canvas temporarily
 * neutralizes them while measuring the cloned DOM. Preserve the visual scale
 * by translating zoom into an equivalent transform inside the throw-away
 * capture clone only.
 */
export function cssZoomAsTransform(zoom: number, transform: string) {
  return `scale(${zoom})${transform === "none" ? "" : ` ${transform}`}`;
}

/** Only an opacity filter has the same group-compositing semantics as opacity. */
export function cssOpacityFilterValue(filter: string): number | null {
  const match = /^opacity\(\s*(\d*\.?\d+)(%)?\s*\)$/.exec(filter);
  if (!match) return null;
  const value = Number(match[1]) / (match[2] ? 100 : 1);
  return Math.min(1, value);
}

/**
 * html2canvas does not implement CSS filters, including their stacking context.
 * Translate a lone opacity filter into equivalent group opacity in the clone.
 * This preserves both motif intensity and its position below later paper planes.
 * Mixed blur/contrast/saturation filters are not equivalent and remain untouched.
 */
export function normalizeOpacityFiltersForHtml2Canvas(root: HTMLElement) {
  const view = root.ownerDocument.defaultView;
  if (!view) return;
  for (const element of [root, ...root.querySelectorAll<HTMLElement>("*")]) {
    const style = view.getComputedStyle(element);
    const filterOpacity = cssOpacityFilterValue(style.filter);
    if (filterOpacity === null) continue;
    const opacity = Number(style.opacity) * filterOpacity;
    element.style.setProperty("opacity", String(opacity), "important");
    element.style.setProperty("filter", "none", "important");
    // Even opacity(1) establishes a stacking context in the browser. A neutral
    // transform makes that boundary explicit to html2canvas without moving it.
    if (opacity === 1 && style.transform === "none")
      element.style.setProperty("transform", "matrix(1, 0, 0, 1, 0, 0)", "important");
  }
}

/** A sharp horizontal inset shadow is exactly a stripe above the background. */
export function cssSharpInsetShadowGradient(shadow: string): string | null {
  const match = /^([a-z-]+\([^()]*\)) 0px (-?\d+(?:\.\d+)?)px 0px 0px inset$/i.exec(shadow);
  if (!match || Number(match[2]) === 0) return null;
  const offset = Number(match[2]);
  const direction = offset < 0 ? "top" : "bottom";
  const width = Math.abs(offset);
  return `linear-gradient(to ${direction}, ${match[1]} 0px, ${match[1]} ${width}px, transparent ${width}px, transparent 100%)`;
}

/** html2canvas interprets gradient dimensions as pixels, ignoring physical units. */
export function cssGradientAbsoluteLengths(image: string): string {
  const units: Record<string, number> = {
    mm: 96 / 25.4,
    cm: 96 / 2.54,
    in: 96,
    pt: 96 / 72,
    pc: 16,
    q: 96 / 101.6,
  };
  let result = "",
    depth = 0,
    quote = "";
  for (let i = 0; i < image.length; ) {
    const character = image[i];
    if (!quote && depth === 0) {
      const match = /^(?:repeating-)?(?:linear|radial|conic)-gradient\(/i.exec(image.slice(i));
      if (match) {
        let end = i + match[0].length,
          nesting = 1;
        while (end < image.length && nesting) {
          if (image[end] === "(") nesting++;
          if (image[end] === ")") nesting--;
          end++;
        }
        result += image
          .slice(i, end)
          .replace(
            /(^|[\s,(])(-?\d*\.?\d+)(mm|cm|in|pt|pc|q)\b/gi,
            (_match, prefix: string, value: string, unit: string) =>
              `${prefix}${Number((Number(value) * units[unit.toLowerCase()]).toFixed(6))}px`,
          );
        i = end;
        continue;
      }
    }
    result += character;
    if (quote) {
      if (character === "\\" && i + 1 < image.length) result += image[++i];
      else if (character === quote) quote = "";
    } else if (character === '"' || character === "'") quote = character;
    else if (character === "(") depth++;
    else if (character === ")") depth--;
    i++;
  }
  return result;
}

/** Preserve physical gradient stops and sharp inset stripes without layout changes. */
export function normalizeCssBackgroundsForHtml2Canvas(root: HTMLElement) {
  const view = root.ownerDocument.defaultView;
  if (!view) return;
  for (const element of [root, ...root.querySelectorAll<HTMLElement>("*")]) {
    const style = view.getComputedStyle(element);
    const backgroundImage = cssGradientAbsoluteLengths(style.backgroundImage);
    if (backgroundImage !== style.backgroundImage)
      element.style.setProperty("background-image", backgroundImage, "important");
    const gradient = cssSharpInsetShadowGradient(style.boxShadow);
    if (!gradient) continue;
    const layers = backgroundImage === "none" ? "" : `, ${backgroundImage}`;
    const properties = {
      "background-image": `${gradient}${layers}`,
      "background-size": `auto, ${style.backgroundSize}`,
      "background-position": `0% 0%, ${style.backgroundPosition}`,
      "background-repeat": `no-repeat, ${style.backgroundRepeat}`,
      "background-origin": `padding-box, ${style.backgroundOrigin}`,
      "background-clip": `padding-box, ${style.backgroundClip}`,
      "box-shadow": "none",
    };
    for (const [property, value] of Object.entries(properties))
      element.style.setProperty(property, value, "important");
  }
}

export function normalizeCssZoomForHtml2Canvas(root: HTMLElement) {
  // Every PDF path already runs this hook on html2canvas' cloned document.
  // Resolve the document-local template there before any computed-style reads,
  // then apply the existing image and CSS zoom compatibility normalization.
  scopeDossierTemplateForHtml2Canvas(root);
  normalizeDataUrlJpegsForHtml2Canvas(root);
  normalizeOpacityFiltersForHtml2Canvas(root);
  normalizeCssBackgroundsForHtml2Canvas(root);

  const view = root.ownerDocument.defaultView;
  if (!view) return;

  // Snapshot every zoomed box before changing an ancestor. CSS zoom contributes
  // to used width and normal-flow height; transforms only affect painting.
  const boxes = [root, ...root.querySelectorAll<HTMLElement>("*")].flatMap((element) => {
    const style = view.getComputedStyle(element);
    const zoom = Number.parseFloat(style.zoom);
    if (!Number.isFinite(zoom) || zoom <= 0 || Math.abs(zoom - 1) < 0.0001) return [];
    const px = (value: string) => Number.parseFloat(value) || 0;
    const width = px(style.width);
    const height = px(style.height);
    const borderWidth =
      width +
      (style.boxSizing === "border-box"
        ? 0
        : px(style.paddingLeft) +
          px(style.paddingRight) +
          px(style.borderLeftWidth) +
          px(style.borderRightWidth));
    const borderHeight =
      height +
      (style.boxSizing === "border-box"
        ? 0
        : px(style.paddingTop) +
          px(style.paddingBottom) +
          px(style.borderTopWidth) +
          px(style.borderBottomWidth));
    return [
      {
        element,
        zoom,
        transform: style.transform,
        width: style.width,
        height: style.height,
        marginTop: px(style.marginTop) * zoom,
        marginLeft: px(style.marginLeft) * zoom,
        marginRight: px(style.marginRight) * zoom + borderWidth * (zoom - 1),
        marginBottom: px(style.marginBottom) * zoom + borderHeight * (zoom - 1),
      },
    ];
  });
  for (const box of boxes) {
    const { element, zoom, transform } = box;
    element.style.setProperty("width", box.width, "important");
    element.style.setProperty("height", box.height, "important");
    for (const key of ["marginTop", "marginRight", "marginBottom", "marginLeft"] as const) {
      element.style.setProperty(
        key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`),
        `${box[key]}px`,
        "important",
      );
    }
    element.style.setProperty("zoom", "1", "important");
    element.style.setProperty("transform-origin", "0 0", "important");
    element.style.setProperty("transform", cssZoomAsTransform(zoom, transform), "important");
  }
}
