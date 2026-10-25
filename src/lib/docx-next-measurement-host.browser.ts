/** Detached measurement uses physical CSS units, independent of editor ancestors. */
export function isolateMeasurementZoom(host: HTMLElement): void {
  let zoom = 1;
  for (let node = host.parentElement; node; node = node.parentElement) {
    const value = getComputedStyle(node).zoom;
    const own = value === "normal" ? 1 : Number(value);
    if (!Number.isFinite(own) || own <= 0) {
      host.remove();
      throw Error("DOCX Next: Ungültiger Vorschau-Zoom.");
    }
    zoom *= own;
  }
  host.style.zoom = String(1 / zoom);
}
