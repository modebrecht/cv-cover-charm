import { expect, test } from "bun:test";
import fixture from "../fixtures/docx-next/sidebar-contact-chrome-23okt.json";
import { DEFAULT_DOSSIER_CHROME_STATE } from "../../src/lib/dossier-chrome";
import { buildAppDocxNextModel } from "../../src/lib/dossier-docx-next-export";
import { assertAppDocxNextSource } from "../../src/lib/docx-next/app-source";
import type { DossierAppSnapshot } from "../../src/lib/docx-next/source";
import type { InteriorTextMetrics } from "../../src/lib/docx-next/interior-metrics";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { validateDossierDocModel } from "../../src/lib/docx-next/validation";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { firstPageChromePaint } from "../../src/lib/docx-next/page-artwork";

function setup() {
  const source = structuredClone(fixture.snapshot) as unknown as DossierAppSnapshot;
  source.settings.chrome = structuredClone(DEFAULT_DOSSIER_CHROME_STATE);
  const interior = {
    ...structuredClone(fixture.interiorMetrics),
    sourceKey: JSON.stringify(source),
    headers: {},
  } as InteriorTextMetrics;
  return { source, measured: { interior } };
}

test("body-paint preview changes only the first-page paint owner, leaving source and semantic model intact", () => {
  const { source, measured } = setup(),
    before = structuredClone(source);
  const baseline = buildAppDocxNextModel(source, measured, "letter");
  const candidate = buildAppDocxNextModel(source, measured, "letter", {
    compactChromeBodyPaintPreview: true,
  });
  expect(candidate.letter.firstPageChromePaintOwner).toBe("body");
  delete candidate.letter.firstPageChromePaintOwner;
  expect(candidate).toEqual(baseline);
  expect(source).toEqual(before);
});

test("body chrome excludes opaque paper so native rubric graphics stay visible", () => {
  const { source, measured } = setup();
  const model = buildAppDocxNextModel(source, measured, "letter");
  const paint = firstPageChromePaint(model.letter);
  expect(paint.body.layers?.some((layer) => layer.id.includes(".paper"))).toBe(false);
  expect(paint.header?.layers?.some((layer) => layer.id.includes(".paper"))).toBe(true);
  expect(
    paint.body.layers?.every((layer) => layer.yMm + layer.heightMm <= 4 || layer.yMm >= 293),
  ).toBe(true);
});

test("first-page paint is body-owned at native page extents; recurring continuation paint remains in the header", async () => {
  const { source, measured } = setup();
  const model = buildAppDocxNextModel(source, measured, "letter", {
    compactChromeBodyPaintPreview: true,
  });
  const asset = {
    bytes: new Uint8Array([1, 2, 3]),
    widthPx: 2,
    heightPx: 1,
    extension: "png" as const,
    contentType: "image/png" as const,
  };
  const renderOptions = {
    allowUnacceptedModelIssues: true,
    rasterizeDecoration: async () => asset,
    normalizeImage: async () => asset,
  };
  const packageFor = async (m: typeof model) =>
    Object.fromEntries(
      readZipEntries(
        new Uint8Array(await (await renderDossierDocx(m, renderOptions)).arrayBuffer()),
      ).map(({ name, bytes }) => [name, new TextDecoder().decode(bytes)]),
    );
  const baseline = structuredClone(model);
  delete baseline.letter.firstPageChromePaintOwner;
  const [a, b] = await Promise.all([packageFor(baseline), packageFor(model)]);
  expect(b["word/document.xml"]).toContain('name="letter.chrome-paint.first"');
  expect(b["word/letter-header-first.xml"]).not.toContain('name="letter.chrome-paint.first"');
  expect(b["word/letter-header.xml"]).toContain('name="letter.page-paint.continuation"');
  expect(b["word/document.xml"]).toContain('cx="7560945" cy="10692765"');
  const paintAnchor = b["word/document.xml"].match(
    /<wp:anchor[^>]*>[\s\S]*?name="letter.chrome-paint.first"[\s\S]*?<\/wp:anchor>/,
  )?.[0];
  expect(paintAnchor).toContain('layoutInCell="0"');
  expect(paintAnchor).toContain('behindDoc="1"');
  const textFlow = (xml: string) =>
    xml.replace(/<w:r><w:drawing>[\s\S]*?<\/w:drawing><\/w:r>/g, "");
  expect(textFlow(b["word/document.xml"])).toBe(textFlow(a["word/document.xml"]));
  expect(b["word/styles.xml"]).toBe(a["word/styles.xml"]);
  expect(b["word/settings.xml"]).toBe(a["word/settings.xml"]);
});

test("body paint rejects semantic header content and invalid coverage instead of hiding it", () => {
  const { source, measured } = setup();
  const candidate = buildAppDocxNextModel(source, measured, "letter", {
    compactChromeBodyPaintPreview: true,
  });
  for (const kind of ["semantic", "coverage"] as const) {
    const bad = structuredClone(candidate);
    if (kind === "coverage") delete bad.letter.pagePaintCoverage;
    else
      bad.letter.header.push({
        ...structuredClone(candidate.letter.header[0]),
        kind: "paragraph",
        id: "letter.forbidden-header",
        runs: [
          {
            id: "forbidden-run",
            text: "Never hide this",
            style: { font: "Arial", sizePt: 10, color: "111827" },
          },
        ],
      });
    expect(() => validateDossierDocModel(bad)).toThrow(/empty compact/);
  }
  source.settings.chrome!.shared.headerMode = "contact";
  expect(() =>
    assertAppDocxNextSource(source, "letter", { compactChromeBodyPaintPreview: true }),
  ).toThrow(/Farbansicht/);
});
