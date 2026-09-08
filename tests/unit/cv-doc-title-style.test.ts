import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  CV_DOC_TITLE_DEFAULTS,
  CV_DOC_TITLE_MARGIN_BOTTOM_MAX,
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
