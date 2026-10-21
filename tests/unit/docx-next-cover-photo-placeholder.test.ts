import { describe, expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { walkBlocks } from "../../src/lib/docx-next/model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { paintPng } from "../../src/lib/docx-next/artwork";
import { graphicCandidateFixture } from "../fixtures/docx-next/graphic-candidate";
import { validateDossierDocModel } from "../../src/lib/docx-next/validation";

/** The saved Web family states without a picture display native editable initials. */
describe("shared opt-in native cover photo placeholder", () => {
  for (const template of ["verlauf", "neon", "freundlich"] as const) {
    test(template + " keeps round paint separate from editable initials", async () => {
      const input = graphicCandidateFixture(template);
      const model = buildDossierDocModel(input);
      const paint = [
        ...model.cover.blocks,
        ...(model.cover.headerShapes ?? []),
      ].find((block) => block.id === "cover.photo.placeholder-paint");
      expect(paint).toMatchObject({
        kind: "decorative-shape",
        shape: "circle",
        widthMm: template === "verlauf" ? 54 : template === "neon" ? 50 : 60,
        heightMm: template === "verlauf" ? 54 : template === "neon" ? 50 : 60,
      });
      const holder = walkBlocks(model.cover.blocks).find(
        (block) => block.id === "cover.photo",
      );
      expect(holder).toMatchObject({
        kind: "table",
        decoration: { borderWidthMm: 0 },
      });
      if (holder?.kind !== "table") throw Error("No editable initials table");
      expect(holder.decoration?.fillColor).toBeUndefined();
      const bytes = new Uint8Array(await (await renderDossierDocx(model, {
        rasterizeDecoration: async () => ({
          bytes: paintPng({ color: "FFFFFF" }),
          widthPx: 1,
          heightPx: 1,
          extension: "png" as const,
          contentType: "image/png" as const,
        }),
      })).arrayBuffer());
      const word = readZipEntries(bytes).find(
        (entry) => entry.name === "word/document.xml",
      )!;
      const xml = new TextDecoder().decode(word.bytes);
      expect(xml).toContain("LM");
      expect(xml).toContain("cover.photo");
      // First-page cover paint is correctly owned by the native header story,
      // not the editable document body. Search package stories, not only document.xml.
      const paintStories = readZipEntries(bytes).filter((entry) =>
        /^word\/cover-header(?:-first)?\.xml$/.test(entry.name));
      expect(paintStories.some((entry) =>
        new TextDecoder().decode(entry.bytes).includes(
          'name="cover.photo.placeholder-paint"',
        ))).toBe(true);
    });

    test(template + " preserves no-photo initials as editable native text", () => {
      const input = graphicCandidateFixture(template);
      const source = structuredClone(input);
      expect(input.cover.data.foto).toBeFalsy();
      const model = buildDossierDocModel(input);
      const blocks = walkBlocks(model.cover.blocks);
      const holder = blocks.find((block) => block.id === "cover.photo");
      expect(holder).toMatchObject({ kind: "table" });
      const actual = blocks.find((block) => block.id === "cover.photo.initials");
      expect(actual?.kind).toBe("paragraph");
      if (actual?.kind !== "paragraph") throw Error("Missing editable initials paragraph");
      expect(actual.runs.map((run) => run.text).join("")).toBe("LM");
      expect(actual.runs.every((run) => run.fieldId === "cover.photo.initials")).toBe(true);
      expect(model.letter).toEqual(buildDossierDocModel(source).letter);
      expect(model.cv).toEqual(buildDossierDocModel(source).cv);
      expect(input).toEqual(source);
    });
    test(template + " uses the user's uploaded photo without duplicating initials", () => {
      const input = graphicCandidateFixture(template);
      input.cover.data.foto = "synthetic-photo-data";
      const model = buildDossierDocModel(input);
      const blocks = walkBlocks(model.cover.blocks);
      expect(blocks.find((block) => block.id === "cover.photo")).toMatchObject({
        kind: "image",
        source: "synthetic-photo-data",
      });
      expect(blocks.find((block) => block.id === "cover.photo.initials")).toBeUndefined();
    });
    test(template + " keeps manually relative-positioned initials safe", () => {
      const input = graphicCandidateFixture(template);
      const block = input.cover.blocks.find((item) => item.id === "foto")!;
      block.style.follows = "name";
      const model = buildDossierDocModel(input);
      expect(model.cover.blocks.find(
        (item) => item.id === "cover.photo.placeholder-paint",
      )).toBeUndefined();
      const holder = walkBlocks(model.cover.blocks).find(
        (item) => item.id === "cover.photo",
      );
      expect(holder).toMatchObject({ kind: "table" });
      if (holder?.kind !== "table") throw Error("No fallback table");
      expect(holder.decoration?.borderWidthMm).toBeGreaterThan(0);
    });
    test(template + " does not resurrect an explicitly hidden photo placeholder", () => {
      const input = graphicCandidateFixture(template);
      input.cover.blocks.find((block) => block.id === "foto")!.style.hidden = true;
      const model = buildDossierDocModel(input);
      expect(walkBlocks(model.cover.blocks).some((block) => block.id === "cover.photo")).toBe(false);
    });
  }
  test("other templates retain their previously photo-free model semantics", () => {
    const original = graphicCandidateFixture("klassisch");
    const model = buildDossierDocModel(original);
    expect(walkBlocks(model.cover.blocks).some((block) => block.id === "cover.photo")).toBe(false);
  });
});


/** The DrawingML avatar rendered invisible in Writer; never revive that candidate. */
describe("rejected DrawingML avatar candidate", () => {
  for (const template of ["verlauf", "neon", "freundlich"] as const) {
    test(template + " rejects the obsolete single-owner experiment", () => {
      expect(() => buildDossierDocModel(graphicCandidateFixture(template), {
        nativeAvatarComposition: "single-owner" as never,
      })).toThrow("requires an approved no-photo flow family");
    });
  }
});

describe("guarded Writer-compatible VML avatar candidate", () => {
  for (const template of ["verlauf", "neon", "freundlich"] as const) {
    test(template + " produces one editable circle with a vertically centered native table", async () => {
      const input = graphicCandidateFixture(template);
      const previous = structuredClone(input);
      const normal = buildDossierDocModel(input);
      const diagnostic = buildDossierDocModel(input, {
        nativeAvatarComposition: "writer-vml",
      });
      const owner = diagnostic.cover.blocks.find(
        (block) => block.id === "cover.photo.native-avatar",
      );
      expect(owner?.kind).toBe("paragraph-frame");
      if (owner?.kind !== "paragraph-frame") throw Error("Missing VML diagnostic owner");
      expect(owner.surface).toMatchObject({
        diagnosticShapeFormat: "legacy-vml",
        verticalAlign: "center",
      });
      expect(diagnostic.cover.blocks.some((block) =>
        block.id === "cover.photo.placeholder-paint")).toBe(false);
      expect(diagnostic.letter).toEqual(normal.letter);
      expect(diagnostic.cv).toEqual(normal.cv);
      expect(input).toEqual(previous);
      validateDossierDocModel(diagnostic);
      await expect(renderDossierDocx(diagnostic)).rejects.toThrow(
        "paragraph frame pagination is unaccepted",
      );
      const bytes = new Uint8Array(await (await renderDossierDocx(diagnostic, {
        allowUnacceptedModelIssues: true,
        rasterizeDecoration: async () => ({
          bytes: paintPng({ color: "FFFFFF" }),
          widthPx: 1, heightPx: 1,
          extension: "png" as const, contentType: "image/png" as const,
        }),
      })).arrayBuffer());
      const xml = new TextDecoder().decode(readZipEntries(bytes).find(
        (entry) => entry.name === "word/document.xml",
      )!.bytes);
      expect(xml).toContain('<w:pict><v:oval');
      expect(xml).toContain('id="cover.photo.native-avatar-');
      expect(xml).toContain('<w:txbxContent><w:tbl>');
      expect(xml).toContain('<w:vAlign w:val="center"/>');
      expect(xml).toContain('cover.photo.initials');
      expect(xml).toContain('<w:t xml:space="preserve">LM</w:t>');
      expect(xml).not.toContain('name="cover.photo.placeholder-paint"');
      expect(xml).not.toContain('name="cover.photo.native-avatar"');
    });
  }
  test("VML trial stays gated on explicit option and safe source geometry", () => {
    const original = graphicCandidateFixture("freundlich");
    expect(walkBlocks(buildDossierDocModel(original).cover.blocks)
      .some((block) => block.id === "cover.photo.native-avatar")).toBe(false);
    original.cover.blocks.find((block) => block.id === "foto")!.style.above = "name";
    expect(() => buildDossierDocModel(original, {
      nativeAvatarComposition: "writer-vml",
    })).toThrow("requires an opaque, unanchored round source");
  });
});
