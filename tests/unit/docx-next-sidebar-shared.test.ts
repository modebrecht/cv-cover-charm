import { expect, test } from "bun:test";
import { cvFrameFor } from "../../src/components/cv/archetype";
import { cvSidebarGeometry } from "../../src/components/cv/sidebar-geometry";
import { DEFAULT_DOSSIER_CHROME_OPTIONS } from "../../src/lib/dossier-chrome";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { walkBlocks, type TableBlock } from "../../src/lib/docx-next/model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { sidebarFixture } from "../fixtures/docx-next/sidebar";

const presentation = { pageMargins: null, continuationTopMarginMm: 10 };
for (const side of ["left", "right"] as const) {
  test(`shared authored A4 rail and text gutter: ${side}`, () => {
    const g = cvSidebarGeometry(
      cvFrameFor("modern"),
      0,
      0.3,
      DEFAULT_DOSSIER_CHROME_OPTIONS,
      presentation,
      side,
    );
    expect(g.rail.widthMm).toBe(63);
    expect(g.rail.leftMm).toBe(side === "left" ? 0 : 147);
    expect(g.sideText.widthMm).toBe(47.5);
    expect(g.sideText.leftMm).toBe(side === "left" ? 8 : 155);
    expect(g.mainText.leftMm).toBe(side === "left" ? 71 : 20);
    expect(g.mainText.widthMm).toBe(119);
  });
  test(`native rail, fixed grid and picture ownership use authored geometry: ${side}`, async () => {
    const input = sidebarFixture(
      side === "left" ? "photo-free-side" : "photo-free-mirrored-side",
    );
    const source = structuredClone(input);
    const model = buildDossierDocModel(input, {
      cvSidebarComposition: "shared-body-stories",
    });
    expect(input).toEqual(source);
    const surface = model.cv.artwork.find(
      (a) => a.id === "cv.artwork.sidebar-surface",
    )!;
    expect(surface.widthMm).toBe(63);
    expect(surface.xMm).toBe(side === "left" ? 0 : 147);
    expect(surface.heightMm).toBe(297);
    const table = model.cv.blocks.find((b) => b.kind === "table") as TableBlock;
    expect(table.widths).toEqual(side === "left" ? [63, 8, 119] : [119, 8, 63]);
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0].keepTogether).toBe(false);
    const paint = table.rows[0].cellDecorations![side === "left" ? 0 : 2]!;
    expect(paint.paddingLeftMm).toBe(8);
    expect(paint.paddingRightMm).toBe(7.5);
    const photo = walkBlocks(model.cv.blocks).find(
      (b) => b.id === "cv.person.photo",
    )!;
    expect(photo.kind).toBe("image");
    if (photo.kind !== "image") throw Error("Missing picture");
    expect(photo.nativeOwner).toBe("page-frame");
    expect(photo.sourceLayout?.xMm).toBe(25);
    expect(photo.xMm).toBe(side === "left" ? 25 : 151);
    expect(photo.yMm).toBe(20);
    expect(photo.widthMm).toBe(34);
    expect(photo.frame?.zoom).toBe(1.25);
    await expect(renderDossierDocx(model)).rejects.toThrow(/unaccepted/);
    const blob = await renderDossierDocx(model, {
      allowUnacceptedModelIssues: true,
      normalizeImage: async () => ({
        bytes: Uint8Array.from(
          atob(
            "iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR4nGP4z8Dwn4GBgQEADfsB/4fYjl4AAAAASUVORK5CYII=",
          ),
          (c) => c.charCodeAt(0),
        ),
        widthPx: 2,
        heightPx: 1,
        extension: "png",
        contentType: "image/png",
      }),
    });
    const xml = new TextDecoder().decode(
      readZipEntries(new Uint8Array(await blob.arrayBuffer())).find(
        (p) => p.name === "word/document.xml",
      )!.bytes,
    );
    expect(xml).toContain('layoutInCell="0"');
    expect(xml).toContain(
      `<wp:positionH relativeFrom="page"><wp:posOffset>${(photo.xMm - 0.4) * 36000}</wp:posOffset>`,
    );
    expect(xml).toContain(
      '<wp:positionV relativeFrom="page"><wp:posOffset>705600</wp:posOffset>',
    );
    expect(xml.match(/<w:tag w:val="cv.person.photo"\/>/g)).toHaveLength(1);
    expect(xml).toContain("<w:picture/>");
  });
}

