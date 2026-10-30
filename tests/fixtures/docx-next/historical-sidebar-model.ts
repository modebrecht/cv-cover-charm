/** Frozen auxiliary stories for the original native Sidebar ownership experiments. */
import assert from "node:assert/strict";
import { buildDossierDocModel } from "../../../src/lib/docx-next/build-model";
import { briefFixture } from "./brief";

export function historicalSidebarControlModel() {
  const model = buildDossierDocModel(briefFixture("normal"));
  // The old experiments predate this application field. Restore their declared
  // input, rather than accepting a new package hash for an old native result.
  // Their existing complete-package pins still reject every other difference.
  const heading = model.letter.blocks.filter((block) => block.id === "letter.attachments-heading");
  assert.equal(heading.length, 1);
  assert(heading[0].kind === "paragraph");
  assert.equal(heading[0].runs.map((run) => run.text).join(""), "Beilagen");
  model.letter.blocks = model.letter.blocks.filter((block) => block !== heading[0]);
  return model;
}
