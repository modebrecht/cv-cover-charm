import { describe, expect, test } from "bun:test";
import { nativeFlowBadgeWidthMm } from "../../src/lib/docx-next/elements";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { walkBlocks, type TableBlock } from "../../src/lib/docx-next/model";
import { graphicCandidateFixture } from "../fixtures/docx-next/graphic-candidate";
import type { UserStyledBlock } from "../../src/components/cover/user-style-precedence";
import cases from "../fixtures/docx-next/cover-family-ten-cases.json";

describe("ten-case gated cover cohort", () => {
  test("exactly four Verlauf, three Neon, three Warm with unique named cases", () => {
    expect(cases).toHaveLength(10);
    expect(new Set(cases.map((item) => item.id)).size).toBe(10);
    expect(cases.filter((item) => item.family === "verlauf")).toHaveLength(4);
    expect(cases.filter((item) => item.family === "neon")).toHaveLength(3);
    expect(cases.filter((item) => item.family === "freundlich")).toHaveLength(3);
    expect(cases.every((item) => item.purpose.trim().length > 10)).toBe(true);
    expect(cases.every((item) => item.family !== "modern" && item.family !== "brief")).toBe(true);
    expect(cases.filter((item) => item.variant === "photo")).toHaveLength(2);
  });
});

describe("measured-packet-independent native cover badge reservation", () => {
  test("all three audited families stop painting the entire date field", () => {
    for (const template of ["verlauf", "neon", "freundlich"]) {
      const fixture = graphicCandidateFixture(template);
      const before = structuredClone(fixture);
      const model = buildDossierDocModel(fixture);
      const badge = walkBlocks(model.cover.blocks)
        .find((block) => block.id === "cover.lehrbeginn.flow-box") as TableBlock;
      expect(badge).toBeDefined();
      expect(badge.kind).toBe("table");
      expect(badge.widthMm).toBeGreaterThan(30);
      expect(badge.widthMm).toBeLessThan(100);
      expect(fixture).toEqual(before);
      expect(model.letter).toEqual(buildDossierDocModel(before).letter);
      expect(model.cv).toEqual(buildDossierDocModel(before).cv);
    }
  });

  test("explicit saved badge width overrides conservative automatic fitting", () => {
    const fixture = graphicCandidateFixture("verlauf");
    const badge = fixture.cover.blocks.find((block) => block.id === "lehrbeginn")!;
    badge.style.w = 104;
    (badge as UserStyledBlock).userStyleKeys = ["w"];
    const box = walkBlocks(buildDossierDocModel(fixture).cover.blocks)
      .find((block) => block.id === "cover.lehrbeginn.flow-box") as TableBlock;
    expect(box.widthMm).toBe(104);
  });

  test("autofit fails closed for multiline/empty metrics and non-badge fields", () => {
    const fixture = graphicCandidateFixture("verlauf");
    const badge = fixture.cover.blocks.find((block) => block.id === "lehrbeginn")!;
    const short = { kind: "paragraph" as const,
      id: "cover.lehrbeginn",
      role: "body" as const,
      runs: [{ id: "run", text: "August 2028",
        style: { font: "Arial", sizePt: 12, color: "000000", bold: false,
          italic: false, underline: false } }],
      align: "center" as const, beforeMm: 0, afterMm: 2, lineHeight: 1.3,
      keepNext: false, keepLines: true,
    };
    expect(nativeFlowBadgeWidthMm(badge, [short], 166)).toBeLessThan(100);
    expect(nativeFlowBadgeWidthMm(badge, [{ ...short,
      runs: [{ ...short.runs[0], text: "August\\n2028" }] }], 166)).toBe(166);
    expect(nativeFlowBadgeWidthMm({ ...badge, style: { ...badge.style, bg: null } },
      [short], 166)).toBe(166);
    expect(nativeFlowBadgeWidthMm(badge, [], 166)).toBe(166);
  });
});
