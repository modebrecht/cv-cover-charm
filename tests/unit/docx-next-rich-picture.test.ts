import assert from "node:assert/strict";
import { test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { renderDossierDocx, type RenderOptions } from "../../src/lib/docx-next/renderer";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { pictureTileTransform } from "../../src/lib/docx-next/native-picture-fill";
import { sidebarFixture, type SidebarFixture } from "../fixtures/docx-next/sidebar";

const bytes = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0X8AAAAASUVORK5CYII=",
  ),
  (char) => char.charCodeAt(0),
);
const normalizeImage = async () => ({
  bytes,
  widthPx: 1,
  heightPx: 1,
  contentType: "image/png" as const,
  extension: "png" as const,
});
const modelFor = (kind: SidebarFixture) =>
  buildDossierDocModel(sidebarFixture(kind, "pixels"), {
    cvSidebarComposition: "body-stories",
    chromeFirstPageIdentity: "distinct-stories",
  });
const render = async (kind: SidebarFixture, options: RenderOptions) =>
  new Uint8Array(
    await (await renderDossierDocx(modelFor(kind), { normalizeImage, ...options })).arrayBuffer(),
  );
const diagnostic = { directPictureOwnership: true, allowUnacceptedModelIssues: true };

test("rich-text direct image owner requires both diagnostic guards", async () => {
  await assert.rejects(
    render("photo-free-main", {
      directPictureVariant: "rich-text-tile",
      allowUnacceptedModelIssues: true,
    }),
    /requires direct picture ownership/,
  );
  await assert.rejects(
    render("photo-free-main", { directPictureVariant: "rich-text" }),
    /requires direct picture ownership/,
  );
  await assert.rejects(
    render("photo-free-main", {
      directPictureOwnership: true,
      directPictureVariant: "rich-text",
    }),
    /diagnostic opt-in required/,
  );
  await assert.rejects(
    render("photo-free-main", {
      ...diagnostic,
      directPictureVariant: "unknown" as RenderOptions["directPictureVariant"],
    }),
    /invalid direct picture variant/,
  );
});

test("diagnostic tile maps asymmetric crop to explicit original-image scale and offset", () => {
  const geometry = {
    widthMm: 34,
    heightMm: 34,
    crop: { left: 8400, top: 24400, right: 11600, bottom: 22267 },
    shape: "ellipse" as const,
    cornerAdjustment: 0,
    borderWidthMm: 0.4,
    borderColor: "244A61",
  };
  assert.deepEqual(pictureTileTransform(geometry, { widthPx: 120, heightPx: 180 }), {
    tx: -128520,
    ty: -559983,
    sx: 133858,
    sy: 133859,
  });
  for (const source of [
    { widthPx: 0, heightPx: 180 },
    { widthPx: 120, heightPx: NaN },
  ])
    assert.throws(
      () => pictureTileTransform(geometry, source),
      /invalid diagnostic picture tile geometry/,
    );
  assert.throws(
    () =>
      pictureTileTransform(
        { ...geometry, crop: { ...geometry.crop, left: 90000 } },
        { widthPx: 120, heightPx: 180 },
      ),
    /invalid diagnostic picture tile geometry/,
  );
});

test("tiled trial has one owned fill and exactly one hidden range marker in four free contexts", async () => {
  for (const kind of [
    "photo-free-main",
    "photo-free-low",
    "photo-free-portrait",
    "photo-free-chrome",
  ] as const) {
    const parts = readZipEntries(
      await render(kind, { ...diagnostic, directPictureVariant: "rich-text-tile" }),
    );
    const doc = new TextDecoder().decode(
      parts.find((part) => part.name === "word/document.xml")!.bytes,
    );
    const owner = doc.match(
      /<w:sdt><w:sdtPr><w:alias w:val="cv.person.photo"\/>[\s\S]*?<\/w:sdt>/g,
    )!;
    assert.equal(owner.length, 1);
    assert.equal((owner[0].match(/<w:drawing>/g) ?? []).length, 1);
    assert.equal((owner[0].match(/<a:blip /g) ?? []).length, 1);
    assert.equal((owner[0].match(/\u200b/g) ?? []).length, 1);
    assert.match(
      owner[0],
      /<w:sdtContent><w:r><w:rPr><w:vanish\/><\/w:rPr><w:t xml:space="preserve">\u200b<\/w:t><\/w:r><w:r><w:drawing>/,
    );
    assert.match(owner[0], /<a:blipFill dpi="96">/);
    assert.match(owner[0], /<a:tile /);
    assert.doesNotMatch(owner[0], /<pic:pic>|<w:picture\/>|<w:txbxContent>|<a:srcRect/);
    for (const original of readZipEntries(await render(kind, diagnostic)).filter(
      (part) => part.name !== "word/document.xml",
    ))
      assert.deepEqual(
        parts.find((part) => part.name === original.name),
        original,
      );
  }
});

test("rich-text trial changes only the owner type for all four free photos", async () => {
  for (const kind of [
    "photo-free-main",
    "photo-free-low",
    "photo-free-portrait",
    "photo-free-chrome",
  ] as const) {
    const model = modelFor(kind);
    const before = structuredClone(model);
    const typed = readZipEntries(await render(kind, diagnostic));
    const rich = readZipEntries(
      new Uint8Array(
        await (
          await renderDossierDocx(model, {
            normalizeImage,
            ...diagnostic,
            directPictureVariant: "rich-text",
          })
        ).arrayBuffer(),
      ),
    );
    const document = new TextDecoder().decode(
      rich.find((p) => p.name === "word/document.xml")!.bytes,
    );
    const owner = document.match(
      /<w:sdt><w:sdtPr><w:alias w:val="cv.person.photo"\/>[\s\S]*?<\/w:sdt>/g,
    );
    assert.equal(owner?.length, 1);
    assert.match(owner![0], /<w:id w:val="[1-9][0-9]*"\/>/);
    assert.match(owner![0], /<wp:anchor\b/);
    assert.equal((owner![0].match(/<w:drawing>/g) ?? []).length, 1);
    assert.equal((owner![0].match(/<pic:pic>/g) ?? []).length, 1);
    assert.doesNotMatch(owner![0], /<w:picture\/>|<wp:inline\b|<w:txbxContent>/);
    for (const part of typed) {
      const actual = rich.find((entry) => entry.name === part.name)!;
      if (part.name === "word/document.xml") {
        const expected = new TextDecoder().decode(part.bytes);
        assert.equal(document, expected.replace("<w:picture/>", ""), kind);
      } else assert.deepEqual(actual, part, kind);
    }
    assert.deepEqual(model, before);
  }
});

test("direct owner selection preserves the typed experiment and normalized inline photos", async () => {
  const options = { ...diagnostic, directPictureVariant: "rich-text" as const };
  for (const kind of ["photo-left", "photo-free-mirrored-side", "left"] as const) {
    assert.deepEqual(await render(kind, options), await render(kind, diagnostic), kind);
    assert.deepEqual(
      await render(kind, { ...options, directPictureVariant: "rich-text-tile" }),
      await render(kind, diagnostic),
      kind,
    );
  }
  assert.deepEqual(
    await render("photo-free-main", { ...diagnostic, directPictureVariant: "picture" }),
    await render("photo-free-main", diagnostic),
  );
});
