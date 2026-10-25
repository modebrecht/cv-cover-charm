/** Minimal native ownership controls; never a production template or export repair. */
import assert from "node:assert/strict";
import { buildDossierDocModel } from "../../../src/lib/docx-next/build-model";
import { walkBlocks, type DocBlock, type Paragraph } from "../../../src/lib/docx-next/model";
import { briefFixture } from "./brief";
import { sidebarFixture } from "./sidebar";

export const PICTURE_IDENTITY_CASES = (["body", "single", "left", "right"] as const).flatMap(
  (owner) =>
    [false, true].map((photo) => ({
      name: `picture-identity-${owner}-${photo ? "photo" : "plain"}`,
      owner,
      photo,
    })),
);
export type PictureIdentityCase = (typeof PICTURE_IDENTITY_CASES)[number];
export const PICTURE_FRAME_CASES = [
  { name: "picture-frame-uncropped-rect", owner: "body", photo: true, crop: false, ellipse: false },
  {
    name: "picture-frame-uncropped-ellipse",
    owner: "body",
    photo: true,
    crop: false,
    ellipse: true,
  },
  { name: "picture-frame-cropped-rect", owner: "body", photo: true, crop: true, ellipse: false },
  { name: "picture-frame-cropped-ellipse", owner: "body", photo: true, crop: true, ellipse: true },
] as const;
export type PictureFrameCase = (typeof PICTURE_FRAME_CASES)[number];
// Separate prospective control; the original four-case stopped matrix stays unchanged.
// These declarative values describe the measured window, not a renderer correction.
export const PICTURE_PRECISION_CASES = [
  PICTURE_FRAME_CASES[0],
  {
    name: "picture-precision-declared-crop-rect",
    owner: "body",
    photo: true,
    crop: true,
    ellipse: false,
    precision: true,
  },
] as const;
export type PicturePrecisionCase = (typeof PICTURE_PRECISION_CASES)[number];
export const PICTURE_WINDOW_CASES = [
  PICTURE_PRECISION_CASES[1],
  {
    name: "picture-window-right-lower",
    owner: "body",
    photo: true,
    crop: true,
    ellipse: false,
    declaredCrop: { left: 14992, top: 25005, right: 5008, bottom: 21667 },
  },
  {
    name: "picture-window-left-upper",
    owner: "body",
    photo: true,
    crop: true,
    ellipse: false,
    declaredCrop: { left: 2992, top: 20008, right: 17008, bottom: 26664 },
  },
  {
    name: "picture-window-increased-zoom",
    owner: "body",
    photo: true,
    crop: true,
    ellipse: false,
    declaredCrop: { left: 20000, top: 30002, right: 13323, bottom: 25551 },
  },
] as const;
export type PictureWindowCase = (typeof PICTURE_WINDOW_CASES)[number];
// Independent original photos; frame settings and complete semantic fields stay fixed.
export const PICTURE_SIZE_CASES = [
  PICTURE_PRECISION_CASES[1],
  {
    ...PICTURE_PRECISION_CASES[1],
    name: "picture-size-240x360",
    sourceKey: "icc-jpeg-240x360",
    originalPixels: { width: 240, height: 360 },
  },
  {
    ...PICTURE_PRECISION_CASES[1],
    name: "picture-size-600x900",
    sourceKey: "icc-jpeg-600x900",
    originalPixels: { width: 600, height: 900 },
  },
] as const;
export type PictureSizeCase = (typeof PICTURE_SIZE_CASES)[number];
export const PICTURE_SIZED_SHAPE_CASES = [
  PICTURE_PRECISION_CASES[1],
  ...([false, true] as const).map((ellipse) => ({
    ...PICTURE_FRAME_CASES[2],
    name: `picture-sized-240x360-declared-${ellipse ? "ellipse" : "rect"}`,
    ellipse,
    sourceKey: "icc-jpeg-240x360",
    originalPixels: { width: 240, height: 360 },
    declaredCrop: { left: 8394, top: 24388, right: 11606, bottom: 22257 },
  })),
] as const;
export type PictureSizedShapeCase = (typeof PICTURE_SIZED_SHAPE_CASES)[number];

