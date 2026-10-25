/**
 * The browser accurately paints CV rubric capsules, but html2canvas-pro draws
 * their inset box shadows as protruding side caps. Suppress the shadow only in
 * the PDF clone: the source DOM, saved styles, and editable DOCX are untouched.
 */
export function normalizeCvRubricPillsForPdf(clonedPage: HTMLElement): void {
  for (const title of clonedPage.querySelectorAll<HTMLElement>("[data-cv-section-title]")) {
    if (!title.closest('[data-cv-rubric-pill="true"]')) continue;
    title.style.setProperty("box-shadow", "none", "important");
  }
}
