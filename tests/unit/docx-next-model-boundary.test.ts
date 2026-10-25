import { describe, expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { walkBlocks, type DocumentPart } from "../../src/lib/docx-next/model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { validateDossierDocModel } from "../../src/lib/docx-next/validation";
import { NEXT_TEMPLATES } from "../../src/lib/docx-next/templates";
import { paintPng } from "../../src/lib/docx-next/artwork";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { briefFixture, briefElementsFixture } from "../fixtures/docx-next/brief";
import { graphicCandidateFixture } from "../fixtures/docx-next/graphic-candidate";
import { coverTemplateSlots } from "../../src/components/cover/template-slots";
import { TEMPLATES } from "../../src/components/cover/types";

function freeze(value: unknown): void {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return;
  Object.values(value).forEach(freeze);
  Object.freeze(value);
}

function objects(value: unknown, found = new Set<object>()): Set<object> {
  if (value && typeof value === "object" && !found.has(value)) {
    found.add(value);
    Object.values(value).forEach((child) => objects(child, found));
  }
  return found;
}

function partBlocks(part: DocumentPart) {
  return walkBlocks([
    ...part.blocks,
    ...part.header,
    ...(part.firstHeader ?? []),
    ...part.footer,
    ...(part.firstFooter ?? []),
  ]);
}

describe("Item 11 canonical model boundary", () => {
  test("construction needs no browser state, clock, randomness or Word package", () => {
    // A separate process keeps the poisoned ambient dependencies out of other tests.
    const result = Bun.spawnSync({
      cmd: [
        process.execPath,
        "-e",
        `import { mock } from "bun:test";
         import { briefFixture } from "./tests/fixtures/docx-next/brief.ts";
         const input = briefFixture("long-cv");
         const before = JSON.stringify(input);
         const fail = () => { throw new Error("ambient/package access during model build"); };
         mock.module("./src/lib/docx-next/package.ts", () => ({ WordPackage: class { constructor() { fail(); } } }));
         for (const key of ["window", "document", "localStorage", "fetch", "Blob"])
           Object.defineProperty(globalThis, key, { configurable: true, get: fail });
         Date.now = fail;
         Math.random = fail;
         const { buildDossierDocModel } = await import("./src/lib/docx-next/build-model.ts");
         const first = JSON.stringify(buildDossierDocModel(input));
         if (first !== JSON.stringify(buildDossierDocModel(structuredClone(input)))) throw new Error("nondeterministic model");
         if (before !== JSON.stringify(input)) throw new Error("mutated source");`,
      ],
      cwd: process.cwd(),
    });
    expect(new TextDecoder().decode(result.stderr)).toBe("");
    expect(result.exitCode).toBe(0);
  });

  test("models own nested motif data independently of templates and other builds", () => {
    for (const template of ["cove", "glow"]) {
      const input = graphicCandidateFixture(template, "none");
      const first = buildDossierDocModel(input);
      const second = buildDossierDocModel(input);
      const firstShapes = [first.cover, first.letter, first.cv].flatMap(
        (part) => part.headerShapes ?? [],
      );
      const secondShapes = [second.cover, second.letter, second.cv].flatMap(
        (part) => part.headerShapes ?? [],
      );
      let checked = 0;
      for (const shape of firstShapes) {
        const other = secondShapes.find((candidate) => candidate.id === shape.id)!;
        if (shape.cornerRadiiMm) {
          expect(shape.cornerRadiiMm).not.toBe(other.cornerRadiiMm);
          // Simulate editing a portable model without changing subsequent builds.
          (shape.cornerRadiiMm as number[])[0] += 1;
          checked++;
        }
        if (shape.fill?.radialFade) {
          expect(shape.fill.radialFade).not.toBe(other.fill?.radialFade);
          shape.fill.radialFade.innerPct += 1;
          checked++;
        }
      }
      expect(checked).toBeGreaterThan(0);
      expect(buildDossierDocModel(input)).toEqual(second);
    }
  });

  test("renderer uses only the detached model after editor state changes", () => {
    const result = Bun.spawnSync({
      cmd: [
        process.execPath,
        "-e",
        `import { briefFixture } from "./tests/fixtures/docx-next/brief.ts";
         import { buildDossierDocModel } from "./src/lib/docx-next/build-model.ts";
         import { renderDossierDocx } from "./src/lib/docx-next/renderer.ts";
         import { readZipEntries } from "./src/lib/docx-next/zip.ts";
         import { paintPng } from "./src/lib/docx-next/artwork.ts";
         const input = briefFixture();
         input.letter.data.betreff = "Captured subject";
         input.letter.data.images = [{ id: "captured", src: "captured-image", side: "left", topMm: 0, widthMm: 20, gapMm: 3 }];
         const model = JSON.parse(JSON.stringify(buildDossierDocModel(input)));
         const before = JSON.stringify(model);
         input.letter.data.betreff = "Changed editor subject";
         input.letter.data.images[0].src = "changed-editor-image";
         for (const key of ["window", "document", "localStorage", "fetch"])
           Object.defineProperty(globalThis, key, { configurable: true, get() { throw new Error("renderer read ambient state"); } });
         const calls = [];
         const blob = await renderDossierDocx(model, { normalizeImage: async (source) => {
           calls.push(source);
           return { bytes: paintPng({ color: "123456" }), widthPx: 1, heightPx: 1, extension: "png", contentType: "image/png" };
         } });
         const document = new TextDecoder().decode(readZipEntries(new Uint8Array(await blob.arrayBuffer())).find(p => p.name === "word/document.xml").bytes);
         if (!document.includes("Captured subject") || document.includes("Changed editor subject")) throw new Error("renderer reread source");
         if (JSON.stringify(calls) !== '["captured-image"]') throw new Error("renderer reread image");
         if (before !== JSON.stringify(model)) throw new Error("renderer mutated model");`,
      ],
      cwd: process.cwd(),
    });
    expect(new TextDecoder().decode(result.stderr)).toBe("");
    expect(result.exitCode).toBe(0);
  });

  test("authored content, stable IDs, styles, layout and images survive the snapshot", () => {
    const input = briefElementsFixture("page-two");
    input.cover.blocks.find((block) => block.id === "name")!.lines = ["Cover authored Éva"];
    input.letter.data.richTextHtml =
      '<div data-align="right"><strong>Letter authored é</strong></div>';
    input.letter.data.images = [
      { id: "authored-image", src: "image-bytes", side: "right", topMm: 12, widthMm: 25, gapMm: 4 },
    ];
    input.settings.fieldStyles = {
      "cover.fullName": { italic: true },
      "cv.entry.schule:continuation.title": { underline: true, color: "123456" },
    };
    const model = buildDossierDocModel(input);
    const find = (part: DocumentPart, id: string) =>
      partBlocks(part).find((block) => block.id === id);
    expect(find(model.cover, "cover.fullName")).toMatchObject({
      runs: [{ fieldId: "cover.fullName", text: "Cover authored Éva", style: { italic: true } }],
    });
    expect(find(model.letter, "letter.body.paragraph:0")).toMatchObject({
      align: "right",
      runs: [{ text: "Letter authored é", style: { bold: true } }],
    });
    expect(find(model.letter, "letter.image:authored-image")).toMatchObject({
      kind: "image",
      source: "image-bytes",
      placement: "right",
      yMm: 12,
      widthMm: 25,
      gapMm: 4,
    });
    expect(find(model.cv, "cv.entry.schule:continuation.title")).toMatchObject({
      runs: [
        {
          fieldId: "cv.entry.schule:continuation.title",
          text: "Zweite CV-Zone",
          style: { underline: true, color: "123456" },
        },
      ],
    });
    expect(find(model.cv, "cv.section.schule")).toMatchObject({ startPage: 2 });
    expect(find(model.cv, "cv.elements.page:2")).toMatchObject({ startPage: 2 });
    expect(find(model.cv, "cv.element:custom-b")).toBeDefined();
  });

  test("active masonry packing is diagnosed without dropping semantic sections", async () => {
    const input = briefFixture("custom-sections");
    input.cv.data.sectionLayouts = {
      "custom:custom-0": { width: "half", packing: "masonry" },
      "custom:custom-1": { width: "half", packing: "masonry" },
    };
    const model = buildDossierDocModel(input);
    expect(
      model.issues
        .filter((issue) => issue.code === "masonry-section-converted-to-rows")
        .map((issue) => issue.fieldId),
    ).toEqual(["cv.section.custom:custom-0", "cv.section.custom:custom-1"]);
    expect(
      partBlocks(model.cv).filter(
        (block) => block.kind === "section" && block.id.startsWith("cv.section.custom:"),
      ),
    ).toHaveLength(12);
    await expect(renderDossierDocx(model)).rejects.toThrow("unaccepted model issues");
    input.cv.data.sectionLayouts["custom:custom-0"] = { width: "full", packing: "masonry" };
    input.cv.data.hidden.schule = true;
    input.cv.data.sectionLayouts.schule = { width: "half", packing: "masonry" };
    const inactive = buildDossierDocModel(input);
    expect(inactive.issues.some((issue) => issue.fieldId === "cv.section.custom:custom-0")).toBe(
      false,
    );
    expect(inactive.issues.some((issue) => issue.fieldId === "cv.section.schule")).toBe(false);
    input.settings.cvLayout = "minimal";
    expect(buildDossierDocModel(input).issues).toEqual([]);
  });

  test("missing image bytes are model issues; empty optional placeholders remain valid", async () => {
    const input = briefFixture();
    input.letter.data.images = [
      { id: "missing", src: "  ", side: "left", topMm: 0, widthMm: 20, gapMm: 3 },
    ];
    const model = buildDossierDocModel(input);
    expect(model.issues).toContainEqual(
      expect.objectContaining({ code: "missing-image-source", fieldId: "letter.image:missing" }),
    );
    expect(
      partBlocks(model.letter).find((block) => block.id === "letter.image:missing"),
    ).toBeDefined();
    await expect(renderDossierDocx(model)).rejects.toThrow("unaccepted model issues");
    await expect(renderDossierDocx(model, { allowUnacceptedModelIssues: true })).rejects.toThrow(
      "missing image source",
    );
    expect(buildDossierDocModel(briefElementsFixture("empty-disabled")).issues).toEqual([]);
  });

  for (const template of Object.keys(NEXT_TEMPLATES))
    test(`${template}: frozen source → portable model → independent Word package`, async () => {
      const input = graphicCandidateFixture(template, "images", "snapshot-image-bytes");
      expect(coverTemplateSlots(input.cv.design.template).map((slot) => slot.key)).toEqual(
        TEMPLATES.find((definition) => definition.id === template)!.slots.map((slot) => slot.key),
      );
      input.cv.design.useElements = true;
      input.cv.elements = [
        { id: "model-boundary-note", kind: "text", label: "Note", text: "Editable custom element" },
      ];
      const before = JSON.stringify(input);
      freeze(input);
      const model = buildDossierDocModel(input);
      expect(model).toEqual(buildDossierDocModel(JSON.parse(before)));
      expect(JSON.stringify(input)).toBe(before);
      expect(model.issues).toEqual([]);
      const sourceObjects = objects(input);
      expect([...objects(model)].some((object) => sourceObjects.has(object))).toBe(false);
      validateDossierDocModel(model);

      const portable = JSON.parse(JSON.stringify(model));
      freeze(portable);
      // Neither the original editor state nor its source is available to rendering.
      const normalizations: string[] = [];
      const asset = {
        bytes: paintPng({ color: "123456" }),
        widthPx: 1,
        heightPx: 1,
        extension: "png" as const,
        contentType: "image/png" as const,
      };
      const bytes = new Uint8Array(
        await (
          await renderDossierDocx(portable, {
            normalizeImage: async (source) => {
              normalizations.push(source);
              return asset;
            },
            rasterizeDecoration: async () => asset,
          })
        ).arrayBuffer(),
      );
      expect(normalizations).toEqual(["snapshot-image-bytes"]);
      expect(portable).toEqual(JSON.parse(JSON.stringify(model)));
      const entries = readZipEntries(bytes);
      const document = new TextDecoder().decode(
        entries.find((entry) => entry.name === "word/document.xml")!.bytes,
      );
      expect(document).toContain('w:tag w:val="letter.subject"');
      expect(document).toContain('w:tag w:val="cv.person.name"');
      expect(document).toContain('w:val="cv.element:model-boundary-note"');
      expect(document).toContain("<w:sectPr>");
      expect(entries.some((entry) => entry.name.startsWith("word/media/"))).toBe(true);
    });
});
