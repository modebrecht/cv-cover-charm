import type { DocumentPart, ModelIssue } from "./model";

/** Native flowing-section policy, after chrome reservation. No measured pagination. */
export function applyContinuationMargin(
  part: DocumentPart,
  requested: number | undefined,
  firstTopMargin: number,
  headerReserveMm: number,
  minimumFirstTopMm?: number,
): ModelIssue[] {
  const issues: ModelIssue[] = [];
  if (requested !== undefined || minimumFirstTopMm !== undefined) {
    if (requested !== undefined && (!Number.isFinite(requested) || requested < 0 || requested > 40))
      throw new Error("DOCX Next invalid CV continuation top margin");
    // An empty header still owns a boundary paragraph. Place it at the page
    // edge so its distance cannot impose an unrelated minimum body margin.
    if (!headerReserveMm) part.page.headerDistanceMm = 0;
    const continuationTop =
      requested === undefined
        ? part.page.margins.top
        : headerReserveMm
          ? Math.max(requested, part.page.headerDistanceMm) + headerReserveMm
          : requested;
    const firstTop = Math.max(part.page.margins.top, minimumFirstTopMm ?? 0);
    const lead = Math.max(0, firstTop - continuationTop);
    part.layout.pagination = {
      firstTopMarginMm: firstTopMargin,
      continuationTopMarginMm: requested ?? continuationTop,
      firstPageLeadMm: lead,
    };
    part.page.margins.top = continuationTop;
    if (continuationTop > firstTop)
      issues.push({
        code: "continuation-margin-exceeds-first-page",
        fieldId: "cv.layout.pagination",
        message:
          "Word uses one flowing section margin: a larger continuation margin cannot preserve the smaller first-page margin. Use a continuation margin no larger than the first-page margin.",
      });
    if (lead) part.blocks.unshift({ kind: "spacer", id: "cv.firstPageLead", heightMm: lead });
  }
  return issues;
}
