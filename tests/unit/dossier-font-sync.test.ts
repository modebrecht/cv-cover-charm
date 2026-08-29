import { describe, expect, test } from "bun:test";
import { emptyLetterDesign } from "../../src/components/letter/types";
import { FONT_LABELS, FONT_STACKS } from "../../src/components/cover/types";
import {
  dossierFontFromSerialized,
  reconcileDossierFontTexts,
} from "../../src/lib/dossier-font-sync";

function fontOf(text: string | null) {
  return dossierFontFromSerialized(text);
}

describe("CV and motivation-letter font sync", () => {
  test("copies the CV dossier font into a missing motivation letter", () => {
    const cv = JSON.stringify({
      version: 6,
      data: { marker: "cv-content" },
      design: { template: "modern", font: "serif", colors: { bg: "#fff" } },
    });

    const result = reconcileDossierFontTexts(cv, null);

    expect(result.font).toBe("serif");
    expect(fontOf(result.cv)).toBe("serif");
    expect(fontOf(result.letter)).toBe("serif");
    expect(JSON.parse(result.cv ?? "{}").data.marker).toBe("cv-content");
  });

  test("copies an existing motivation-letter font into a CV without a concrete font", () => {
    const cv = JSON.stringify({
      version: 6,
      data: { marker: "keep-me" },
      design: { template: "modern", colors: { bg: "#fff" } },
    });
    const letter = JSON.stringify({
      version: 1,
      data: { text: "Brief bleibt erhalten" },
      design: { template: "brief", font: "maschine", colors: { bg: "#fff" } },
    });

    const result = reconcileDossierFontTexts(cv, letter);

    expect(result.font).toBe("maschine");
    expect(fontOf(result.cv)).toBe("maschine");
    expect(fontOf(result.letter)).toBe("maschine");
    expect(JSON.parse(result.cv ?? "{}").data.marker).toBe("keep-me");
    expect(JSON.parse(result.letter ?? "{}").data.text).toBe("Brief bleibt erhalten");
  });

  test("uses the CV as the one-time tie-breaker for an old conflicting pair", () => {
    const cv = JSON.stringify({ version: 6, design: { font: "freundlich" } });
    const letter = JSON.stringify({ version: 1, design: { font: "sans" } });

    const result = reconcileDossierFontTexts(cv, letter);

    expect(result.font).toBe("freundlich");
    expect(fontOf(result.cv)).toBe("freundlich");
    expect(fontOf(result.letter)).toBe("freundlich");
  });

  test("ignores invalid font values instead of spreading corrupted data", () => {
    const cv = JSON.stringify({ version: 6, design: { font: "comic-sans-nope" } });
    const letter = JSON.stringify({ version: 1, design: { font: "times" } });

    const result = reconcileDossierFontTexts(cv, letter);

    expect(result.font).toBe("times");
    expect(fontOf(result.cv)).toBe("times");
    expect(fontOf(result.letter)).toBe("times");
  });

  test("keeps the semantic dossier default mapped to Cabin", () => {
    expect(emptyLetterDesign().font).toBe("freundlich");
    expect(FONT_LABELS.freundlich).toBe("Cabin");
    expect(FONT_STACKS.freundlich).toContain("Cabin");

    const reconciled = reconcileDossierFontTexts(
      JSON.stringify({ version: 6, design: { font: "freundlich" } }),
      JSON.stringify({ version: 1, design: {} }),
    );

    expect(reconciled.font).toBe("freundlich");
    expect(fontOf(reconciled.cv)).toBe("freundlich");
    expect(fontOf(reconciled.letter)).toBe("freundlich");
  });
});
