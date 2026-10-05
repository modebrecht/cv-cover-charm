import { describe, test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { walkBlocks, type Paragraph } from "../../src/lib/docx-next/model";
import { paintPng } from "../../src/lib/docx-next/artwork";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { ORBIT } from "../../src/lib/docx-next/templates";
import { withUserStyleKeys } from "../../src/components/cover/user-style-precedence";
import { ORBIT_FIXTURES, orbitFixture } from "../fixtures/docx-next/orbit";

describe("Orbit native candidate and reusable outline paint", () => {
  test("positive scenarios retain identities and deterministic portable data", () => {
    for (const kind of ORBIT_FIXTURES) {
      const input = orbitFixture(kind),
        model = buildDossierDocModel(input);
      expect(model.issues).toEqual([]);
      expect(model).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input))));
      expect(model.templateId).toBe("orbit");
      expect(walkBlocks(model.cover.blocks).some((b) => b.id === "cover.fullName")).toBe(true);
    }
  });
  test("right photo and no-photo clearance reuse native composition without fixed text heights", () => {
    for (const kind of ["normal", "images"] as const) {
      const model = buildDossierDocModel(orbitFixture(kind, "data:image/png;base64,test"));
      const lead = model.cover.blocks.find((b) => b.id === "cover.heroLead");
      expect(lead).toMatchObject({ kind: "spacer", heightMm: kind === "images" ? 36 : 102 });
      const photo = model.cover.blocks.find((b) => b.id === "cover.photo");
      if (kind === "images")
        expect(photo).toMatchObject({
          kind: "image",
          align: "right",
          frame: { radiusMm: 999, heightRatio: 1 },
        });
      else expect(photo).toBeUndefined();
      expect((model.cover.blocks.find((b) => b.id === "cover.fullName") as Paragraph).align).toBe(
        "left",
      );
    }
  });
  test("configured alignment respects explicit saved alignment and independent field styles", () => {
    const input = orbitFixture();
    input.cover.blocks = input.cover.blocks.map((b) =>
      b.id === "name"
        ? withUserStyleKeys({ ...b, style: { ...b.style, align: "right" } }, { align: "right" })
        : b,
    );
    input.settings.fieldStyles = { "cover.fullName": { color: "123456", italic: true } };
    const model = buildDossierDocModel(input);
    const name = model.cover.blocks.find((b) => b.id === "cover.fullName") as Paragraph;
    expect(name.align).toBe("right");
    expect(name.runs[0].style).toMatchObject({ color: "123456", italic: true });
    expect(
      (model.cover.blocks.find((b) => b.id === "cover.profession") as Paragraph).runs[0].style
        .color,
    ).not.toBe("123456");
  });
  test("ring remains transparent, palette-bound and first/continuation scoped with chrome off", async () => {
    const input = orbitFixture("none"),
      model = buildDossierDocModel(input);
    for (const ring of model.cv.headerShapes!.filter((s) => s.shape === "circle")) {
      expect(ring.fill).toBeUndefined();
      expect(ring.stroke).toEqual({ color: "625FE8", widthMm: 2 });
    }
    expect(model.cv.headerShapes!.map((s) => s.repeat)).toEqual([
      "first",
      "first",
      "continuation",
      "continuation",
    ]);
    expect(model.letter.blocks.some((b) => b.id === "letter.sender.name")).toBe(true);
    const asset = {
      bytes: paintPng({ color: "123456" }),
      widthPx: 1,
      heightPx: 1,
      extension: "png" as const,
      contentType: "image/png" as const,
    };
    const zip = readZipEntries(
      new Uint8Array(
        await (
          await renderDossierDocx(model, { rasterizeDecoration: async () => asset })
        ).arrayBuffer(),
      ),
    );
    const xml = (key: string) => new TextDecoder().decode(zip.find((p) => p.name === key)!.bytes);
    expect(xml("word/cv-header-first.xml")).toContain("decoration");
    expect(xml("word/cv-header.xml")).toContain("decoration");
    expect(xml("word/document.xml")).not.toMatch(/txbxContent|w:trHeight/);
    const changed = buildDossierDocModel(orbitFixture("custom-colors"));
    expect(changed.cv.headerShapes!.find((s) => s.shape === "circle")!.stroke.color).toBe("D48B35");
    expect(buildDossierDocModel(orbitFixture("no-motifs")).cv.headerShapes).toBeUndefined();
  });
  test("sidebar fails explicitly and shared rendering stays template-ID-free", async () => {
    await expect(
      renderDossierDocx(buildDossierDocModel(orbitFixture("sidebar-blocked"))),
    ).rejects.toThrow("sidebar has not passed");
    for (const file of [
      "renderer.ts",
      "build-model.ts",
      "template-motifs.ts",
      "template-composition.ts",
      "cover-composition.ts",
    ]) {
      const source = readFileSync(`src/lib/docx-next/${file}`, "utf8");
      expect(source).not.toMatch(/(?:orbit|human|prism|freundlich)["']/i);
      expect(source).not.toMatch(
        /dossier-docx-templates|txbxContent|patchFirstParagraphContaining/,
      );
    }
    expect(JSON.stringify(ORBIT)).not.toContain("<w:");
  });
});
