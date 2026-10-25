import { expect, test } from "bun:test";
import snapshot from "../fixtures/docx-next/modern-app-snapshot.json";
import metrics from "../fixtures/docx-next/modern-app-metrics.json";
import type { DossierAppSnapshot } from "../../src/lib/docx-next/source";
import type { CoverTextMetrics } from "../../src/components/cover/text-metrics";
import { coverTextMetricsKey } from "../../src/components/cover/text-metrics";
import { normalizedCoverLabels } from "../../src/components/cover/presentation";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { designDocxNextUiEnabled } from "../../src/lib/docx-next/design-visibility";
import { validateBriefIntegrationModel } from "../../src/lib/brief-docx-next-export";
import { graphicCandidateFixture } from "../fixtures/docx-next/graphic-candidate";

const input = () => structuredClone(snapshot) as unknown as DossierAppSnapshot;
const packet = () => structuredClone(metrics) as CoverTextMetrics;
const options = (coverTextMetrics = packet()) => ({
  coverComposition: "authored-frames" as const,
  coverTextMetrics,
});
const rasterizeDecoration = async () => ({
  bytes: Uint8Array.from(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==",
      "base64",
    ),
  ),
  widthPx: 1,
  heightPx: 1,
  extension: "png" as const,
  contentType: "image/png",
});

test("explicit body badge avoids an inactive header while preserving text frames, artwork and neighbors", async () => {
  const old = buildDossierDocModel(input(), options());
  const model = buildDossierDocModel(input(), { ...options(), coverBadgePlacement: "body" });
  const badgeId = "cover.lehrbeginn.badge-paint";
  const oldPaint = old.cover.headerShapes!.find((b) => b.id === badgeId)!;
  const { repeat: _, ...paint } = oldPaint;
  expect(model.cover.blocks.filter((b) => b.kind === "decorative-shape")).toEqual([paint]);
  expect(model.cover.blocks.filter((b) => b.kind !== "decorative-shape")).toEqual(old.cover.blocks);
  expect(model.cover.headerShapes).toEqual(old.cover.headerShapes!.filter((b) => b.id !== badgeId));
  expect(model.cover.page).toEqual(old.cover.page);
  expect(model.letter).toEqual(old.letter);
  expect(model.cv).toEqual(old.cv);
  expect(() => buildDossierDocModel(input(), { coverBadgePlacement: "body" })).toThrow(
    "authored candidate",
  );
  const entries = readZipEntries(
    new Uint8Array(
      await (
        await renderDossierDocx(model, {
          allowUnacceptedModelIssues: true,
          rasterizeDecoration,
        })
      ).arrayBuffer(),
    ),
  );
  const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
  const body = decode(entries.find((e) => e.name === "word/document.xml")!.bytes);
  expect(body).toContain(`name="${badgeId}"`);
  expect(body).toContain('w:val="cover.lehrbeginn"');
  expect(body).toContain("Lehrbeginn August 2028");
  expect((body.match(/<w:sectPr>/g) ?? []).length).toBe(3);
  for (const entry of entries.filter((e) => /^word\/header\d+\.xml$/.test(e.name)))
    expect(decode(entry.bytes)).not.toContain(badgeId);
});

test("controlled compact chrome preserves body content and uses the Web painted-footer reserve", () => {
  const source = input();
  const before = JSON.stringify(source);
  const old = buildDossierDocModel(source, options());
  const model = buildDossierDocModel(source, {
    ...options(),
    compactChromeComposition: "source-bands",
  });
  expect(model.cover).toEqual(old.cover);
  expect(JSON.stringify(source)).toBe(before);
  for (const scope of ["letter", "cv"] as const) {
    const part = model[scope];
    expect(part.blocks).toEqual(old[scope].blocks);
    const expectedPage = structuredClone(old[scope].page);
    // The Web CV has 1 mm physical bottom space plus this fixture's 4 mm band.
    // An empty painted band must not retain the old text-footer reserve.
    if (scope === "cv") expectedPage.margins.bottom = 5;
    expect(part.page).toEqual(expectedPage);
    expect(part.footer).toEqual([]);
    expect(part.pagePaintComposition).toBe("single-asset");
    expect(part.header).toEqual(old[scope].header);
    expect(part.chrome.borderColor).toBeUndefined();
    expect(part.artwork.some((p) => p.id === `${scope}.artwork.footer`)).toBe(false);
    const paints = part.headerShapes!.filter((p) => p.id.startsWith(`${scope}.compact.`));
    const strip = paints.find((p) => p.id.endsWith(".footer"))!;
    const edge = paints.find((p) => p.id.endsWith(".footer-edge"))!;
    expect(strip.yMm + strip.heightMm).toBe(297);
    expect(strip.heightMm + edge.heightMm).toBe(4);
    expect(edge.yMm).toBe(293);
    expect(strip.opacity).toBe(1);
    expect(strip.fill?.color).toBe("111827");
    expect(paints.find((p) => p.id.endsWith(".header"))!.yMm).toBe(0);
  }
});

