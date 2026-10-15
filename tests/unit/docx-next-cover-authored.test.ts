import { test, expect } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { walkBlocks, type Paragraph } from "../../src/lib/docx-next/model";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { authoredCoverFixture, AUTHORED_COVER_CASES } from "../fixtures/docx-next/cover-authored";
import { graphicCandidateFixture } from "../fixtures/docx-next/graphic-candidate";
import captured from "../fixtures/docx-next/cover-text-metrics.json";
import type { CoverTextMetrics } from "../../src/components/cover/text-metrics";
import { validateDossierDocModel } from "../../src/lib/docx-next/validation";
import { paragraph } from "../../src/lib/docx-next/native-text";
const option = { coverComposition: "authored-frames" as const };
const find = (m: ReturnType<typeof buildDossierDocModel>, id: string) =>
  walkBlocks(m.cover.blocks).find((b) => b.id === id) as Paragraph;
test("font-metric model construction does not read browser state or a clock", () => {
  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      "-e",
      `
    import { authoredCoverFixture } from "./tests/fixtures/docx-next/cover-authored.ts";
    import captured from "./tests/fixtures/docx-next/cover-text-metrics.json";
    const input=authoredCoverFixture("scaled");
    const fail=()=>{throw Error("ambient state read during measured cover build")};
    for(const key of ["window","document","localStorage","fetch","Blob"])Object.defineProperty(globalThis,key,{configurable:true,get:fail});
    Date.now=fail;Math.random=fail;
    const { buildDossierDocModel }=await import("./src/lib/docx-next/build-model.ts");
    const options={coverComposition:"authored-frames",coverTextMetrics:captured.cases.scaled};
    const model=JSON.stringify(buildDossierDocModel(input,options));
    if(model!==JSON.stringify(buildDossierDocModel(structuredClone(input),structuredClone(options))))throw Error("Nondeterministic measured model");
  `,
    ],
    cwd: process.cwd(),
  });
  expect(new TextDecoder().decode(result.stderr)).toBe("");
  expect(result.exitCode).toBe(0);
});
test("captured font metrics remove the reproduced 115% name displacement without browser access", () => {
  const input = authoredCoverFixture("scaled"),
    metrics = captured.cases.scaled as CoverTextMetrics;
  const before = JSON.stringify({ input, metrics });
  const model = buildDossierDocModel(input, { ...option, coverTextMetrics: metrics });
  const previous = buildDossierDocModel(input, option);
  const frame = model.cover.blocks.find((b) => b.id === "cover.fullName.frame");
  const old = previous.cover.blocks.find((b) => b.id === "cover.fullName.frame");
  if (frame?.kind !== "paragraph-frame" || old?.kind !== "paragraph-frame")
    throw Error("Missing name frame");
  expect(frame.yMm).toBeCloseTo(152.33525, 5);
  expect(old.yMm - frame.yMm).toBeCloseTo(15.33525, 5);
  expect(find(model, "cover.profession").minimumLineHeightPt).toBeCloseTo(52.164, 5);
  expect(model.letter).toEqual(previous.letter);
  expect(model.cv).toEqual(previous.cv);
  expect(JSON.stringify({ input, metrics })).toBe(before);
  expect(
    buildDossierDocModel(JSON.parse(JSON.stringify(input)), {
      ...option,
      coverTextMetrics: JSON.parse(JSON.stringify(metrics)),
    }),
  ).toEqual(model);
});
test("font packets reject stale authored data, missing measurements, invalid metrics and wrong composition", () => {
  const input = authoredCoverFixture("scaled"),
    metrics = captured.cases.scaled as CoverTextMetrics;
  expect(() => buildDossierDocModel(input, { coverTextMetrics: metrics })).toThrow(
    "require authored frame",
  );
  for (const change of [
    (s: typeof input) => (s.cover.fontScale = 1),
    (s: typeof input) => (s.cover.blocks.find((b) => b.id === "beruf")!.lines = ["Changed title"]),
    (s: typeof input) => (s.cover.blocks.find((b) => b.id === "name")!.style.w = 70),
  ]) {
    const stale = structuredClone(input);
    change(stale);
    expect(() => buildDossierDocModel(stale, { ...option, coverTextMetrics: metrics })).toThrow(
      "stale",
    );
  }
  for (const patch of [
    { sizePt: NaN },
    { sizePt: 0 },
    { sizePt: 100 },
    { lines: 0 },
    { lines: 1.5 },
    { lines: 99 },
  ]) {
    const invalid = structuredClone(metrics);
    Object.assign(invalid.blocks.beruf, patch);
    expect(() => buildDossierDocModel(input, { ...option, coverTextMetrics: invalid })).toThrow();
  }
  const missing = structuredClone(metrics);
  delete missing.blocks.beruf;
  expect(() => buildDossierDocModel(input, { ...option, coverTextMetrics: missing })).toThrow(
    "measurement",
  );
});
test("minimum leading remains growing native paragraph spacing and does not change the legacy auto rule", () => {
  const base = buildDossierDocModel(authoredCoverFixture(), option),
    p = find(base, "cover.profession");
  expect(paragraph(p)).toContain('w:line="302" w:lineRule="auto"');
  expect(paragraph({ ...p, minimumLineHeightPt: 45.36 })).toContain(
    'w:line="907" w:lineRule="atLeast"',
  );
  expect(paragraph({ ...p, minimumLineHeightPt: 45.36 })).not.toContain('w:lineRule="exact"');
  for (const value of [0, -1, NaN, Infinity]) {
    const invalid = structuredClone(base);
    find(invalid, "cover.profession").minimumLineHeightPt = value;
    expect(() => validateDossierDocModel(invalid)).toThrow("invalid paragraph geometry");
  }
});
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
