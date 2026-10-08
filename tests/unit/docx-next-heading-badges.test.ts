import { expect, test } from "bun:test";
import { resolveCvRubricOptions } from "../../src/components/cv/citrus-rubric";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { walkBlocks, type SectionBlock } from "../../src/lib/docx-next/model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { NEXT_TEMPLATES } from "../../src/lib/docx-next/templates";
import { briefFixture, briefVariantFixture } from "../fixtures/docx-next/brief";
import { headingBadgeModel } from "../fixtures/docx-next/heading-badges";

test("saved current and historic badge choices override declarative defaults, including false", () => {
  for (const fallback of [false, true]) {
    const design = briefFixture().cv.design;
    delete design.sectionTitlePill;
    delete design.citrusRubricPill;
    expect(resolveCvRubricOptions(design, fallback).pill).toBe(fallback);
    design.citrusRubricPill = !fallback;
    expect(resolveCvRubricOptions(design, fallback).pill).toBe(!fallback);
    design.sectionTitlePill = fallback;
    expect(resolveCvRubricOptions(design, !fallback).pill).toBe(fallback);
  }
  const design = briefFixture().cv.design;
  delete design.sectionTitlePill;
  delete design.citrusRubricPill;
  expect(resolveCvRubricOptions(design).pill).toBe(false);
});

test("template defaults shade editable semantic headings without changing layout, fields or input", async () => {
  for (const variant of ["classic", "timeline", "editorial"] as const) {
    const input = variant === "classic" ? briefFixture() : briefVariantFixture(`${variant}-short`);
    delete input.cv.design.sectionTitlePill;
    delete input.cv.design.citrusRubricPill;
    const before = JSON.stringify(input),
      registry = Object.keys(NEXT_TEMPLATES);
    const enabled = headingBadgeModel(input, true),
      disabled = headingBadgeModel(input, false);
    expect(enabled.issues).toEqual([]);
    expect(JSON.stringify(input)).toBe(before);
    expect(Object.keys(NEXT_TEMPLATES)).toEqual(registry);
    expect(enabled).toEqual(headingBadgeModel(JSON.parse(before), true));
    const sections = walkBlocks(enabled.cv.blocks).filter(
      (b) => b.kind === "section",
    ) as SectionBlock[];
    expect(sections.length).toBeGreaterThan(0);
    expect(
      sections.every((s) =>
        s.heading?.runs.every((r) => /^[0-9A-F]{6}$/.test(r.style.backgroundColor ?? "")),
      ),
    ).toBe(true);
    for (const block of walkBlocks(enabled.cv.blocks))
      if (block.kind === "paragraph")
        for (const run of block.runs) delete run.style.backgroundColor;
    expect(enabled).toEqual(disabled);
  }
  const input = briefFixture();
  input.settings.fieldStyles = { "cv.section.person.heading": { italic: true, color: "123456" } };
  const model = headingBadgeModel(input, true);
  const bytes = new Uint8Array(await (await renderDossierDocx(model)).arrayBuffer());
  const xml = new TextDecoder().decode(
    readZipEntries(bytes).find((e) => e.name === "word/document.xml")!.bytes,
  );
  expect(xml).toContain('w:val="cv.section.person.heading"');
  expect(xml).toContain('w:shd w:val="clear"');
  expect(xml).toContain('<w:color w:val="123456"/>');
  expect(xml).toContain('<w:i w:val="1"/>');
});

test("explicit saved off and legacy off both suppress a template badge default", () => {
  for (const flag of ["sectionTitlePill", "citrusRubricPill"] as const) {
    const input = briefFixture();
    delete input.cv.design.sectionTitlePill;
    delete input.cv.design.citrusRubricPill;
    input.cv.design[flag] = false;
    const model = headingBadgeModel(input, true);
    expect(
      walkBlocks(model.cv.blocks)
        .filter((b) => b.kind === "paragraph")
        .every((p) => p.runs.every((r) => !r.style.backgroundColor)),
    ).toBe(true);
  }
  expect(NEXT_TEMPLATES.brief.cv.headingBadge).toBeUndefined();
  expect(buildDossierDocModel(briefFixture()).issues).toEqual([]);
});
