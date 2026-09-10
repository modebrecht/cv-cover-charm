import type { LetterHeaderMode, LetterTemplateId } from "./types";

/**
 * Warm's first motivation-letter page uses a deliberately deep visual masthead.
 * Keep this dimension in one place so background, content flow and sender placement
 * cannot drift apart again.
 */
export const WARM_FIRST_PAGE_HEADER_HEIGHT_MM = 52;

export function isWarmFirstPageCompactHeader(
  template: LetterTemplateId,
  headerMode: LetterHeaderMode,
  pageIndex: number,
): boolean {
  return template === "freundlich" && headerMode === "compact" && pageIndex === 0;
}
