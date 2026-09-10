import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const cleanup = readFileSync(
  new URL("../../src/components/cover/fresh-cover-visual-cleanup.css", import.meta.url),
  "utf8",
);
const legacyFresh = readFileSync(
  new URL("../../src/components/cover/fresh-templates.css", import.meta.url),
  "utf8",
);

describe("Fresh 19-22 cover acceptance repair", () => {
  test("the late acceptance layer neutralizes the shared negative title transforms", () => {
    for (const template of ["edge", "glow", "frame", "monoLuxe"]) {
      expect(cleanup).toContain(`data-dossier-template="${template}"`);
    }
    expect(cleanup).toContain(
      ':is([data-block-id="name"], [data-block-id="beruf"], [data-block-id="lehrbeginn"])',
    );
    expect(cleanup).toContain("transform: none !important;");

    // Keep this regression meaningful: the acceptance layer exists specifically
    // because the older family stylesheet still contains the historic offsets.
    expect(legacyFresh).toContain("translate(-34mm");
  });

  test("Glow gets a saturated bounded masthead and stronger stationery echoes", () => {
    const glow = cleanup.slice(
      cleanup.indexOf("/* Glow: the previous"),
      cleanup.indexOf("/* Frame: Warm's top metadata"),
    );
    expect(glow).toContain(
      "background: linear-gradient(100deg, var(--cover-primary), var(--cover-secondary)) !important;",
    );
    expect(glow).toContain("height: 30mm !important;");
    expect(glow).toContain('data-letter-motif="glow-capsule"');
    expect(glow).toContain("opacity: 0.22 !important;");
  });

  test("Frame supplies a dark inner masthead without replacing its architectural outline", () => {
    const frame = cleanup.slice(
      cleanup.indexOf("/* Frame: Warm's top metadata"),
      cleanup.indexOf("/* FRAME: the architectural crossbar"),
    );
    expect(frame).toContain("var(--cover-primary) 18mm");
    expect(frame).toContain("transparent 18mm");
    expect(legacyFresh).toContain("border: 0.55mm solid var(--cover-primary) !important;");
  });
});
