import { describe, expect, test } from "bun:test";
import { cvDesignWithFullSectionRules } from "../../src/components/cv/CvCanvas";
import type { CvDesign } from "../../src/components/cv/types";

const baseDesign: CvDesign = {
  template: "klassisch",
  colors: {},
  bgOpacity: 0.25,
  useElements: false,
};

describe("CV section rule contract", () => {
  test("missing and legacy short settings render as full-width rules", () => {
    expect(cvDesignWithFullSectionRules(baseDesign).headingRule).toBe("full");
    expect(cvDesignWithFullSectionRules({ ...baseDesign, headingRule: "short" }).headingRule).toBe(
      "full",
    );
  });

  test("full stays full and none remains the explicit opt-out", () => {
    expect(cvDesignWithFullSectionRules({ ...baseDesign, headingRule: "full" }).headingRule).toBe(
      "full",
    );
    expect(cvDesignWithFullSectionRules({ ...baseDesign, headingRule: "none" }).headingRule).toBe(
      "none",
    );
  });
});
