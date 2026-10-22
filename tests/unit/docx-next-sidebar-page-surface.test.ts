import { expect, test } from "bun:test";
import { sidebarFixture } from "../fixtures/docx-next/sidebar";
import { briefFixture } from "../fixtures/docx-next/brief";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { readZipEntries } from "../../src/lib/docx-next/zip";
const options = { cvSidebarComposition: "body-stories" as const };
const surface = (model: ReturnType<typeof buildDossierDocModel>) =>
  model.cv.artwork.find((p) => p.id === "cv.artwork.sidebar-surface")!;

test("page rail reaches both vertical edges independently of content length and physical side", () => {
  for (const kind of ["minimal", "left", "right", "both-long", "narrow", "wide"] as const) {
    const input = sidebarFixture(kind),
      before = structuredClone(input);
    for (const side of ["left", "right"] as const) {
      input.settings.sidebarSide = side;
      const expected = structuredClone(input),
        model = buildDossierDocModel(input, options),
        paint = surface(model);
      expect(input).toEqual(expected);
      expect(paint.yMm).toBe(0);
      expect(paint.heightMm).toBe(model.cv.page.heightMm);
      expect(paint.semanticText).toBe(false);
      expect(paint.repeat).toBeUndefined();
      if (side === "left") expect(paint.xMm).toBe(0);
      else expect(paint.xMm + paint.widthMm).toBeCloseTo(model.cv.page.widthMm, 10);
      const edge = model.cv.artwork.find((p) => p.id === "cv.artwork.sidebar-edge")!;
      expect(edge.yMm).toBe(0);
      expect(edge.heightMm).toBe(paint.heightMm);
      expect(edge.xMm + 0.125).toBeCloseTo(side === "left" ? paint.widthMm : paint.xMm, 10);
      const restored = buildDossierDocModel(JSON.parse(JSON.stringify(input)), options);
      expect(restored).toEqual(model);
    }
    input.settings.sidebarSide = before.settings.sidebarSide;
    expect(input).toEqual(before);
  }
});

test("page paint respects custom margins and tint, and is absent in hidden-paint and classic layouts", () => {
  const input = sidebarFixture("left");
  input.settings.margins = { cv: { top: 31, bottom: 27, left: 23, right: 17 } };
  const left = buildDossierDocModel(input, options);
  input.settings.sidebarSide = "right";
  const right = buildDossierDocModel(input, options);
  const table = right.cv.blocks.find((p) => p.kind === "table")!;
  expect(surface(right).fill.color).toBe(
    table.kind === "table" ? table.rows[0].cellDecorations![2]!.fillColor : "",
  );
  expect(surface(left).widthMm - surface(right).widthMm).toBeCloseTo(6, 8);
  expect(surface(buildDossierDocModel(sidebarFixture("hidden-paint"), options))).toBeUndefined();
  const classic = buildDossierDocModel(briefFixture());
  expect(classic.cv.artwork.some((p) => p.id.startsWith("cv.artwork.sidebar-"))).toBe(false);
});

test("every header story carries page-relative background paint without document text or height changes", async () => {
  const input = sidebarFixture("chrome-continuation");
  const model = buildDossierDocModel(input, options),
    old = structuredClone(model);
  old.cv.artwork = old.cv.artwork.filter((p) => !p.id.startsWith("cv.artwork.sidebar-"));
  const renderOptions = { allowUnacceptedModelIssues: true };
  const fresh = readZipEntries(
    new Uint8Array(await (await renderDossierDocx(model, renderOptions)).arrayBuffer()),
  );
  const previous = readZipEntries(
    new Uint8Array(await (await renderDossierDocx(old, renderOptions)).arrayBuffer()),
  );
  const decode = (files: typeof fresh, name: string) =>
    new TextDecoder().decode(files.find((p) => p.name === name)!.bytes);
  expect(decode(fresh, "word/document.xml")).toBe(decode(previous, "word/document.xml"));
  for (const name of ["word/cv-header.xml", "word/cv-header-first.xml"]) {
    const xml = decode(fresh, name);
    expect(xml).toContain("cv.artwork.sidebar-surface");
    expect(xml).toContain("cv.artwork.sidebar-edge");
    expect(xml).toContain('relativeFrom="page"');
    expect(xml).toContain('behindDoc="1"');
    expect(xml).not.toContain('<w:tag w:val="cv.artwork.sidebar-');
  }
  expect(model.cv.blocks).toEqual(old.cv.blocks);
  expect(model.cv.page).toEqual(old.cv.page);
  expect(model.cover).toEqual(old.cover);
  expect(model.letter).toEqual(old.letter);
});