export function pictureIdentityFixture(
  value:
    | PictureIdentityCase
    | PictureFrameCase
    | PicturePrecisionCase
    | PictureWindowCase
    | PictureSizeCase
    | PictureSizedShapeCase,
  source: string,
) {
  const model = buildDossierDocModel(briefFixture("normal"));
  const canonical = buildDossierDocModel(sidebarFixture("photo-main", source));
  const picture = walkBlocks(canonical.cv.blocks).find((block) => block.kind === "image");
  assert(picture?.kind === "image");
  // Same canonical identity/source/frame everywhere; only remove absolute placement once.
  const image = {
    ...picture,
    placement: "inline" as const,
    align: "left" as const,
    xMm: 0,
    yMm: 0,
    coordinateOrigin: "content" as const,
  };
  if ("crop" in value) {
    assert(image.frame);
    image.frame = {
      ...image.frame,
      radiusMm: value.ellipse ? 999 : 0,
      ...(!value.crop ? { heightRatio: 1.5, zoom: 1, xPct: 50, yPct: 50 } : {}),
    };
    if (!value.crop) image.maxHeightMm = Math.max(image.maxHeightMm, image.widthMm * 1.5);
    if ("precision" in value) {
      // 120×180 original grid: retain 80% width and 53.349% height.
      const ratio = (1.5 * 0.53349) / 0.8;
      image.frame = {
        ...image.frame,
        heightRatio: ratio,
        zoom: 1.25,
        xPct: 41.89,
        yPct: ((0.24396 - (1.5 - ratio) / 3) * 750) / ratio,
      };
    }
  }
  if ("declaredCrop" in value) {
    assert(image.frame);
    const crop = value.declaredCrop;
    const width = 1 - (crop.left + crop.right) / 100000;
    const height = 1 - (crop.top + crop.bottom) / 100000;
    const ratio = (1.5 * height) / width;
    const zoom = 1 / width;
    assert(ratio <= 1.5 && zoom > 1 && zoom <= 3);
    image.frame = {
      ...image.frame,
      heightRatio: ratio,
      zoom,
      xPct: (100 * crop.left) / (crop.left + crop.right),
      yPct: (100 * (crop.top / 100000 - (1.5 - ratio) / 3) * zoom * 1.5) / ((zoom - 1) * ratio),
    };
  }
  const style = walkBlocks(model.cv.blocks).find(
    (block): block is Paragraph => block.kind === "paragraph",
  )!.runs[0].style;
  function paragraph(id: string, text: string): Paragraph {
    return {
      kind: "paragraph",
      id,
      role: "body",
      runs: [{ id: id + ".run", fieldId: id, text, style: { ...style, sizePt: 11, bold: false } }],
      align: "left",
      beforeMm: 0,
      afterMm: 2,
      lineHeight: 1.15,
      keepNext: false,
      keepLines: true,
    };
  }
  const main = [
    paragraph("cv.identity.before", "Before picture: editable identity control."),
    ...(value.photo ? [image] : []),
    paragraph(
      "cv.identity.after",
      "After picture: complete field identity survives independently of visible text.",
    ),
    paragraph(
      "cv.identity.description",
      "A complete description contains accents Ä ö ü é è à, punctuation, and several sentences. Every word must remain editable and visible after native Save/Reopen. This paragraph is never split into new semantic fields.",
    ),
  ];
  const neighbour = [
    paragraph("cv.identity.neighbour.before", "Adjacent cell: separate editable field."),
    paragraph(
      "cv.identity.neighbour.description",
      "The neighbouring description must retain its original semantic identity even when the picture belongs to another cell. Complete text alone cannot establish this.",
    ),
  ];
  const width = model.cv.page.widthMm - model.cv.page.margins.left - model.cv.page.margins.right;
  assert(image.widthMm < width / 2);
  const cells =
    value.owner === "single"
      ? [[...main, ...neighbour]]
      : value.owner === "right"
        ? [neighbour, main]
        : [main, neighbour];
  const blocks: DocBlock[] =
    value.owner === "body"
      ? [...main, ...neighbour]
      : [
          {
            kind: "table",
            id: "cv.identity.container",
            widths: cells.map(() => 1),
            widthMm: width,
            rows: [{ cells, keepTogether: false }],
            decoration: { borderColor: "FFFFFF", borderWidthMm: 0, paddingXMm: 0, paddingYMm: 0 },
          },
        ];
  model.cv.blocks = blocks;
  for (const part of [model.cover, model.letter, model.cv]) {
    if (part.id !== "cv")
      part.blocks = [paragraph(`${part.id}.identity.marker`, `${part.id} identity control.`)];
    part.artwork = [];
    part.headerShapes = [];
    part.header = [];
    part.firstHeader = [];
    part.footer = [];
    part.layout = { mode: "classic", side: "left", sidebarFraction: 0.3 };
  }
  model.issues = [
    {
      code: "diagnostic-picture-identity",
      message: "Unaccepted native identity control; no application export.",
    },
  ];
  const fields = walkBlocks(blocks)
    .filter((block): block is Paragraph => block.kind === "paragraph")
    .map((block) => ({ fieldId: block.id, text: block.runs.map((run) => run.text).join("") }));
  return {
    model,
    image,
    fixture: {
      ...value,
      fixture: value.name,
      fields,
      expectedPages: 3,
      margins: model.cv.page.margins,
      pictureCell: value.owner === "right" ? 1 : 0,
      cellWidthMm: value.owner === "left" || value.owner === "right" ? width / 2 : width,
    },
  };
}
