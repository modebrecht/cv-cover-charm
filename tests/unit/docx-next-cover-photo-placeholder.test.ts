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
      const paint = model.cover.blocks.find(
        (block) => block.id === "cover.photo.placeholder-paint",
      );
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
      // Artwork and native editable text must not be flattened together.
      expect(xml).toContain('name="cover.photo.placeholder-paint"');
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


describe("single-owner native avatar experiment (never the default export)", () => {
  for (const template of ["verlauf", "neon", "freundlich"] as const) {
    test(template + " holds editable initials inside the same rounded Word shape", async () => {
      const input = graphicCandidateFixture(template);
      const untouched = structuredClone(input);
      const standard = buildDossierDocModel(input);
      const trial = buildDossierDocModel(input, { nativeAvatarComposition: "single-owner" });
      const photo = input.cover.blocks.find((block) => block.id === "foto")!;
      expect(trial.cover.blocks.find((block) => block.id === "cover.photo.native-avatar")).toMatchObject({
        kind: "paragraph-frame",
        xMm: photo.style.x,
        yMm: photo.style.y,
        widthMm: photo.style.w,
        surface: {
          heightMm: photo.style.w * (photo.style.ratio ?? 1),
          radiusMm: photo.style.w / 2,
          borderColor: expect.any(String),
          verticalAlign: "center",
        },
      });
      expect(trial.cover.blocks.some((node) =>
        node.id === "cover.photo.placeholder-paint")).toBe(false);
      expect(walkBlocks(trial.cover.blocks).find((node) =>
        node.id === "cover.photo")).toMatchObject({ kind: "spacer" });
      expect(walkBlocks(trial.cover.blocks).some((node) =>
        node.kind === "table" && node.id === "cover.photo")).toBe(false);
      expect(input).toEqual(untouched);
      expect(trial.letter).toEqual(standard.letter);
      expect(trial.cv).toEqual(standard.cv);
      validateDossierDocModel(trial);
      await expect(renderDossierDocx(trial)).rejects.toThrow(
        "paragraph frame pagination is unaccepted",
      );
      const bytes = new Uint8Array(await (await renderDossierDocx(trial, {
        allowUnacceptedModelIssues: true,
        rasterizeDecoration: async () => ({
          bytes: paintPng({ color: "FFFFFF" }), widthPx: 1, heightPx: 1,
          extension: "png" as const, contentType: "image/png" as const,
        }),
      })).arrayBuffer());
      const xml = new TextDecoder().decode(readZipEntries(bytes).find(
        (entry) => entry.name === "word/document.xml",
      )!.bytes);
      expect(xml).toContain('name="cover.photo.native-avatar"');
      expect(xml).toContain("<wps:txbx><w:txbxContent>");
      expect(xml).toContain('anchor="ctr"');
      expect(xml).toContain("<a:arcTo");
      expect(xml).toContain('<w:t xml:space="preserve">LM</w:t>');
      expect(xml).not.toContain('name="cover.photo.placeholder-paint"');
    });
  }
  test("gates unrelated templates, uploaded photos and relative photo anchors", () => {
    expect(() => buildDossierDocModel(graphicCandidateFixture("klassisch"), {
      nativeAvatarComposition: "single-owner",
    })).toThrow("requires an approved no-photo flow family");
    const photo = graphicCandidateFixture("neon");
    photo.cover.data.foto = "synthetic-photo";
    expect(() => buildDossierDocModel(photo, {
      nativeAvatarComposition: "single-owner",
    })).toThrow("requires an approved no-photo flow family");
    const moved = graphicCandidateFixture("verlauf");
    moved.cover.blocks.find((block) => block.id === "foto")!.style.follows = "name";
    expect(() => buildDossierDocModel(moved, {
      nativeAvatarComposition: "single-owner",
    })).toThrow("requires an opaque, unanchored round source");
  });
});
