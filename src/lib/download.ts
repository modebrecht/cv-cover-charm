import "jspdf";
import "./cv-pdf-text";

const UMLAUTS: Record<string, string> = {
  ä: "ae",
  ö: "oe",
  ü: "ue",
  Ä: "Ae",
  Ö: "Oe",
  Ü: "Ue",
  ß: "ss",
};

/**
 * Chrome ignoriert das `download`-Attribut, sobald der Dateiname Zeichen
 * ausserhalb von Latin-1 … in der Praxis reicht schon ein "ü": aus
 * "Titelblatt-Lea-Müller.pdf" wird dann kommentarlos "download". Deshalb
 * werden Umlaute transliteriert und alles Übrige entfernt.
 */
export function safeFileName(name: string): string {
  const ascii = name
    .replace(/[äöüÄÖÜß]/g, (c) => UMLAUTS[c])
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
  return ascii || "Titelblatt";
}

/** Lädt einen Blob herunter, ohne die Object-URL zu früh freizugeben. */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safeFileName(fileName);
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
