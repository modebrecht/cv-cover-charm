import { describe, expect, test } from "bun:test";
import { buildBlocks, type StyleOverrides } from "../../src/components/cover/layouts";
import { DEMO_DATA, TEMPLATES } from "../../src/components/cover/types";

const slots = TEMPLATES.find(({ id }) => id === "studio")?.slots;
if (!slots) throw new Error("Missing Studio template definition");

function studio(overrides: StyleOverrides = {}) {
  return buildBlocks("studio", DEMO_DATA, [], overrides, slots);
}

describe("Studio cover hierarchy", () => {
  test("keeps application kicker and profession together in the yellow band", () => {
    const blocks = studio();
    const kicker = blocks.find(({ id }) => id === "kicker");
    const profession = blocks.find(({ id }) => id === "beruf");
    const name = blocks.find(({ id }) => id === "name");
    const start = blocks.find(({ id }) => id === "lehrbeginn");
    const date = blocks.find(({ id }) => id === "ortDatum");

    expect(kicker?.style).toMatchObject({ x: 84, y: 31, w: 100 });
    expect(profession?.style).toMatchObject({ x: 84, y: 40, w: 100 });
    expect(name?.style).toMatchObject({ x: 84, y: 72, w: 100 });
    expect(start?.style).toMatchObject({ x: 84, y: 88, w: 100 });
    expect(date?.style).toMatchObject({ x: 84, y: 104, w: 100 });
  });

  test("explicit editor geometry still wins over the new defaults", () => {
    const blocks = studio({
      kicker: { x: 91, y: 47 },
      beruf: { y: 58 },
      name: { x: 96 },
    });

    expect(blocks.find(({ id }) => id === "kicker")?.style).toMatchObject({ x: 91, y: 47 });
    expect(blocks.find(({ id }) => id === "beruf")?.style.y).toBe(58);
    expect(blocks.find(({ id }) => id === "name")?.style.x).toBe(96);
  });
});
