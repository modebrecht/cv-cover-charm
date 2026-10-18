/** Shared section assignment, in source order; a tie starts in the left column. */
export function cvFlowColumns<T>(items: T[], rowCount: (item: T) => number): [T[], T[]] {
  const columns: [T[], T[]] = [[], []];
  const weights = [0, 0];
  for (const item of items) {
    const count = rowCount(item);
    if (!Number.isFinite(count) || count < 0) throw Error("Invalid CV flow row count");
    const target = weights[0] <= weights[1] ? 0 : 1;
    columns[target].push(item);
    weights[target] += Math.max(1, count);
  }
  return columns;
}
