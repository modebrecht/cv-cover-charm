import { describe, expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { validateDossierDocModel } from "../../src/lib/docx-next/validation";
import { walkBlocks } from "../../src/lib/docx-next/model";
import { nextTemplate } from "../../src/lib/docx-next/templates";
import { GRAPHIC_FIXTURES, graphicCandidateFixture } from "../fixtures/docx-next/graphic-candidate";

describe("Aurora approved flowing solid hero adaptation", () => {
  test("complete stress models and semantic title survive portable restoration", () => {
    for (const kind of [
      ...GRAPHIC_FIXTURES,
      "cover-long",
      "contact-long",
      "hero-long",
      "title-long",
      "title-pages",
    ] as const) {
      const input = graphicCandidateFixture("aurora", kind);
      const model = buildDossierDocModel(input);
      validateDossierDocModel(model);
      expect(model.issues).toEqual([]);
      expect(model).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input))));
      const blocks = walkBlocks(model.cover.blocks);
      const title = blocks.find((b) => b.id === "cover.profession");
      expect(title?.kind).toBe("paragraph");
      if (title?.kind === "paragraph" && kind === "title-pages") {
        expect(title.runs.map((r) => r.text).join("")).toContain("Berufszeile 36:");
      }
      const hero = blocks.find((b) => b.id === "cover.composition.row:1");
      expect(hero).toMatchObject({
        kind: "table",
        rows: [{ keepTogether: false }],
        decoration: { fillColor: input.cover.colors.primary.replace("#", "").toUpperCase() },
      });
      expect(blocks.some((b) => b.kind === "table" && b.id.endsWith("cell:0.surface"))).toBe(true);
    }
  });
  test("source photo and explicit semantic style keep precedence", () => {
    const input = graphicCandidateFixture("aurora", "images", "data:image/png;base64/test");
    input.settings.fieldStyles = {
      "cover.profession": { font: "Georgia", color: "112233", fontSizePt: 18 },
    };
    const blocks = walkBlocks(buildDossierDocModel(input).cover.blocks);
    expect(blocks.find((b) => b.id === "cover.photo")).toMatchObject({
      kind: "image",
      frame: { radiusMm: 999 },
    });
    const title = blocks.find((b) => b.id === "cover.profession");
    expect(title?.kind === "paragraph" && title.runs[0].style).toMatchObject({
      font: "Georgia",
      color: "112233",
    });
  });
  test("gradient is a finite banner and name uses flow rather than absolute compensation", () => {
    const descriptor = nextTemplate("aurora");
    expect(descriptor.cover.motifs?.[0].heightMm).toBe(32);
    expect(descriptor.cover.fieldSpaceBeforeMm?.name).toBe(8);
    expect(descriptor.cover.rows?.[1].fillSlot).toBe("primary");
  });
});
