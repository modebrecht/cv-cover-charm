import { buildDossierDocModel } from "../../../src/lib/docx-next/build-model";
import { sidebarFixture, type SidebarFixture } from "./sidebar";

export const PICTURE_OWNERSHIP_CASES = [
  "left",
  "both-long-right",
  "photo-left",
  "photo-right",
  "photo-free-mirrored-side",
  "photo-free-portrait",
] as const;

export function pictureOwnershipFixture(
  kind: (typeof PICTURE_OWNERSHIP_CASES)[number],
  source: string,
) {
  const input = sidebarFixture(
    kind === "both-long-right" ? "both-long" : (kind as SidebarFixture),
    source,
  );
  if (kind === "both-long-right") input.settings.sidebarSide = "right";
  const model = buildDossierDocModel(input, {
    cvSidebarComposition: "body-stories",
    chromeFirstPageIdentity: "distinct-stories",
  });
  return { input, model };
}
