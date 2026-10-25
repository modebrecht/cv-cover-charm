import { describe, expect, test } from "bun:test";
import { inflateSync } from "node:zlib";
import { paintPng } from "../../src/lib/docx-next/artwork";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { crc32, readZipEntries } from "../../src/lib/docx-next/zip";
import { briefChromeFixture, briefFixture } from "../fixtures/docx-next/brief";

const xmlParts = async (model: ReturnType<typeof buildDossierDocModel>) => {
  const parts = readZipEntries(
    new Uint8Array(await (await renderDossierDocx(model)).arrayBuffer()),
  );
  return new Map(parts.map((part) => [part.name, new TextDecoder().decode(part.bytes)]));
};
describe("declarative paper and native chrome geometry", () => {
  test("paint assets are deterministic valid PNGs, with exact solid/gradient endpoints", () => {
    for (const fill of [{ color: "123456" }, { color: "123456", endColor: "ABCDEF" }]) {
      const png = paintPng(fill);
      expect(png).toEqual(paintPng(fill));
      const chunks = new Map<string, Uint8Array>();
      let offset = 8;
      while (offset < png.length) {
        const length = new DataView(png.buffer).getUint32(offset);
        const type = new TextDecoder().decode(png.slice(offset + 4, offset + 8));
        chunks.set(type, png.slice(offset + 8, offset + 8 + length));
        expect(crc32(png.slice(offset + 4, offset + 8 + length))).toBe(
          new DataView(png.buffer).getUint32(offset + 8 + length),
        );
        offset += length + 12;
      }
      const pixels = inflateSync(chunks.get("IDAT")!);
      expect([...pixels.subarray(1, 4)]).toEqual([18, 52, 86]);
      expect([...pixels.subarray(-3)]).toEqual(fill.endColor ? [171, 205, 239] : [18, 52, 86]);
      expect(png.length).toBeLessThan(1200);
    }
    expect(() => paintPng({ color: "user text" })).toThrow("invalid artwork color");
  });
  test("independent part papers repeat in known header stories, behind native text", async () => {
    const input = briefChromeFixture();
    input.cover.colors.bg = "#efeedc";
    input.letter.design.paperColor = "#def0f1";
    input.cv.design.paperColor = "#def0f1";
    const model = buildDossierDocModel(input);
    expect(model).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input))));
    expect(model.issues).toEqual([]);
    const parts = await xmlParts(model);
    expect([...parts.keys()].filter((key) => key.startsWith("word/media/paint"))).toHaveLength(2);
    for (const story of [
      "cover-header",
      "letter-header",
      "letter-header-first",
      "cv-header",
      "cv-header-first",
    ]) {
      expect(parts.get(`word/${story}.xml`)).toContain('behindDoc="1"');
      expect(parts.get(`word/${story}.xml`)).toContain("<wp:wrapNone/>");
      expect(parts.get(`word/_rels/${story}.xml.rels`)).toContain('Target="media/paint-');
    }
    expect(parts.get("word/document.xml")).toContain("Lea Müller");
    expect(parts.get("word/document.xml")).not.toContain("txbxContent");
    expect(parts.get("word/document.xml")).not.toContain("w:background");
  });
  test("gradient bands use the same declarative artwork/picture primitive", async () => {
    const input = briefChromeFixture();
    Object.assign(input.settings.chrome!.shared, {
      headerBackgroundColor: "#123456",
      headerGradientColor: "#abcdef",
      footerBackgroundColor: "#654321",
      footerGradientColor: "#fedcba",
    });
    const model = buildDossierDocModel(input);
    expect(model.issues).toEqual([]);
    expect(model.letter.artwork.map((value) => value.id)).toEqual([
      "letter.artwork.header",
      "letter.artwork.footer",
    ]);
    const parts = await xmlParts(model);
    expect(parts.get("word/letter-header-first.xml")!.match(/behindDoc="1"/g)).toHaveLength(2);
    expect(parts.get("word/letter-footer.xml")).not.toContain("w:shd");
  });
  test("the entire signed offset range becomes native section distances and a flowing recipient gap", async () => {
    for (const sign of [-1, 0, 1]) {
      const input = briefChromeFixture();
      Object.assign(input.settings.chrome!.shared, {
        headerContentOffsetYMm: sign * 12,
        footerContentOffsetYMm: sign * 8,
        letterRecipientOffsetYMm: sign * 12,
      });
      const model = buildDossierDocModel(input);
      expect(model.issues).toEqual([]);
      expect(model.letter.page.headerDistanceMm).toBe(16 + sign * 12);
      expect(model.cv.page.footerDistanceMm).toBe(12 - sign * 8);
      expect(model.letter.blocks.find((value) => value.id === "letter.recipient.gap")).toEqual(
        sign < 0
          ? undefined
          : { kind: "spacer", id: "letter.recipient.gap", heightMm: 12 + sign * 12 },
      );
      expect(model.letter.page.margins.top).toBeGreaterThan(model.letter.page.headerDistanceMm);
      const parts = await xmlParts(model);
      expect(parts.get("word/document.xml")).toContain(
        `w:header="${Math.round(((16 + sign * 12) * 1440) / 25.4)}"`,
      );
    }
  });
  test("empty recipient creates no spacer; actual large chrome font sizes reserve body space", () => {
    const input = briefChromeFixture();
    Object.assign(input.letter.data, {
      empfaengerFirma: "",
      empfaengerName: "",
      empfaengerAdresse: "",
      empfaengerPlzOrt: "",
    });
    const before = buildDossierDocModel(input);
    input.settings.fieldStyles!["letter.header.title"].sizePt = 48;
    const after = buildDossierDocModel(input);
    expect(after.letter.blocks.some((block) => block.id === "letter.recipient.gap")).toBe(false);
    expect(after.letter.page.margins.top).toBeGreaterThan(before.letter.page.margins.top);
  });
  test("invalid artwork and chrome geometry fail explicitly before returning a package", async () => {
    const input = briefFixture();
    input.cover.colors.bg = "#123456";
    const model = buildDossierDocModel(input);
    model.cover.artwork[0].semanticText = true as false;
    await expect(renderDossierDocx(model)).rejects.toThrow("invalid artwork");
    model.cover.artwork[0].semanticText = false;
    model.cover.page.headerDistanceMm = -1;
    await expect(renderDossierDocx(model)).rejects.toThrow("invalid chrome geometry");
  });
});
