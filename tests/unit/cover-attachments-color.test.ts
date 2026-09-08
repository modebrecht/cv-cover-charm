import { describe, expect, test } from "bun:test";
import { buildBlocks } from "../../src/components/cover/layouts";
import {
  DEFAULT_COVER_BEILAGEN,
  EMPTY_META,
  TEMPLATES,
  type CoverData,
} from "../../src/components/cover/types";

const DATA: CoverData = {
  kicker: "Bewerbung um eine Lehrstelle als",
  eyebrow: "",
  beruf: "Informatiker/in EFZ",
  lehrbeginn: "August 2027",
  vorname: "Lea",
  nachname: "Müller",
  adresse: "Dorfstrasse 12",
  plzOrt: "4535 Hubersdorf",
  telefon: "+41 79 123 45 67",
  email: "lea.mueller@example.ch",
  geburtsdatum: "14.03.2010",
  lehrbetrieb: "Beispiel AG",
  ansprechperson: "Herr Thomas Weber",
  betriebAdresse: "Industriestrasse 8, 4500 Solothurn",
  showBetriebOnCover: false,
  showBeilagenOnCover: true,
  beilagen: [...DEFAULT_COVER_BEILAGEN],
  ort: "Hubersdorf",
  datum: "05.09.2026",
  labelKontakt: "",
  labelEmpfaenger: "",
  foto: null,
  meta: EMPTY_META,
};

describe("Kolumne cover attachments", () => {
  test("attachments moved from the dark sidebar use readable ink on the light page area", () => {
    const template = TEMPLATES.find(({ id }) => id === "terracotta");
    expect(template).toBeDefined();
    if (!template) return;

    const blocks = buildBlocks(template.id, DATA, [], {}, template.slots);
    const body = blocks.find((block) => block.id === "beilagen");

    expect(body).toBeDefined();
    expect(body!.style.x).toBe(110);
    expect(body!.style.align).toBe("right");
    expect(body!.style.color).toBe("ink");
  });

  test("a manual attachment color override still wins", () => {
    const template = TEMPLATES.find(({ id }) => id === "terracotta");
    expect(template).toBeDefined();
    if (!template) return;

    const blocks = buildBlocks(
      template.id,
      DATA,
      [],
      { beilagen: { color: "#123456" } },
      template.slots,
    );
    const body = blocks.find((block) => block.id === "beilagen");

    expect(body?.style.color).toBe("#123456");
  });
});
