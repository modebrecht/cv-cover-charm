import { expect, test } from "bun:test";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { validateDossierDocModel } from "../../src/lib/docx-next/validation";
import {
  CONTAINER_IDENTITY_CASES,
  containerIdentityFixture,
} from "../fixtures/docx-next/sidebar-container-identity";

test("native table identity annotations cannot bypass the diagnostic export gate by removing issues", async () => {
  const { model } = containerIdentityFixture(CONTAINER_IDENTITY_CASES[1]);
  model.issues = [];
  for (const candidate of [model, JSON.parse(JSON.stringify(model))])
    await expect(renderDossierDocx(candidate)).rejects.toThrow(
      "table identity carrier is unaccepted",
    );
  const header = structuredClone(model);
  header.cv.header = header.cv.blocks;
  header.cv.blocks = [];
  await expect(renderDossierDocx(header)).rejects.toThrow("table identity carrier is unaccepted");
});

test("malformed native identity carrier declarations fail explicitly", () => {
  for (const value of [false, true, null, 1, "caption", "", {}]) {
    const { model } = containerIdentityFixture(CONTAINER_IDENTITY_CASES[1]);
    Object.assign(model.cv.blocks[0], { identityCarrier: value });
    expect(() => validateDossierDocModel(model)).toThrow("invalid table identity carrier");
  }
  const { model } = containerIdentityFixture(CONTAINER_IDENTITY_CASES[1]);
  const table = model.cv.blocks[0];
  if (table.kind !== "table") throw Error("Missing table");
  table.rows = [];
  expect(() => validateDossierDocModel(model)).toThrow("invalid table identity carrier");
});
