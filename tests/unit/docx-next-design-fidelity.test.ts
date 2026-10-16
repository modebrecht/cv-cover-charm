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

test("controlled compact chrome matches Web band geometry without inventing footer text or moving body content", () => {
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
    expect(part.page).toEqual(old[scope].page);
    expect(part.footer).toEqual([]);
    expect(part.header).toEqual(old[scope].header);
    expect(part.chrome.borderColor).toBeUndefined();
    expect(part.artwork.some((p) => p.id === `${scope}.artwork.footer`)).toBe(false);
    const paints = part.headerShapes!.filter((p) => p.id.startsWith(`${scope}.compact.`));
    const strip = paints.find((p) => p.id.endsWith(".footer"))!;
    const edge = paints.find((p) => p.id.endsWith(".footer-edge"))!;
    expect(strip.yMm + strip.heightMm).toBe(297);
    expect(strip.heightMm + edge.heightMm).toBe(4);
    expect(edge.yMm).toBe(293);
    expect(strip.opacity).toBe(0.92);
    expect(strip.fill?.color).toBe(scope === "letter" ? "111827" : "111111");
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
  expect(paint.opacity).toBe(0.68);
  expect(model.cover.headerShapes!.some((b) => b.id === "cover.trenner")).toBe(false);
  validateBriefIntegrationModel(model, "modern");
  expect(() => validateBriefIntegrationModel(model)).toThrow("Nicht freigegebene");
  await expect(renderDossierDocx(model)).rejects.toThrow();
  const entries = readZipEntries(
    new Uint8Array(
      await (
        await renderDossierDocx(model, {
          allowUnacceptedModelIssues: true,
          rasterizeDecoration: async () => ({
            bytes: Uint8Array.from(
              Buffer.from(
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==",
                "base64",
              ),
            ),
            widthPx: 1,
            heightPx: 1,
            extension: "png",
            contentType: "image/png",
          }),
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
    expect(() => buildDossierDocModel(s, options(m))).toThrow("non-square CSS");
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
