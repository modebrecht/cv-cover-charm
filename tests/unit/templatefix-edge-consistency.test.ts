import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const layout = readFileSync(new URL("../../src/components/cv/layout.ts", import.meta.url), "utf8");
const letter = readFileSync(
  new URL("../../src/components/letter/fresh-letter-system.ts", import.meta.url),
  "utf8",
);
const freshCss = readFileSync(
  new URL("../../src/components/cover/fresh-templates.css", import.meta.url),
  "utf8",
);

describe("Fresh 19-22 dossier rebuild", () => {
  test("unsaved CVs default to Standard except Kolumne's intentional Sidebar default", () => {
    expect(layout).toContain('const DEFAULT_LAYOUT: CvLayoutId = "classic";');
    expect(layout).toContain('return template === "terracotta" ? "modern" : DEFAULT_LAYOUT;');
    expect(layout).toContain("return valid(value) ? value : fallback;");
  });

  test("Edge uses one compact masthead signature across cover, letter and CV", () => {
    const edge = letter.slice(letter.indexOf("  edge: {"), letter.indexOf("  glow: {"));
    expect(edge).toContain('rect("edge-band", 0, 0, 210, 9, "primary")');
    expect(edge).toContain('rect("edge-signal", 0, 0, 4, 9, "secondary")');
    expect(edge).toContain('rect("edge-rule", 25, 15.5, 42, 1.1, "accent"');
    expect(edge).not.toContain('rect("rail"');

    expect(freshCss).toContain("/* 19 EDGE");
    expect(freshCss).toContain('data-dossier-sheet-background="edge"');
    expect(freshCss).toContain("height: 10mm !important;");
    expect(freshCss).toContain("background: transparent !important;");
  });

  test("Glow is restrained and does not use page-filling blobs or card shadows", () => {
    const glow = letter.slice(letter.indexOf("  glow: {"), letter.indexOf("  frame: {"));
    expect(glow).toContain("glow-capsule");
    expect(glow).toContain("glow-orb");
    expect(glow).toContain("glow-rule");
    expect(glow).not.toContain("bottom-orb");

    const css = freshCss.slice(freshCss.indexOf("/* 20 GLOW"), freshCss.indexOf("/* 21 FRAME"));
    expect(css).toContain("width: 72mm !important;");
    expect(css).toContain("height: 24mm !important;");
    expect(css).toContain("box-shadow: none !important;");
    expect(css).not.toContain("176mm");
    expect(css).not.toContain("146mm");
  });

  test("Frame is an inset architectural frame rather than a heavy color slab", () => {
    const frame = letter.slice(letter.indexOf("  frame: {"), letter.indexOf("  monoLuxe: {"));
    expect(frame).toContain("frame-top");
    expect(frame).toContain("frame-left");
    expect(frame).toContain("frame-bottom");
    expect(frame).toContain("frame-right");

    const css = freshCss.slice(freshCss.indexOf("/* 21 FRAME"), freshCss.indexOf("/* 22 MONO LUXE"));
    expect(css).toContain("border: 0.55mm solid var(--cover-primary) !important;");
    expect(css).toContain("background: transparent !important;");
    expect(css).not.toContain("width: 15mm !important;");
    expect(css).not.toContain("height: 265mm !important;");
  });

  test("Mono Luxe stays typographic and removes the old filled CV card treatment", () => {
    const mono = letter.slice(letter.indexOf("  monoLuxe: {"), letter.indexOf("  horizon: {"));
    expect(mono).toContain("mono-band");
    expect(mono).toContain("mono-gold-rule");
    expect(mono).toContain("mono-mark");

    const css = freshCss.slice(freshCss.indexOf("/* 22 MONO LUXE"));
    expect(css).toContain("font-family: Georgia");
    expect(css).toContain("background: transparent !important;");
    expect(css).toContain("height: 9mm !important;");
  });
});
