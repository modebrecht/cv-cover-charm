import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const decorations = readFileSync(
  new URL("../../src/components/cover/template-decorations.ts", import.meta.url),
  "utf8",
);
const stationery = readFileSync(
  new URL("../../src/components/dossier/pastell-stationery.css", import.meta.url),
  "utf8",
);
const sharedInteriorStyles = readFileSync(
  new URL("../../src/components/dossier/edel-stationery.css", import.meta.url),
  "utf8",
);

describe("Rahmen/Pastell dossier consistency", () => {
  test("the cover keeps only the restrained inset top signature", () => {
    expect(decorations).toContain(
      'pastell: [rect("decor-top-band", "Kopfband", 12, 12, 186, 3, "secondary", 0.72)]',
    );
    expect(decorations).not.toContain("decor-middle-rule");
    expect(decorations).not.toContain("decor-bottom-ellipse");
  });

  test("letter and CV use the same frame/top geometry and a quiet sidebar tint", () => {
    expect(sharedInteriorStyles).toContain('@import "./pastell-stationery.css";');
    expect(stationery).toContain('[data-dossier-sheet-background="pastell"] > div:first-child');
    expect(stationery).toContain("inset: 12mm !important;");
    expect(stationery).toContain('[data-dossier-sheet-background="pastell"] > div:last-child');
    expect(stationery).toContain("left: 12mm !important;");
    expect(stationery).toContain("right: 12mm !important;");
    expect(stationery).toContain("top: 12mm !important;");
    expect(stationery).toContain("height: 3mm !important;");
    expect(stationery).toContain('[data-cv-sidebar-tint]');
    expect(stationery).toContain("opacity: 0.35 !important;");
  });
});
