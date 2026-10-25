/** Physical height of the existing required empty native paragraph. */
export const NATIVE_BOUNDARY_HEIGHT_MM = 25.4 / 72;

/** A dated flow row has a cell-ending paragraph and a table-ending paragraph. */
export function datedFlowAfterMm(authoredGapMm: number): number {
  return Math.max(0, authoredGapMm - 2 * NATIVE_BOUNDARY_HEIGHT_MM);
}