test("compact chrome retains saved heights and palette and rejects semantic content or unsupported modes", () => {
  const source = input();
  const chrome = source.settings.chrome!.shared;
  chrome.headerHeightMm = 6;
  chrome.footerHeightMm = 8;
  source.letter.design.colors.primary = "#005577";
  const opts = { ...options(), compactChromeComposition: "source-bands" as const };
  const part = buildDossierDocModel(source, opts).letter;
  const footer = part.headerShapes!.find((p) => p.id === "letter.compact.footer")!;
  expect(footer.fill?.color).toBe("005577");
  expect(footer.heightMm).toBe(7.4);
  expect(footer.yMm + footer.heightMm).toBe(297);
  expect(buildDossierDocModel(source, opts).cv.page.margins.bottom).toBe(9);
  const height = part.headerShapes!.find((p) => p.id === "letter.compact.header")!;
  expect(height.heightMm).toBe(5.4);
  for (const patch of [
    { headerMode: "contact" },
    { footerMode: "details" },
    { footerMode: "none" },
  ]) {
    const s = input();
    Object.assign(s.settings.chrome!.shared, patch);
    expect(() => buildDossierDocModel(s, opts)).toThrow("compact chrome");
  }
  const custom = input();
  custom.letter.design.chromeContent = { footerTextEnabled: true, footerText: "Keep this text" };
  expect(() => buildDossierDocModel(custom, opts)).toThrow("Benutzertexte");
  expect(() => buildDossierDocModel(input(), { compactChromeComposition: "source-bands" })).toThrow(
    "declared authored candidate",
  );
});

test("Modern compact surfaces and rules share one native transform without flattening semantic body text", async () => {
  const model = buildDossierDocModel(input(), {
    ...options(),
    compactChromeComposition: "source-bands",
    coverBadgePlacement: "body",
  });
  expect(model.cover.pagePaintComposition).toBeUndefined();
  const entries = new Map(
    readZipEntries(
      new Uint8Array(
        await (
          await renderDossierDocx(model, {
            allowUnacceptedModelIssues: true,
            rasterizeDecoration,
          })
        ).arrayBuffer(),
      ),
    ).map((e) => [e.name, new TextDecoder().decode(e.bytes)]),
  );
  for (const scope of ["letter", "cv"])
    for (const suffix of ["", "-first"]) {
      const xml = entries.get(`word/${scope}-header${suffix}.xml`)!;
      expect((xml.match(/<wp:anchor /g) ?? []).length).toBe(1);
      expect(xml).toContain(`${scope}.page-paint.`);
      expect(xml).not.toContain(`${scope}.compact.`);
    }
  const body = entries.get("word/document.xml")!;
  for (const field of ["cover.lehrbeginn", "letter.sender.name", "cv.person.email"])
    expect(body).toContain(`w:val="${field}"`);
  expect(body).toContain("lea.mueller@example.ch");
  expect(body).toContain('name="cover.lehrbeginn.badge-paint"');
});

test("real app metrics reproduce a compact rounded badge and semantic initials without changing neighbors", async () => {
  const source = input();
  const before = JSON.stringify(source);
  const model = buildDossierDocModel(source, options());
  const baseline = buildDossierDocModel(source);
  expect(model.letter).toEqual(baseline.letter);
  expect(model.cv).toEqual(baseline.cv);
  expect(JSON.stringify(source)).toBe(before);
  const paint = model.cover.headerShapes!.find((b) => b.id === "cover.lehrbeginn.badge-paint")!;
  expect(paint.widthMm).toBeCloseTo(53.90107421875, 6);
  expect(paint.heightMm).toBeCloseTo(8.8303333333, 6);
  expect(paint.radiusMm).toBeCloseTo(paint.heightMm / 2, 6);
  expect(paint.opacity).toBe(1);
  expect(paint.fill?.color).toBe("F44664");
  expect(model.cover.headerShapes!.some((b) => b.id === "cover.trenner")).toBe(false);
  validateBriefIntegrationModel(model, "modern");
  expect(() => validateBriefIntegrationModel(model)).toThrow("Nicht freigegebene");
  await expect(renderDossierDocx(model)).rejects.toThrow();
  const entries = readZipEntries(
    new Uint8Array(
      await (
        await renderDossierDocx(model, {
          allowUnacceptedModelIssues: true,
          rasterizeDecoration,
        })
      ).arrayBuffer(),
    ),
  );
  const xml = new TextDecoder().decode(entries.find((e) => e.name === "word/document.xml")!.bytes);
  expect(xml).toContain('w:val="cover.lehrbeginn"');
  expect(xml).toContain('w:val="cover.photo.initials"');
  expect(xml).toContain("Lehrbeginn August 2028");
  expect(xml).toContain("LM");
});

