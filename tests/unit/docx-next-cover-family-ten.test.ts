import { describe, expect, test } from "bun:test";
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
