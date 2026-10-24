import { test, expect } from "bun:test";
import headerSource from "../fixtures/docx-next/modern-header-snapshot.json";
import headerCover from "../fixtures/docx-next/modern-header-metrics.json";
import headerMetrics from "../fixtures/docx-next/modern-header-interior-metrics.json";
import rubricSource from "../fixtures/docx-next/modern-rubric-snapshot.json";
import rubricCover from "../fixtures/docx-next/modern-rubric-metrics.json";
import rubricMetrics from "../fixtures/docx-next/modern-rubric-interior-metrics.json";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { validateDossierDocModel } from "../../src/lib/docx-next/validation";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { walkBlocks } from "../../src/lib/docx-next/model";
import { paintPng } from "../../src/lib/docx-next/artwork";
import type { DossierAppSnapshot } from "../../src/lib/docx-next/source";
import type { CoverTextMetrics } from "../../src/components/cover/text-metrics";
import type { InteriorTextMetrics } from "../../src/lib/docx-next/interior-metrics";

const source = (rubric = false) =>
  structuredClone(rubric ? rubricSource : headerSource) as unknown as DossierAppSnapshot;
const metrics = (rubric = false) =>
  structuredClone(rubric ? rubricMetrics : headerMetrics) as unknown as InteriorTextMetrics;
const options = (rubric = false) => ({
  coverComposition: "authored-frames" as const,
  coverTextMetrics: structuredClone(rubric ? rubricCover : headerCover) as CoverTextMetrics,
  coverBadgePlacement: "body" as const,
  cvContactComposition: "compact-grid" as const,
  ...(rubric ? { compactChromeComposition: "source-bands" as const } : {}),
  interiorTextMetrics: metrics(rubric),
});
const model = (rubric = false) => buildDossierDocModel(source(rubric), options(rubric));
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

test("actual saved header capture keeps one native row and every contact field; ordinary Next remains independent", () => {
  const input = source(),
    before = JSON.stringify(input),
    next = buildDossierDocModel(input, options());
  expect(JSON.stringify(input)).toBe(before);
  for (const part of [next.letter, next.cv]) {
    expect(part.headerFrames).toHaveLength(2);
    for (const frame of part.headerFrames!) {
      const p = frame.paragraphs[0];
      expect(p.fieldControls).toBe(true);
      expect(p.tabStopsMm).toHaveLength(6);
      expect(p.runs.filter((r) => r.fieldId).map((r) => r.text)).toEqual([
        "Lea Müller",
        "Dorfstrasse 12",
        "4535 Hubersdorf",
        "079 123 45 67",
        "lea.mueller@example.ch",
      ]);
      expect(frame.surface).toBeUndefined();
      expect(frame.wrapMode).toBe("none");
    }
    expect(part.footer).toEqual([]);
    expect(part.pagePaintComposition).toBe("single-asset");
  }
  expect(buildDossierDocModel(input).letter.headerFrames).toBeUndefined();
  expect(next.cover).toEqual(
    buildDossierDocModel(input, { ...options(), interiorTextMetrics: undefined }).cover,
  );
  expect(next.cv.page.margins.top).toBe(26);
  expect(next.cv.layout.pagination?.firstPageLeadMm).toBe(21);
});

test("stale, unavailable and invalid header data fail instead of producing another layout", () => {
  const input = source();
  input.cv.data.person.email = "changed@example.ch";
  expect(() => buildDossierDocModel(input, options())).toThrow("veraltet");
  const bad = options();
  bad.interiorTextMetrics.headers.letter!.first.frames[0].paragraphs[0].runs[0].style.font =
    "Trebuchet MS";
  expect(() => buildDossierDocModel(source(), bad)).toThrow("Header-Messwerte");
  const changed = options();
  changed.interiorTextMetrics.headers.letter!.first.frames[0].paragraphs[0].runs[0].text =
    "wrong source";
  expect(() => buildDossierDocModel(source(), changed)).toThrow("Messinhalt");
  const next = model();
  next.letter.headerFrames![0].paragraphs[0].tabStopsMm = [20, 10];
  expect(() => validateDossierDocModel(next)).toThrow("header tabs");
  const out = model();
  out.letter.headerFrames![0].xMm = 209;
  expect(() => validateDossierDocModel(out)).toThrow("paragraph frame");
});

