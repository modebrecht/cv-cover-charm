import assert from "node:assert/strict";
import { test } from "bun:test";
import { pictureControl } from "../../src/lib/docx-next/native-text";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import {
  PICTURE_OWNERSHIP_CASES,
  pictureOwnershipFixture,
} from "../fixtures/docx-next/picture-ownership";

const pixels = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0X8AAAAASUVORK5CYII=",
  ),
  (char) => char.charCodeAt(0),
);
const options = {
  allowUnacceptedModelIssues: true,
  normalizeImage: async () => ({
    bytes: pixels,
    widthPx: 1,
    heightPx: 1,
    contentType: "image/png" as const,
    extension: "png" as const,
  }),
};
async function entries(model: ReturnType<typeof pictureOwnershipFixture>["model"]) {
  return readZipEntries(
    new Uint8Array(await (await renderDossierDocx(model, options)).arrayBuffer()),
  );
}
const text = (values: Awaited<ReturnType<typeof entries>>, path: string) =>
  new TextDecoder().decode(values.find((value) => value.name === path)!.bytes);

test("inline and wrapped photos have a typed run owner, preserving complete source pixels", async () => {
  for (const kind of PICTURE_OWNERSHIP_CASES.filter((value) => value.startsWith("photo"))) {
    const { model } = pictureOwnershipFixture(kind, "source-pixels");
    const before = structuredClone(model);
    const values = await entries(model);
    const document = text(values, "word/document.xml");
    const owner = document.match(
      /<w:sdt><w:sdtPr><w:alias w:val="cv.person.photo"\/>[\s\S]*?<\/w:sdt>/g,
    );
    assert.equal(owner?.length, 1, kind);
    assert.match(
      owner![0],
      /<w:tag w:val="cv.person.photo"\/><w:id w:val="[1-9][0-9]*"\/><w:picture\/>/,
    );
    assert.equal((owner![0].match(/<w:drawing>/g) ?? []).length, 1);
    assert.match(owner![0], /<wp:inline\b/);
    if (kind === "photo-free-portrait") {
      assert.match(document, /<wps:txbx><w:txbxContent><w:p>/);
      assert.match(document, /name="cv.person.photo.frame"/);
      assert.doesNotMatch(owner![0], /<wp:anchor\b/);
    }
    assert.match(owner![0], /<pic:pic>/);
    assert.match(owner![0], /<a:srcRect\b/);
    const stroke = kind === "photo-free-portrait" ? 43200 : 14400;
    assert.ok(
      owner![0].includes(
        `<wp:effectExtent l="${stroke}" t="${stroke}" r="${stroke}" b="${stroke}"/>`,
      ),
      `${kind}: the line box must include the complete picture outline`,
    );
    if (kind === "photo-free-portrait") {
      assert.match(document, /<wp:extent cx="1310400" cy="1652400"\/>/);
      assert.match(document, /<wps:bodyPr lIns="0" rIns="0" tIns="0" bIns="0"/);
    }
    assert.doesNotMatch(
      owner![0],
      /<w:p[ >]/,
      "The picture SDT must not own/dispose its paragraph",
    );
    assert.match(
      document,
      /<w:p><w:pPr>[\s\S]*?<\/w:pPr><w:sdt><w:sdtPr><w:alias w:val="cv.person.photo"/,
    );
    assert.deepEqual(
      values.find((value) => value.name === "word/media/image-1.png")!.bytes,
      pixels,
    );
    const settings = text(values, "word/settings.xml");
    assert.match(settings, /<\/w:compat><w:doNotAutoCompressPictures\/><\/w:settings>/);
    assert.deepEqual(model, before);
    assert.deepEqual(await entries(JSON.parse(JSON.stringify(model))), values);
  }
});

test("each inline picture has its own instance ID, tag, media relationship and paragraph", async () => {
  const { model } = pictureOwnershipFixture("photo-left", "source-pixels");
  const table = model.cv.blocks.find((block) => block.kind === "table")!;
  const photo = table.rows[0].cells.flat().find((block) => block.kind === "image")!;
  assert.equal(photo.kind, "image");
  table.rows[0].cells[0].push({ ...photo, id: "cv.second.photo" });
  const document = text(await entries(model), "word/document.xml");
  const ids = [...document.matchAll(/<w:id w:val="([0-9]+)"\/><w:picture\/>/g)].map(
    (match) => match[1],
  );
  assert.equal(ids.length, 2);
  assert.equal(new Set(ids).size, 2);
  assert.match(document, /<w:tag w:val="cv.second.photo"\/>/);
  assert.equal((document.match(/<a:blip r:embed="image1"\/>/g) ?? []).length, 2);
});

test("no-photo exports keep their settings and diagnostic Sidebar guards", async () => {
  const { model } = pictureOwnershipFixture("left", "unused");
  const values = await entries(model);
  assert.doesNotMatch(text(values, "word/settings.xml"), /doNotAutoCompressPictures/);
  model.issues = [];
  await assert.rejects(renderDossierDocx(model), /body boundary is unaccepted/);
});

test("invalid Word picture instance IDs reject instead of emitting ambiguous controls", () => {
  for (const id of [0, -1, 1.5, NaN, Infinity, 2147483648])
    assert.throws(() => pictureControl("photo", "<w:r/>", id), /picture control identity/);
});
