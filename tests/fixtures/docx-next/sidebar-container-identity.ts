/** Native container annotation hypothesis. No photos, nesting or pagination changes. */
import assert from "node:assert/strict";
import { pictureIdentityFixture } from "./sidebar-picture-identity";

export const CONTAINER_IDENTITY_CASES = (["single", "left", "right"] as const).flatMap((owner) =>
  (["caption-only", "cell-ending"] as const).map((carrier) => ({
    name: `container-identity-${owner}-${carrier}`,
    owner,
    carrier,
  })),
);
export type ContainerIdentityCase = (typeof CONTAINER_IDENTITY_CASES)[number];

export function containerIdentityFixture(value: ContainerIdentityCase) {
  const originalName = `picture-identity-${value.owner}-plain`;
  const { model, fixture } = pictureIdentityFixture(
    { name: originalName, owner: value.owner, photo: false },
    "unused:no-photo-container-control",
  );
  const table = model.cv.blocks[0];
  assert(table.kind === "table");
  if (value.carrier === "cell-ending") table.identityCarrier = "cell-ending";
  return {
    model,
    fixture: {
      ...fixture,
      ...value,
      fixture: value.name,
      originalName,
      tableId: table.id,
      cellFields: table.rows[0].cells.map((cell) =>
        cell.map((block) => {
          assert(block.kind === "paragraph");
          return block.id;
        }),
      ),
    },
  };
}
