import { expect, test } from "bun:test";
import { buildBlocks } from "../../src/components/cover/layouts";
import { DEMO_DATA, TEMPLATES } from "../../src/components/cover/types";
import {
  coverPdfTextContract,
  readCoverPdfTextContract,
} from "../../src/lib/cover-pdf-text-contract";

const blocks = () =>
  buildBlocks(
    "brief",
    structuredClone(DEMO_DATA),
    [],
    {},
    TEMPLATES.find((t) => t.id === "brief")!.slots,
  );

test("cover text contracts are readable for all production templates without changing their source", () => {
  for (const template of TEMPLATES) {
    const source = buildBlocks(template.id, structuredClone(DEMO_DATA), [], {}, template.slots);
    const before = JSON.stringify(source);
    const expected = readCoverPdfTextContract(coverPdfTextContract(source));
    expect(expected, template.id).not.toBeNull();
    expect(
      expected!.some((block) => block.id === "name" && block.lines.join("").includes("Müller")),
      template.id,
    ).toBe(true);
    expect(new Set(expected!.map((block) => block.id)).size).toBe(expected!.length);
    expect(JSON.stringify(source)).toBe(before);
  }
});

test("rich segments retain line positions; explicit hidden and empty text require no printed copy", () => {
  const source = blocks();
  const name = source.find((block) => block.id === "name")!;
  name.lines = ["", [{ t: " Lea " }, { t: "Müller", weight: 700 }], " Name "];
  const contact = source.find((block) => block.id === "kontakt")!;
  contact.style.hidden = true;
  const before = JSON.stringify(source);
  const expected = readCoverPdfTextContract(coverPdfTextContract(source))!;
  expect(expected.find((block) => block.id === "name")!.lines).toEqual(["", "LeaMüller", "Name"]);
  expect(expected.some((block) => block.id === "kontakt")).toBe(false);
  expect(expected.some((block) => block.id === "foto")).toBe(false);
  expect(JSON.stringify(source)).toBe(before);
  expect(
    readCoverPdfTextContract(
      coverPdfTextContract(
        source.map((block) => ({ ...block, style: { ...block.style, hidden: true } })),
      ),
    ),
  ).toEqual([]);
});

test("disabled recipient and attachments do not create missing text requirements", () => {
  const data = {
    ...structuredClone(DEMO_DATA),
    showBetriebOnCover: false,
    showBeilagenOnCover: false,
  };
  const source = buildBlocks("brief", data, [], {}, TEMPLATES.find((t) => t.id === "brief")!.slots);
  const expected = readCoverPdfTextContract(coverPdfTextContract(source))!;
  for (const id of ["empfaenger", "anTitel", "beilagen", "beilagenTitel"])
    expect(expected.some((block) => block.id === id)).toBe(false);
});

test("missing, malformed, duplicate and unsupported contracts are rejected", () => {
  for (const value of [
    undefined,
    "",
    "{",
    "null",
    "[]",
    '{"version":2,"blocks":[]}',
    '{"version":1}',
    '{"version":1,"blocks":[null]}',
    '{"version":1,"blocks":[{"id":"name","lines":[7]}]}',
    '{"version":1,"blocks":[{"id":"","lines":[]}]}',
    '{"version":1,"blocks":[{"id":"name","lines":[]},{"id":"name","lines":[]}]}',
  ])
    expect(readCoverPdfTextContract(value)).toBeNull();
  expect(readCoverPdfTextContract('{"version":1,"blocks":[]}')).toEqual([]);
});
