import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { emptyLetterDesign } from "../../src/components/letter/types";
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

  test("uses Trebuchet as the new-dossier default while preserving saved font choices", () => {
    const coverSource = readFileSync(
      new URL("../../src/routes/titelblatt.tsx", import.meta.url),
      "utf8",
    );
    const cvSource = readFileSync(
      new URL("../../src/routes/lebenslauf.tsx", import.meta.url),
      "utf8",
    );

    expect(emptyLetterDesign().font).toBe("freundlich");
    expect(coverSource).toContain('useState<FontKey | null>("freundlich")');
    expect(coverSource).toContain("setDocumentFont(validFont(p.font));");
    expect(cvSource).toContain('font: "freundlich"');
    expect(cvSource).toContain('font: draft ? (draft.font ?? undefined) : "freundlich"');
  });
});
