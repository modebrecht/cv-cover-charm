import { describe, expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { walkBlocks } from "../../src/lib/docx-next/model";
import { graphicCandidateFixture } from "../fixtures/docx-next/graphic-candidate";

/** The saved Web family states without a picture display native editable initials. */
describe("shared opt-in native cover photo placeholder", () => {
  for (const template of ["verlauf", "neon", "freundlich"] as const) {
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
