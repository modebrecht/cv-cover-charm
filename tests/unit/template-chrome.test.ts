import { describe, expect, test } from "bun:test";
import { DEFAULT_DOSSIER_CHROME_OPTIONS } from "../../src/lib/dossier-chrome";
import { resolveTemplateChromeOptions } from "../../src/lib/template-chrome";

describe("template-owned dossier chrome", () => {
  test("Modern mirrors compact header and footer without changing their geometry", () => {
    const source = {
      ...DEFAULT_DOSSIER_CHROME_OPTIONS,
      headerMode: "compact" as const,
      footerMode: "compact" as const,
    };
    const resolved = resolveTemplateChromeOptions(
      "modern",
      { primary: "#111827", accent: "#f43f5e" },
      source,
    );

    expect(resolved.headerMode).toBe("compact");
    expect(resolved.footerMode).toBe("compact");
    expect(resolved.headerHeightMm).toBe(source.headerHeightMm);
    expect(resolved.footerHeightMm).toBe(source.footerHeightMm);
    expect(resolved.headerBackgroundColor).toBe("#111827");
    expect(resolved.footerBackgroundColor).toBe("#111827");
    expect(resolved.borderEnabled).toBe(true);
    expect(resolved.borderColor).toBe("#f43f5e");
    expect(resolved.borderWidthMm).toBe(0.6);
  });

  test("Modern compact pair follows customized template colours", () => {
    const source = {
      ...DEFAULT_DOSSIER_CHROME_OPTIONS,
      headerMode: "compact" as const,
      footerMode: "compact" as const,
    };
    const resolved = resolveTemplateChromeOptions(
      "modern",
      { primary: "#223344", accent: "#ee4466" },
      source,
    );

    expect(resolved.headerBackgroundColor).toBe("#223344");
    expect(resolved.footerBackgroundColor).toBe("#223344");
    expect(resolved.borderColor).toBe("#ee4466");
  });

  test("Modern never overrides explicit contact / none / details mode choices", () => {
    const variants = [
      {
        ...DEFAULT_DOSSIER_CHROME_OPTIONS,
        headerMode: "contact" as const,
        footerMode: "compact" as const,
      },
      {
        ...DEFAULT_DOSSIER_CHROME_OPTIONS,
        headerMode: "none" as const,
        footerMode: "compact" as const,
      },
      {
        ...DEFAULT_DOSSIER_CHROME_OPTIONS,
        headerMode: "compact" as const,
        footerMode: "details" as const,
      },
      {
        ...DEFAULT_DOSSIER_CHROME_OPTIONS,
        headerMode: "compact" as const,
        footerMode: "none" as const,
      },
    ];

    for (const source of variants) {
      expect(
        resolveTemplateChromeOptions(
          "modern",
          { primary: "#111827", accent: "#f43f5e" },
          source,
        ),
      ).toBe(source);
    }
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
