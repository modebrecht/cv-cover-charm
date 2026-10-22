import { expect, test } from "bun:test";
import fixture from "../fixtures/docx-next/sidebar-typography-22okt.json";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import {
  walkBlocks,
  type Paragraph,
  type TableBlock,
} from "../../src/lib/docx-next/model";
import type { DossierAppSnapshot } from "../../src/lib/docx-next/source";
import type { CvSidebarTextMetrics } from "../../src/lib/docx-next/cv-sidebar-text-metrics";
import { flowSurfacePaint } from "../../src/lib/docx-next/flow-surface";
import { validateDossierDocModel } from "../../src/lib/docx-next/validation";
import { paragraph } from "../../src/lib/docx-next/native-text";
import { twips } from "../../src/lib/docx-next/xml";

function setup() {
  const source = structuredClone(fixture.source) as DossierAppSnapshot;
  const metrics = {
    ...structuredClone(fixture.metrics),
    sourceKey: JSON.stringify(source),
  } as CvSidebarTextMetrics;
  return { source, metrics };
}
function build(source: DossierAppSnapshot, metrics?: CvSidebarTextMetrics) {
  return buildDossierDocModel(source, {
    cvSidebarComposition: "shared-body-stories",
    cvSidebarTextMetrics: metrics,
  });
}
function p(model: ReturnType<typeof build>, id: string) {
  return walkBlocks(model.cv.blocks).find((b) => b.id === id) as Paragraph;
}

test("fresh shared Sidebar styles preserve data, canonical text and adjacent dossier parts", () => {
  const { source, metrics } = setup(),
    before = structuredClone(source),
    beforeMetrics = structuredClone(metrics);
  const old = build(source),
    model = build(source, metrics);
  validateDossierDocModel(model);
  expect(source).toEqual(before);
  expect(metrics).toEqual(beforeMetrics);
  expect(model.cover).toEqual(old.cover);
  expect(model.letter).toEqual(old.letter);
  const texts = (m: ReturnType<typeof build>) =>
    walkBlocks(m.cv.blocks)
      .filter((b) => b.kind === "paragraph")
      .map((b) => [b.id, (b as Paragraph).runs.map((r) => r.text).join("")])
      .sort((a, b) => a[0].localeCompare(b[0]));
  expect(texts(model)).toEqual(texts(old));
});

test("Web name size, main-only document zoom and unscaled Sidebar survive independently", () => {
  const { source, metrics } = setup(),
    model = build(source, metrics);
  expect(p(model, "cv.person.name").runs[0].style.sizePt).toBeCloseTo(32.4);
  expect(
    p(model, "cv.entry.schule:demo-s1.title").runs[0].style.sizePt,
  ).toBeCloseTo(12.312);
  expect(p(model, "cv.person.address").runs[0].style.sizePt).toBeCloseTo(10.92);
  expect(p(model, "cv.person.name").runs[0].style.trackingPt).toBeCloseTo(
    -1.134,
  );
  expect(p(model, "cv.section.person.heading").runs[0].style.allCaps).toBe(
    true,
  );
});

test("native date tracks retain complete field owners instead of stacked metadata", () => {
  const { source, metrics } = setup(),
    model = build(source, metrics);
  const table = walkBlocks(model.cv.blocks).find(
    (b) => b.id === "cv.entry.schule:demo-s1.dateRail",
  ) as TableBlock;
  expect(table.columnWidthsMm![0]).toBeCloseTo(20.7, 3);
  expect(table.rows[0].cells[0][0].id).toBe("cv.entry.schule:demo-s1.date");
  expect(table.rows[0].cells[1][0].id).toBe("cv.entry.schule:demo-s1.title");
  expect((table.rows[0].cells[1][0] as Paragraph).indentMm).toBeCloseTo(3.6, 3);
  expect(table.rows[0].keepTogether).toBe(true);
});

test("long descriptions remain splittable while short dated entries stay together", () => {
  const { source, metrics } = setup();
  const text = Array.from(
    { length: 90 },
    (_, i) => `Langer Abschnitt ${i + 1} mit vollständig erhaltenem Inhalt.`,
  ).join("\n");
  source.cv.data.schule[0].beschreibung = text;
  metrics.fields["cv.entry.schule:demo-s1.description"].text = text;
  metrics.sourceKey = JSON.stringify(source);
  const model = build(source, metrics);
  const rail = walkBlocks(model.cv.blocks).find(
    (b) => b.id === "cv.entry.schule:demo-s1.dateRail",
  ) as TableBlock;
  expect(rail.rows[0].keepTogether).toBe(false);
  expect(
    p(model, "cv.entry.schule:demo-s1.description")
      .runs.map((r) => r.text)
      .join(""),
  ).toBe(text);
  const other = walkBlocks(model.cv.blocks).find(
    (b) => b.id === "cv.entry.schule:demo-s2.dateRail",
  ) as TableBlock;
  expect(other.rows[0].keepTogether).toBe(true);
});

