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

export function pictureIdentityFixture(value: PictureIdentityCase, source: string) {
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
