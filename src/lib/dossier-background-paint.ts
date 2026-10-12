/** Resolved CSS serializes non-opaque gradient stops as rgba/hsla or color(... / alpha).
 * Opaque gradients and translucent solid colors do not use the failing native
 * alpha-gradient primitive. Keep their artwork vector painted. */
export function hasAlphaGradient(backgroundImage: string): boolean {
  return (
    /\b(?:repeating-)?(?:linear|radial|conic)-gradient\(/i.test(backgroundImage) &&
    /\b(?:rgba|hsla)\(|\bcolor\([^)]*\//i.test(backgroundImage)
  );
}

/** Renderer-local paint state, derived from its own resolved artwork. No
 * template names, global carrier, export branch, clone or content changes.
 * Include generated artwork, and never inspect the document's text/photo layer. */
export function resolveBackgroundPaint(background: HTMLElement) {
  const view = background.ownerDocument.defaultView;
  if (!view) return;
  const alpha = [background, ...background.querySelectorAll("*")].some((node) =>
    [null, "::before", "::after"].some((pseudo) =>
      hasAlphaGradient(view.getComputedStyle(node, pseudo).backgroundImage),
    ),
  );
  if (alpha) background.dataset.dossierPaintAlphaGradient = "true";
  else delete background.dataset.dossierPaintAlphaGradient;
}
