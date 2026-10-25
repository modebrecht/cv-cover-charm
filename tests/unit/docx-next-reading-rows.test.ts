import { expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { walkBlocks, type TableBlock } from "../../src/lib/docx-next/model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { briefFixture } from "../fixtures/docx-next/brief";
import { coverPdfDocumentFromSaved } from "../../src/lib/dossier-pdf-document";

const options = { cvContentComposition: "reading-rows" } as const;
const fields = (blocks: Parameters<typeof walkBlocks>[0]) =>
  walkBlocks(blocks)
    .filter((b) => b.kind === "paragraph")
    .flatMap((p) => p.runs.filter((r) => r.fieldId).map((r) => [r.fieldId, r.text]))
    .filter(([id]) => id !== "cv.section.person.heading")
    .sort(([a], [b]) => a!.localeCompare(b!));

test("five classic families share rows without changing source fields or adjacent documents", () => {
  for (const template of ["brief", "modern", "freundlich", "verlauf", "neon"] as const) {
    const source = briefFixture("normal");
    source.cover = coverPdfDocumentFromSaved({
      template,
      data: source.cover.data,
      colors: {},
      fontScale: 1,
    })!;
    source.letter.design.template = template;
    source.cv.design.template = template;
    const before = JSON.stringify(source);
    const old = buildDossierDocModel(source);
    const model = buildDossierDocModel(source, options);
    expect(JSON.stringify(source)).toBe(before);
    expect(model.cover).toEqual(old.cover);
    expect(model.letter).toEqual(old.letter);
    expect(fields(model.cv.blocks)).toEqual(fields(old.cv.blocks));
    const blocks = walkBlocks(model.cv.blocks);
    const ids = blocks.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    const rails = blocks.filter((b) => b.kind === "table" && b.id.endsWith(".dateRail"));
    expect(rails.length).toBeGreaterThan(0);
    for (const row of rails) {
      expect(row.columnWidthsMm).toEqual([27, null]);
      expect(row.rows[0].keepTogether).toBe(false);
      expect(row.rows[0].cells[0][0]).toMatchObject({ keepNext: false });
      expect(row.rows[0].cells[1][0]).toMatchObject({ indentMm: 5 });
    }
    expect(blocks.find((b) => b.id === "cv.section.person.heading")).toBeUndefined();
    expect(blocks.filter((b) => b.kind === "paragraph" && b.list).length).toBe(
      source.cv.data.staerken.filter((s) => s.trim()).length +
        source.cv.data.hobbys.filter((s) => s.trim()).length,
    );
  }
});

test("native language rows and lists retain controls and real numbering in DOCX", async () => {
  const source = briefFixture("normal");
  source.settings.fieldStyles = { "cv.entry.schule:school1.title": { underline: true } };
  const model = buildDossierDocModel(source, options);
  const rows = walkBlocks(model.cv.blocks).filter(
    (b): b is TableBlock => b.kind === "table" && b.id.endsWith(".languageRow"),
  );
  expect(rows).toHaveLength(source.cv.data.sprachen.length);
  expect(rows[0].rows[0].cells.map((cell) => cell[0].id)).toEqual([
    `cv.entry.sprachen:${source.cv.data.sprachen[0].id}.name`,
    `cv.entry.sprachen:${source.cv.data.sprachen[0].id}.level`,
  ]);
  const parts = readZipEntries(
    new Uint8Array(await (await renderDossierDocx(model)).arrayBuffer()),
  );
  const document = new TextDecoder().decode(
    parts.find((p) => p.name === "word/document.xml")!.bytes,
  );
  const numbering = new TextDecoder().decode(
    parts.find((p) => p.name === "word/numbering.xml")!.bytes,
  );
  expect(document).toContain("<w:numPr>");
  expect(numbering).toContain('<w:lvlText w:val="•"/>');
  for (const block of walkBlocks(model.cv.blocks).filter((b) => b.kind === "paragraph"))
    expect(document.includes(`w:tag w:val="${block.id}"`)).toBe(true);
});

test("empty dates and one-sided languages keep content without fabricated fields", () => {
  const source = briefFixture("minimal");
  source.cv.data.schule = [
    { id: "undated", zeit: "", titel: "Ohne Datum", ort: "", beschreibung: "Inhalt" },
    { id: "date-only", zeit: "2026", titel: "", ort: "", beschreibung: "" },
  ];
  source.cv.data.sprachen = [{ id: "name-only", name: "Deutsch", niveau: "" }];
  const model = buildDossierDocModel(source, options);
  const blocks = walkBlocks(model.cv.blocks);
  expect(blocks.filter((b) => b.id.endsWith(".dateRail"))).toHaveLength(0);
  expect(blocks.filter((b) => b.id.endsWith(".languageRow"))).toHaveLength(0);
  expect(fields(model.cv.blocks)).toEqual(fields(buildDossierDocModel(source).cv.blocks));
});

test("long entries may flow and explicit spacing and field styles remain authoritative", () => {
  const source = briefFixture("long-cv");
  const entry = source.cv.data.schule[0];
  source.settings.fieldStyles = { [`cv.entry.schule:${entry.id}.date`]: { underline: true } };
  source.settings.cvSectionGapMm = 9;
  const model = buildDossierDocModel(source, options);
  const blocks = walkBlocks(model.cv.blocks);
  expect(blocks.find((b) => b.id === `cv.entry.schule:${entry.id}.date`)).toMatchObject({
    runs: [{ style: { underline: true } }],
  });
  expect(blocks.find((b) => b.id === "cv.section.schule.heading")).toMatchObject({ beforeMm: 9 });
  expect(blocks.find((b) => b.id === `cv.entry.schule:${entry.id}.description`)).toMatchObject({
    keepLines: false,
    keepNext: false,
  });
});

test("candidate cannot alter frozen sidebar, free elements or relocated personal composition", () => {
  const source = briefFixture("minimal");
  for (const layout of ["sidebar", "modern", "minimal", "timeline", "editorial"] as const) {
    source.settings.cvLayout = layout;
    expect(() => buildDossierDocModel(source, options)).toThrow("Lesefluss-Test");
  }
  source.settings.cvLayout = "classic";
  source.cv.design.useElements = true;
  expect(() => buildDossierDocModel(source, options)).toThrow("Lesefluss-Test");
  source.cv.design.useElements = false;
  source.cv.data.sectionOrder = ["schule", "person"];
  expect(() => buildDossierDocModel(source, options)).toThrow("Verschobene");
});
