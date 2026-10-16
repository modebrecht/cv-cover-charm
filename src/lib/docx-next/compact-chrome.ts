import {
  dossierFooterVisualHeightMmForOptions,
  dossierHeaderVisualHeightMmForOptions,
  effectiveDossierHeaderModeForOptions,
  type DossierChromeOptions,
} from "@/lib/dossier-chrome";
import type { DossierChromeDocumentContent } from "@/lib/dossier-chrome-content";
import type { DocumentPart } from "./model";
import { color } from "./colors";

/** Source-owned decorative bands. Word story distances never enlarge their paint.
 * Empty compact Web chrome has no implicit name. Body reservations stay unchanged.
 * Semantic/custom chrome requires a separate measured acceptance gate.
 */
export function composeSourceCompactBands(
  part: DocumentPart,
  options: DossierChromeOptions,
  content: DossierChromeDocumentContent,
  policy: { footerOpacity: number },
) {
  if (
    options.headerMode !== "compact" ||
    effectiveDossierHeaderModeForOptions(options, 1) !== "compact" ||
    options.footerMode !== "compact" ||
    Object.values(content).some((text) => text?.trim()) ||
    options.headerGradientColor ||
    options.footerGradientColor ||
    !options.headerBackgroundColor ||
    !options.footerBackgroundColor
  )
    throw Error(
      "DOCX Next compact chrome: Dieser Modern-Test unterstützt nur leere kompakte Kopf- und Fussstreifen ohne Verlauf. Benutzertexte und andere Modi benötigen eine eigene Layoutprüfung.",
    );
  if (
    !Number.isFinite(policy.footerOpacity) ||
    policy.footerOpacity < 0 ||
    policy.footerOpacity > 1
  )
    throw Error("DOCX Next invalid compact footer opacity");
  const headerHeight = dossierHeaderVisualHeightMmForOptions(options);
  const continuationHeight = dossierHeaderVisualHeightMmForOptions(options, 1);
  const footerHeight = dossierFooterVisualHeightMmForOptions(options);
  const border = options.borderEnabled ? options.borderWidthMm : 0;
  if (
    ![headerHeight, continuationHeight, footerHeight, border].every(Number.isFinite) ||
    headerHeight !== continuationHeight ||
    headerHeight <= 0 ||
    footerHeight <= 0 ||
    headerHeight + footerHeight >= part.page.heightMm ||
    border < 0 ||
    border > Math.min(headerHeight, footerHeight)
  )
    throw Error(
      "DOCX Next compact chrome: Streifen und Trennlinien überschreiten die unterstützte Geometrie.",
    );

  // Retain the renderer's existing empty header carrier: it owns page paint.
  // Replacing it with the renderer's exact-height empty story changes import
  // ordering of opaque page paper in supplementary Writer rendering.
  if ([...part.header, ...(part.firstHeader ?? [])].some((p) => p.runs.some((r) => r.text.trim())))
    throw Error(
      "DOCX Next compact chrome: Nichtleere Kopfzeile benötigt eine eigene Layoutprüfung.",
    );
  part.footer = [];
  // Word PDF output can scale separately anchored shallow paint differently
  // despite equal saved extents. Reuse the existing single decorative page
  // asset so compact surfaces and their edge rules share one native transform.
  part.pagePaintComposition = "single-asset";
  // Source borders are horizontal band edges, never a full Word page border.
  part.chrome.borderColor = undefined;
  part.artwork = part.artwork.filter(
    (paint) => ![`${part.id}.artwork.header`, `${part.id}.artwork.footer`].includes(paint.id),
  );
  const paint = (suffix: string, yMm: number, heightMm: number, fill: string, opacity: number) => {
    part.headerShapes = [
      ...(part.headerShapes ?? []),
      {
        kind: "decorative-shape",
        id: `${part.id}.compact.${suffix}`,
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
      },
    ];
  };
  // CSS border-box edges replace the surface in their strip; avoid double alpha.
  if (headerHeight > border)
    paint("header", 0, headerHeight - border, color(options.headerBackgroundColor, "FFFFFF"), 1);
  if (footerHeight > border)
    paint(
      "footer",
      part.page.heightMm - footerHeight + border,
      footerHeight - border,
      color(options.footerBackgroundColor, "FFFFFF"),
      policy.footerOpacity,
    );
  if (border) {
    const edge = color(options.borderColor, "000000");
    paint("header-edge", headerHeight - border, border, edge, 1);
    paint("footer-edge", part.page.heightMm - footerHeight, border, edge, policy.footerOpacity);
  }
}
