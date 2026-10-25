import { CV_SCALE_MIN, CV_SCALE_MAX, type CvDesign } from "./types";

// Browser migration stays outside shared semantic data modules.
/**
 * Vor der engeren Skala konnten gespeicherte Entwürfe Werte bis 200 % tragen.
 * Die Route liest ihren Entwurf erst nach der Modulevaluation aus localStorage;
 * deshalb können wir solche Altwerte hier einmalig auf den neuen sicheren
 * Bereich ziehen. Entwürfe innerhalb des Bereichs werden nie verändert.
 */
function normalizeLegacyCvTypeScales() {
  if (typeof window === "undefined") return;
  try {
    const key = "lebenslauf:v1";
    const raw = window.localStorage.getItem(key);
    if (!raw) return;
    const saved = JSON.parse(raw) as { design?: CvDesign };
    if (!saved.design) return;

    let changed = false;
    for (const scaleKey of ["titleScale", "headingScale", "bodyScale"] as const) {
      const value = saved.design[scaleKey];
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      const next = Math.max(CV_SCALE_MIN, Math.min(CV_SCALE_MAX, value));
      if (Math.abs(next - value) > 0.0001) {
        saved.design[scaleKey] = next;
        changed = true;
      }
    }

    if (changed) window.localStorage.setItem(key, JSON.stringify(saved));
  } catch {
    // Beschädigter oder blockierter Speicher darf das Formular nie verhindern.
  }
}

normalizeLegacyCvTypeScales();
