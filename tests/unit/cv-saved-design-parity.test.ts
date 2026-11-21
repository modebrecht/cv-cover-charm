import { expect, test } from "bun:test";
import { cvDesignForSave, migrateCvDesign } from "../../src/components/cv/design";
import { cvPdfDocumentFromSaved } from "../../src/lib/dossier-pdf-document";
import { emptyCv, type CvDesign } from "../../src/components/cv/types";

const current: CvDesign = {
  template: "studio3",
  colors: {},
  font: "freundlich",
  bgOpacity: 0.25,
  useElements: false,
};

test("canonical print uses the editor migration for absent, explicit and legacy saved design values", () => {
  for (const version of [1, 6])
    for (const font of [undefined, null, "serif", "invalid"])
      for (const bgOpacity of [0.06, 0.12, 0.4]) {
        const incoming = {
          template: "studio3",
          colors: {},
          bgOpacity,
          useElements: false,
          ...(font === undefined ? {} : { font }),
        } as CvDesign;
        const print = cvPdfDocumentFromSaved({ version, data: emptyCv, design: incoming });
        const visible = migrateCvDesign(current, incoming, version);
        expect(print?.design.font).toBe(visible.font);
        expect(print?.design.bgOpacity).toBe(visible.bgOpacity);
        expect(print?.design.template).toBe(visible.template);
      }
});

test("round-trip retains the template font choice and continues to migrate absent legacy fonts", () => {
  const { font: _font, ...template } = current;
  const stored = JSON.parse(JSON.stringify(cvDesignForSave(template)));
  expect(stored.font).toBeNull();
  expect(migrateCvDesign(current, stored, 6).font).toBeUndefined();
  expect(
    cvPdfDocumentFromSaved({ version: 6, data: emptyCv, design: stored })?.design.font,
  ).toBeUndefined();
  expect(migrateCvDesign(current, template, 6).font).toBe("freundlich");
  expect(cvDesignForSave(current).font).toBe("freundlich");
});
