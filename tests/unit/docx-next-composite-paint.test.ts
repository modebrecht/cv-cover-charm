import { describe, expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { decorationAssetKey, validateDecoration } from "../../src/lib/docx-next/decoration";
import { compositePagePaint, ensureFirstHeader } from "../../src/lib/docx-next/page-artwork";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { paintPng } from "../../src/lib/docx-next/artwork";
import { briefFixture } from "../fixtures/docx-next/brief";

/** A minimal generic composition, independent of candidate registry entries. */
function paintModel() {
  const model = buildDossierDocModel(briefFixture());
  for (const part of [model.cover, model.letter, model.cv]) {
    part.pagePaintComposition = "single-asset";
    part.paintOrder = "layer";
    part.artwork = [
      {
        kind: "decorative-artwork",
        id: `${part.id}.artwork.paper`,
        semanticText: false,
        fill: { color: "0D0B2B" },
        xMm: 0,
        yMm: 0,
        widthMm: 210,
        heightMm: 297,
        paintLayer: 0,
      },
    ];
    part.headerShapes =
      part.id === "cover"
        ? ["one", "two", "three"].map((name, index) => ({
            kind: "decorative-shape",
            id: `cover.decor-blob-${name}`,
            semanticText: false,
            shape: "circle",
            xMm: -45 + index * 50,
            yMm: -40 + index * 80,
            widthMm: 150,
            heightMm: 130,
            radiusMm: 0,
            opacity: 0.95,
            fill: { color: "7C3AED", endColor: "E11D8F" },
            stroke: { color: "000000", widthMm: 0 },
            clipToPage: true,
            repeat: "first",
          }))
        : [];
    if (part.id === "cover")
      part.headerShapes.push({
        kind: "decorative-shape",
        id: "cover.trenner",
        semanticText: false,
        shape: "line",
        xMm: 20,
        yMm: 236,
        widthMm: 170,
        heightMm: 0.4,
        radiusMm: 0,
        opacity: 0.6,
        fill: { color: "E11D8F" },
        stroke: { color: "000000", widthMm: 0 },
        repeat: "first",
      });
    ensureFirstHeader(part);
  }
  return model;
}

describe("opt-in nonsemantic composite page paint", () => {
  test("keeps authored layer order, page clipping and first/continuation scopes", () => {
    const part = paintModel().cover;
    const first = compositePagePaint(part, true)!;
    const continuation = compositePagePaint(part, false)!;
    expect(first.layers!.map((layer) => layer.id)).toEqual([
      "cover.artwork.paper",
      "cover.decor-blob-one",
      "cover.decor-blob-two",
      "cover.decor-blob-three",
      "cover.trenner",
    ]);
    expect(first.layers![1]).toMatchObject({ xMm: -45, yMm: -40, opacity: 0.95 });
    expect(continuation.layers!.map((layer) => layer.id)).toEqual(["cover.artwork.paper"]);
    expect(first).toMatchObject({
      xMm: 0,
      yMm: 0,
      widthMm: 210,
      heightMm: 297,
      semanticText: false,
    });
    validateDecoration(first);
    validateDecoration(continuation);
  });
  test("asset reuse ignores identities, retaining relative geometry and paint order", () => {
    const paint = compositePagePaint(paintModel().cover, true)!;
    const renamed = {
      ...paint,
      id: "renamed",
      layers: paint.layers!.map((s) => ({ ...s, id: "renamed" })),
    };
    expect(decorationAssetKey(renamed)).toBe(decorationAssetKey(paint));
    expect(decorationAssetKey({ ...paint, layers: [...paint.layers!].reverse() })).not.toBe(
      decorationAssetKey(paint),
    );
    expect(
      decorationAssetKey({
        ...paint,
        layers: paint.layers!.map((s) => ({ ...s, xMm: s.xMm + 1 })),
      }),
    ).not.toBe(decorationAssetKey(paint));
  });
  test("rejects nested, excessive or semantic layers", () => {
    const paint = compositePagePaint(paintModel().cover, true)!;
    expect(() => validateDecoration({ ...paint, layers: [] })).toThrow("invalid composite");
    expect(() =>
      validateDecoration({ ...paint, layers: Array(257).fill(paint.layers![0]) }),
    ).toThrow("invalid composite");
    expect(() => validateDecoration({ ...paint, layers: [paint] })).toThrow("invalid composite");
    expect(() =>
      validateDecoration({
        ...paint,
        layers: [{ ...paint.layers![0], semanticText: true as false }],
      }),
    ).toThrow("invalid decoration");
  });
  test("uses one behind-text anchor per story and retains native semantic text", async () => {
    const model = paintModel();
    const before = structuredClone(model);
    const bytes = new Uint8Array(
      await (
        await renderDossierDocx(model, {
          rasterizeDecoration: async () => ({
            bytes: paintPng({ color: "123456" }),
            widthPx: 1,
            heightPx: 1,
            extension: "png",
            contentType: "image/png",
          }),
        })
      ).arrayBuffer(),
    );
    expect(model).toEqual(before);
    const entries = new Map(
      readZipEntries(bytes).map((p) => [p.name, new TextDecoder().decode(p.bytes)]),
    );
    for (const story of [
      "cover-header-first",
      "cover-header",
      "letter-header-first",
      "letter-header",
      "cv-header-first",
      "cv-header",
    ])
      expect(entries.get(`word/${story}.xml`)!.match(/behindDoc="1"/g)).toHaveLength(1);
    expect(entries.get("word/document.xml")).toContain("Lea Müller");
    expect(entries.get("word/document.xml")).toContain("cover.fullName");
    expect(entries.get("word/document.xml")).not.toContain("txbxContent");
  });
  test("a failed required composite never silently drops the page background", async () => {
    const model = paintModel();
    await expect(
      renderDossierDocx(model, {
        rasterizeDecoration: async () => {
          throw new Error("required page paint failed");
        },
        onDecorationFailure: () => {},
      }),
    ).rejects.toThrow("required page paint failed");
  });
  test("templates without the opt-in retain their existing package serialization", async () => {
    const model = buildDossierDocModel(briefFixture());
    expect(model.cover.pagePaintComposition).toBeUndefined();
    const before = new Uint8Array(await (await renderDossierDocx(model)).arrayBuffer());
    const copy = JSON.parse(JSON.stringify(model));
    const after = new Uint8Array(await (await renderDossierDocx(copy)).arrayBuffer());
    expect(after).toEqual(before);
  });
});
