import { test, expect } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { walkBlocks, type Paragraph } from "../../src/lib/docx-next/model";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { authoredCoverFixture, AUTHORED_COVER_CASES } from "../fixtures/docx-next/cover-authored";
import { graphicCandidateFixture } from "../fixtures/docx-next/graphic-candidate";
const option = { coverComposition: "authored-frames" as const };
const find = (m: ReturnType<typeof buildDossierDocModel>, id: string) =>
  walkBlocks(m.cover.blocks).find((b) => b.id === id) as Paragraph;
test("authored page uses shared visible labels and typography without altering authored text", () => {
  const input = authoredCoverFixture(),
    before = structuredClone(input),
    m = buildDossierDocModel(input, option);
  expect(input).toEqual(before);
  expect(find(m, "cover.beilagenTitel")).toMatchObject({
    runs: [{ text: "Beilagen", style: { allCaps: true, trackingPt: 0, bold: true } }],
    lineHeight: 1.12,
  });
  expect(find(m, "cover.lehrbeginn").runs[0].style.bold).toBe(false);
  expect(find(m, "cover.fullName").runs[0].style.trackingPt).toBe(-0.2475);
  expect(find(m, "cover.photo.initials").runs[0].text).toBe("LM");
  expect(m.letter).toEqual(buildDossierDocModel(input).letter);
  expect(m.cv).toEqual(buildDossierDocModel(input).cv);
});
test("explicit saved element styles and manual coordinates win over role defaults", () => {
  const m = buildDossierDocModel(authoredCoverFixture("moved"), option);
  expect(m.cover.blocks.find((b) => b.id === "cover.ortDatum.frame")).toMatchObject({
    xMm: 105,
    yMm: 28,
    widthMm: 85,
  });
  expect(find(m, "cover.ortDatum")).toMatchObject({
    runs: [{ style: { bold: true, allCaps: false, trackingPt: 0.23 } }],
    lineHeight: 1.5,
  });
  expect(find(m, "cover.fullName")).toBeUndefined();
});
test("photo uses saved native page geometry and original source without cover width cap", () => {
  const m = buildDossierDocModel(authoredCoverFixture("photo-portrait"), option);
  expect(m.cover.blocks.find((b) => b.id === "cover.photo")).toMatchObject({
    kind: "image",
    placement: "free",
    coordinateOrigin: "page",
    xMm: 125,
    yMm: 45,
    widthMm: 40,
    maxHeightMm: 60,
    source: "synthetic-photo",
    frame: { heightRatio: 1.5, zoom: 1.3, xPct: 30, yPct: 65 },
  });
  expect(m.cover.blocks.find((b) => b.id === "cover.photo.mat")).toBeDefined();
  expect(find(m, "cover.photo.initials")).toBeUndefined();
});
test("native package stays opt-in, JSON-stable and preserves adjacent models", async () => {
  const input = authoredCoverFixture(),
    m = buildDossierDocModel(input, option);
  await expect(renderDossierDocx(m)).rejects.toThrow("paragraph frame pagination is unaccepted");
  // Placeholder paint is separately normalized by a deterministic nonsemantic fixture adapter.
  const png = Uint8Array.from(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==",
      "base64",
    ),
  );
  const opts = {
    allowUnacceptedModelIssues: true,
    rasterizeDecoration: async () => ({
      bytes: png,
      widthPx: 1,
      heightPx: 1,
      extension: "png" as const,
      contentType: "image/png" as const,
    }),
  };
  const pack = async (model: typeof m) =>
    new Uint8Array(await (await renderDossierDocx(model, opts)).arrayBuffer());
  const bytes = await pack(m);
  expect(bytes).toEqual(await pack(JSON.parse(JSON.stringify(m))));
  const xml = new TextDecoder().decode(
    readZipEntries(bytes).find((e) => e.name === "word/document.xml")!.bytes,
  );
  expect(xml).toContain("<w:framePr");
  expect(xml).not.toContain("<w:txbxContent");
  expect(xml).toContain("Lea Müller");
  expect(xml).toContain('w:hRule="auto"');
});
test("bounded Brief cases build; clipping, collisions and undeclared templates fail explicitly", () => {
  for (const name of AUTHORED_COVER_CASES)
    expect(() => buildDossierDocModel(authoredCoverFixture(name), option)).not.toThrow();
  const bad = authoredCoverFixture();
  bad.cover.blocks.find((b) => b.id === "beilagen")!.lines = Array.from(
    { length: 80 },
    (_, i) => "Unterlage " + i,
  );
  expect(() => buildDossierDocModel(bad, option)).toThrow("A4 bounds");
  const overlap = authoredCoverFixture();
  Object.assign(overlap.cover.blocks.find((b) => b.id === "ortDatum")!.style, {
    x: 20,
    y: 140,
    w: 100,
  });
  expect(() => buildDossierDocModel(overlap, option)).toThrow("overlaps");
  expect(() => buildDossierDocModel(graphicCandidateFixture("prism"), option)).toThrow(
    "not declared",
  );
});
