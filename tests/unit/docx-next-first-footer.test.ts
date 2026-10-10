import { expect, test } from "bun:test";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { createDossierDocxNextBlob } from "../../src/lib/docx-next/export";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { sidebarFixture } from "../fixtures/docx-next/sidebar";

const diagnostic = { chromeFirstPageIdentity: "distinct-stories" as const };
test("first footers preserve source fields and styles while declaring distinct native identities", async () => {
  for (const kind of [
    "chrome-leading",
    "chrome-continuation",
    "photo-free-chrome",
    "contact-long",
  ] as const) {
    const input = sidebarFixture(kind),
      before = structuredClone(input);
    const old = buildDossierDocModel(input),
      model = buildDossierDocModel(input, diagnostic);
    expect(input).toEqual(before);
    expect(model).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input)), diagnostic));
    for (const name of ["cover", "letter", "cv"] as const) {
      const { firstFooter, firstHeader, ...originalStories } = model[name];
      if (old[name].firstHeader) Object.assign(originalStories, { firstHeader });
      else if (firstHeader)
        expect(
          firstHeader.map((paragraph) => ({
            ...paragraph,
            id: paragraph.id.replace(".header.first.", ".header."),
            runs: paragraph.runs.map((run) => ({
              ...run,
              id: run.id.replace(".header.first.", ".header."),
            })),
          })),
        ).toEqual(old[name].header);
      expect(originalStories).toEqual(old[name]);
      if (!firstHeader) {
        expect(firstFooter).toBeUndefined();
        continue;
      }
      expect(
        firstFooter!.map((paragraph) => ({
          ...paragraph,
          id: paragraph.id.replace(".footer.first.", ".footer."),
          runs: paragraph.runs.map((run) => ({
            ...run,
            id: run.id.replace(".footer.first.", ".footer."),
          })),
        })),
      ).toEqual(old[name].footer);
      expect(firstFooter![0].id).not.toBe(model[name].footer[0].id);
      expect(firstFooter![0].runs[0].fieldId).toBe(model[name].footer[0].runs[0].fieldId);
    }
  }
  const input = sidebarFixture("chrome-leading");
  await expect(createDossierDocxNextBlob(input, diagnostic)).rejects.toThrow(
    "first footer identity is unaccepted",
  );
  const options = { ...diagnostic, allowUnacceptedModelIssues: true };
  const bytes = new Uint8Array(
    await (await createDossierDocxNextBlob(input, options)).arrayBuffer(),
  );
  const model = buildDossierDocModel(input, diagnostic);
  expect(bytes).toEqual(
    new Uint8Array(
      await (await renderDossierDocx(JSON.parse(JSON.stringify(model)), options)).arrayBuffer(),
    ),
  );
  const zip = readZipEntries(bytes),
    decode = (name: string) =>
      new TextDecoder().decode(zip.find((part) => part.name === name)!.bytes);
  expect(decode("word/document.xml")).toContain(
    '<w:footerReference w:type="first" r:id="cv-footer-first"/>',
  );
  expect(decode("word/cv-footer-first.xml")).toContain('<w:tag w:val="cv.footer.first.content"/>');
  expect(decode("word/cv-footer.xml")).toContain('<w:tag w:val="cv.footer.content"/>');
  model.issues = [];
  await expect(renderDossierDocx(model)).rejects.toThrow("first footer identity is unaccepted");
});

test("first footer stories reject missing first-page scope, duplicate identities and malformed options", async () => {
  const model = buildDossierDocModel(sidebarFixture("chrome-leading"), diagnostic);
  delete model.cv.firstHeader;
  await expect(renderDossierDocx(model, { allowUnacceptedModelIssues: true })).rejects.toThrow(
    "invalid first footer story",
  );
  const duplicate = buildDossierDocModel(sidebarFixture("chrome-leading"), diagnostic);
  duplicate.cv.firstFooter = structuredClone(duplicate.cv.footer);
  await expect(renderDossierDocx(duplicate, { allowUnacceptedModelIssues: true })).rejects.toThrow(
    "duplicate semantic identity",
  );
  for (const value of [null, true, "shared", {}])
    expect(() =>
      buildDossierDocModel(sidebarFixture(), { chromeFirstPageIdentity: value } as never),
    ).toThrow("invalid diagnostic first-page story identity");
  expect(buildDossierDocModel(sidebarFixture(), diagnostic)).toEqual(
    buildDossierDocModel(sidebarFixture()),
  );
});