test("plain heading rules use decoration while heading text remains a native paragraph", () => {
  const { source, metrics } = setup(),
    model = build(source, metrics);
  const heading = p(model, "cv.section.schule.heading");
  expect(heading.flowSurface?.variant).toBe("rule");
  expect(heading.ruleColor).toBeUndefined();
  const paint = flowSurfacePaint(heading);
  expect(paint.layers).toHaveLength(1);
  expect(paint.layers![0].id).toEndWith(".rule");
  expect(heading.runs.map((r) => r.text).join("")).toBe("Schulbildung");
  const rule = metrics.headings[heading.id].rule!;
  expect(heading.rightIndentMm! + rule.textWidthMm + rule.gapMm).toBeCloseTo(
    heading.flowSurface!.rowWidthMm,
  );
  expect(paragraph(heading)).toContain(
    `w:right="${twips(heading.rightIndentMm!)}"`,
  );
});

test("source bullet spacing and reference columns keep native semantic owners", () => {
  const { source, metrics } = setup(),
    model = build(source, metrics);
  const bullet = walkBlocks(model.cv.blocks).find(
    (b) => b.kind === "paragraph" && b.listIndentMm !== undefined,
  ) as Paragraph;
  expect(bullet.list).toBe("bullet");
  expect(bullet.listIndentMm).toBeCloseTo(
    metrics.fields[bullet.id].listIndentMm!,
  );
  expect(paragraph(bullet, "", 1)).toContain(
    `w:hanging="${twips(bullet.listIndentMm!)}"`,
  );
  const pair = walkBlocks(model.cv.blocks).find((b) =>
    b.id.startsWith("cv.section.referenzen.pair:"),
  ) as TableBlock;
  expect(pair.columnWidthsMm).toEqual([null, metrics.referenceGapMm!, null]);
  expect(pair.rows[0].cells[0][0].id).toBe("cv.entry.referenzen:demo-r1");
});

test("invalid native insets reject rather than emitting malformed list paragraphs", () => {
  for (const field of ["rightIndentMm", "listIndentMm"] as const) {
    const { source, metrics } = setup(),
      model = build(source, metrics);
    p(model, "cv.person.name")[field] = -1;
    expect(() => validateDossierDocModel(model)).toThrow(/paragraph inset/);
  }
});

test("unsupported authored rubric treatments remain guarded", () => {
  for (const patch of [
    { sectionTitlePill: true },
    { sectionTitleOffsetMm: 2 },
    { sectionContentIndentMm: 3 },
  ]) {
    const { source, metrics } = setup();
    Object.assign(source.cv.design, patch);
    metrics.sourceKey = JSON.stringify(source);
    expect(() => build(source, metrics)).toThrow(/ohne Pills/);
  }
});

test("empty compact footer has no implicit name and its paint matches Web height", () => {
  const { source, metrics } = setup(),
    model = build(source, metrics);
  expect(model.cv.footer).toEqual([]);
  expect(model.cv.firstFooter ?? []).toEqual([]);
  const footer = model.cv.artwork.find((a) => a.id === "cv.artwork.footer")!;
  expect(footer.heightMm).toBeCloseTo(4, 2);
  expect(footer.yMm + footer.heightMm).toBe(297);
  expect(
    model.cv.artwork.findIndex((a) => a.id === "cv.artwork.footer"),
  ).toBeGreaterThan(
    model.cv.artwork.findIndex((a) => a.id === "cv.artwork.sidebar-surface"),
  );
});

test("canonical compound subfields retain their explicit saved styles", () => {
  const { source, metrics } = setup();
  source.settings.fieldStyles = {
    "cv.person.firstName": { sizePt: 20, italic: true, color: "6D2857" },
  };
  metrics.sourceKey = JSON.stringify(source);
  const model = build(source, metrics),
    run = p(model, "cv.person.name").runs.find(
      (r) => r.fieldId === "cv.person.firstName",
    )!;
  expect(run.style.sizePt).toBe(18);
  expect(run.style.italic).toBe(true);
  expect(run.style.color).toBe("6D2857");
});

test("source-bound capture fails on stale, missing or invalid styles", () => {
  for (const mutation of [
    "stale",
    "missing-field",
    "missing-heading",
    "missing-entry",
    "negative-gap",
  ] as const) {
    const { source, metrics } = setup();
    if (mutation === "stale") metrics.sourceKey += "old";
    if (mutation === "missing-field") delete metrics.fields["cv.person.name"];
    if (mutation === "missing-heading")
      delete metrics.headings["cv.section.schule.heading"];
    if (mutation === "missing-entry")
      delete metrics.entries["cv.entry.schule:demo-s1"];
    if (mutation === "negative-gap")
      metrics.fields["cv.person.name"].beforeMm = -1;
    expect(() => build(source, metrics)).toThrow(/Sidebar/);
  }
});

test("custom footer content cannot be erased by the empty-band candidate", () => {
  const { source, metrics } = setup();
  source.cv.design.chromeContent = {
    footerTextEnabled: true,
    footerText: "Eigener Fuss",
  };
  metrics.sourceKey = JSON.stringify(source);
  expect(() => build(source, metrics)).toThrow(/leere kompakte/);
});

test("shared styles do not bypass the classic/sidebar composition boundary", () => {
  const { source, metrics } = setup();
  expect(() =>
    buildDossierDocModel(source, { cvSidebarTextMetrics: metrics }),
  ).toThrow(/expliziten gemeinsamen/);
});
