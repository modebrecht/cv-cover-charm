export const normalizeContent = (text: string) => text.normalize("NFC").replace(/\s+/g, "");
export type ContentPage = { text: string; markers: string[] };

/** Exact checks, with no stored pass/fail baseline and no template exceptions. */
export function contentFindings(
  pages: ContentPage[],
  markers: string[],
  sequences: string[][],
  segments: string[],
) {
  const findings: string[] = [];
  const text = normalizeContent(pages.map((p) => p.text).join(" "));
  for (const marker of markers) {
    const count = pages.reduce((n, p) => n + p.markers.filter((m) => m === marker).length, 0);
    if (count !== 1) findings.push(`content ${marker}: expected once, found ${count}`);
  }
  for (const sequence of sequences) {
    const positions = sequence.map((m) => text.indexOf(m));
    if (positions.some((n, i) => n < 0 || (i > 0 && n <= positions[i - 1])))
      findings.push(`sequence: ${sequence.join(",")}`);
  }
  for (const segment of segments)
    if (!text.includes(normalizeContent(segment)))
      findings.push(`incomplete segment: ${segment.slice(0, 70)}`);
  for (const [i, p] of pages.entries())
    if (!p.markers.length)
      findings.push(`page ${i + 1}: no fixture content (possible unintended blank page)`);
  return findings;
}
export function distributionFindings(
  expected: ContentPage[],
  actual: ContentPage[],
  label: string,
) {
  const findings: string[] = [];
  if (actual.length !== expected.length)
    findings.push(`${label} page count ${actual.length} != Web ${expected.length}`);
  for (const [i, p] of expected.entries())
    if (JSON.stringify(p.markers) !== JSON.stringify(actual[i]?.markers))
      findings.push(`${label} page ${i + 1}: marker order/distribution differs`);
  return findings;
}
