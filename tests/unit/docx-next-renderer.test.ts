import { describe, expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { WordPackage } from "../../src/lib/docx-next/package";
import { imageCache } from "../../src/lib/docx-next/images";
import { BRIEF_FIXTURES, briefFixture } from "../fixtures/docx-next/brief";

const png = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR4nGP4z8Dwn4GBgQEADfsB/4fYjl4AAAAASUVORK5CYII=",
  ),
  (char) => char.charCodeAt(0),
);
async function parts(blob: Blob) {
  return Object.fromEntries(
    readZipEntries(new Uint8Array(await blob.arrayBuffer())).map((entry) => [
      entry.name,
      new TextDecoder().decode(entry.bytes),
    ]),
  );
}
describe("DOCX Next independent renderer", () => {
  for (const fixture of BRIEF_FIXTURES)
    test(`creates native three-part Word package: ${fixture}`, async () => {
      const model = buildDossierDocModel(briefFixture(fixture)),
        blob = await renderDossierDocx(model);
      const pkg = await parts(blob);
      expect(Object.keys(pkg)).toContain("[Content_Types].xml");
      expect(Object.keys(pkg)).toContain("_rels/.rels");
      expect(pkg["word/document.xml"].match(/<w:sectPr>/g)?.length).toBe(3);
      expect(pkg["word/document.xml"]).toContain('w:tag w:val="letter.subject"');
      expect(pkg["word/document.xml"]).toContain('w:tag w:val="cv.person.name"');
      expect(pkg["word/document.xml"]).not.toContain("<w:txbxContent");
      expect(pkg["word/document.xml"]).not.toContain("<w:pict");
      expect(pkg["word/document.xml"]).toContain("<w:widowControl");
      expect(pkg["word/styles.xml"]).toContain('w:styleId="Heading1"');
      expect(pkg["word/fontTable.xml"]).toContain("Liberation Sans");
      const repeat = new Uint8Array(await (await renderDossierDocx(model)).arrayBuffer());
      expect(repeat).toEqual(new Uint8Array(await blob.arrayBuffer()));
    });
  test("image bytes are normalized once and reused with independent geometry", async () => {
    const model = buildDossierDocModel(briefFixture());
    model.cover.blocks.unshift({
      kind: "image",
      id: "cover.photo",
      source: "shared",
      alt: "Portrait",
      widthMm: 40,
      maxHeightMm: 80,
      placement: "inline",
      xMm: 0,
      yMm: 0,
      gapMm: 2,
    });
    model.cv.blocks.unshift({
      kind: "image",
      id: "cv.photo",
      source: "shared",
      alt: "Portrait",
      widthMm: 20,
      maxHeightMm: 40,
      placement: "right",
      xMm: 0,
      yMm: 0,
      gapMm: 2,
      frame: {
        heightRatio: 1,
        radiusMm: 999,
        zoom: 2,
        xPct: 50,
        yPct: 50,
        borderWidthMm: 0.5,
        borderColor: "123456",
      },
      coordinateOrigin: "page",
    });
    let calls = 0;
    const pkg = await parts(
      await renderDossierDocx(model, {
        normalizeImage: async () => {
          calls++;
          return {
            bytes: png,
            widthPx: 2,
            heightPx: 1,
            extension: "png",
            contentType: "image/png",
          };
        },
      }),
    );
    expect(calls).toBe(1);
    expect(Object.keys(pkg).filter((path) => path.startsWith("word/media/"))).toHaveLength(1);
    expect(pkg["word/document.xml"]).toContain('cx="1440000" cy="720000"');
    expect(pkg["word/document.xml"]).toContain('cx="720000" cy="720000"');
    expect(pkg["word/document.xml"]).toContain(
      '<a:srcRect l="37500" t="25000" r="37500" b="25000"/>',
    );
    expect(pkg["word/document.xml"]).toContain('prst="ellipse"');
    expect(pkg["word/document.xml"]).toContain('<a:ln w="18000">');
    expect(pkg["word/document.xml"]).toContain('relativeFrom="page"');
    expect(pkg["word/document.xml"]).toContain("<wp:anchor");
    expect(pkg["word/_rels/document.xml.rels"]).toContain('Target="media/image-1.png"');
  });
  test("normalization failure is visible and never silently removes the photo", async () => {
    const model = buildDossierDocModel(briefFixture());
    model.cover.blocks.push({
      kind: "image",
      id: "photo",
      source: "broken",
      alt: "Portrait",
      widthMm: 40,
      maxHeightMm: 80,
      placement: "inline",
      xMm: 0,
      yMm: 0,
      gapMm: 2,
    });
    await expect(
      renderDossierDocx(model, {
        normalizeImage: async () => {
          throw new Error("image decode failed");
        },
      }),
    ).rejects.toThrow("image decode failed");
  });
  test("native sidebar and unresolved identities stay explicit", async () => {
    const input = briefFixture();
    input.settings.cvLayout = "sidebar";
    expect(
      buildDossierDocModel(input).cv.blocks.some((block) => block.kind === "parallel-flow"),
    ).toBe(true);
    input.settings.cvLayout = "classic";
    input.settings.unresolvedTypography = ["old-field"];
    await expect(renderDossierDocx(buildDossierDocModel(input))).rejects.toThrow(
      "unaccepted model issues",
    );
  });
  test("native half sections and explicit second page produce tables/breaks without heading searches", async () => {
    const input = briefFixture("custom-sections");
    input.cv.data.sectionLayouts = {
      "custom:custom-0": { width: "half", page: 2 },
      "custom:custom-1": { width: "half", page: 2 },
    };
    const pkg = await parts(await renderDossierDocx(buildDossierDocModel(input)));
    expect(pkg["word/document.xml"]).toContain('<w:tblLayout w:type="fixed"/>');
    expect(pkg["word/document.xml"]).toContain('w:type="page"');
    expect(pkg["word/document.xml"]).not.toContain("<w:trHeight");
  });
  test("duplicate package parts and relationships are rejected", () => {
    const pkg = new WordPackage();
    pkg.add("word/document.xml", "application/xml", "document");
    expect(() => pkg.add("word/document.xml", "application/xml", "duplicate")).toThrow("Duplicate");
    pkg.relate("", "document", "officeDocument", "word/document.xml");
    expect(() => pkg.relate("", "document", "officeDocument", "word/document.xml")).toThrow(
      "Duplicate",
    );
  });
  test("image cache rejects invalid normalized dimensions", async () => {
    await expect(
      imageCache(async () => ({
        bytes: png,
        widthPx: 0,
        heightPx: 1,
        extension: "png",
        contentType: "image/png",
      }))("test"),
    ).rejects.toThrow("invalid image");
  });
});
