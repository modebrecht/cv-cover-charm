import { describe, test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { walkBlocks, type Paragraph } from "../../src/lib/docx-next/model";
import { templateMotifs } from "../../src/lib/docx-next/template-motifs";
import { validateDecoration } from "../../src/lib/docx-next/decoration";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { paintPng } from "../../src/lib/docx-next/artwork";
import { PRISM_FIXTURES, prismFixture } from "../fixtures/docx-next/prism";
import { PRISM } from "../../src/lib/docx-next/templates";
import {
  composeLetterTail,
  composeHeaderBands,
} from "../../src/lib/docx-next/template-composition";
const asset = {
  bytes: paintPng({ color: "123456" }),
  widthPx: 1,
  heightPx: 1,
  extension: "png" as const,
  contentType: "image/png" as const,
};
describe("Prism declarative architecture stress", () => {
  test("a shared band may combine circles and polygons without discarding either primitive", () => {
    const part = buildDossierDocModel(prismFixture("none")).letter;
    composeHeaderBands(
      part,
      { ...PRISM.chrome.band!, circles: [{ rightMm: 0, topMm: 0, diameterMm: 8, opacity: 0.5 }] },
      { primary: "#123456", secondary: "#ABCDEF" },
      "123456",
      "compact",
      "compact",
      0,
      false,
    );
    expect(part.headerShapes).toHaveLength(3);
    expect(part.headerShapes!.map((p) => p.shape)).toEqual(["path", "path", "circle"]);
    expect(part.headerShapes!.map((p) => p.repeat)).toEqual(["first", "continuation", "first"]);
  });
  test("all authored scenarios retain canonical identity and deterministic source snapshots", () => {
    for (const kind of PRISM_FIXTURES) {
      const input = prismFixture(kind);
      const model = buildDossierDocModel(input);
      expect(model).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input))));
      expect(model.issues).toEqual([]);
      expect(model.templateId).toBe("prism");
      const runs = walkBlocks([
        ...model.letter.blocks,
        ...model.letter.header,
        ...(model.letter.firstHeader ?? []),
      ]).flatMap((b) => (b.kind === "paragraph" ? b.runs : []));
      expect(
        runs.some(
          (r) => r.fieldId === "letter.sender.name" && r.text === input.letter.data.absenderName,
        ),
      ).toBe(true);
    }
  });
  test("shared page-relative motifs use existing validated polygon paint and growing band height", () => {
    const part = buildDossierDocModel(prismFixture()).cv;
    const policy = {
      shape: "path" as const,
      path: "M 0 0 L 100 0 L 100 100 L 0 70",
      xFraction: 0.5,
      widthFraction: 0.5,
      topMm: 0,
      fillSlot: "paint",
      endSlot: "end",
      angleDeg: 110,
    };
    const [shape] = templateMotifs(
      part,
      [policy],
      { paint: "#123456", end: "#ABCDEF" },
      "111111",
      67,
      "continuation",
    );
    expect(shape).toMatchObject({
      xMm: 105,
      widthMm: 105,
      heightMm: 67,
      repeat: "continuation",
      fill: { color: "123456", endColor: "ABCDEF", angleDeg: 110 },
    });
    expect(() => validateDecoration(shape)).not.toThrow();
    expect(
      templateMotifs(part, [{ ...policy, repeat: "first" }], {}, "111111", 67, "continuation"),
    ).toEqual([]);
    expect(() => validateDecoration(templateMotifs(part, [policy], {}, "111111")[0])).toThrow(
      "invalid decoration",
    );
  });
  test("native cover cells group title fields while preserving independent saved formatting", async () => {
    const input = prismFixture();
    input.settings.fieldStyles = { "cover.fullName": { color: "123456", italic: true } };
    const model = buildDossierDocModel(input);
    const hero = model.cover.blocks.find((b) => b.id === "cover.composition.row:1");
    expect(hero?.kind).toBe("table");
    if (hero?.kind !== "table") throw new Error("Missing native hero table");
    expect(walkBlocks(hero.rows[0].cells[0]).map((b) => b.id)).toEqual(
      expect.arrayContaining(["cover.fullName", "cover.profession"]),
    );
    const name = walkBlocks(model.cover.blocks).find((b) => b.id === "cover.fullName") as Paragraph;
    expect(name.runs[0].style).toMatchObject({ color: "123456", italic: true });
    const badge = walkBlocks(hero.rows[0].cells[0]).find(
      (b) => b.id === "cover.lehrbeginn.flow-box",
    );
    expect(badge).toMatchObject({
      kind: "table",
      widthMm: 105.4,
      indentMm: 0,
      sourceLayout: { widthMm: 170 },
    });
    expect(model.cover.blocks.find((b) => b.id === "cover.composition.lead:1")).toMatchObject({
      kind: "spacer",
      heightMm: 90,
    });
    const zip = readZipEntries(
      new Uint8Array(
        await (
          await renderDossierDocx(model, { rasterizeDecoration: async () => asset })
        ).arrayBuffer(),
      ),
    );
    const xml = (key: string) => new TextDecoder().decode(zip.find((p) => p.name === key)!.bytes);
    expect(xml("word/document.xml")).toContain('w:val="cover.composition.row:1"');
    expect(xml("word/document.xml")).not.toContain("txbxContent");
    expect(xml("word/cover-header-first.xml")).toContain("decoration");
    expect(xml("word/cover-header.xml")).not.toContain("decoration");
    expect(xml("word/letter-header-first.xml")).toContain("decoration");
    expect(xml("word/letter-header.xml")).toContain("decoration");
  });
  test("disabled chrome retains native sender and suppresses every interior motif", () => {
    const model = buildDossierDocModel(prismFixture("none"));
    for (const part of [model.letter, model.cv]) {
      expect(part.headerShapes).toBeUndefined();
      expect(part.artwork.filter((p) => p.id.includes(".band."))).toEqual([]);
    }
    expect(model.letter.blocks.some((b) => b.id === "letter.sender.name")).toBe(true);
  });
  test("explicit custom header surface replaces template motifs and foreground stays authoritative", () => {
    const model = buildDossierDocModel(prismFixture("custom-surface"));
    for (const part of [model.letter, model.cv]) {
      expect(part.headerShapes).toBeUndefined();
      expect(part.artwork.filter((p) => p.id.includes(".band."))).toEqual([]);
      expect(part.artwork.find((p) => p.id.endsWith(".artwork.header"))?.fill).toEqual({
        color: "EFE6DC",
        endColor: "DED3C4",
      });
      expect(
        part.firstHeader!.flatMap((p) => p.runs).every((r) => r.style.color === "18223A"),
      ).toBe(true);
    }
  });
  test("wrapped signed-offset contact enlarges both polygon and paint with one CV first spacer", () => {
    const model = buildDossierDocModel(prismFixture("continuation"));
    for (const part of [model.letter, model.cv]) {
      for (const motif of part.headerShapes!) {
        const band = part.artwork.find(
          (p) => p.repeat === motif.repeat && p.id.includes(".band."),
        )!;
        expect(motif.heightMm).toBe(band.heightMm);
        expect(band.heightMm).toBeGreaterThan(35);
      }
    }
    expect(model.cv.blocks.filter((b) => b.id === "cv.firstPageLead")).toHaveLength(1);
  });
  test("registration introduces no template-ID condition or alternative renderer", () => {
    expect(JSON.stringify(PRISM)).not.toContain("<w:");
    for (const file of [
      "renderer.ts",
      "template-motifs.ts",
      "template-composition.ts",
      "cover-composition.ts",
      "build-model.ts",
    ]) {
      const source = readFileSync(`src/lib/docx-next/${file}`, "utf8");
      expect(source).not.toMatch(/(?:freundlich|prism|human|warm)["']/i);
      expect(source).not.toMatch(
        /dossier-docx-templates|txbxContent|patchFirstParagraphContaining/,
      );
    }
  });
  test("a short semantic closing/signature/attachment tail stays attached without fixed heights", () => {
    const model = buildDossierDocModel(prismFixture("columns"));
    const tail = model.letter.blocks.filter(
      (b): b is Paragraph =>
        b.kind === "paragraph" &&
        (b.id === "letter.closing" ||
          b.id === "letter.signature" ||
          b.id.startsWith("letter.attachment:")),
    );
    expect(tail).toHaveLength(4);
    expect(tail.map((p) => p.keepNext)).toEqual([true, true, true, false]);
  });
  test("an oversized semantic tail remains splittable instead of moving a giant keep group", () => {
    const part = buildDossierDocModel(prismFixture("none")).letter;
    const closing = part.blocks.find((b) => b.id === "letter.closing") as Paragraph;
    closing.runs[0].text = "Lange editierbare Schlussbemerkung. ".repeat(1000);
    const signature = part.blocks.find((b) => b.id === "letter.signature") as Paragraph;
    signature.keepNext = false;
    composeLetterTail(part);
    expect(signature.keepNext).toBe(false);
  });
});
