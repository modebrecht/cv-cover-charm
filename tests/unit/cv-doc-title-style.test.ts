import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  CV_DOC_TITLE_DEFAULTS,
  CV_DOC_TITLE_MARGIN_BOTTOM_MAX,
  CV_SECTION_TITLE_DEFAULTS,
  CV_SECTION_TITLE_MARGIN_BOTTOM_MAX,
  CV_TYPE_DEFAULTS,
  DEMO_CV,
} from "../../src/components/cv/types";

test("CV defaults use full heading rules and omit the redundant demo subtitle", () => {
  expect(CV_TYPE_DEFAULTS.headingRule).toBe("full");
  expect(DEMO_CV.person.untertitel).toBe("");
});

test("document title has independent persisted style controls", () => {
  expect(CV_DOC_TITLE_DEFAULTS.fontSizePx).toBeGreaterThan(13);
  expect(CV_DOC_TITLE_MARGIN_BOTTOM_MAX).toBe(100);

  const canvas = readFileSync("src/components/cv/CvCanvasBase.tsx", "utf8");
  const route = readFileSync("src/routes/lebenslauf.tsx", "utf8");
  for (const contract of [
    "docTitleFontSizePx",
    "docTitleColor",
    "docTitleBold",
    "docTitleItalic",
    "docTitleUnderline",
    "docTitleMarginBottomPx",
  ]) {
    expect(canvas).toContain(contract);
    expect(route).toContain(contract);
  }
  expect(route).toContain("max={CV_DOC_TITLE_MARGIN_BOTTOM_MAX}");
  expect(canvas).toContain("marginBottom: `${marginBottomPx}px`");
});

test("rubric title formatting is one global CV style and defaults to a full right rule", () => {
  expect(CV_TYPE_DEFAULTS.headingRule).toBe("full");
  expect(CV_SECTION_TITLE_DEFAULTS.fontSizePx).toBeGreaterThan(12);
  expect(CV_SECTION_TITLE_MARGIN_BOTTOM_MAX).toBe(100);

  const canvas = readFileSync("src/components/cv/CvCanvasBase.tsx", "utf8");
  const route = readFileSync("src/routes/lebenslauf.tsx", "utf8");
  for (const contract of [
    "sectionTitleFontSizePx",
    "sectionTitleColor",
    "sectionTitleBold",
    "sectionTitleItalic",
    "sectionTitleUnderline",
    "sectionTitleMarginBottomPx",
  ]) {
    expect(canvas).toContain(contract);
    expect(route).toContain(contract);
  }
  expect(route).toContain("Rubriktitel gestalten");
  expect(route).toContain("Referenzen und eigene Rubriken");
  expect(canvas).toContain("background: sectionTitleColor || pal.accent");
  expect(canvas).toContain("background: sectionTitleColor || side.accent");
  expect(canvas).toContain('flex: headingRule === "full" ? "1 1 auto" : undefined');
});
