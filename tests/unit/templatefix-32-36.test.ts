import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FRESH_TEMPLATE_REGISTRY } from "@/components/cover/fresh-template-registry";

const css = readFileSync("src/components/cover/templatefix-32-36.css", "utf8");
const loader = readFileSync("src/components/cover/fresh-templates.ts", "utf8");

const IDS = ["prism", "gallery", "orbit", "ribbon", "cove"] as const;

describe("templateFIX 32–36 dossier rebuild", () => {
  it("loads the late override after the legacy signature systems", () => {
    expect(loader).toContain('import "./templatefix-32-36.css";');
    expect(loader.indexOf('import "./templatefix-32-36.css";')).toBeGreaterThan(
      loader.indexOf('import "./next-signature-templates.css";'),
    );
  });

  it("defines cover, letter and CV treatment for every rebuilt family", () => {
    for (const id of IDS) {
      expect(css).toContain(`[data-dossier-template="${id}"]`);
      expect(css).toContain(`[data-letter-fresh-template="${id}"]`);
    }
    expect(css).toContain('[data-cv-accent="header"]');
    expect(css).toContain('[data-cv-accent="section"]');
    expect(css).toContain("[data-cv-sidebar-tint]");
  });

  it("uses harmonized default palettes instead of unrelated third hues", () => {
    const palette = Object.fromEntries(
      FRESH_TEMPLATE_REGISTRY.filter(({ id }) => IDS.includes(id as (typeof IDS)[number])).map(
        ({ id, slots }) => [id, Object.fromEntries(slots.map(({ key, default: value }) => [key, value]))],
      ),
    );

    expect(palette.prism).toMatchObject({ primary: "#172554", secondary: "#2f66e6", accent: "#6f95f2" });
    expect(palette.gallery).toMatchObject({ primary: "#4b2f40", secondary: "#d6b7a4", accent: "#a97d6d" });
    expect(palette.orbit).toMatchObject({ primary: "#24204f", secondary: "#625fe8", accent: "#8d8af0" });
    expect(palette.ribbon).toMatchObject({ primary: "#174d3f", secondary: "#d5a13d", accent: "#a57a2d" });
    expect(palette.cove).toMatchObject({ primary: "#5a244f", secondary: "#e36d5a", accent: "#b84959" });
  });
});
