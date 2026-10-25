import { expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { validateDossierDocModel } from "../../src/lib/docx-next/validation";
import { walkBlocks, type ImageBlock, type TableBlock } from "../../src/lib/docx-next/model";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { sidebarFixture, type SidebarFixture } from "../fixtures/docx-next/sidebar";

const pictureBytes = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR4nGP4z8Dwn4GBgQEADfsB/4fYjl4AAAAASUVORK5CYII=",
  ),
  (c) => c.charCodeAt(0),
);
const normalizeImage = async () => ({
  bytes: pictureBytes,
  widthPx: 2,
  heightPx: 1,
  extension: "png" as const,
  contentType: "image/png",
});
const options = {
  cvSidebarComposition: "shared-body-stories" as const,
  cvPhotoComposition: "ordinary-picture" as const,
};

for (const name of [
  "photo-left",
  "photo-right",
  "photo-main",
  "photo-free-side",
  "photo-free-mirrored-side",
] as SidebarFixture[]) {
  test(`ordinary CV photo reuses the CV opening paragraph without a separate photo page: ${name}`, async () => {
    const input = sidebarFixture(name),
      original = structuredClone(input);
    const model = buildDossierDocModel(input, options);
    expect(input).toEqual(original);
    const picture = model.cv.blocks.find(
      (b) => b.kind === "image" && b.id === "cv.person.photo",
    ) as ImageBlock;
    expect(picture.nativeOwner).toBe("page-picture");
    expect(picture.frame?.zoom).toBeGreaterThan(0);
    const table = model.cv.blocks.find((b) => b.kind === "table") as TableBlock;
    expect(walkBlocks([table]).some((b) => b.id === picture.id)).toBe(false);
    const render = { allowUnacceptedModelIssues: true, normalizeImage };
    const bytes = new Uint8Array(await (await renderDossierDocx(model, render)).arrayBuffer());
    const entries = readZipEntries(bytes);
    const xml = new TextDecoder().decode(
      entries.find((p) => p.name === "word/document.xml")!.bytes,
    );
    // Inspect the serialized ancestor path, including mirrored cases. Merely
    // counting four pages in a different renderer missed the Word regression.
    const stack: string[] = [];
    let ancestors: string[] | undefined;
    for (const match of xml.matchAll(/<\/?[\w:]+(?:\s[^<>]*?)?\/?>/g)) {
      const token = match[0],
        tag = token.match(/^<\/?([\w:]+)/)![1];
      if (tag === "wp:docPr" && token.includes('name="cv.person.photo"')) ancestors = [...stack];
      if (token.startsWith("</")) stack.pop();
      else if (!token.endsWith("/>")) stack.push(tag);
    }
    expect(ancestors).toBeDefined();
    expect(ancestors).toContain("w:tc");
    expect(ancestors).not.toContain("w:sdt");
    expect(ancestors?.filter((tag) => tag === "w:tbl")).toHaveLength(1);
    expect(ancestors).toContain("wp:anchor");
    expect(xml).toContain('layoutInCell="0"');
    expect(xml).toContain('name="cv.person.photo"');
    expect(xml).not.toContain('<w:tag w:val="cv.person.photo"');
    expect(xml).not.toContain("<wps:wsp>");
    expect(
      entries.some(
        (p) =>
          p.name.startsWith("word/media/") &&
          p.bytes.every((v, i) => v === pictureBytes[i]) &&
          p.bytes.length === pictureBytes.length,
      ),
    ).toBe(true);
    const portable = JSON.parse(JSON.stringify(model));
    expect(new Uint8Array(await (await renderDossierDocx(portable, render)).arrayBuffer())).toEqual(
      bytes,
    );
    portable.issues = [];
    await expect(renderDossierDocx(portable)).rejects.toThrow(/unaccepted/);
  });
}

test("ordinary photo cannot be reintroduced into a cell or an unrelated layout", () => {
  const model = buildDossierDocModel(sidebarFixture("photo-left"), options);
  const image = model.cv.blocks.find((b) => b.kind === "image")!;
  model.cv.blocks.splice(model.cv.blocks.indexOf(image), 1);
  const table = model.cv.blocks.find((b) => b.kind === "table") as TableBlock;
  table.rows[0].cells[0].push(image);
  expect(() => validateDossierDocModel(model)).toThrow(/outside cells/);
  expect(() =>
    buildDossierDocModel(sidebarFixture("photo-left"), { cvPhotoComposition: "ordinary-picture" }),
  ).toThrow(/requires shared/);
});
