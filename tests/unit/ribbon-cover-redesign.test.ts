import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const defaults = readFileSync(
  new URL("../../src/components/cover/forest-flow-cover-defaults.ts", import.meta.url),
  "utf8",
);
const css = readFileSync(
  new URL("../../src/components/cover/ribbon-cover-redesign.css", import.meta.url),
  "utf8",
);
const legacySignatures = readFileSync(
  new URL("../../src/components/cover/next-signature-templates.css", import.meta.url),
  "utf8",
);
const freshTemplates = readFileSync(
  new URL("../../src/components/cover/fresh-templates.ts", import.meta.url),
  "utf8",
);

test("Ribbon cover is reduced to a straight rail and one rounded ribbon", () => {
  expect(css).toContain('data-dossier-template="ribbon"');
  expect(css).toContain("width: 48mm !important;");
  expect(css).toContain("border-radius: 0 !important;");
  expect(css).toContain("left: 48mm !important;");
  expect(css).toContain("top: 24mm !important;");
  expect(css).toContain("width: 146mm !important;");
  expect(css).toContain("height: 64mm !important;");
  expect(css).toContain("border-radius: 32mm !important;");
  expect(css).toContain("> div:nth-child(2)");
  expect(css).toContain("display: none !important;");
  expect(freshTemplates).toContain('import "./ribbon-cover-redesign.css";');
});

test("Ribbon portrait and content positions are editor defaults, not CSS pins", () => {
  expect(defaults).toContain("RIBBON_COVER_DEFAULTS");
  expect(defaults).toContain('templateId === "ribbon"');
  expect(defaults).toContain("foto: {");
  expect(defaults).toContain("x: 25,");
  expect(defaults).toContain("y: 33,");
  expect(defaults).toContain("w: 46,");
  expect(defaults).toContain("radius: 999,");
  expect(defaults).toContain("name: {");
  expect(defaults).toContain("x: 76,");
  expect(defaults).toContain("kontaktTitel: {");
  expect(defaults).toContain("anTitel: {");
  expect(defaults).toContain("if (custom[key] === undefined)");

  // User-editable block geometry must never be pinned by the visual stylesheet.
  expect(css).not.toContain('[data-block-id="foto"] {\n  left:');
  expect(css).not.toContain('[data-block-id="name"]');
  expect(css).not.toContain('[data-block-id="beruf"]');
});

test("Ribbon application label is direct rail typography, not another badge", () => {
  expect(defaults).toContain("eyebrow: {");
  expect(defaults).toContain('color: "bg"');
  expect(defaults).toContain("bg: null");
  expect(css).toContain('[data-block-id="eyebrow"]');
  expect(css).toContain("background: transparent !important;");
});

test("Ribbon's old cover-only transforms cannot displace user-owned A4 blocks", () => {
  // Keep CV styling intact; only the historical cover-specific offsets go.
  const ribbonCss = legacySignatures.split("/* RIBBON —")[1].split("/* COVE —")[0];
  expect(ribbonCss).not.toMatch(/data-dossier-template="ribbon"\]\s*\[data-block-id=/);
  expect(ribbonCss).toContain('data-cv-template="ribbon"');
  for (const id of ["foto", "ortDatum", "name", "beruf", "lehrbeginn", "kontakt"]) {
    expect(css).not.toContain(`[data-block-id="${id}"] {\n  transform:`);
  }
});

test("Ribbon flows long display lines and bottom-anchors the date by declarative defaults", () => {
  const ribbon = defaults.split("const RIBBON_COVER_DEFAULTS")[1].split("const DIAGONAL_COVER_DEFAULTS")[0];
  expect(ribbon).toContain('follows: "name"');
  expect(ribbon).toContain('follows: "kicker"');
  expect(ribbon).toContain('follows: "beruf"');
  expect(ribbon).toMatch(/ortDatum: \{[\s\S]*?y: 285,[\s\S]*?anchorBottom: true/);
  expect(defaults).toContain('custom.y !== undefined && custom.follows === undefined');
});
