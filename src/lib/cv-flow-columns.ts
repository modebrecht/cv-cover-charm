/** Shared section assignment, in source order; a tie starts in the left column. */
export function cvFlowColumns<T>(
  items: T[],
  rowCount: (item: T) => number,
  { balanceMeasuredHeights = false } = {},
): [T[], T[]] {
  const columns: [T[], T[]] = [[], []];
  const weights = [0, 0];
  const sizes = items.map((item) => {
    const count = rowCount(item);
    if (!Number.isFinite(count) || count < 0) throw Error("Invalid CV flow row count");
    return Math.max(1, count);
  });
  for (const [index, item] of items.entries()) {
    const target = weights[0] <= weights[1] ? 0 : 1;
    columns[target].push(item);
    weights[target] += sizes[index];
  }
  if (!balanceMeasuredHeights) return columns;

  // A tall final section can leave the greedy assignment taller than a split
  // between adjacent sections. Keep the measured improvement in source order.
  const total = weights[0] + weights[1];
  const greedyHeight = Math.max(...weights);
  let bestHeight = greedyHeight;
  let bestSplit = 0;
  let left = 0;
  for (let split = 1; split < items.length; split++) {
    left += sizes[split - 1];
    const height = Math.max(left, total - left);
    if (height < bestHeight) {
      bestHeight = height;
      bestSplit = split;
    }
  }
  return greedyHeight - bestHeight >= 0.5
    ? [items.slice(0, bestSplit), items.slice(bestSplit)]
    : columns;
}
