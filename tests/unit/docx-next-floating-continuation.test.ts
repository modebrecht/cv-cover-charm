import { expect, test } from "bun:test";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { validateDossierDocModel } from "../../src/lib/docx-next/validation";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { briefFixture } from "../fixtures/docx-next/brief";
import {
  SIDEBAR_FLOATING_CONTINUATION_CASES,
  sidebarFloatingContinuationFixture,
} from "../fixtures/docx-next/sidebar-floating-continuation";

test("native document continuation stays guarded even without a positioned table or issues, and after JSON", async () => {
  const model = buildDossierDocModel(briefFixture("normal"));
  model.issues = [];
  model.floatingTableTextFlow = "all-pages";
  await expect(renderDossierDocx(model)).rejects.toThrow(
    "floating table continuation is unaccepted",
  );
  await expect(renderDossierDocx(JSON.parse(JSON.stringify(model)))).rejects.toThrow(
    "floating table continuation is unaccepted",
  );
});

test("restored native continuation rejects unknown policies rather than silently treating them as default", () => {
  const model = buildDossierDocModel(briefFixture("normal"));
  for (const value of [null, false, true, "last-page", "ALL-PAGES", {}, 1]) {
    const restored = JSON.parse(JSON.stringify(model));
    restored.floatingTableTextFlow = value;
    expect(() => validateDossierDocModel(restored)).toThrow(
      "invalid floating table continuation policy",
    );
  }
});

test("all twelve mirrored native controls alter only the one documented setting and retain immutable JSON", async () => {
  expect(SIDEBAR_FLOATING_CONTINUATION_CASES).toHaveLength(12);
  for (const value of SIDEBAR_FLOATING_CONTINUATION_CASES) {
    const { model } = sidebarFloatingContinuationFixture(value);
    const original = sidebarFloatingContinuationFixture({ ...value, policy: "default" }).model;
    const before = structuredClone(model),
      normalized = structuredClone(model);
    delete normalized.floatingTableTextFlow;
    expect(normalized).toEqual(original);
    const options = { allowUnacceptedModelIssues: true };
    const bytes = new Uint8Array(await (await renderDossierDocx(model, options)).arrayBuffer());
    const control = new Uint8Array(
      await (await renderDossierDocx(original, options)).arrayBuffer(),
    );
    expect(
      new Uint8Array(
        await (await renderDossierDocx(JSON.parse(JSON.stringify(model)), options)).arrayBuffer(),
      ),
    ).toEqual(bytes);
    expect(model).toEqual(before);
    const entries = readZipEntries(bytes),
      originals = readZipEntries(control);
    expect(entries.map((entry) => entry.name)).toEqual(originals.map((entry) => entry.name));
    for (let index = 0; index < entries.length; index++) {
      const current = entries[index],
        previous = originals[index];
      if (current.name === "word/settings.xml" && value.policy === "all-pages") {
        const settings = new TextDecoder().decode(current.bytes);
        const flag =
          '<w:compatSetting w:name="allowTextAfterFloatingTableBreak" w:uri="http://schemas.microsoft.com/office/word" w:val="1"/>';
        expect(settings.split(flag)).toHaveLength(2);
        expect(settings.replace(flag, "")).toEqual(new TextDecoder().decode(previous.bytes));
      } else expect(current.bytes).toEqual(previous.bytes);
    }
  }
});
