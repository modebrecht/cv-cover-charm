import assert from "node:assert/strict";
import { readZipEntries } from "../../src/lib/docx-next/zip";

export function freezeStressInput(value: unknown): void {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return;
  Object.values(value).forEach(freezeStressInput);
  Object.freeze(value);
}

const unescape = (value: string) =>
  value.replace(
    /&(amp|lt|gt|quot|apos);/g,
    (_, entity: string) => ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" })[entity]!,
  );

/** Current renderer's non-nested semantic controls; native XML parsing is separate QA. */
export function taggedStressFields(document: string): Map<string, string> {
  const fields = new Map<string, string>();
  for (const match of document.matchAll(/<w:sdt>([\s\S]*?)<\/w:sdt>/g)) {
    const id = match[1].match(/<w:tag w:val="([^"]+)"\/>/)?.[1];
    if (!id) continue;
    assert(!fields.has(id), `Duplicate stress field ${id}`);
    fields.set(
      unescape(id),
      [...match[1].matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)]
        .map((part) => unescape(part[1]))
        .join(""),
    );
  }
  return fields;
}

export function checkStressFields(document: string, expected: Record<string, string>): void {
  const actual = taggedStressFields(document);
  for (const [id, text] of Object.entries(expected))
    assert.equal(actual.get(id), text, `Missing or changed stress field ${id}`);
}

export function stressPackageParts(bytes: Uint8Array): Map<string, string> {
  return new Map(
    readZipEntries(bytes)
      .filter((entry) => entry.name.endsWith(".xml") || entry.name.endsWith(".rels"))
      .map((entry) => [entry.name, new TextDecoder().decode(entry.bytes)]),
  );
}