test("badge capture fails closed for stale, absent, nonfinite and overwide advances", () => {
  for (const advance of [undefined, NaN, 0, -1, Infinity, 200]) {
    const m = packet();
    m.blocks.lehrbeginn.badgeAdvanceMm = advance;
    expect(() => buildDossierDocModel(input(), options(m))).toThrow("fresh single-line metrics");
  }
  const stale = input();
  stale.cover.blocks.find((b) => b.id === "lehrbeginn")!.lines = ["Changed August 2029"];
  expect(() => buildDossierDocModel(stale, options())).toThrow("stale");
  expect(() => buildDossierDocModel(input(), { coverComposition: "authored-frames" })).toThrow(
    "fresh single-line metrics",
  );
});

test("unsupported paint and transparent text crossing artwork cannot silently lose fidelity", () => {
  const custom = input();
  custom.cover.customFieldIds = ["custom-rounded-shape"];
  expect(() => buildDossierDocModel(custom, options())).toThrow("custom cover elements");
  for (const id of ["modernAccentCircle", "foto"]) {
    const s = input();
    Object.assign(s.cover.blocks.find((b) => b.id === id)!.style, {
      ratio: 0.8,
      ...(id === "foto" ? { radius: 999 } : {}),
    });
    const m = packet();
    m.sourceKey = coverTextMetricsKey(
      normalizedCoverLabels(s.cover.blocks, s.cover.data.labelKontakt),
      s.cover.fontScale,
    );
    // Native non-square shape and photo placeholders are now supported geometrically.
    // Retain an explicit check that the authored 0.8 ratio survives the export model.
    const model = buildDossierDocModel(s, options(m));
    const paintId = id === "foto" ? "cover.photo.placeholder-paint" : "cover.modernAccentCircle";
    const paint = model.cover.headerShapes?.find((shape) => shape.id === paintId);
    expect(paint).toMatchObject({
      kind: "decorative-shape",
      heightMm: 0.8 * s.cover.blocks.find((block) => block.id === id)!.style.w,
    });
  }
  for (const patch of [{ borderWidth: 1 }, { h: 20 }, { list: "bullet" }]) {
    const s = input();
    const m = packet();
    Object.assign(s.cover.blocks.find((b) => b.id === "lehrbeginn")!.style, patch);
    m.sourceKey = coverTextMetricsKey(
      normalizedCoverLabels(s.cover.blocks, s.cover.data.labelKontakt),
      s.cover.fontScale,
    );
    expect(() => buildDossierDocModel(s, options(m))).toThrow("separate acceptance");
  }
  const s = input();
  const b = s.cover.blocks.find((b) => b.id === "lehrbeginn")!;
  Object.assign(b.style, { x: 110, y: 37, w: 85, follows: null });
  const m = packet();
  m.sourceKey = coverTextMetricsKey(
    normalizedCoverLabels(s.cover.blocks, s.cover.data.labelKontakt),
    s.cover.fontScale,
  );
  expect(() => buildDossierDocModel(s, options(m))).toThrow("over artwork");
});

test("the independent gate excludes the other audited templates and does not change the default", () => {
  for (const template of ["verlauf", "neon", "freundlich"]) {
    expect(() =>
      buildDossierDocModel(graphicCandidateFixture(template), {
        coverComposition: "authored-frames",
      }),
    ).toThrow("not declared");
  }
  const before = Object.getOwnPropertyDescriptor(globalThis, "window");
  try {
    for (const search of [
      "",
      "?docx-next-brief-qa=1",
      "?docx-next-design-qa=true",
      "?docx-next-design-qa=1",
    ]) {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: { location: { search } },
      });
      expect(designDocxNextUiEnabled()).toBe(search === "?docx-next-design-qa=1");
    }
  } finally {
    if (before) Object.defineProperty(globalThis, "window", before);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
