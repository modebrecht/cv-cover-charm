import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DossierChromeDocumentContentControls } from "../../src/components/dossier/DossierChromeDocumentContentControls";
import { DossierHeaderFooterChrome } from "../../src/components/dossier/DossierHeaderFooterChrome";
import {
  dossierChromeFieldId,
  isSemanticDossierFieldId,
} from "../../src/lib/dossier-semantic-fields";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { resolveDossierChromeSnapshot } from "../../src/lib/dossier-resolved-chrome";
import { briefChromeFixture } from "../fixtures/docx-next/brief";

describe("semantic custom header/footer content", () => {
  test("editor and preview own every field independently of repeated visible values", () => {
    const input = briefChromeFixture();
    const resolved = resolveDossierChromeSnapshot(input, input.settings.chrome!);
    for (const scope of ["letter", "cv"] as const) {
      const controls = renderToStaticMarkup(
        createElement(DossierChromeDocumentContentControls, {
          scope,
          value: input[scope].design.chromeContent,
          defaultTitle: "Default",
          onChange: () => {},
        }),
      );
      for (const footerTextLayout of ["inline", "stacked"] as const) {
        const preview = renderToStaticMarkup(
          createElement(DossierHeaderFooterChrome, {
            scope,
            template: "brief",
            colors: {},
            contact: resolved[scope].contact,
            options: { ...resolved[scope].options, footerTextLayout },
            documentContent: resolved[scope].content,
          }),
        );
        for (const surface of ["header", "footer"] as const)
          for (const field of ["title", "text"] as const) {
            const id = dossierChromeFieldId(scope, surface, field);
            expect(isSemanticDossierFieldId(scope, id)).toBe(true);
            expect(isSemanticDossierFieldId(scope === "cv" ? "letter" : "cv", id)).toBe(false);
            expect(controls).toContain(`data-dossier-field-id="${id}"`);
            expect(preview).toContain(`data-dossier-field-id="${id}"`);
          }
      }
    }
    expect(isSemanticDossierFieldId("cv", "cv.header.first.title")).toBe(false);
  });
  test("first and continuation headers resolve the same canonical style before rendering, even after edits", async () => {
    const input = briefChromeFixture();
    input.letter.design.chromeContent!.headerTitle = "Changed in the editor";
    const model = buildDossierDocModel(JSON.parse(JSON.stringify(input)));
    for (const scope of ["letter", "cv"] as const) {
      for (const headers of [model[scope].header, model[scope].firstHeader!]) {
        const title = headers
          .flatMap((paragraph) => paragraph.runs)
          .find((run) => run.fieldId === `${scope}.header.title`)!;
        const text = headers
          .flatMap((paragraph) => paragraph.runs)
          .find((run) => run.fieldId === `${scope}.header.text`)!;
        expect(title.style).toMatchObject(input.settings.fieldStyles![`${scope}.header.title`]);
        expect(text.style).toMatchObject(input.settings.fieldStyles![`${scope}.header.text`]);
      }
    }
    const parts = readZipEntries(
      new Uint8Array(await (await renderDossierDocx(model)).arrayBuffer()),
    );
    const firstHeader = new TextDecoder().decode(
      parts.find((part) => part.name === "word/letter-header-first.xml")!.bytes,
    );
    expect(firstHeader).toContain('w:val="letter.header.first.title"');
    expect(firstHeader).toContain(
      '<w:b w:val="0"/><w:i w:val="1"/><w:color w:val="123456"/><w:sz w:val="22"',
    );
  });
  test("native footer layout preserves separate run styles and custom content replaces automatic contact text", () => {
    for (const stacked of [false, true]) {
      const input = briefChromeFixture(stacked);
      const model = buildDossierDocModel(input);
      expect(model.letter.footer).toHaveLength(stacked ? 2 : 1);
      const runs = model.letter.footer.flatMap((paragraph) => paragraph.runs);
      expect(runs.filter((run) => run.fieldId).map((run) => run.fieldId)).toEqual([
        "letter.footer.title",
        "letter.footer.text",
      ]);
      expect(runs.find((run) => run.fieldId === "letter.footer.title")!.style.bold).toBe(true);
      expect(runs.find((run) => run.fieldId === "letter.footer.text")!.style.italic).toBe(true);
      expect(runs.find((run) => run.fieldId === "letter.footer.text")!.style.bold).toBe(false);
      expect(runs.some((run) => run.text.includes("Lea Müller"))).toBe(false);
    }
  });
  test("different first-page headers explicitly reuse their logical part footer", async () => {
    const parts = readZipEntries(
      new Uint8Array(
        await (await renderDossierDocx(buildDossierDocModel(briefChromeFixture()))).arrayBuffer(),
      ),
    );
    const xml = new TextDecoder().decode(
      parts.find((part) => part.name === "word/document.xml")!.bytes,
    );
    for (const scope of ["letter", "cv"]) {
      expect(xml).toContain(`<w:footerReference w:type="default" r:id="${scope}-footer"/>`);
      expect(xml).toContain(`<w:footerReference w:type="first" r:id="${scope}-footer"/>`);
      expect(parts.filter((part) => part.name === `word/${scope}-footer.xml`)).toHaveLength(1);
    }
  });
});
