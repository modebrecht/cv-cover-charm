/** CSS document zoom, excluding the page's outer preview and browser display scale. */
export function cvDocumentZoom(el: HTMLElement): number {
  const page = el.closest<HTMLElement>("[data-cv-page], [data-cv-measure-page]");
  if (!page) throw Error("DOCX Next: CV document page is missing.");
  let zoom = 1;
  for (let node: HTMLElement | null = el; node && node !== page; node = node.parentElement) {
    const value = getComputedStyle(node).zoom;
    const own = value === "normal" ? 1 : Number(value);
    if (!Number.isFinite(own) || own <= 0) throw Error("DOCX Next: Invalid document CSS zoom.");
    zoom *= own;
  }
  return zoom;
}
export function cvReadingFlowZoom(host: HTMLElement): number {
  const rows = [...host.querySelectorAll<HTMLElement>("[data-cv-page] [data-cv-content-row]")];
  if (!rows.length) return 1;
  const zoom = cvDocumentZoom(rows[0]);
  if (rows.some((row) => Math.abs(cvDocumentZoom(row) - zoom) > 1e-6))
    throw Error("DOCX Next: Inconsistent CV flow zoom.");
  return zoom;
}
