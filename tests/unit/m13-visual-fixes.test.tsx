import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildBlocks } from "../../src/components/cover/layouts";
import { resolveLayout } from "../../src/components/cover/resolve";
import { EMPTY_META, TEMPLATES, type CoverData } from "../../src/components/cover/types";
import { LetterSheetBackground } from "../../src/components/letter/LetterSheetBackground";
import { defaultLetterColors } from "../../src/components/letter/types";

const coverData: CoverData = {
  meta: { ...EMPTY_META },
  kicker: "Bewerbung um eine Lehrstelle als",
  eyebrow: "Bewerbung",
  beruf: "Informatiker/in EFZ",
  lehrbeginn: "August 2027",
  vorname: "Lea",
  nachname: "Müller",
  adresse: "Dorfstrasse 12",
  plzOrt: "4535 Hubersdorf",
  telefon: "+41 79 123 45 67",
  email: "lea@example.ch",
  geburtsdatum: "14.03.2010",
  lehrbetrieb: "Beispiel AG",
  ansprechperson: "Herr Weber",
  betriebAdresse: "Industriestrasse 8, 4500 Solothurn",
  showBetriebOnCover: false,
  showBeilagenOnCover: true,
  beilagen: ["Motivationsschreiben", "Lebenslauf", "Zeugnis"],
  ort: "Hubersdorf",
  datum: "29.08.2026",
  labelKontakt: "",
  labelEmpfaenger: "",
  foto: null,
};

describe("M13 visual acceptance fixes", () => {
  test("Studio attachments stay above the A4 bottom edge", () => {
    const studio = TEMPLATES.find(({ id }) => id === "studio");
    expect(studio).toBeTruthy();
    const blocks = buildBlocks("studio", coverData, [], {}, studio?.slots ?? []);
    const resolved = resolveLayout(blocks, 1.2);
    const attachments = resolved.beilagen;
    const heading = resolved.beilagenTitel;

    expect(attachments).toBeTruthy();
    expect(heading).toBeTruthy();
    expect(attachments.y + attachments.height).toBeLessThanOrEqual(276.1);
    expect(heading.y + heading.height).toBeLessThan(attachments.y);
  });

  test("legacy column letters use narrow safe rails instead of CV-width columns", () => {
    const cases = [
      ["blockig", "19mm", "66mm"],
      ["terracotta", "17mm", "70mm"],
      ["studio", "20mm", "72mm"],
    ] as const;

    for (const [template, safeWidth, legacyWidth] of cases) {
      const markup = renderToStaticMarkup(
        createElement(LetterSheetBackground, {
          template,
          colors: defaultLetterColors(template),
        }),
      );
      expect(markup).toContain('data-letter-background-variant="quiet-column"');
      expect(markup).toContain("data-letter-safe-rail");
      expect(markup).toContain(`w-[${safeWidth}]`);
      expect(markup).not.toContain(`width:${legacyWidth}`);
    }
  });

  test("Blockig letter uses one larger orange block without a detached dash", () => {
    const markup = renderToStaticMarkup(
      createElement(LetterSheetBackground, {
        template: "blockig",
        colors: defaultLetterColors("blockig"),
      }),
    );

    expect(markup).toContain('data-letter-motif="accent-block"');
    expect(markup).toContain("h-[32mm]");
    expect(markup).toContain("w-[24mm]");
    expect(markup).not.toContain('data-letter-motif="rail-rule"');
  });
});