test("native header stories retain inline source controls and a real terminating paragraph", async () => {
  const entries = readZipEntries(
    new Uint8Array(await (await renderDossierDocx(model(), renderOptions)).arrayBuffer()),
  );
  for (const scope of ["letter", "cv"])
    for (const suffix of ["-first", ""]) {
      const xml = new TextDecoder().decode(
        entries.find((e) => e.name === `word/${scope}-header${suffix}.xml`)!.bytes,
      );
      const frames = xml.match(/<w:framePr\b[^>]*\/>/g) ?? [];
      expect(frames.length).toBeGreaterThan(0);
      expect(frames.every((frame) => frame.includes('w:wrap="none"'))).toBe(true);
      for (const key of ["name", "address", "place", "phone", "email"]) {
        const field = scope === "letter" ? `letter.sender.${key}` : `cv.person.${key}`;
        expect(xml.split(`w:tag w:val="${field}"`).length - 1).toBe(1);
      }
      expect(xml).toContain("<w:tabs>");
      expect(xml).not.toContain("<wps:wsp");
      expect(xml).toContain(
        '<w:spacing w:after="0" w:line="20" w:lineRule="exact"/></w:pPr></w:p></w:hdr>',
      );
    }
});

test("rubric pills remain semantic flowing headings, keep native content and leave Letter untouched", async () => {
  const input = source(true),
    opts = options(true),
    next = model(true),
    old = buildDossierDocModel(input, { ...opts, interiorTextMetrics: undefined });
  expect(next.letter).toEqual(old.letter);
  expect(next.cover).toEqual(old.cover);
  const headings = walkBlocks(next.cv.blocks).filter(
    (b) => b.kind === "paragraph" && b.flowSurface,
  );
  expect(headings).toHaveLength(7);
  expect(
    walkBlocks(next.cv.blocks)
      .filter((b) => b.kind === "paragraph")
      .map((b) => b.runs.map((r) => r.text).join("")),
  ).toEqual(
    walkBlocks(old.cv.blocks)
      .filter((b) => b.kind === "paragraph")
      .map((b) => b.runs.map((r) => r.text).join("")),
  );
  for (const h of headings) {
    if (h.kind !== "paragraph") throw Error("missing heading");
    expect(h.role).toBe("heading");
    expect(h.runs.every((r) => !r.style.backgroundColor)).toBe(true);
    expect(h.flowSurface!.paddingXMm).toBeCloseTo(2.4, 2);
    expect(h.flowSurface!.paddingYMm).toBeCloseTo(0.8, 2);
  }
  const xml = new TextDecoder().decode(
    readZipEntries(
      new Uint8Array(await (await renderDossierDocx(next, renderOptions)).arrayBuffer()),
    ).find((e) => e.name === "word/document.xml")!.bytes,
  );
  expect(xml).toContain('wp:positionV relativeFrom="line"');
  expect(xml).toContain('<w:pStyle w:val="Heading1"/>');
  expect(xml).not.toContain("<wps:wsp");
  expect(xml).toContain('w:tag w:val="cv.section.schule.heading"');
});

test("flowing capsule overflow and missing rubric measurements reject before serialization", () => {
  const next = model(true),
    heading = walkBlocks(next.cv.blocks).find((b) => b.kind === "paragraph" && b.flowSurface)!;
  if (heading.kind !== "paragraph") throw Error("missing");
  heading.flowSurface!.widthMm = 500;
  expect(() => validateDossierDocModel(next)).toThrow("flowing rubric surface");
  const opts = options(true);
  delete opts.interiorTextMetrics.rubrics!["cv.section.schule.heading"];
  expect(() => buildDossierDocModel(source(true), opts)).toThrow("Rubrik-Messwerte");
});

test("measured CV text roles use matching Web style without mutating the saved snapshot", () => {
  const input = source();
  const before = JSON.stringify(input);
  const opts = options();
  const roleStyle = {
    font: "Arial",
    sizePt: 13.5,
    color: "334455",
    bold: false,
    italic: false,
    underline: true,
    allCaps: true,
    trackingPt: 2.16,
  };
  opts.interiorTextMetrics.textRoles = {
    "cv.documentTitle": {
      text: "Lebenslauf",
      style: roleStyle,
      lineHeightPt: 21,
      afterMm: 3,
    },
    "cv.person.name": {
      text: "mismatched source name",
      style: roleStyle,
      lineHeightPt: 22,
    },
  };
  const result = buildDossierDocModel(input, opts);
  const title = walkBlocks(result.cv.blocks).find(
    (block) => block.kind === "paragraph" && block.id === "cv.documentTitle",
  );
  expect(title?.kind).toBe("paragraph");
  if (title?.kind !== "paragraph") throw Error("Missing title");
  expect(title.runs[0].style).toEqual(roleStyle);
  expect(title.minimumLineHeightPt).toBe(21);
  expect(title.afterMm).toBe(3);
  const name = walkBlocks(result.cv.blocks).find(
    (block) => block.kind === "paragraph" && block.id === "cv.person.name",
  );
  expect(name?.kind).toBe("paragraph");
  if (name?.kind !== "paragraph") throw Error("Missing name");
  expect(name.runs[0].style.color).not.toBe(roleStyle.color);
  expect(JSON.stringify(input)).toBe(before);
});

test("stale typography measurements are rejected before model construction", () => {
  const opts = options();
  opts.interiorTextMetrics.sourceKey = "stale";
  expect(() => buildDossierDocModel(source(), opts)).toThrow();
});
