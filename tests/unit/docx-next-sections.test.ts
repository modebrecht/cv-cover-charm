import { describe, expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { planPartSections } from "../../src/lib/docx-next/section-plan";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { briefFixture } from "../fixtures/docx-next/brief";
import { DEFAULT_DOSSIER_CHROME_STATE } from "../../src/lib/dossier-chrome";
describe("native flowing columns and physical section ownership", () => {
  test("deterministic planning keeps the before/column/after content in order", () => {
    const input = briefFixture();
    input.letter.data.richTextHtml =
      '<div>Before</div><div data-columns="2"><strong>Native flow</strong></div><div>After</div>';
    const part = buildDossierDocModel(input).letter;
    const plan = planPartSections(part);
    expect(plan.map((segment) => segment.columns.count)).toEqual([1, 2, 1]);
    expect(plan.map((segment) => segment.breakBefore)).toEqual([
      "nextPage",
      "continuous",
      "continuous",
    ]);
    expect(plan.map((segment) => segment.logicalStart)).toEqual([true, false, false]);
    expect(planPartSections(structuredClone(part))).toEqual(plan);
  });
  test("native column definitions reset before the CV, with one header/footer package per logical part", async () => {
    const input = briefFixture();
    input.letter.data.richTextHtml = '<div data-columns="3">Native editable content</div>';
    const blob = await renderDossierDocx(buildDossierDocModel(input));
    const parts = readZipEntries(new Uint8Array(await blob.arrayBuffer()));
    const doc = new TextDecoder().decode(parts.find((p) => p.name === "word/document.xml")!.bytes);
    expect(doc.match(/<w:sectPr>/g)).toHaveLength(5);
    expect(doc).toContain('w:num="3"');
    expect(doc).toContain('w:val="continuous"');
    // CV contact/reference tables are independent of the native letter columns.
    const letterStart = doc.indexOf('w:tag w:val="letter.sender.');
    const cvStart = doc.indexOf('w:tag w:val="cv.documentTitle"');
    expect(letterStart).toBeGreaterThan(0);
    expect(cvStart).toBeGreaterThan(letterStart);
    expect(doc.slice(letterStart, cvStart)).not.toContain("<w:tbl>");
    expect(
      parts.filter((p) => /^word\/(?:cover|letter|cv)-(?:header|footer)\.xml$/.test(p.name)),
    ).toHaveLength(6);
    expect(doc.slice(doc.lastIndexOf("<w:sectPr>"))).toContain('w:num="1"');
  });
  test("nested/table-cell column sections fail rather than producing invalid Word sections", () => {
    const input = briefFixture();
    input.letter.data.richTextHtml =
      '<table><tbody><tr><td><div data-columns="2">Invalid cell flow</div></td></tr></tbody></table>';
    expect(() => planPartSections(buildDossierDocModel(input).letter)).toThrow("outside tables");
    input.letter.data.richTextHtml =
      '<div data-columns="2"><div data-columns="3">Invalid nesting</div></div>';
    expect(() => planPartSections(buildDossierDocModel(input).letter)).toThrow(
      "Nested column flow",
    );
  });
  test("alternating flow restores normal width and owns first-page chrome once per dossier part", async () => {
    const input = briefFixture();
    input.letter.data.richTextHtml =
      '<div data-columns="2">Two</div><div>Between</div><div data-columns="3">Three</div>';
    input.settings.chrome = structuredClone(DEFAULT_DOSSIER_CHROME_STATE);
    input.settings.chrome.shared.headerMode = "contact";
    input.settings.chrome.shared.headerDifferentFirstPage = true;
    input.settings.chrome.shared.headerContinuationMode = "compact";
    const model = buildDossierDocModel(input);
    expect(planPartSections(model.letter).map((segment) => segment.columns.count)).toEqual([
      1, 2, 1, 3, 1,
    ]);
    const parts = readZipEntries(
      new Uint8Array(await (await renderDossierDocx(model)).arrayBuffer()),
    );
    const doc = new TextDecoder().decode(
      parts.find((part) => part.name === "word/document.xml")!.bytes,
    );
    const sections = [...doc.matchAll(/<w:sectPr>(.*?)<\/w:sectPr>/g)].map((match) => match[1]);
    expect(sections).toHaveLength(7);
    expect(
      sections
        .slice(2, 6)
        .every(
          (section) => !section.includes("<w:titlePg/>") && !section.includes('w:type="first"'),
        ),
    ).toBe(true);
    expect(sections[1]).toContain('r:id="letter-header-first"');
    expect(sections[6]).toContain('r:id="cv-header-first"');
    expect(parts.filter((part) => part.name.endsWith("header-first.xml"))).toHaveLength(2);
  });
  test("unsafe column geometry is rejected before a package is returned", async () => {
    const input = briefFixture();
    input.letter.data.richTextHtml = '<div data-columns="3">Native content</div>';
    const model = buildDossierDocModel(input);
    const flow = model.letter.blocks.find((block) => block.kind === "column-flow");
    if (!flow || flow.kind !== "column-flow") throw new Error("Missing fixture column block");
    flow.gapMm = 100;
    await expect(renderDossierDocx(model)).rejects.toThrow("invalid column geometry");
  });
});
