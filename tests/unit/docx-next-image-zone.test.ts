import { expect, test } from "bun:test";
import { sidebarFixture } from "../fixtures/docx-next/sidebar";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { imageZoneFromPage, imageZoneTable } from "../../src/lib/docx-next/image-zone";
import { parallelFlowTable } from "../../src/lib/docx-next/parallel-flow";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { paintPng } from "../../src/lib/docx-next/artwork";
import {
  walkBlocks,
  type ImageBlock,
  type ImageZoneBlock,
  type ParallelFlowBlock,
} from "../../src/lib/docx-next/model";

const freeInput = (xMm = 150, yMm = 20) => {
  const input = sidebarFixture("photo-left");
  Object.assign(input.settings.cvPhotoPlacement!, { mode: "frei", xMm, yMm });
  return input;
};

test("free photo owns a native zone and retains authored coordinates, frame and source identity", () => {
  const input = freeInput(150, 45),
    before = structuredClone(input);
  const model = buildDossierDocModel(input);
  const flow = model.cv.blocks.find((b): b is ParallelFlowBlock => b.kind === "parallel-flow")!;
  const zone = flow.tracks[1].blocks[0] as ImageZoneBlock;
  expect(zone.kind).toBe("image-zone");
  expect(zone.sourceLayout).toEqual({ xMm: 150, yMm: 45, widthMm: 34, minimumHeightMm: 34 });
  expect(zone.image).toMatchObject({
    id: "cv.person.photo",
    placement: "inline",
    source: "sidebar-photo",
    frame: { zoom: 1.25, xPct: 42, yPct: 58, borderWidthMm: 0.4 },
  });
  expect(zone.topInsetMm).toBeCloseTo(24.8);
  expect(zone.leftInsetMm + 75.2 + 0.2).toBeCloseTo(150);
  const table = imageZoneTable(zone, 114.8);
  expect(table.widthMm).toBeCloseTo(34.4);
  expect(table.rows[0].keepTogether).toBe(false);
  expect(parallelFlowTable(flow, 170).rows[0].keepTogether).toBe(true);
  const ids = walkBlocks(model.cv.blocks).map((b) => b.id);
  expect(ids.filter((id) => id === "cv.person.photo")).toHaveLength(1);
  expect(new Set(ids).size).toBe(ids.length);
  expect(input).toEqual(before);
  expect(model).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input))));
});

test("physical mirroring chooses the matching track and below-header photos begin at its body start", () => {
  for (const [xMm, side, track] of [
    [25, "left", 0],
    [150, "right", 0],
    [25, "right", 1],
  ] as const) {
    const input = freeInput(xMm);
    input.settings.sidebarSide = side;
    input.settings.chrome = sidebarFixture("contact").settings.chrome;
    const model = buildDossierDocModel(input);
    const flow = model.cv.blocks.find((b): b is ParallelFlowBlock => b.kind === "parallel-flow")!;
    const zone = flow.tracks[track].blocks[0] as ImageZoneBlock;
    expect(zone.kind).toBe("image-zone");
    expect(zone.topInsetMm).toBe(0);
    expect(zone.sourceLayout.xMm).toBe(xMm);
    expect(zone.sourceLayout.yMm).toBe(20);
  }
});

test("invalid or unrepresentable image zones fail without resizing, crossing a gutter or losing the picture", () => {
  for (const xMm of [0, 60, 185])
    expect(() => buildDossierDocModel(freeInput(xMm))).toThrow(
      "free photo must fit one native track",
    );
  expect(() => buildDossierDocModel(freeInput(150, 250))).toThrow(
    "image zone exceeds its first-page body",
  );
  const zone = walkBlocks(buildDossierDocModel(freeInput()).cv.blocks).find(
    (b): b is ImageZoneBlock => b.kind === "image-zone",
  )!;
  const original = JSON.stringify(zone);
  expect(() => imageZoneTable(zone, 34)).toThrow("exceeds its native track");
  for (const value of [-1, Infinity, NaN]) {
    expect(() => imageZoneTable({ ...zone, topInsetMm: value }, 170)).toThrow();
    expect(() => imageZoneTable({ ...zone, leftInsetMm: value }, 170)).toThrow();
  }
  const floating: ImageBlock = {
    ...zone.image,
    placement: "free",
    coordinateOrigin: "page",
    xMm: 150,
    yMm: 20,
  };
  expect(() =>
    imageZoneFromPage(
      { ...floating, frame: undefined },
      { leftMm: 75, topMm: 20, widthMm: 115, heightMm: 257 },
    ),
  ).toThrow("declared frame");
  expect(() =>
    imageZoneFromPage(
      { ...floating, maxHeightMm: 20 },
      { leftMm: 75, topMm: 20, widthMm: 115, heightMm: 257 },
    ),
  ).toThrow("cannot shrink");
  expect(JSON.stringify(zone)).toBe(original);
});

test("the shared renderer emits one native picture with its source identity, crop, frame and flow-zone cell", async () => {
  const model = buildDossierDocModel(freeInput(150, 45));
  let normalizations = 0;
  const blob = await renderDossierDocx(model, {
    normalizeImage: async () => {
      normalizations++;
      return {
        bytes: paintPng({ color: "123456" }),
        widthPx: 1,
        heightPx: 1,
        contentType: "image/png",
        extension: "png",
      };
    },
  });
  const files = readZipEntries(new Uint8Array(await blob.arrayBuffer()));
  const document = new TextDecoder().decode(
    files.find((f) => f.name === "word/document.xml")!.bytes,
  );
  expect(normalizations).toBe(1);
  expect(files.filter((f) => f.name.startsWith("word/media/image-"))).toHaveLength(1);
  expect(document).toContain('w:tblCaption w:val="cv.person.photo.zone"');
  expect(document.match(/w:tag w:val="cv.person.photo"/g)).toHaveLength(1);
  expect(document).toContain('<wp:extent cx="1224000" cy="1224000"/>');
  expect(document).toContain('<a:prstGeom prst="ellipse">');
  expect(document).toContain('<a:srcRect l="8400" t="11600" r="11600" b="8400"/>');
  expect(document).toContain('w:tag w:val="cv.person.email"');
  expect(document).not.toContain("<w:txbxContent");
  expect(document).not.toContain("<wp:anchor");
  model.cv.blocks = [];
  await expect(renderDossierDocx(model)).rejects.toThrow("sidebar requires native parallel flow");
});
