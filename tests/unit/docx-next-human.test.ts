import { describe, test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { walkBlocks, type Paragraph } from "../../src/lib/docx-next/model";
import { composePageMotifs } from "../../src/lib/docx-next/template-motifs";
import { paintPng } from "../../src/lib/docx-next/artwork";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { HUMAN } from "../../src/lib/docx-next/templates";
import { HUMAN_FIXTURES, humanFixture } from "../fixtures/docx-next/human";

describe("Human native candidate and shared page paint", () => {
  test("all scenarios retain semantic identities and deterministic portable data", () => {
    for (const kind of HUMAN_FIXTURES) {
      const input = humanFixture(kind);
      const model = buildDossierDocModel(input);
      expect(model.issues).toEqual([]);
      expect(model).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input))));
      expect(model.templateId).toBe("human");
      expect(walkBlocks(model.cover.blocks).some((b) => b.id === "cover.fullName")).toBe(true);
    }
  });
  test("photo-left hero preserves native image crop and independently styled profession", () => {
    const input = humanFixture("images", "data:image/png;base64,test");
    input.settings.fieldStyles = { "cover.profession": { color: "123456", italic: true } };
    const model = buildDossierDocModel(input);
    const hero = model.cover.blocks.find((b) => b.id === "cover.composition.row:1");
    if (hero?.kind !== "table") throw new Error("Missing native Human hero");
    expect(hero.widths).toEqual([0.35, 0.65]);
    expect(hero.rows[0].cells[0][0]).toMatchObject({
      kind: "image",
      id: "cover.photo",
      align: "left",
      widthMm: 46,
      frame: { heightRatio: 1, radiusMm: 999 },
    });
    const profession = hero.rows[0].cells[1].find((b) => b.id === "cover.profession") as Paragraph;
    expect(profession.runs[0].style).toMatchObject({ color: "123456", italic: true });
  });
  test("quiet page motifs remain on first/continuation pages when running chrome is disabled", async () => {
    const model = buildDossierDocModel(humanFixture("none"));
    expect(model.letter.headerShapes!.map((s) => s.repeat)).toEqual([
      "first",
      "first",
      "continuation",
      "continuation",
    ]);
    expect(model.cv.headerShapes!.map((s) => s.repeat)).toEqual(["first", "continuation"]);
    expect(model.letter.blocks.some((b) => b.id === "letter.sender.name")).toBe(true);
    const asset = {
      bytes: paintPng({ color: "123456" }),
      widthPx: 1,
      heightPx: 1,
      extension: "png" as const,
      contentType: "image/png" as const,
    };
    const zip = readZipEntries(
      new Uint8Array(
        await (
          await renderDossierDocx(model, { rasterizeDecoration: async () => asset })
        ).arrayBuffer(),
      ),
    );
    const xml = (key: string) => new TextDecoder().decode(zip.find((p) => p.name === key)!.bytes);
    for (const part of ["letter", "cv"]) {
      expect(xml(`word/${part}-header-first.xml`)).toContain("decoration");
      expect(xml(`word/${part}-header.xml`)).toContain("decoration");
    }
    expect(xml("word/document.xml")).not.toContain("txbxContent");
  });
  test("CV motif opacity scales paint independently and zero disables it", () => {
    const input = humanFixture();
    input.cv.design.bgOpacity = 0.5;
    const model = buildDossierDocModel(input);
    expect(model.cv.headerShapes!.map((s) => s.opacity)).toEqual([0.15, 0.15]);
    expect(model.letter.headerShapes![0].opacity).toBe(0.3);
    expect(buildDossierDocModel(humanFixture("no-motifs")).cv.headerShapes).toBeUndefined();
    expect(() => composePageMotifs(model.cv, HUMAN.pageMotifs!.cv!, {}, "111111", NaN)).toThrow(
      "opacity",
    );
  });
  test("shared renderer/model modules remain template-ID-free with no repair chain", () => {
    for (const file of [
      "renderer.ts",
      "build-model.ts",
      "template-motifs.ts",
      "template-composition.ts",
      "cover-composition.ts",
    ]) {
      const source = readFileSync(`src/lib/docx-next/${file}`, "utf8");
      expect(source).not.toMatch(/(?:human|prism|freundlich)["']/i);
      expect(source).not.toMatch(
        /dossier-docx-templates|txbxContent|patchFirstParagraphContaining/,
      );
    }
    expect(JSON.stringify(HUMAN)).not.toContain("<w:");
  });
});
