import { describe, expect, test } from "bun:test";
import { pictureGeometry } from "../../src/lib/docx-next/picture-geometry";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import type { ImageBlock } from "../../src/lib/docx-next/model";
import { briefFixture } from "../fixtures/docx-next/brief";

const image: ImageBlock = {
  kind: "image",
  id: "test.photo",
  source: "pixels",
  alt: "Photo",
  widthMm: 40,
  maxHeightMm: 80,
  placement: "inline",
  xMm: 0,
  yMm: 0,
  gapMm: 3,
};
const square = {
  heightRatio: 1,
  radiusMm: 999,
  zoom: 1,
  xPct: 50,
  yPct: 50,
  borderWidthMm: 0.5,
  borderColor: "123456",
};
describe("native picture geometry", () => {
  test("unframed photos retain intrinsic aspect ratio within width/height constraints", () => {
    expect(pictureGeometry(image, { widthPx: 120, heightPx: 180 }, 30)).toMatchObject({
      widthMm: 30,
      heightMm: 45,
      crop: { left: 0, right: 0, top: 0, bottom: 0 },
    });
  });
  test("circle crops rather than stretching the source", () => {
    expect(
      pictureGeometry({ ...image, frame: square }, { widthPx: 100, heightPx: 200 }, 100),
    ).toMatchObject({
      widthMm: 40,
      heightMm: 40,
      shape: "ellipse",
      crop: { left: 0, right: 0, top: 25000, bottom: 25000 },
    });
  });
  test("zoom/pan match the editor's centered object-fit crop at each extreme", () => {
    const left = pictureGeometry(
      { ...image, frame: { ...square, zoom: 2, xPct: 0, yPct: 0 } },
      { widthPx: 200, heightPx: 100 },
      100,
    );
    const right = pictureGeometry(
      { ...image, frame: { ...square, zoom: 2, xPct: 100, yPct: 100 } },
      { widthPx: 200, heightPx: 100 },
      100,
    );
    expect(left.crop).toEqual({ left: 25000, right: 50000, top: 0, bottom: 50000 });
    expect(right.crop).toEqual({ left: 50000, right: 25000, top: 50000, bottom: 0 });
  });
  test("nonfinite and unsafe dimensions cannot enter a picture package", () => {
    expect(() =>
      pictureGeometry({ ...image, widthMm: NaN }, { widthPx: 100, heightPx: 200 }, 100),
    ).toThrow("dimensions");
    expect(() =>
      pictureGeometry(
        { ...image, frame: { ...square, zoom: 0 } },
        { widthPx: 100, heightPx: 200 },
        100,
      ),
    ).toThrow("frame");
  });
  test("CV page placement and picture frame are deterministic explicit model metadata", () => {
    const input = briefFixture();
    input.cv.data.person.foto = "pixels";
    input.settings.cvPhotoStyle = { shape: "circle", zoom: 2, x: 20, y: 70, borderWidth: 1 };
    input.settings.cvPhotoPlacement = {
      mode: "frei",
      widthMm: 35,
      xMm: 130,
      yMm: 25,
      frameColor: "#123456",
    };
    const model = buildDossierDocModel(input),
      photo = model.cv.blocks[0];
    expect(photo).toMatchObject({
      kind: "image",
      id: "cv.person.photo",
      placement: "free",
      coordinateOrigin: "page",
      xMm: 130,
      yMm: 25,
      widthMm: 35,
      frame: { heightRatio: 1, zoom: 2, radiusMm: 999, borderColor: "123456" },
    });
    expect(buildDossierDocModel(structuredClone(input))).toEqual(model);
    input.settings.cvPhotoPlacement.mode = "auto";
    expect(buildDossierDocModel(input).cv.blocks[0]).toMatchObject({
      placement: "right",
      coordinateOrigin: "content",
    });
  });
});
