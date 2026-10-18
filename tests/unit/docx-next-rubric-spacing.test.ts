import { expect, test } from "bun:test";
import sourceJson from "../fixtures/docx-next/modern-rubric-snapshot.json";
import coverJson from "../fixtures/docx-next/modern-rubric-metrics.json";
import interiorJson from "../fixtures/docx-next/modern-rubric-interior-metrics.json";
import type { DossierAppSnapshot } from "../../src/lib/docx-next/source";
import type { CoverTextMetrics } from "../../src/components/cover/text-metrics";
import type { InteriorTextMetrics } from "../../src/lib/docx-next/interior-metrics";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { walkBlocks, type DossierDocModel } from "../../src/lib/docx-next/model";
import { validateDossierDocModel } from "../../src/lib/docx-next/validation";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { paintPng } from "../../src/lib/docx-next/artwork";
import { ownFlowSurfaceSpacing } from "../../src/lib/docx-next/flow-surface-spacing";
import { designRubricSpacingUiEnabled } from "../../src/lib/docx-next/design-visibility";

const build = (trial = true) =>
  buildDossierDocModel(structuredClone(sourceJson) as unknown as DossierAppSnapshot, {
    coverComposition: "authored-frames",
    coverTextMetrics: structuredClone(coverJson) as CoverTextMetrics,
    coverBadgePlacement: "body",
    compactChromeComposition: "source-bands",
    cvContactComposition: "compact-grid",
    interiorTextMetrics: structuredClone(interiorJson) as unknown as InteriorTextMetrics,
    ...(trial ? { cvRubricSpacing: "previous-block" as const } : {}),
  });
const semantic = (m: DossierDocModel) =>
  walkBlocks(m.cv.blocks)
    .filter((b) => b.kind === "paragraph")
    .map((b) => (b.kind === "paragraph" ? { id: b.id, role: b.role, runs: b.runs } : null));
const paints = (m: DossierDocModel) =>
  walkBlocks(m.cv.blocks).filter((b) => b.kind === "paragraph" && b.flowSurface);
const renderOptions = {
  allowUnacceptedModelIssues: true,
  normalizeImage: async () => ({
    bytes: paintPng({ color: "FFFFFF" }),
    widthPx: 1,
    heightPx: 1,
    extension: "png" as const,
    contentType: "image/png",
  }),
  rasterizeDecoration: async () => ({
    bytes: paintPng({ color: "FFFFFF" }),
    widthPx: 1,
    heightPx: 1,
    extension: "png" as const,
    contentType: "image/png",
  }),
};
const xml = async (m: DossierDocModel) =>
  new TextDecoder().decode(
    readZipEntries(
      new Uint8Array(await (await renderDossierDocx(m, renderOptions)).arrayBuffer()),
    ).find((x) => x.name === "word/document.xml")!.bytes,
  );

test("source-sized before-gap is owned once by existing previous paragraphs and the contact-table ending", () => {
  const old = build(false),
    next = build();
  expect(next.cover).toEqual(old.cover);
  expect(next.letter).toEqual(old.letter);
  expect(next.cv.page).toEqual(old.cv.page);
  expect(semantic(next)).toEqual(semantic(old));
  expect(walkBlocks(next.cv.blocks).map((b) => [b.kind, b.id])).toEqual(
    walkBlocks(old.cv.blocks).map((b) => [b.kind, b.id]),
  );
  expect(paints(next)).toHaveLength(7);
  for (const p of paints(next)) {
    if (p.kind !== "paragraph") throw Error("heading missing");
    expect(p.beforeMm).toBe(0);
    expect(p.flowSurface!.spacingOwner).toBe("previous-block");
    const previous = walkBlocks(next.cv.blocks).find(
      (b) =>
        b.id ===
        (
          {
            "cv.section.custom:familie.heading": "cv.person.contact",
            "cv.section.schule.heading": "cv.entry.custom:familie:demo-familie.description",
            "cv.section.erfahrung.heading": "cv.entry.schule:demo-s2.place",
            "cv.section.sprachen.heading": "cv.entry.erfahrung:demo-p2.description",
            "cv.section.hobbys.heading": "cv.entry.sprachen:demo-l3.level",
            "cv.section.staerken.heading": "cv.entry.hobbys:2",
            "cv.section.referenzen.heading": "cv.entry.staerken:2",
          } as Record<string, string>
        )[p.id],
    )!;
    expect(previous.kind === "table" || previous.kind === "paragraph").toBe(true);
    if (previous.kind === "table" || previous.kind === "paragraph")
      expect(previous.afterMm).toBeCloseTo(4.8, 5);
  }
  validateDossierDocModel(next);
});

