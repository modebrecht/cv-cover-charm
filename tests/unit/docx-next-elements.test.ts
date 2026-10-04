import { describe, expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { walkBlocks, type Paragraph, type DecorativeShape } from "../../src/lib/docx-next/model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { planPartSections } from "../../src/lib/docx-next/section-plan";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { shapePathPoints } from "../../src/lib/docx-next/decoration";
import { paintPng } from "../../src/lib/docx-next/artwork";
import { isSemanticDossierFieldId } from "../../src/lib/dossier-semantic-fields";
import { briefElementsFixture } from "../fixtures/docx-next/brief";

const asset = {
  bytes: paintPng({ color: "123456" }),
  widthPx: 1,
  heightPx: 1,
  contentType: "image/png" as const,
  extension: "png" as const,
};
const parts = async (
  model: ReturnType<typeof buildDossierDocModel>,
  options: Parameters<typeof renderDossierDocx>[1] = {},
) =>
  new Map(
    readZipEntries(
      new Uint8Array(await (await renderDossierDocx(model, options)).arrayBuffer()),
    ).map((part) => [part.name, new TextDecoder().decode(part.bytes)]),
  );
describe("semantic custom elements and nonsemantic decoration", () => {
  test("equal values keep saved identities, independent styles and deterministic portable JSON", () => {
    const input = briefElementsFixture();
    input.cv.elementStyles["custom-a"].y = 260;
    const model = buildDossierDocModel(input);
    expect(model).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input))));
    expect(model.issues).toEqual([]);
    const blocks = walkBlocks(model.cv.blocks);
    expect(blocks.findIndex((block) => block.id === "cv.element:custom-b")).toBeLessThan(
      blocks.findIndex((block) => block.id === "cv.element:custom-a"),
    );
    expect(blocks.find((block) => block.id === "cv.element:custom-a.flow-box")).toMatchObject({
      sourceLayout: { yMm: 260 },
    });
    const a = blocks.find((block) => block.id === "cv.element:custom-a") as Paragraph;
    const b = blocks.find((block) => block.id === "cv.element:custom-b") as Paragraph;
    expect(a.runs[0].text).toBe(b.runs[0].text);
    expect(a.runs[0]).toMatchObject({
      fieldId: "cv.element:custom-a",
      style: { font: "Times New Roman", color: "234567", bold: true },
    });
    expect(b.runs[0]).toMatchObject({
      fieldId: "cv.element:custom-b",
      style: { italic: true, underline: true },
    });
    expect(isSemanticDossierFieldId("cv", "cv.element:custom-a")).toBe(true);
    input.cv.elements[0].text = "Umbenannt";
    const renamed = walkBlocks(buildDossierDocModel(input).cv.blocks).find(
      (block) => block.id === a.id,
    ) as Paragraph;
    expect(renamed.runs[0].style).toEqual(a.runs[0].style);
  });
  test("native flowing boxes retain width/indent/shading/padding/borders without fixed-height text boxes", async () => {
    const model = buildDossierDocModel(briefElementsFixture());
    const box = walkBlocks(model.cv.blocks).find(
      (block) => block.id === "cv.element:custom-b.flow-box",
    );
    expect(box).toMatchObject({
      kind: "table",
      widthMm: 120,
      indentMm: 15,
      decoration: { fillColor: "E6EDF3", paddingXMm: 2, paddingYMm: 1, borderWidthMm: 0.3 },
      rows: [{ keepTogether: true }],
    });
    const xml = (await parts(model)).get("word/document.xml")!;
    expect(xml).toContain('w:tblCaption w:val="cv.element:custom-b.flow-box"');
    expect(xml).toContain('w:fill="E6EDF3"');
    expect(xml).toContain('w:tblInd w:w="850"');
    expect(xml).toContain("Eigenes Feld ä ö ü é è à");
    expect(xml).not.toContain("txbxContent");
    expect(xml).not.toContain("trHeight");
    expect(xml).toContain(
      '</w:tbl><w:p><w:pPr><w:spacing w:after="0" w:line="20" w:lineRule="exact"/></w:pPr></w:p><w:tbl>',
    );
  });
  test("page-two groups retain their native break and share it with page-two sections", async () => {
    const model = buildDossierDocModel(briefElementsFixture("page-two"));
    const zone = model.cv.blocks.find((block) => block.id === "cv.elements.page:2");
    expect(zone).toMatchObject({ kind: "group", startPage: 2 });
    expect(planPartSections(model.cv)[0].blocks).toContain(zone);
    const xml = (await parts(model)).get("word/document.xml")!;
    expect(xml.match(/w:type="page"/g)).toHaveLength(1);
    expect(xml.indexOf('w:type="page"')).toBeLessThan(
      xml.indexOf('w:alias w:val="cv.element:custom-b"'),
    );
  });
  test("hidden, empty and disabled elements do not create media, paragraphs or a second-page group", async () => {
    const input = briefElementsFixture("empty-disabled");
    input.cover.blocks.find((block) => block.id === "custom-b")!.style.hidden = true;
    const model = buildDossierDocModel(input);
    expect(walkBlocks(model.cover.blocks).some((block) => block.id.includes("custom"))).toBe(false);
    expect(walkBlocks(model.cv.blocks).some((block) => block.id.startsWith("cv.element"))).toBe(
      false,
    );
    expect([...(await parts(model))].some(([name]) => name.startsWith("word/media/"))).toBe(false);
  });
  test("custom images reuse normalized pixels while retaining their own frame geometry", async () => {
    const input = briefElementsFixture();
    input.cv.elements.push(
      { id: "picture-a", kind: "image", label: "Bild", text: "", src: "shared" },
      { id: "picture-b", kind: "image", label: "Bild", text: "", src: "shared" },
    );
    input.cv.elementStyles["picture-a"] = { w: 30, ratio: 1.25, imgZoom: 2 };
    input.cv.elementStyles["picture-b"] = { w: 20, ratio: 1, radius: 999 };
    input.cv.elements.push({
      id: "caption",
      kind: "text",
      label: "Beschriftung",
      text: "Bild mit nativer Beschriftung",
      src: "shared",
    });
    input.cv.elementStyles.caption = { w: 30, ratio: 1 };
    let decoded = 0;
    const pkg = await parts(buildDossierDocModel(input), {
      normalizeImage: async () => {
        decoded++;
        return asset;
      },
    });
    expect(decoded).toBe(1);
    expect([...pkg.keys()].filter((key) => key.startsWith("word/media/"))).toHaveLength(1);
    expect(pkg.get("word/document.xml")).toContain('prst="ellipse"');
    expect(pkg.get("word/document.xml")).toContain('name="cv.element:picture-a"');
    expect(pkg.get("word/document.xml")).toContain('name="cv.element:caption.background-image"');
    expect(pkg.get("word/document.xml")).toContain("Bild mit nativer Beschriftung");
  });
  test("decorations reuse assets across parts and attach behind body content, without user text", async () => {
    const model = buildDossierDocModel(briefElementsFixture("shapes"));
    let rendered = 0;
    const pkg = await parts(model, {
      rasterizeDecoration: async (shape) => {
        rendered++;
        expect(shape.semanticText).toBe(false);
        expect(JSON.stringify(shape)).not.toContain("Eigenes Feld");
        return asset;
      },
    });
    expect(rendered).toBe(4);
    expect([...pkg.keys()].filter((key) => key.startsWith("word/media/decoration"))).toHaveLength(
      4,
    );
    expect(pkg.get("word/document.xml")!.match(/behindDoc="1"/g)).toHaveLength(9);
    expect(pkg.get("word/cover-header.xml")).not.toContain("art-rect");
    expect(pkg.get("word/document.xml")).toContain('name="cv.element:art-circle-page2"');
    expect(pkg.get("word/document.xml")).toContain('w:alias w:val="cv.element:custom-a"');
  });
  test("failed decorative assets leave native content and a valid package, with explicit diagnostics", async () => {
    const model = buildDossierDocModel(briefElementsFixture("shapes"));
    const omitted: string[] = [];
    const pkg = await parts(model, {
      rasterizeDecoration: async () => {
        throw new Error("canvas unavailable");
      },
      onDecorationFailure: (id) => omitted.push(id),
    });
    expect(omitted).toHaveLength(9);
    expect([...pkg.keys()].some((key) => key.startsWith("word/media/decoration"))).toBe(false);
    expect(pkg.get("word/_rels/document.xml.rels")).not.toContain("decoration");
    expect(pkg.get("word/document.xml")).toContain("Eigenes Feld ä ö ü é è à");
    expect(pkg.get("word/document.xml")).not.toContain('w:type="page"');
  });
  test("invalid geometry and arbitrary path markup are rejected before asset generation", async () => {
    const model = buildDossierDocModel(briefElementsFixture("shapes"));
    const shape = model.cover.blocks.find(
      (block) => block.kind === "decorative-shape",
    ) as DecorativeShape;
    let called = false;
    shape.opacity = 2;
    await expect(
      parts(model, {
        rasterizeDecoration: async () => {
          called = true;
          return asset;
        },
      }),
    ).rejects.toThrow("invalid decoration");
    expect(called).toBe(false);
    expect(shapePathPoints("M0 100 L50.5 0 L100 100")).toHaveLength(3);
    for (const path of [
      "<text>User name</text>",
      "M0 0 Q50 50 100 0",
      "M0 0 L101 50",
      "M0 0 L50 50 trailing",
    ])
      expect(() => shapePathPoints(path)).toThrow("invalid decorative path");
  });
});
