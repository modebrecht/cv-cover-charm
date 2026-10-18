import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const css = readFileSync(
  new URL("../../src/components/dossier/chrome-template-surfaces.css", import.meta.url),
  "utf8",
);
const sharedChrome = readFileSync(
  new URL("../../src/components/dossier/DossierHeaderFooterChrome.tsx", import.meta.url),
  "utf8",
);

describe("Prism + Neon header identity rework", () => {
  test("loads authored surfaces from the shared chrome component for both documents", () => {
    expect(sharedChrome).toContain('import "./chrome-template-surfaces.css";');
    expect(css).not.toContain('[data-dossier-chrome="cv"]');
    expect(css).not.toContain("[data-cv-template=");
  });

  test("Prism uses default-only faceted chrome for compact and contact surfaces", () => {
    expect(css).toContain('[data-dossier-template-chrome="prism"]');
    expect(css).toContain('[data-dossier-header-custom-surface="false"]');
    expect(css).toContain("[data-dossier-compact-header]");
    expect(css).toContain("[data-dossier-contact-header-background]");
    expect(css).toContain("[data-dossier-continuation-contact-header]");
    expect(css).toContain("clip-path: polygon(0 0, 100% 0, 78% 100%, 0 72%);");
    expect(css).toContain("clip-path: polygon(28% 0, 100% 0, 100% 100%, 0 78%);");
    expect(css).toContain("padding-right: 46mm !important;");
  });

  test("Neon keeps a coherent gradient masthead instead of a solid pink block", () => {
    expect(css).toContain('[data-dossier-template-chrome="neon"]');
    expect(css).toContain("radial-gradient(");
    expect(css).toContain("linear-gradient(");
    expect(css).toContain("var(--chrome-primary)");
    expect(css).toContain("var(--chrome-secondary)");
    expect(css).toContain("color: #ffffff !important;");
    expect(css).not.toContain("background: #e11d8f");
  });

  test("the identity layer never rewrites stored motif or chrome state", () => {
    expect(css).not.toContain("localStorage");
    expect(css).not.toContain("bgOpacity");
    expect(css).not.toContain("--dossier-motif-opacity:");
    expect(css).not.toContain("headerMode:");
  });
});
