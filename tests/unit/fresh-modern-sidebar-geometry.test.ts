import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const css = readFileSync(
  new URL("../../src/components/cv/fresh-modern-sidebar-geometry.css", import.meta.url),
  "utf8",
);
const canvas = readFileSync(new URL("../../src/components/cv/CvCanvas.tsx", import.meta.url), "utf8");
const guardedTemplates = ["warm2", "warm3", "prism", "gallery", "orbit", "cove"];

describe("Fresh modern sidebar geometry guard", () => {
  test("the CV renderer publishes its actual adjustable modern content box", () => {
    expect(canvas).toContain('import { cvContentBox, cvFrameFor } from "./archetype";');
    expect(canvas).toContain("design.sidebarPct");
    expect(canvas).toContain('"--cv-modern-main-left": `${modernBox.left}mm`');
    expect(canvas).toContain('"--cv-modern-main-right": `${modernBox.right}mm`');
  });

  test("all known Fresh overlap templates consume renderer geometry in Sidebar mode", () => {
    expect(css).not.toContain('data-cv-variant="executive"');
    expect(css).toContain('[data-cv-layout="modern"]');
    expect(css).toContain("left: var(--cv-modern-main-left) !important;");
    expect(css).toContain("right: var(--cv-modern-main-right) !important;");

    for (const template of guardedTemplates) {
      expect(css).toContain(`[data-dossier-template="${template}"]`);
    }
  });
});
