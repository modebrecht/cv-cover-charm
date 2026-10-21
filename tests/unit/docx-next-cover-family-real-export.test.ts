import { describe, expect, test } from "bun:test";
import { buildFullCoverFamilyQaModel } from "../../src/lib/cover-family-docx-next-export";
import { walkBlocks } from "../../src/lib/docx-next/model";
import { graphicCandidateFixture } from "../fixtures/docx-next/graphic-candidate";

describe("full saved-family native DOCX QA model", () => {
  for (const family of ["verlauf", "neon", "freundlich"] as const) {
    test(family + " preserves all three documents with one editable native cover avatar", () => {
      const snapshot = graphicCandidateFixture(family);
      const before = structuredClone(snapshot);
      const model = buildFullCoverFamilyQaModel(snapshot);
      expect(model.templateId).toBe(family);
      expect(model.issues).toEqual([]);
      expect(model.cover.blocks.find((block) =>
        block.id === "cover.photo.native-avatar")).toMatchObject({
          kind: "paragraph-frame",
          surface: { diagnosticShapeFormat: "legacy-vml" },
        });
      expect(walkBlocks(model.cover.blocks).filter((block) =>
        block.id === "cover.photo.native-avatar")).toHaveLength(1);
      expect(model.letter.blocks.length).toBeGreaterThan(0);
      expect(model.cv.blocks.length).toBeGreaterThan(0);
      expect(snapshot).toEqual(before);
    });
    test(family + " retains uploaded photo without initials", () => {
      const snapshot = graphicCandidateFixture(family);
      snapshot.cover.data.foto = "synthetic-photo-data";
      const model = buildFullCoverFamilyQaModel(snapshot);
      expect(walkBlocks(model.cover.blocks).some((block) =>
        block.id === "cover.photo.native-avatar")).toBe(false);
      const picture = walkBlocks(model.cover.blocks).find((block) =>
        block.id === "cover.photo");
      const photo = snapshot.cover.blocks.find((block) => block.id === "foto")!;
      expect(picture).toMatchObject({
        kind: "image",
        placement: "free",
        coordinateOrigin: "page",
        wrapMode: "none",
        xMm: photo.style.x,
        yMm: photo.style.y,
        widthMm: photo.style.w,
        frame: {
          radiusMm: photo.style.radius,
          zoom: photo.style.imgZoom ?? 1,
          xPct: photo.style.imgX ?? 50,
          yPct: photo.style.imgY ?? 50,
        },
      });
      expect(walkBlocks(model.cover.blocks).find((block) =>
        block.id === "cover.photo.source-slot")).toMatchObject({
          kind: "spacer",
          heightMm: photo.style.w * (photo.style.ratio ?? 1),
        });
      expect(walkBlocks(model.cover.blocks).filter((block) =>
        block.id === "cover.photo")).toHaveLength(1);
    });
  }
  test("an authored photo with a relative anchor is never guessed", () => {
    const snapshot = graphicCandidateFixture("neon");
    snapshot.cover.data.foto = "synthetic-photo-data";
    snapshot.cover.blocks.find((block) => block.id === "foto")!.style.follows = "name";
    expect(() => buildFullCoverFamilyQaModel(snapshot)).toThrow(
      "requires safe absolute page coordinates",
    );
  });
  test("out-of-page authored photo is refused, not silently clamped", () => {
    const snapshot = graphicCandidateFixture("freundlich");
    snapshot.cover.data.foto = "synthetic-photo-data";
    snapshot.cover.blocks.find((block) => block.id === "foto")!.style.x = 180;
    expect(() => buildFullCoverFamilyQaModel(snapshot)).toThrow(
      "requires safe absolute page coordinates",
    );
  });
  test("rejects unsupported family or mismatched dossier templates", () => {
    expect(() => buildFullCoverFamilyQaModel(graphicCandidateFixture("klassisch")))
      .toThrow("dieselbe geprüfte Vorlage");
    const snapshot = graphicCandidateFixture("verlauf");
    snapshot.letter.design.template = "neon";
    expect(() => buildFullCoverFamilyQaModel(snapshot))
      .toThrow("dieselbe geprüfte Vorlage");
  });
});
