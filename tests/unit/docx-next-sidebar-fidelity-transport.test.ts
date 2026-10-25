import assert from "node:assert/strict";
import { test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { paintPng } from "../../src/lib/docx-next/artwork";
import { walkBlocks } from "../../src/lib/docx-next/model";
import { graphicCandidateFixture } from "../fixtures/docx-next/graphic-candidate";
import { sidebarFixture } from "../fixtures/docx-next/sidebar";

// Serialization regression for the combined branches, not a cover visual approval.
for (const side of ["left", "right"] as const)
  test(`authored cover picture and ${side} Sidebar picture keep their distinct owners and wrap`, async () => {
    const input = graphicCandidateFixture("neon", "sidebar");
    const portrait = sidebarFixture("photo-free-portrait");
    input.settings.sidebarSide = side;
    input.cv.design.sidebarPct = 0.3;
    input.settings.margins = { cv: { top: 20, right: 20, bottom: 20, left: 20 } };
    input.settings.cvPhotoPlacement = structuredClone(portrait.settings.cvPhotoPlacement);
    input.settings.cvPhotoStyle = structuredClone(portrait.settings.cvPhotoStyle);
    input.cover.data.foto = "transport-photo";
    input.cv.data.person.foto = "transport-photo";
    const before = structuredClone(input);
    const model = buildDossierDocModel(input, {
      cvSidebarComposition: "body-stories",
      coverPhotoPlacement: "authored-page",
    });
    const cover = walkBlocks(model.cover.blocks).find((b) => b.kind === "image")!;
    assert.equal(cover.kind, "image");
    if (cover.kind !== "image") throw new Error("Missing cover picture");
    assert.equal(cover.wrapMode, "none");
    assert.equal(cover.coordinateOrigin, "page");
    const png = paintPng({ color: "123456" });
    let normalizations = 0;
    const asset = {
      bytes: png,
      widthPx: 1,
      heightPx: 1,
      contentType: "image/png" as const,
      extension: "png" as const,
    };
    const blob = await renderDossierDocx(model, {
      allowUnacceptedModelIssues: true,
      normalizeImage: async () => {
        normalizations++;
        return asset;
      },
      rasterizeDecoration: async () => asset,
    });
    const entries = readZipEntries(new Uint8Array(await blob.arrayBuffer()));
    const xml = new TextDecoder().decode(
      entries.find((p) => p.name === "word/document.xml")!.bytes,
    );
    const coverName = xml.indexOf(`name="${cover.id}"`);
    assert.ok(coverName > 0);
    const anchor = xml.slice(
      xml.lastIndexOf("<wp:anchor", coverName),
      xml.indexOf("</wp:anchor>", coverName),
    );
    assert.match(anchor, /behindDoc="0"/);
    assert.match(anchor, /allowOverlap="1"/);
    assert.match(anchor, /<wp:wrapNone\/>/);
    assert.match(anchor, /<wp:positionH relativeFrom="page">/);
    const owner = xml.match(
      /<w:sdt><w:sdtPr><w:alias w:val="cv.person.photo"\/>[\s\S]*?<\/w:sdt>/g,
    );
    assert.equal(owner?.length, 1);
    assert.match(owner![0], /<w:picture\/>/);
    assert.match(owner![0], /<wp:inline\b/);
    assert.doesNotMatch(owner![0], /<w:p[ >]/);
    assert.match(xml, /name="cv.person.photo.frame"/);
    assert.equal(normalizations, 1);
    assert.deepEqual(entries.find((p) => p.name === "word/media/image-1.png")!.bytes, png);
    assert.deepEqual(input, before);
    await assert.rejects(renderDossierDocx(model), /unaccepted/);
  });
