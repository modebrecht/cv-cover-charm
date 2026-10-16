import { expect, test } from "bun:test";
import snapshot from "../fixtures/docx-next/modern-app-snapshot.json";
import metrics from "../fixtures/docx-next/modern-app-metrics.json";
import type { DossierAppSnapshot } from "../../src/lib/docx-next/source";
import type { CoverTextMetrics } from "../../src/components/cover/text-metrics";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { validateDossierDocModel } from "../../src/lib/docx-next/validation";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { walkBlocks, type ParagraphFrameBlock } from "../../src/lib/docx-next/model";
import { paintPng } from "../../src/lib/docx-next/artwork";
import {
  designNativeBadgeUiEnabled,
  designInteriorAuditUiEnabled,
} from "../../src/lib/docx-next/design-visibility";

const input = () => structuredClone(snapshot) as unknown as DossierAppSnapshot;
const options = () => ({
  coverComposition: "authored-frames" as const,
  coverTextMetrics: structuredClone(metrics) as CoverTextMetrics,
  coverBadgePlacement: "body" as const,
});
const model = () =>
  buildDossierDocModel(input(), { ...options(), coverBadgeComposition: "native-shape" });
const frame = (m = model()) =>
  m.cover.blocks.find((b) => b.id === "cover.lehrbeginn.frame") as ParagraphFrameBlock;
const renderOptions = {
  allowUnacceptedModelIssues: true,
  rasterizeDecoration: async () => ({
    bytes: paintPng({ color: "FFFFFF" }),
    widthPx: 1,
    heightPx: 1,
    extension: "png" as const,
    contentType: "image/png",
  }),
};

test("native badge is opt-in and retains all semantic fields, artwork and adjacent documents", () => {
  const source = input(),
    before = JSON.stringify(source);
  const old = buildDossierDocModel(source, options()),
    next = model();
  expect(JSON.stringify(source)).toBe(before);
  expect(next.letter).toEqual(old.letter);
  expect(next.cv).toEqual(old.cv);
  expect(next.cover.headerShapes).toEqual(old.cover.headerShapes);
  const text = (m: typeof next) =>
    walkBlocks(m.cover.blocks)
      .filter((b) => b.kind === "paragraph")
      .map((b) => ({ id: b.id, runs: b.runs }));
  expect(text(next)).toEqual(text(old));
  expect(frame(old).surface).toBeUndefined();
  expect(next.cover.blocks.some((b) => b.id === "cover.lehrbeginn.badge-paint")).toBe(false);
  const paint = old.cover.blocks.find(
    (b) => b.kind === "decorative-shape" && b.id.endsWith(".badge-paint"),
  )!;
  if (paint.kind !== "decorative-shape") throw Error("missing paint");
  expect(frame(next)).toMatchObject({
    xMm: paint.xMm,
    yMm: paint.yMm,
    widthMm: paint.widthMm,
    surface: { heightMm: paint.heightMm, radiusMm: paint.radiusMm, fillColor: paint.fill!.color },
  });
  expect(() => buildDossierDocModel(source, { coverBadgeComposition: "native-shape" })).toThrow(
    "fresh authored cover metrics",
  );
});

test("one movable DrawingML owner contains the editable badge field, without duplicated text or bitmap paint", async () => {
  const bytes = new Uint8Array(
    await (await renderDossierDocx(model(), renderOptions)).arrayBuffer(),
  );
  const xml = new TextDecoder().decode(
    readZipEntries(bytes).find((e) => e.name === "word/document.xml")!.bytes,
  );
  const drawing = xml.match(/<wp:anchor[^>]*>[\s\S]*?<wps:wsp[\s\S]*?<\/wp:anchor>/)![0];
  expect(xml.match(/<wps:wsp\s/g) || []).toHaveLength(1);
  expect(drawing).toContain("<w:txbxContent><w:sdt>");
  expect(drawing).toContain('w:tag w:val="cover.lehrbeginn"');
  expect(xml.match(/w:tag w:val="cover.lehrbeginn"/g) || []).toHaveLength(1);
  expect(drawing).toContain('<a:solidFill><a:srgbClr val="F44664"');
  expect(drawing).not.toContain("<pic:pic>");
  expect(xml).not.toContain("cover.lehrbeginn.badge-paint");
  expect(drawing).toContain("<a:custGeom>");
  expect(drawing).toContain('<a:rect l="0" t="0"');
  expect(drawing).not.toContain("<a:prstGeom");
  expect(drawing).toContain('vertOverflow="overflow" horzOverflow="overflow"');
  expect(drawing).toContain("<a:noAutofit/>");
});

test("native surface validation rejects unusable geometry and unsupported content before serialization", () => {
  for (const mutate of [
    (f: ParagraphFrameBlock) => (f.surface!.radiusMm = 99),
    (f: ParagraphFrameBlock) => (f.surface!.heightMm = NaN),
    (f: ParagraphFrameBlock) => (f.surface!.paddingXMm = f.widthMm),
    (f: ParagraphFrameBlock) => (f.surface!.paddingYMm = -1),
    (f: ParagraphFrameBlock) => (f.surface!.heightMm = 3.3),
    (f: ParagraphFrameBlock) => (f.surface!.fillColor = "bad"),
    (f: ParagraphFrameBlock) => (f.yMm = 296),
    (f: ParagraphFrameBlock) => (f.paragraphs[0].runs[0].text += "\nsecond line"),
    (f: ParagraphFrameBlock) => (f.paragraphs[0].list = "bullet"),
  ]) {
    const next = model();
    mutate(frame(next));
    expect(() => validateDossierDocModel(next)).toThrow("native text-shape surface");
  }
});

test("the extra badge trial requires both explicit query flags", () => {
  const before = Object.getOwnPropertyDescriptor(globalThis, "window");
  try {
    for (const search of [
      "",
      "?docx-next-badge-qa=1",
      "?docx-next-design-qa=1",
      "?docx-next-design-qa=1&docx-next-badge-qa=1",
      "?docx-next-interior-qa=1",
      "?docx-next-design-qa=1&docx-next-interior-qa=1",
    ]) {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: { location: { search } },
      });
      expect(designNativeBadgeUiEnabled()).toBe(
        search.includes("design-qa=1&docx-next-badge-qa=1"),
      );
      expect(designInteriorAuditUiEnabled()).toBe(
        search.includes("design-qa=1&docx-next-interior-qa=1"),
      );
    }
  } finally {
    if (before) Object.defineProperty(globalThis, "window", before);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
