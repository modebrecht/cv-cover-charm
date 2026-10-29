import assert from "node:assert/strict";

/** Added story drawings shift package-global instance IDs without changing a story. */
export function assertSameStoryPart(before: Uint8Array, after: Uint8Array, name: string) {
  const oldXml = new TextDecoder().decode(before),
    newXml = new TextDecoder().decode(after);
  const drawingNumber =
    /(<(?:wp:docPr|pic:cNvPr)\b[^>]*\bid="|<wp:anchor\b[^>]*\brelativeHeight=")(\d+)"/g;
  const oldNumbers = [...oldXml.matchAll(drawingNumber)].map((match) => Number(match[2]));
  const newNumbers = [...newXml.matchAll(drawingNumber)].map((match) => Number(match[2]));
  assert.equal(newNumbers.length, oldNumbers.length, `${name}: changed drawing inventory`);
  const offset = (newNumbers[0] ?? 0) - (oldNumbers[0] ?? 0);
  assert.deepEqual(
    newNumbers.map((value) => value - offset),
    oldNumbers,
    `${name}: changed drawing identity or order`,
  );
  assert.equal(
    newXml.replace(drawingNumber, (_, prefix, number) => `${prefix}${Number(number) - offset}"`),
    oldXml,
    `${name}: changed story content, styling, geometry or relationships`,
  );
}
