import { describe, expect, test } from "bun:test";
import { DEFAULT_DOSSIER_CHROME_OPTIONS } from "../../src/lib/dossier-chrome";
import { resolveTemplateChromeOptions } from "../../src/lib/template-chrome";

describe("template-owned dossier chrome", () => {
  test("Modern uses a mirrored compact navy/pink header and footer", () => {
    const resolved = resolveTemplateChromeOptions(
      "modern",
      { primary: "#111827", accent: "#f43f5e" },
      DEFAULT_DOSSIER_CHROME_OPTIONS,
    );

    expect(resolved.headerMode).toBe("compact");
    expect(resolved.footerMode).toBe("compact");
    expect(resolved.headerHeightMm).toBe(3);
    expect(resolved.footerHeightMm).toBe(3);
    expect(resolved.headerBackgroundColor).toBe("#111827");
    expect(resolved.footerBackgroundColor).toBe("#111827");
    expect(resolved.borderEnabled).toBe(true);
    expect(resolved.borderColor).toBe("#f43f5e");
    expect(resolved.borderWidthMm).toBe(0.6);
  });

  test("Modern follows customized template colours", () => {
    const resolved = resolveTemplateChromeOptions(
      "modern",
      { primary: "#223344", accent: "#ee4466" },
      DEFAULT_DOSSIER_CHROME_OPTIONS,
    );

    expect(resolved.headerBackgroundColor).toBe("#223344");
    expect(resolved.footerBackgroundColor).toBe("#223344");
    expect(resolved.borderColor).toBe("#ee4466");
  });

  test("other templates keep the shared chrome contract unchanged", () => {
    const source = { ...DEFAULT_DOSSIER_CHROME_OPTIONS, headerMode: "contact" as const };
    const resolved = resolveTemplateChromeOptions(
      "colorful",
      { primary: "#ef4444", accent: "#3b82f6" },
      source,
    );

    expect(resolved).toBe(source);
  });
});
