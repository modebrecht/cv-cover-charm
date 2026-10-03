import { describe, expect, test } from "bun:test";
import {
  resolveDossierFieldTypographyEntry,
  normalizeDossierFieldTypographyState,
  type DossierFieldTypographyEntry,
} from "../../src/lib/dossier-field-typography";
import {
  cvLineFieldId,
  semanticListItemIds,
  referenceContactFields,
} from "../../src/lib/dossier-semantic-fields";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { walkBlocks } from "../../src/lib/docx-next/model";
import { briefFixture } from "../fixtures/docx-next/brief";
import { cvPdfDocumentFromSaved } from "../../src/lib/dossier-pdf-document";
import {
  DOSSIER_PROJECT_KIND,
  DOSSIER_PROJECT_VERSION,
  parseDossierProject,
} from "../../src/lib/dossier-project";

describe("persistent semantic field typography", () => {
  test("saved-project adapters preserve document title, heading and chrome settings", () => {
    const input = briefFixture();
    const settings = {
      showDocumentTitle: false,
      docTitleFontSizePx: 30,
      docTitleColor: "#123456",
      docTitleBold: false,
      docTitleItalic: true,
      docTitleUnderline: true,
      docTitleMarginBottomPx: 20,
      sectionTitleFontSizePx: 20,
      sectionTitleColor: "#234567",
      sectionTitleBold: false,
      sectionTitleItalic: true,
      sectionTitleUnderline: true,
      sectionTitleMarginBottomPx: 5,
      chromeContent: { headerTitleEnabled: true, headerTitle: "My dossier" },
    };
    const restored = cvPdfDocumentFromSaved(
      JSON.parse(JSON.stringify({ ...input.cv, design: { ...input.cv.design, ...settings } })),
    )!;
    expect(restored.design).toMatchObject(settings);
    const model = buildDossierDocModel({ ...input, cv: restored });
    expect(model.cv.blocks.some((block) => block.id === "cv.documentTitle")).toBe(false);
    const school = walkBlocks(model.cv.blocks).find(
      (block) => block.id === "cv.section.schule.heading",
    )!;
    expect(school.kind === "paragraph" && school.runs[0].style).toMatchObject({
      sizePt: 15,
      color: "234567",
      bold: false,
      italic: true,
      underline: true,
    });
  });
  const entries: DossierFieldTypographyEntry[] = ["one", "two"].map((id) => ({
    scope: "cv",
    key: `field:cv:cv.entry.schule:${id}.title`,
    fieldId: `cv.entry.schule:${id}.title`,
    section: "Schule",
    label: "Titel",
    value: "Identical",
    style: id === "one" ? { italic: true } : { underline: true },
  }));
  test("reload and changed text/labels resolve only the persisted field ID", () => {
    const restored = JSON.parse(JSON.stringify(entries));
    expect(
      resolveDossierFieldTypographyEntry(
        {
          scope: "cv",
          section: "Renamed",
          label: "Changed",
          value: "New content",
          fieldId: entries[1].fieldId,
        },
        restored,
      )?.style,
    ).toEqual({ underline: true });
    expect(
      resolveDossierFieldTypographyEntry(
        {
          scope: "cv",
          section: "Schule",
          label: "Titel",
          value: "Identical",
          fieldId: "cv.entry.schule:unformatted.title",
        },
        restored,
      ),
    ).toBeNull();
  });
  test("an empty semantic field keeps formatting through portable normalization", () => {
    const state = normalizeDossierFieldTypographyState({
      cv: {
        x: {
          fieldId: "cv.person.email",
          section: "Kontakt",
          label: "E-Mail",
          value: "",
          style: { italic: true },
        },
      },
      letter: {},
    });
    expect(state.cv.x.style).toEqual({ italic: true });
    expect(state.cv.x.value).toBe("");
  });
  test("names and date components style independently before rendering", () => {
    const input = briefFixture();
    input.cv.data.person.vorname = input.cv.data.person.nachname = "Same";
    input.settings.fieldStyles = {
      "cv.person.firstName": { italic: true },
      "cv.person.lastName": { underline: true },
      "letter.date.place": { bold: true },
    };
    const model = buildDossierDocModel(input);
    const name = walkBlocks(model.cv.blocks).find((block) => block.id === "cv.person.name")!;
    expect(name.kind === "paragraph" && name.runs[0].style.italic).toBe(true);
    expect(name.kind === "paragraph" && name.runs[2].style.underline).toBe(true);
    expect(name.kind === "paragraph" && name.runs[2].style.italic).toBe(false);
    const date = walkBlocks(model.letter.blocks).find((block) => block.id === "letter.date")!;
    expect(date.kind === "paragraph" && date.runs[0].style.bold).toBe(true);
    expect(date.kind === "paragraph" && date.runs[2].style.bold).toBe(false);
  });
  test("reordering identical line items keeps style and empty items do not renumber identities", () => {
    const input = briefFixture();
    input.cv.data.hobbys = ["", "Same", "Same"];
    input.cv.data.lineIds = { hobbys: ["empty", "one", "two"] };
    input.settings.fieldStyles = { "cv.entry.hobbys:two": { underline: true } };
    input.cv.data.hobbys.reverse();
    input.cv.data.lineIds.hobbys!.reverse();
    const blocks = walkBlocks(buildDossierDocModel(input).cv.blocks);
    const second = blocks.find((block) => block.id === "cv.entry.hobbys:two")!;
    expect(second.kind === "paragraph" && second.runs[0].style.underline).toBe(true);
    expect(blocks.some((block) => block.id === "cv.entry.hobbys:empty")).toBe(false);
    expect(cvLineFieldId("hobbys", 1, semanticListItemIds(3))).toBe("cv.entry.hobbys:1");
  });
  test("JSON projects keep additive list identities and canonical portable styles", () => {
    const input = briefFixture();
    input.cv.data.lineIds = { hobbys: ["one"] };
    input.letter.data.attachmentIds = ["a", "b"];
    const project = parseDossierProject(
      JSON.parse(
        JSON.stringify({
          kind: DOSSIER_PROJECT_KIND,
          version: DOSSIER_PROJECT_VERSION,
          savedAt: "2026-10-03T12:00:00Z",
          cv: input.cv,
          letter: input.letter,
          fieldTypography: { version: 1, cv: { [entries[0].key]: entries[0] }, letter: {} },
        }),
      ),
    );
    expect((project?.cv?.data as typeof input.cv.data).lineIds).toEqual({ hobbys: ["one"] });
    expect((project?.letter?.data as typeof input.letter.data).attachmentIds).toEqual(["a", "b"]);
    expect(project?.fieldTypography?.cv[entries[0].key].fieldId).toBe(entries[0].fieldId);
  });
  test("reference contact composite is split by its explicit semantic fields once", () => {
    const reference = {
      id: "ref",
      name: "Name",
      funktion: "Role",
      kontakt: "079 123\nmail@example.ch\nDetails",
      email: "mail@example.ch",
      zusatz: "Details",
    };
    expect(referenceContactFields(reference)).toEqual({
      contact: "079 123",
      email: "mail@example.ch",
      extra: "Details",
    });
    const input = briefFixture();
    input.cv.data.referenzen = [reference];
    const text = walkBlocks(buildDossierDocModel(input).cv.blocks)
      .filter((block) => block.kind === "paragraph")
      .flatMap((block) => (block.kind === "paragraph" ? block.runs.map((run) => run.text) : []))
      .join("|");
    expect(text.match(/mail@example.ch/g)).toHaveLength(1);
    expect(text.match(/Details/g)).toHaveLength(1);
  });
});
