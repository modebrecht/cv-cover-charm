import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const css = readFileSync(
  new URL("../../src/components/cv/fresh-modern-sidebar-geometry.css", import.meta.url),
  "utf8",
);
const canvas = readFileSync(new URL("../../src/components/cv/CvCanvas.tsx", import.meta.url), "utf8");
const guardedTemplates = ["warm2", "warm3", "prism", "gallery", "orbit", "cove"];

describe("Fresh modern sidebar geometry guard", () => {
  test("the CV renderer loads the geometry guard", () => {
    expect(canvas).toContain('import "./fresh-modern-sidebar-geometry.css";');
  });

  test("all known Fresh overlap templates restore the executive main-column clearance", () => {
    expect(css).toContain('html[data-cv-variant="executive"]');
    expect(css).toContain('[data-cv-layout="modern"]');
    expect(css).toContain("left: 69mm !important;");

    for (const template of guardedTemplates) {
      expect(css).toContain(`[data-dossier-template="${template}"]`);
    }
  });
});
