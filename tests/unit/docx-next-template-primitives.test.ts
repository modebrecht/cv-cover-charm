import { describe, test, expect } from "bun:test";
import {
  decorationPageGeometry,
  ensureFirstHeader,
  artworkApplies,
  orderedPagePaint,
} from "../../src/lib/docx-next/page-artwork";
import { decorationAssetKey, validateDecoration } from "../../src/lib/docx-next/decoration";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { walkBlocks, type DecorativeShape, type Paragraph } from "../../src/lib/docx-next/model";
import { paintPng } from "../../src/lib/docx-next/artwork";
import { briefFixture, briefElementsFixture } from "../fixtures/docx-next/brief";
import { WARM_FIXTURES, warmFixture } from "../fixtures/docx-next/warm";
import { composePageMotifs } from "../../src/lib/docx-next/template-motifs";
const asset = {
  bytes: paintPng({ color: "123456" }),
  widthPx: 1,
  heightPx: 1,
  contentType: "image/png" as const,
  extension: "png" as const,
};
const shape: DecorativeShape = {
  kind: "decorative-shape",
  id: "test.edge",
  semanticText: false,
  clipToPage: true,
  shape: "circle",
  xMm: 170,
  yMm: -20,
  widthMm: 80,
  heightMm: 80,
  radiusMm: 0,
  opacity: 0.7,
  fill: { color: "123456" },
  stroke: { color: "123456", widthMm: 0 },
};
async function parts(model: ReturnType<typeof buildDossierDocModel>) {
  return new Map(
    readZipEntries(
      new Uint8Array(
        await (
          await renderDossierDocx(model, { rasterizeDecoration: async () => asset })
        ).arrayBuffer(),
      ),
    ).map((p) => [p.name, new TextDecoder().decode(p.bytes)]),
  );
}
describe("shared native template primitives", () => {
  test("opt-in page paint serializes native anchors by layer, scopes stories and keeps earlier packages unchanged", async () => {
    const model = buildDossierDocModel(briefFixture());
    model.cover.artwork = [
      {
        kind: "decorative-artwork",
        id: "paper",
        semanticText: false,
        paintLayer: 0,
        fill: { color: "FFFFFF" },
        xMm: 0,
        yMm: 0,
        widthMm: 210,
        heightMm: 297,
      },
    ];
    model.cover.headerShapes = [
      { ...shape, id: "foreground", paintLayer: 3, repeat: "first" },
      { ...shape, id: "frame", paintLayer: 1 },
      { ...shape, id: "continuation", paintLayer: 2, repeat: "continuation" },
    ];
    expect(orderedPagePaint(model.cover, true).map((p) => p.id)).toEqual([
      "paper",
      "foreground",
      "frame",
    ]);
    ensureFirstHeader(model.cover);
    model.cover.paintOrder = "layer";
    expect(orderedPagePaint(model.cover, true).map((p) => p.id)).toEqual([
      "paper",
      "frame",
      "foreground",
    ]);
    expect(orderedPagePaint(model.cover, false).map((p) => p.id)).toEqual([
      "paper",
      "frame",
      "continuation",
    ]);
    expect(model.cover.headerShapes[0].id).toBe("foreground");
    const xml = (await parts(model)).get("word/cover-header.xml")!;
    expect([...xml.matchAll(/relativeHeight="(\d+)"/g)].map((m) => Number(m[1]))).toEqual([
      0, 1, 2,
    ]);
    model.cover.artwork.push({
      ...model.cover.artwork[0],
      id: "authored chrome",
      paintLayer: undefined,
    });
    expect(orderedPagePaint(model.cover, true).at(-1)).toMatchObject({
      id: "authored chrome",
      paintLayer: 5,
    });
  });
  test("explicit paint stacking is independent of global DrawingML IDs in both native stories", async () => {
    const model = buildDossierDocModel(briefFixture());
    model.cover.blocks.push(
      ...Array.from({ length: 50 }, (_, index) => ({ ...shape, id: `global-id:${index}` })),
    );
    model.cover.artwork = [
      {
        kind: "decorative-artwork",
        id: "cover.paper",
        semanticText: false,
        paintLayer: 0,
        fill: { color: "FFFFFF" },
        xMm: 0,
        yMm: 0,
        widthMm: 210,
        heightMm: 297,
      },
    ];
    model.cover.headerShapes = [{ ...shape, id: "authored.foreground" }];
    composePageMotifs(
      model.cover,
      [
        {
          shape: "rect",
          xFraction: 0,
          widthFraction: 1,
          topMm: 0,
          heightMm: 297,
          fillSlot: "primary",
          paintLayer: 1,
        },
      ],
      { primary: "#123456" },
      "123456",
    );
    expect(model.cover.headerShapes[0].paintLayer).toBe(2);
    const entries = await parts(model);
    for (const story of ["word/cover-header.xml", "word/cover-header-first.xml"]) {
      const xml = entries.get(story)!;
      expect(xml).toContain('relativeHeight="0"');
      expect(xml).toContain('relativeHeight="1"');
      expect(xml).toContain('relativeHeight="2"');
    }
    expect(decorationAssetKey({ ...shape, paintLayer: 1 })).toBe(
      decorationAssetKey({ ...shape, paintLayer: 2 }),
    );
    expect(() => validateDecoration({ ...shape, paintLayer: -1 })).toThrow("paint layer");
    expect(() =>
      composePageMotifs(
        model.cover,
        [
          {
            shape: "rect",
            xFraction: 0,
            widthFraction: 1,
            topMm: 0,
            heightMm: 297,
            fillSlot: "primary",
            paintLayer: 1,
          },
          {
            shape: "circle",
            xFraction: 0,
            widthFraction: 0.1,
            topMm: 0,
            heightMm: 21,
            fillSlot: "primary",
          },
        ],
        { primary: "#123456" },
        "123456",
      ),
    ).toThrow("every layer or none");
  });
  test("palette-bound outline motifs retain transparent centers and scoped native stories", () => {
    const part = buildDossierDocModel(briefFixture()).cv;
    composePageMotifs(
      part,
      [
        {
          shape: "circle",
          xFraction: 180 / 210,
          widthFraction: 22 / 210,
          topMm: -6,
          heightMm: 22,
          stroke: { slot: "secondary", widthMm: 2 },
          opacity: 0.52,
        },
      ],
      { secondary: "#625fe8" },
      "111111",
    );
    expect(part.headerShapes!.map((s) => s.repeat)).toEqual(["first", "continuation"]);
    for (const motif of part.headerShapes!) {
      expect(motif.fill).toBeUndefined();
      expect(motif.stroke).toEqual({ color: "625FE8", widthMm: 2 });
      expect(motif.opacity).toBe(0.52);
      validateDecoration(motif);
      expect(() =>
        validateDecoration({ ...motif, stroke: { ...motif.stroke, widthMm: 22 } }),
      ).toThrow("invalid decoration");
    }
    expect(part.firstHeader).toBeDefined();
  });
  test("unpainted and fill-less gradient descriptors fail explicitly", () => {
    const part = buildDossierDocModel(briefFixture()).cv;
    const policy = {
      shape: "circle" as const,
      xFraction: 0,
      widthFraction: 0.1,
      topMm: 0,
      heightMm: 20,
    };
    expect(() => composePageMotifs(part, [policy], {}, "111111")).toThrow("visible outline");
    expect(() =>
      composePageMotifs(
        part,
        [{ ...policy, stroke: { slot: "accent", widthMm: 0 } }],
        {},
        "111111",
      ),
    ).toThrow("visible outline");
    expect(() =>
      composePageMotifs(
        part,
        [{ ...policy, stroke: { slot: "accent", widthMm: 2 }, endSlot: "primary" }],
        {},
        "111111",
      ),
    ).toThrow("gradients require a fill");
  });
  test("page intersection retains visible circle viewport and rejects unspecified clipping", () => {
    const page = buildDossierDocModel(briefFixture()).cover.page;
    validateDecoration(shape);
    expect(decorationPageGeometry(shape, page)).toEqual({
      xMm: 170,
      yMm: 0,
      widthMm: 40,
      heightMm: 60,
      crop: { left: 0, top: 25000, right: 50000, bottom: 0 },
    });
    expect(() => decorationPageGeometry({ ...shape, clipToPage: undefined }, page)).toThrow(
      "outside page",
    );
    expect(() => decorationPageGeometry({ ...shape, xMm: 210 }, page)).toThrow(
      "no page intersection",
    );
    expect(() => validateDecoration({ ...shape, opacity: 2 })).toThrow("invalid decoration");
    expect(decorationAssetKey(shape)).toBe(
      decorationAssetKey({ ...shape, id: "other", xMm: 0, yMm: 0, repeat: "first" }),
    );
  });
  test("scoped paint creates explicit stories with reusable assets and owned relationships", async () => {
    const model = buildDossierDocModel(briefFixture());
    model.letter.headerShapes = [
      { ...shape, repeat: "first" },
      { ...shape, id: "test.edge.two", repeat: "first", xMm: -20 },
      { ...shape, id: "test.edge.three", repeat: "first" },
    ];
    ensureFirstHeader(model.letter);
    const xml = await parts(model);
    expect(xml.get("word/letter-header-first.xml")).toContain('r:embed="decoration1"');
    expect(xml.get("word/letter-header-first.xml")).toContain('cx="1440000" cy="2160000"');
    expect(xml.get("word/letter-header.xml")).not.toContain("decoration1");
    expect(
      xml.get("word/_rels/letter-header-first.xml.rels")!.match(/Id="decoration1"/g),
    ).toHaveLength(1);
    expect(xml.get("word/document.xml")).toContain("<w:titlePg/>");
    expect(artworkApplies({ repeat: "continuation" }, true)).toBe(false);
    expect(artworkApplies({}, false)).toBe(true);
  });
  test("Warm scenarios preserve identities and portable deterministic models", () => {
    for (const kind of WARM_FIXTURES) {
      const input = warmFixture(kind),
        model = buildDossierDocModel(input);
      expect(model).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input))));
      expect(model.issues).toEqual([]);
      expect(model.templateId).toBe("freundlich");
      const text = walkBlocks([
        ...model.letter.blocks,
        ...model.letter.header,
        ...model.letter.firstHeader!,
      ])
        .filter((block) => block.kind === "paragraph")
        .flatMap((block) => block.runs);
      expect(
        text.some(
          (run) =>
            run.fieldId === "letter.sender.name" && run.text === input.letter.data.absenderName,
        ),
      ).toBe(true);
    }
  });
  test("compact sender stays native and growing with saved style and dossier font", async () => {
    const input = warmFixture("compact");
    input.settings.fieldStyles = {
      "letter.sender.name": { color: "ABCDEF", sizePt: 18, italic: true },
    };
    input.letter.design.font = "humanist";
    input.letter.design.fontOverride = "times";
    const model = buildDossierDocModel(input);
    const sender = walkBlocks(model.letter.blocks).find(
      (block) => block.id === "letter.sender.name",
    ) as Paragraph;
    expect(sender.runs[0].style).toMatchObject({
      color: "ABCDEF",
      sizePt: 18,
      italic: true,
      font: "Times New Roman",
    });
    const xml = await parts(model);
    expect(xml.get("word/document.xml")).toContain('w:val="letter.sender.masthead"');
    expect(xml.get("word/document.xml")).not.toContain("txbxContent");
    expect(xml.get("word/document.xml")).not.toContain("w:trHeight");
  });
  test("default contact keeps reviewed 44mm policy and none keeps sender flow", () => {
    const normal = buildDossierDocModel(warmFixture());
    expect(normal.letter.page.margins.top).toBe(68);
    expect(
      normal.letter.header.some((p) => p.runs.some((run) => run.fieldId === "letter.sender.name")),
    ).toBe(true);
    const none = buildDossierDocModel(warmFixture("none"));
    expect(none.letter.headerShapes).toBeUndefined();
    expect(none.letter.artwork.every((art) => !art.id.includes(".band."))).toBe(true);
    expect(none.letter.blocks.some((block) => block.id === "letter.sender.name")).toBe(true);
  });
  test("cover rows are native and light palette chrome has readable editable ink", async () => {
    const model = buildDossierDocModel(warmFixture("custom-colors"));
    expect(
      model.cover.blocks.filter(
        (block) => block.kind === "table" && block.id.startsWith("cover.composition"),
      ),
    ).toHaveLength(3);
    const xml = await parts(model);
    expect(xml.get("word/document.xml")).toContain('w:val="cover.composition.row:0"');
    expect(model.letter.header[0].runs[0].style.color).not.toBe("FFFFFF");
  });
  test("first paint clearance and continuation margin use one spacer", () => {
    const input = warmFixture("compact");
    input.settings.cvContinuationTopMarginMm = 10;
    const model = buildDossierDocModel(input);
    expect(model.cv.page.margins.top).toBe(10);
    expect(model.cv.layout.pagination?.firstPageLeadMm).toBe(46);
    expect(
      model.cv.blocks.filter((block) => block.kind === "spacer" && block.id === "cv.firstPageLead"),
    ).toHaveLength(1);
  });
  test("wrapped contact chrome with signed offsets reserves native text safety", () => {
    const model = buildDossierDocModel(warmFixture("continuation"));
    for (const part of [model.letter, model.cv]) {
      const follow = part.artwork.find((paint) => paint.repeat === "continuation")!;
      expect(follow.heightMm).toBeGreaterThan(35);
      expect(part.page.margins.top).toBeGreaterThan(follow.heightMm);
    }
  });
  test("custom flow boxes keep content and native padding in one row at a page boundary", async () => {
    const model = buildDossierDocModel(warmFixture("custom"));
    const boxes = walkBlocks(model.cover.blocks).filter(
      (block) =>
        block.kind === "table" &&
        block.id.startsWith("cover.custom-") &&
        block.id.endsWith(".flow-box"),
    );
    expect(boxes).toHaveLength(2);
    for (const box of boxes) if (box.kind === "table") expect(box.rows[0].keepTogether).toBe(true);
    const xml = (await parts(model)).get("word/document.xml")!;
    expect(xml).toContain("<w:trPr><w:cantSplit/></w:trPr>");
    expect(xml).not.toContain("w:trHeight");
    const longBox = walkBlocks(buildDossierDocModel(briefElementsFixture("long")).cv.blocks).find(
      (block) => block.id === "cv.element:custom-a.flow-box",
    );
    expect(longBox).toMatchObject({ kind: "table", rows: [{ keepTogether: false }] });
  });
  test("disabled chrome ignores dormant height and unsupported inputs block", async () => {
    const input = warmFixture("none");
    Object.assign(input.settings.chrome!.shared, {
      headerHeightMm: 44,
      footerMode: "none",
      footerHeightMm: 30,
    });
    const model = buildDossierDocModel(input);
    expect(model.letter.page.margins).toEqual({ top: 20, right: 22, bottom: 22, left: 24 });
    input.settings.cvLayout = "sidebar";
    expect(
      buildDossierDocModel(input).cv.blocks.some((block) => block.kind === "parallel-flow"),
    ).toBe(true);
    input.settings.cvLayout = "classic";
    input.cv.design.font = "unknown" as typeof input.cv.design.font;
    expect(() => buildDossierDocModel(input)).toThrow("unsupported font key");
  });
});
