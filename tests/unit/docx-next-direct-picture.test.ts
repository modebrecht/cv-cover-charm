import assert from "node:assert/strict";
import { test } from "bun:test";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { pictureOwnershipFixture } from "../fixtures/docx-next/picture-ownership";

const pixels = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0X8AAAAASUVORK5CYII=",
  ),
  (char) => char.charCodeAt(0),
);
const normalizeImage = async () => ({
  bytes: pixels,
  widthPx: 1,
  heightPx: 1,
  contentType: "image/png" as const,
  extension: "png" as const,
});

test("direct picture ownership requires a diagnostic opt-in", async () => {
  const { model } = pictureOwnershipFixture("photo-free-portrait", "pixels");
  await assert.rejects(
    renderDossierDocx(model, { directPictureOwnership: true, normalizeImage }),
    /direct picture ownership is unaccepted/,
  );
});

test("direct free photos own one anchored picture without a text frame", async () => {
  for (const kind of ["photo-free-portrait"] as const) {
    const { model } = pictureOwnershipFixture(kind, "pixels");
    const before = structuredClone(model);
    const options = { normalizeImage, allowUnacceptedModelIssues: true };
    const entries = async (directPictureOwnership?: boolean) =>
      readZipEntries(
        new Uint8Array(
          await (
            await renderDossierDocx(model, { ...options, directPictureOwnership })
          ).arrayBuffer(),
        ),
      );
    const baseline = await entries();
    assert.deepEqual(await entries(false), baseline);
    const candidate = await entries(true);
    const document = new TextDecoder().decode(
      candidate.find((p) => p.name === "word/document.xml")!.bytes,
    );
    const ownerPattern = /<w:sdt><w:sdtPr><w:alias w:val="cv.person.photo"\/>[\s\S]*?<\/w:sdt>/g;
    const owners = document.match(ownerPattern);
    assert.equal(owners?.length, 1);
    const owner = owners![0];
    const previousDocument = new TextDecoder().decode(
      baseline.find((p) => p.name === "word/document.xml")!.bytes,
    );
    assert.equal(
      owner.match(/<pic:pic>[\s\S]*?<\/pic:pic>/)?.[0],
      previousDocument.match(ownerPattern)?.[0].match(/<pic:pic>[\s\S]*?<\/pic:pic>/)?.[0],
      "The direct anchor must preserve the picture, crop, geometry and outline",
    );
    assert.match(owner, /<w:picture\/>/);
    assert.equal((owner.match(/<w:drawing>/g) ?? []).length, 1);
    assert.equal((owner.match(/<pic:pic>/g) ?? []).length, 1);
    assert.match(owner, /<wp:anchor\b/);
    assert.doesNotMatch(owner, /<wp:inline\b|<w:txbxContent>|<w:p[ >]/);
    for (const part of baseline.filter((p) => p.name !== "word/document.xml"))
      assert.deepEqual(
        candidate.find((p) => p.name === part.name),
        part,
      );
    assert.deepEqual(model, before);
    assert.deepEqual(await entries(true), candidate);
  }
});

test("direct picture trial preserves inline and photo-free packages byte for byte", async () => {
  for (const kind of ["photo-left", "photo-right", "photo-free-mirrored-side", "left"] as const) {
    const { model } = pictureOwnershipFixture(kind, "pixels");
    const options = { normalizeImage, allowUnacceptedModelIssues: true };
    const bytes = async (directPictureOwnership: boolean) =>
      new Uint8Array(
        await (
          await renderDossierDocx(model, { ...options, directPictureOwnership })
        ).arrayBuffer(),
      );
    assert.deepEqual(await bytes(true), await bytes(false));
  }
});
