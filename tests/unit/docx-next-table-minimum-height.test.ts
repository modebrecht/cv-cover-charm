import { test } from "bun:test";
import assert from "node:assert/strict";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { validateDossierDocModel } from "../../src/lib/docx-next/validation";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import type { DossierDocModel, DocumentPart, Paragraph, TableBlock, DocBlock } from "../../src/lib/docx-next/model";

function model(minimumHeightMm?: number): DossierDocModel {
  const part = (id: DocumentPart["id"]): DocumentPart => ({
    id, blocks: [], artwork: [], header: [], footer: [],
    page: { widthMm: 210, heightMm: 297, margins: { top: 20, bottom: 20, left: 20, right: 20 },
      headerDistanceMm: 5, footerDistanceMm: 5 },
    chrome: { borderWidthMm: 0 },
    layout: { mode: "classic", side: "left", sidebarFraction: 0.33 },
  });
  const paragraph: Paragraph = {
    kind: "paragraph", id: "letter.minimum.value", role: "body", align: "left",
    beforeMm: 0, afterMm: 0, lineHeight: 1.4, keepNext: false, keepLines: false,
    runs: [{ id: "letter.minimum.value.run", text: "Editable native text",
      style: { font: "Arial", sizePt: 10, color: "111111", bold: false, italic: false, underline: false } }],
  };
  const table: TableBlock = {
    kind: "table", id: "letter.minimum", widths: [1],
    rows: [{ cells: [[paragraph]], keepTogether: false,
      ...(minimumHeightMm === undefined ? {} : { minimumHeightMm }) }],
    decoration: { borderColor: "FFFFFF", borderWidthMm: 0, paddingXMm: 0, paddingYMm: 0 },
  };
  const result: DossierDocModel = {
    version: 1, templateId: "brief", issues: [],
    metadata: { title: "Synthetic native minimum", author: "", subject: "", keywords: "" },
    theme: { font: "Arial", ink: "111111", accent: "111111", paper: "FFFFFF" },
    fonts: { embedding: "disabled", availability: "target-application", selections: [] },
    cover: part("cover"), letter: part("letter"), cv: part("cv"),
  };
  result.letter.blocks.push(table);
  return result;
}

async function xml(value: DossierDocModel, allow = false) {
  const blob = await renderDossierDocx(value, { allowUnacceptedModelIssues: allow });
  const entry = readZipEntries(new Uint8Array(await blob.arrayBuffer()))
    .find((p) => p.name === "word/document.xml");
  assert.ok(entry);
  return new TextDecoder().decode(entry.bytes);
}

test("a native minimum is growable and does not force an unsplittable row", async () => {
  const output = await xml(model(24), true);
  assert.ok(output.includes('<w:trHeight w:val="1361" w:hRule="atLeast"/>'));
  assert.ok(!output.includes("<w:cantSplit/>"));
  assert.ok(output.includes("Editable native text"));
  assert.ok(output.includes('w:tag w:val="letter.minimum.value"'));
});

test("omitting the minimum retains the ordinary table serializer", async () => {
  const first = await xml(model());
  assert.ok(!first.includes("<w:trHeight"));
  assert.equal(await xml(model(), true), first);
});

test("normal rendering rejects an unaccepted minimum before normalising images", async () => {
  const value = model(24);
  value.cover.blocks.push({ kind: "image", id: "cover.sentinel", source: "sentinel", alt: "",
    widthMm: 10, maxHeightMm: 10, placement: "inline", xMm: 0, yMm: 0, gapMm: 0 });
  let normalised = false;
  await assert.rejects(renderDossierDocx(value, { normalizeImage: async () => {
    normalised = true;
    throw Error("Image handling must not begin");
  } }), /table row minimum height is unaccepted/);
  assert.equal(normalised, false);
});

test("the diagnostic guard also detects row minima in a supplied story", async () => {
  const value = model(24);
  const table = value.letter.blocks.pop()!;
  // Deliberately supplied runtime structure, outside the typed header API.
  (value.letter.header as unknown as DocBlock[]).push(table);
  await assert.rejects(renderDossierDocx(value), /table row minimum height is unaccepted/);
});

test("invalid or collapsed row minima fail validation even with diagnostic opt-in", async () => {
  for (const height of [NaN, Infinity, -1, 0, 0.0001, 258]) {
    const value = model(height);
    assert.throws(() => validateDossierDocModel(value), /invalid table row minimum height/);
    await assert.rejects(renderDossierDocx(value, { allowUnacceptedModelIssues: true }), /invalid table row minimum height/);
  }
});
