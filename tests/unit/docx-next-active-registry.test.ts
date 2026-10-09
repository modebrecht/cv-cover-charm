import { expect, test } from "bun:test";
import { TEMPLATES } from "../../src/components/cover/types";
import { NEXT_TEMPLATES } from "../../src/lib/docx-next/templates";

test("DOCX Next registry exactly covers the 39 active picker templates", () => {
  const active = TEMPLATES.filter((template) => !["warm4", "warm5"].includes(template.id))
    .map((template) => template.id)
    .sort();
  expect(active).toHaveLength(39);
  expect(new Set(active).size).toBe(39);
  expect(Object.keys(NEXT_TEMPLATES).sort()).toEqual(active);
  for (const id of ["aurora", "neon", "verlauf"]) expect(NEXT_TEMPLATES[id]).toBeDefined();
  expect(NEXT_TEMPLATES.warm4).toBeUndefined();
  expect(NEXT_TEMPLATES.warm5).toBeUndefined();
});