test("trial emits no additional paragraphs/tables, retains Heading1/SDTs and gives all paint paragraphs zero before-spacing", async () => {
  const old = await xml(build(false)),
    next = await xml(build());
  expect(next.match(/<w:p>/g)?.length).toBe(old.match(/<w:p>/g)?.length);
  expect(next.match(/<w:tbl>/g)?.length).toBe(old.match(/<w:tbl>/g)?.length);
  for (const paragraph of next.match(/<w:p>.*?<\/w:p>/g) ?? [])
    if (paragraph.includes('.flow-paint"')) {
      expect(paragraph).toContain('<w:pStyle w:val="Heading1"/>');
      expect(paragraph).toContain('<w:spacing w:before="0"');
      expect(paragraph).toContain('wp:positionV relativeFrom="line"');
    }
  for (const p of paints(build())) expect(next.split(`w:tag w:val="${p.id}"`).length - 1).toBe(1);
  expect(next).not.toContain("<wps:wsp");
  expect(next).toContain('<w:spacing w:after="272" w:line="20" w:lineRule="exact"/>');
  await expect(renderDossierDocx(build())).rejects.toThrow("diagnostic opt-in required");
  const ordinary = buildDossierDocModel(
    structuredClone(sourceJson) as unknown as DossierAppSnapshot,
  );
  const table = walkBlocks(ordinary.cv.blocks).find((b) => b.kind === "table")!;
  if (table.kind !== "table") throw Error("table missing");
  table.afterMm = 1;
  await expect(renderDossierDocx(ordinary)).rejects.toThrow(
    "table after-spacing requires the explicit candidate gate",
  );
});

test("invalid gap ownership and unsupported flow predecessors reject; the operation is idempotent", () => {
  const next = build(),
    before = JSON.stringify(next);
  ownFlowSurfaceSpacing(next.cv);
  expect(JSON.stringify(next)).toBe(before);
  const p = paints(next)[0];
  if (p.kind !== "paragraph") throw Error("heading missing");
  p.beforeMm = 1;
  expect(() => validateDossierDocModel(next)).toThrow("flowing rubric surface");
  const t = walkBlocks(build().cv.blocks).find((b) => b.kind === "table")!;
  expect(t.kind).toBe("table");
  if (t.kind === "table") {
    const m = build();
    const table = walkBlocks(m.cv.blocks).find((b) => b.id === t.id)!;
    if (table.kind !== "table") throw Error("table missing");
    table.afterMm = NaN;
    expect(() => validateDossierDocModel(m)).toThrow("table after-spacing");
  }
  const unsupported = build(false);
  const section = unsupported.cv.blocks.find(
    (b) => b.kind === "section" && b.id === "cv.section.person",
  )!;
  if (section.kind !== "section") throw Error("section missing");
  section.blocks.push({ kind: "page-break", id: "unsupported-boundary" });
  expect(() => ownFlowSurfaceSpacing(unsupported.cv)).toThrow("keinen unterstützten Vorgänger");
});

test("the new rubric path requires the design and interior gates in addition to its own flag", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  try {
    for (const [search, expected] of [
      ["?docx-next-rubric-spacing-qa=1", false],
      ["?docx-next-design-qa=1&docx-next-interior-qa=1", false],
      ["?docx-next-design-qa=1&docx-next-interior-qa=1&docx-next-rubric-spacing-qa=1", true],
    ] as const) {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: { location: { search } },
      });
      expect(designRubricSpacingUiEnabled()).toBe(expected);
    }
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "window", descriptor);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
