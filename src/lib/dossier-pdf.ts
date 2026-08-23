import { downloadBlob } from "@/lib/download";
import { PAGE, PDF } from "@/default-config";

export type DossierPdfMeta = {
  title: string;
  author: string;
  subject?: string;
  keywords?: string;
};

/** Erstellt eine PDF mit Titelblatt als Seite 1 und allen CV-Seiten dahinter. */
export async function downloadCombinedDossierPdf(
  root: HTMLElement,
  fileName: string,
  meta: DossierPdfMeta,
): Promise<void> {
  await document.fonts?.ready;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const cover = root.querySelector<HTMLElement>("[data-dossier-document='cover']");
  const cvPages = Array.from(root.querySelectorAll<HTMLElement>("[data-cv-page]"));
  if (!cover || !cvPages.length) throw new Error("Dossier ist noch nicht vollständig");

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);
  const pages = [cover, ...cvPages];
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  pdf.setProperties({
    title: meta.title,
    author: meta.author,
    subject: meta.subject ?? "Bewerbungsdossier",
    keywords: meta.keywords ?? "Bewerbung, Lebenslauf, Titelblatt",
    creator: meta.author || "Bewerbungsdossier",
  });

  for (const [index, page] of pages.entries()) {
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
    });
    if (index > 0) pdf.addPage("a4", "portrait");
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

  downloadBlob(pdf.output("blob"), fileName);
}
