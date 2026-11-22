import { printableTextClips } from "@/components/letter/preflight";

export function cvSidebarTextClips(page: HTMLElement): boolean {
  const sidebar = page.querySelector<HTMLElement>(":scope > [data-cv-sidebar]");
  return (
    !!sidebar &&
    (sidebar.scrollHeight > sidebar.clientHeight || sidebar.scrollWidth > sidebar.clientWidth) &&
    printableTextClips(sidebar)
  );
}

export function cvSidebarOverflowMessage(pageNumber: number): string {
  return `Auf Seite ${pageNumber} wird Text in der seitlichen Spalte abgeschnitten. Kürze die betroffene Rubrik oder verschiebe sie in die Hauptspalte.`;
}

export class CvSidebarOverflowError extends Error {
  constructor(pageNumber: number) {
    super(cvSidebarOverflowMessage(pageNumber));
  }
}