test("shared grid preserves authored margins and the full Web sidebar width range", () => {
  for (const pct of [0.22, 0.3, 0.5]) {
    const input = sidebarFixture("left");
    input.cv.design.sidebarPct = pct;
    const model = buildDossierDocModel(input, {
      cvSidebarComposition: "shared-body-stories",
    });
    expect(
      model.cv.artwork.find((a) => a.id === "cv.artwork.sidebar-surface")!
        .widthMm,
    ).toBe(Math.round(210 * pct));
  }
  for (const side of ["left", "right"] as const) {
    const g = cvSidebarGeometry(
      cvFrameFor("citrus"),
      0,
      0.3,
      DEFAULT_DOSSIER_CHROME_OPTIONS,
      {
        ...presentation,
        pageMargins: { top: 40, bottom: 1, left: 104, right: 36 },
      },
      side,
    );
    expect(g.rail.leftMm).toBe(side === "left" ? 12 : 135);
    expect(g.mainText.leftMm).toBe(side === "left" ? 104 : 36);
    expect(g.mainText.widthMm).toBe(70);
  }
});

test("a picture crossing the authored gutter fails instead of being shifted or shrunk", () => {
  const input = sidebarFixture("photo-free-side");
  input.settings.cvPhotoPlacement!.xMm = 45;
  expect(() =>
    buildDossierDocModel(input, {
      cvSidebarComposition: "shared-body-stories",
    }),
  ).toThrow(/fit one shared Sidebar area/);
});

test("shared geometry is explicit and classic CV stays unchanged", () => {
  const input = sidebarFixture("left");
  input.settings.cvLayout = "classic";
  const before = buildDossierDocModel(input);
  expect(() =>
    buildDossierDocModel(input, {
      cvSidebarComposition: "shared-body-stories",
    }),
  ).toThrow(/invalid diagnostic Sidebar composition/);
  expect(buildDossierDocModel(input)).toEqual(before);
});

test("shared Sidebar retains the explicit page-start gate", () => {
  const input = sidebarFixture("left");
  input.cv.data.sectionLayouts = { schule: { page: 2 } };
  expect(() =>
    buildDossierDocModel(input, {
      cvSidebarComposition: "shared-body-stories",
    }),
  ).toThrow(/unsupported shared Sidebar content cv.section.schule/);
});

test("automatic rail photos use Web compact sizing while free-photo width stays authored", () => {
  const input = sidebarFixture("photo-left");
  const model = buildDossierDocModel(input, {
    cvSidebarComposition: "shared-body-stories",
  });
  const photo = walkBlocks(model.cv.blocks).find(
    (b) => b.id === "cv.person.photo",
  );
  expect(photo?.kind === "image" && photo.widthMm).toBe(28);
  expect(input.settings.cvPhotoPlacement!.widthMm).toBe(34);
});

test("first-page lead belongs to cell boundary paragraphs, not recurring top padding", () => {
  const input = sidebarFixture("continuation");
  const model = buildDossierDocModel(input, {
    cvSidebarComposition: "shared-body-stories",
  });
  const table = model.cv.blocks.find((b) => b.kind === "table") as TableBlock;
  expect(table.bodyBoundaryLeadByCellMm?.[2]).toBeGreaterThan(0);
  expect(table.rows[0].cellDecorations![2]!.paddingTopMm).toBe(0);
});
