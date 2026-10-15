import { describe, expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { validateDossierDocModel } from "../../src/lib/docx-next/validation";
import { walkBlocks } from "../../src/lib/docx-next/model";
import { paintPng } from "../../src/lib/docx-next/artwork";
import {
  STRESS_EDGE_CASES,
  stressEdgeExpectedFields,
  stressEdgeFixture,
} from "../fixtures/docx-next/stress-edge";
import {
  checkStressFields,
  freezeStressInput,
  stressPackageParts,
} from "../support/docx-next-stress-edge";

const asset = {
  bytes: paintPng({ color: "123456" }),
  widthPx: 1,
  heightPx: 1,
  extension: "png" as const,
  contentType: "image/png" as const,
};

describe("six combined non-Sidebar stress cases", () => {
  for (const value of STRESS_EDGE_CASES)
    test(`${value.id}: long native flow, photo and first/continuation chrome`, async () => {
      const input = stressEdgeFixture(value, "stress-photo");
      const source = JSON.stringify(input);
      const expected = stressEdgeExpectedFields(input);
      expect(input.cv.data.schule).toHaveLength(66);
      expect(input.letter.data.text.split("\n\n")).toHaveLength(70);
      freezeStressInput(input);
      const model = buildDossierDocModel(input);
      expect(model.issues).toEqual([]);
      validateDossierDocModel(model);
      expect(model.cv.layout).toMatchObject({ mode: "classic", variant: value.layout });
      expect(buildDossierDocModel(structuredClone(input))).toEqual(model);
      expect(buildDossierDocModel(JSON.parse(source))).toEqual(model);
      expect(JSON.stringify(input)).toBe(source);
      const cv = walkBlocks(model.cv.blocks);
      expect(cv.find((block) => block.id === "cv.person.photo")).toMatchObject({
        kind: "image",
        placement: "right",
        coordinateOrigin: "content",
      });
      expect(cv.some((block) => block.kind === "parallel-flow")).toBe(false);
      expect(
        cv.filter(
          (block) => block.id.startsWith("cv.entry.schule:") && block.id.endsWith(".dateRail"),
        ),
      ).toHaveLength(value.layout === "editorial" ? 66 : 0);
      for (const scope of ["letter", "cv"] as const) {
        expect(model[scope].firstHeader).toBeDefined();
        expect(model[scope].firstHeader!.some((paragraph) => paragraph.runs.length)).toBe(true);
        expect(model[scope].header.some((paragraph) => paragraph.runs.length)).toBe(true);
      }
      const portable = JSON.parse(JSON.stringify(model));
      freezeStressInput(model);
      freezeStressInput(portable);
      const normalized: string[] = [];
      const options = {
        normalizeImage: async (source: string) => {
          normalized.push(source);
          return asset;
        },
        rasterizeDecoration: async () => asset,
      };
      const bytes = new Uint8Array(await (await renderDossierDocx(model, options)).arrayBuffer());
      expect(normalized).toEqual(["stress-photo"]);
      const restored = new Uint8Array(
        await (await renderDossierDocx(portable, options)).arrayBuffer(),
      );
      expect(restored).toEqual(bytes);
      const parts = stressPackageParts(bytes);
      const document = parts.get("word/document.xml")!;
      checkStressFields(document, expected);
      for (const id of ["cover.photo", "cv.person.photo", "letter.image:candidate-inline"])
        expect(document).toContain(`name="${id}"`);
      expect(document).not.toContain("<w:txbxContent");
      expect(document).not.toContain("<w:pict");
      for (const [scope, own, other] of [
        ["letter", "BRIEF", "CV"],
        ["cv", "CV", "BRIEF"],
      ] as const) {
        for (const suffix of ["header-first", "header"]) {
          const header = parts.get(`word/${scope}-${suffix}.xml`)!;
          expect(header).toContain(`${own}KOPF`);
          expect(header).not.toContain(`${other}KOPF`);
        }
        const footer = parts.get(`word/${scope}-footer.xml`)!;
        expect(footer).toContain(`${own}FUSS`);
        expect(footer).not.toContain(`${other}FUSS`);
      }
    });

  test("content checks reject a lost final CV field and a changed long-letter field", async () => {
    const input = stressEdgeFixture(STRESS_EDGE_CASES[0], "stress-photo");
    const model = buildDossierDocModel(input);
    const bytes = new Uint8Array(
      await (
        await renderDossierDocx(model, {
          normalizeImage: async () => asset,
          rasterizeDecoration: async () => asset,
        })
      ).arrayBuffer(),
    );
    const document = stressPackageParts(bytes).get("word/document.xml")!;
    const expected = stressEdgeExpectedFields(input);
    checkStressFields(document, expected);
    const lastId = `cv.entry.schule:${input.cv.data.schule.at(-1)!.id}.description`;
    const lastControl = [...document.matchAll(/<w:sdt>([\s\S]*?)<\/w:sdt>/g)].find((match) =>
      match[1].includes(`<w:tag w:val="${lastId}"/>`),
    )![0];
    const missing = document.replace(lastControl, "");
    expect(missing).not.toBe(document);
    expect(() => checkStressFields(missing, expected)).toThrow(lastId);
    expect(() => checkStressFields(document.replace("BRIEFPROBE070", "CHANGED"), expected)).toThrow(
      "letter.body.paragraph:138",
    );
  });
});
