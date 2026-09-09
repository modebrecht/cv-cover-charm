import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  DEFAULT_DOSSIER_CHROME_OPTIONS,
  dossierHeaderContentTopMmForOptions,
  normalizeDossierChromeState,
} from "../../src/lib/dossier-chrome";

const controls = readFileSync(
  new URL("../../src/components/dossier/DossierChromeControls.tsx", import.meta.url),
  "utf8",
);

describe("dossier header spacing", () => {
  test("defaults to 6 mm and clamps persisted values to 0–40 mm", () => {
    expect(DEFAULT_DOSSIER_CHROME_OPTIONS.headerGapMm).toBe(6);

    const low = normalizeDossierChromeState({
      shared: { ...DEFAULT_DOSSIER_CHROME_OPTIONS, headerGapMm: -4 },
    });
    const high = normalizeDossierChromeState({
      shared: { ...DEFAULT_DOSSIER_CHROME_OPTIONS, headerGapMm: 99 },
    });
    const legacy = normalizeDossierChromeState({
      shared: { ...DEFAULT_DOSSIER_CHROME_OPTIONS, headerGapMm: undefined },
    });

    expect(low.shared.headerGapMm).toBe(0);
    expect(high.shared.headerGapMm).toBe(40);
    expect(legacy.shared.headerGapMm).toBe(6);
  });

  test("adds the selected whitespace after an enabled header", () => {
    const base = {
      ...DEFAULT_DOSSIER_CHROME_OPTIONS,
      headerMode: "contact" as const,
      headerGapMm: 0,
    };

    expect(
      dossierHeaderContentTopMmForOptions({ ...base, headerGapMm: 6 }) -
        dossierHeaderContentTopMmForOptions(base),
    ).toBe(6);
    expect(
      dossierHeaderContentTopMmForOptions({ ...base, headerGapMm: 40 }) -
        dossierHeaderContentTopMmForOptions(base),
    ).toBe(40);
  });

  test("exposes a 0–40 mm range control in the shared chrome UI", () => {
    expect(controls).toContain("data-dossier-header-gap-control");
    expect(controls).toContain("<span>Abstand nach Header</span>");
    expect(controls).toContain("min={0}");
    expect(controls).toContain("max={40}");
    expect(controls).toContain("headerGapMm: 6");
  });
});
