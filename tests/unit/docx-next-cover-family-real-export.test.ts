import { describe, expect, test } from "bun:test";
import { buildFullCoverFamilyQaModel } from "../../src/lib/cover-family-docx-next-export";
import { walkBlocks } from "../../src/lib/docx-next/model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { paintPng } from "../../src/lib/docx-next/artwork";
import { graphicCandidateFixture } from "../fixtures/docx-next/graphic-candidate";

describe("full saved-family native DOCX QA model", () => {
  for (const family of ["verlauf", "neon", "freundlich"] as const) {
    test(family + " preserves all three documents with one editable native cover avatar", () => {
      const snapshot = graphicCandidateFixture(family);
      const before = structuredClone(snapshot);
      const model = buildFullCoverFamilyQaModel(snapshot);
      expect(model.templateId).toBe(family);
      expect(model.issues).toEqual([]);
      expect(model.cover.blocks.find((block) =>
        block.id === "cover.photo.initials.frame")).toMatchObject({
          kind: "paragraph-frame",
          wrapMode: "none",
        });
      expect(walkBlocks(model.cover.blocks).filter((block) =>
        block.id === "cover.photo.initials.frame")).toHaveLength(1);
      const textFrame = model.cover.blocks.find((block) =>
        block.id === "cover.photo.initials.frame");
      if (textFrame?.kind !== "paragraph-frame") throw Error("Missing frame");
      expect(textFrame.surface).toBeUndefined();
      expect(model.letter.blocks.length).toBeGreaterThan(0);
      expect(model.cv.blocks.length).toBeGreaterThan(0);
      expect(snapshot).toEqual(before);
    });
    test(family + " serializes centered editable initials in real Word page frame", async () => {
      const model = buildFullCoverFamilyQaModel(graphicCandidateFixture(family));
      const blob = await renderDossierDocx(model, {
        allowUnacceptedModelIssues: true,
        rasterizeDecoration: async () => ({
          bytes: paintPng({ color: "AABBCC" }),
          widthPx: 2,
          heightPx: 2,
          extension: "png",
          contentType: "image/png",
        }),
      });
      const data = readZipEntries(new Uint8Array(await blob.arrayBuffer()));
      const word = new TextDecoder().decode(data.find((part) =>
        part.name === "word/document.xml")!.bytes);
      expect(word).toContain('<w:framePr w:w="');
      expect(word).toContain('w:wrap="none" w:vAnchor="page" w:hAnchor="page"');
      expect(word).toContain('cover.photo.initials');
      expect(word).toContain('<w:t xml:space="preserve">LM</w:t>');
      expect(word).not.toContain('id="cover.photo.native-avatar-');
    });
    test(family + " retains uploaded photo without initials", () => {
      const snapshot = graphicCandidateFixture(family);
      snapshot.cover.data.foto = "synthetic-photo-data";
      const model = buildFullCoverFamilyQaModel(snapshot);
      expect(walkBlocks(model.cover.blocks).some((block) =>
        block.id === "cover.photo.initials.frame")).toBe(false);
      const picture = walkBlocks(model.cover.blocks).find((block) =>
        block.id === "cover.photo");
      const photo = snapshot.cover.blocks.find((block) => block.id === "foto")!;
      expect(picture).toMatchObject({
        kind: "image",
        placement: "free",
        coordinateOrigin: "page",
        wrapMode: "none",
        xMm: photo.style.x,
        yMm: photo.style.y,
        widthMm: photo.style.w,
        frame: {
          radiusMm: photo.style.radius,
          zoom: photo.style.imgZoom ?? 1,
          xPct: photo.style.imgX ?? 50,
          yPct: photo.style.imgY ?? 50,
        },
      });
      expect(walkBlocks(model.cover.blocks).some((block) =>
        block.id === "cover.photo.source-slot")).toBe(false);
      expect(walkBlocks(model.cover.blocks).filter((block) =>
        block.id === "cover.photo")).toHaveLength(1);
    });
  }

  for (const family of ["verlauf", "neon", "freundlich"] as const) {
    test(family + " exports the real three-part Word picture ABOVE the page background without reflow", async () => {
      const input = graphicCandidateFixture(family);
      const block = input.cover.blocks.find((item) => item.id === "foto")!;
      input.cover.data.foto = "synthetic-photo-data";
      block.style.imgZoom = 2;
      block.style.imgX = 25;
      block.style.imgY = 70;
      const model = buildFullCoverFamilyQaModel(input);
      const blob = await renderDossierDocx(model, {
        allowUnacceptedModelIssues: true,
        normalizeImage: async () => ({
          bytes: paintPng({ color: "AABBCC" }),
          widthPx: 2,
          heightPx: 1,
          extension: "png",
          contentType: "image/png",
        }),
        rasterizeDecoration: async () => ({
          bytes: paintPng({ color: "FFFFFF" }),
          widthPx: 1,
          heightPx: 1,
          extension: "png",
          contentType: "image/png",
        }),
      });
      const parts = readZipEntries(new Uint8Array(await blob.arrayBuffer()));
      const xml = new TextDecoder().decode(parts.find((entry) =>
        entry.name === "word/document.xml")!.bytes);
      const marker = xml.indexOf('name="cover.photo"');
      expect(marker).toBeGreaterThan(0);
      const start = xml.lastIndexOf("<wp:anchor", marker);
      const end = xml.indexOf("</wp:anchor>", marker);
      expect(start).toBeGreaterThanOrEqual(0);
      expect(end).toBeGreaterThan(marker);
      const drawing = xml.slice(start, end + "</wp:anchor>".length);
      const emu = (mm: number) => Math.round(mm * 36000);
      expect(drawing).toContain('behindDoc="0"');
      expect(drawing).toContain('allowOverlap="1"');
      expect(drawing).toContain("<wp:wrapNone/>");
      expect(drawing).toContain(
        '<wp:positionH relativeFrom="page"><wp:posOffset>' +
          emu(block.style.x) + "</wp:posOffset>",
      );
      expect(drawing).toContain(
        '<wp:positionV relativeFrom="page"><wp:posOffset>' +
          emu(block.style.y) + "</wp:posOffset>",
      );
      expect(drawing).toContain('prst="ellipse"');
      expect(drawing).toMatch(/<a:srcRect l="[0-9]+" t="[0-9]+" r="[0-9]+" b="[0-9]+"/);
      expect(drawing).not.toContain('<a:srcRect l="0" t="0" r="0" b="0"/>');
      expect(parts.some((entry) => entry.name === "word/styles.xml")).toBe(true);
      expect(xml).toContain("letter.");
      expect(xml).toContain("cv.");
    });
  }
  test("an authored photo with a relative anchor is never guessed", () => {
    const snapshot = graphicCandidateFixture("neon");
    snapshot.cover.data.foto = "synthetic-photo-data";
    snapshot.cover.blocks.find((block) => block.id === "foto")!.style.follows = "name";
    expect(() => buildFullCoverFamilyQaModel(snapshot)).toThrow(
      "requires safe absolute page coordinates",
    );
  });
  test("out-of-page authored photo is refused, not silently clamped", () => {
    const snapshot = graphicCandidateFixture("freundlich");
    snapshot.cover.data.foto = "synthetic-photo-data";
    snapshot.cover.blocks.find((block) => block.id === "foto")!.style.x = 180;
    expect(() => buildFullCoverFamilyQaModel(snapshot)).toThrow(
      "requires safe absolute page coordinates",
    );
  });
  test("rejects unsupported family or mismatched dossier templates", () => {
    expect(() => buildFullCoverFamilyQaModel(graphicCandidateFixture("klassisch")))
      .toThrow("dieselbe geprüfte Vorlage");
    const snapshot = graphicCandidateFixture("verlauf");
    snapshot.letter.design.template = "neon";
    expect(() => buildFullCoverFamilyQaModel(snapshot))
      .toThrow("dieselbe geprüfte Vorlage");
  });
});
