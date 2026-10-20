import type { DocumentPart, ModelIssue } from "./model";

/** Reuse the existing first-page lead for resolved flowing CV and Letter geometry.
 * A single native section cannot express a smaller first-page body margin. */
export function applyFlowPageTops(
  part: DocumentPart,
  tops: { firstMm: number; continuationMm: number },
) {
  const { firstMm, continuationMm } = tops;
  if (![firstMm, continuationMm].every((n) => Number.isFinite(n) && n >= 0 && n <= 120))
    throw Error(`DOCX Next: Ungültige Seitengeometrie (${part.id}).`);
  if (continuationMm > firstMm)
    throw Error(
      `DOCX Next: ${part.id === "cv" ? "Lebenslauf" : "Anschreiben"} benötigt auf Seite 1 einen kleineren Rand als auf Folgeseiten. Diese Word-Geometrie ist noch nicht unterstützt.`,
    );
  if (part.layout.mode === "sidebar")
    throw Error("DOCX Next: Sidebar-Geometrie bleibt eingefroren.");
  // Measured headers may already have inserted the same existing primitive.
  const leadId = part.id === "cv" ? "cv.firstPageLead" : `${part.id}.measured.firstPageLead`;
  part.blocks = part.blocks.filter((block) => block.id !== leadId);
  const lead = firstMm - continuationMm;
  part.page.margins.top = continuationMm;
  if (![...part.header, ...(part.firstHeader ?? [])].some((p) => p.runs.some((r) => r.text.trim())))
    part.page.headerDistanceMm = 0;
  part.layout.pagination = {
    firstTopMarginMm: firstMm,
    continuationTopMarginMm: continuationMm,
    firstPageLeadMm: lead,
  };
  if (lead) part.blocks.unshift({ kind: "spacer", id: leadId, heightMm: lead });
}

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
    if (
      requested !== undefined &&
      (!Number.isFinite(requested) || requested < 0 || requested > 120)
    )
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
