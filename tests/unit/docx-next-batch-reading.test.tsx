import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CvCanvas } from "../../src/components/cv/CvCanvas";
import { referenceHasContent } from "../../src/lib/dossier-semantic-fields";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { walkBlocks } from "../../src/lib/docx-next/model";
import { briefFixture } from "../fixtures/docx-next/brief";

test("classic Web, page-fit content and native references retain email-only and extra-only records", () => {
  const source = briefFixture();
  source.cv.data.referenzen = [
    { id: "email", name: "", funktion: "", kontakt: "", email: "referenz@example.ch", zusatz: "" },
    {
      id: "extra",
      name: "",
      funktion: "",
      kontakt: "",
      email: "",
      zusatz: "Auf Anfrage erreichbar",
    },
    {
      id: "named",
      name: "Kontaktperson",
      funktion: "Lehrperson",
      kontakt: "",
      email: "lehrperson@example.ch",
      zusatz: "",
    },
    { id: "empty", name: " ", funktion: "", kontakt: "", email: "", zusatz: " " },
  ];
  expect(source.cv.data.referenzen.filter(referenceHasContent)).toHaveLength(3);
  const html = renderToStaticMarkup(
    createElement(CvCanvas, {
      data: source.cv.data,
      design: source.cv.design,
      elements: [],
      presentation: { layoutChoice: "classic" },
    }),
  );
  const fields = walkBlocks(
    buildDossierDocModel(source, { cvContentComposition: "reading-rows" }).cv.blocks,
  )
    .filter((b) => b.kind === "paragraph")
    .flatMap((b) => b.runs.map((r) => r.text));
  for (const text of ["referenz@example.ch", "Auf Anfrage erreichbar", "lehrperson@example.ch"]) {
    expect(html).toContain(text);
    expect(fields).toContain(text);
  }
  expect(html).not.toContain("cv.entry.referenzen:empty");
});

test("reading rows use the Web's narrow rail for half-width dates and language levels", () => {
  const source = briefFixture();
  source.cv.data.sectionLayouts = {
    schule: { width: "half", packing: "rows", positioning: "flow", page: 1 },
    sprachen: { width: "half", packing: "masonry", positioning: "flow", page: 1 },
  };
  const before = JSON.stringify(source);
  const model = buildDossierDocModel(source, { cvContentComposition: "reading-rows" });
  const tables = walkBlocks(model.cv.blocks).filter((b) => b.kind === "table");
  expect(
    tables.find((t) => t.id.startsWith("cv.entry.schule:") && t.id.endsWith(".dateRail"))
      ?.columnWidthsMm,
  ).toEqual([20, null]);
  expect(tables.find((t) => t.id.endsWith(".languageRow"))?.columnWidthsMm).toEqual([20, null]);
  expect(
    tables.find((t) => t.id.startsWith("cv.entry.erfahrung:") && t.id.endsWith(".dateRail"))
      ?.columnWidthsMm,
  ).toEqual([27, null]);
  expect(JSON.stringify(source)).toBe(before);
  // The ordinary composition is unchanged and retains its established gating.
  expect(
    walkBlocks(buildDossierDocModel(source).cv.blocks).some((b) => b.id.endsWith(".languageRow")),
  ).toBe(false);
});
