import { expect, test } from "bun:test";
import { contentFindings, distributionFindings } from "../qa/pagination-assertions";
import { paginationFixture } from "../qa/pagination-fixtures";

test("pagination audit detects missing, duplicated, reordered and empty-page evidence", () => {
  const correct = [{ text: "QAONE001 First QATWO001 Last", markers: ["QAONE001", "QATWO001"] }];
  expect(contentFindings(correct, correct[0].markers, [correct[0].markers], ["First"])).toEqual([]);
  expect(
    contentFindings(
      [
        { text: "QATWO001 QAONE001 QAONE001", markers: ["QATWO001", "QAONE001", "QAONE001"] },
        { text: "footer", markers: [] },
      ],
      ["QAONE001", "QATWO001", "QAMISSING001"],
      [["QAONE001", "QATWO001"]],
      ["First"],
    ),
  ).toHaveLength(5);
  expect(distributionFindings(correct, [...correct, { text: "", markers: [] }], "PDF")).toContain(
    "PDF page count 2 != Web 1",
  );
  expect(
    distributionFindings(correct, [{ ...correct[0], markers: ["QATWO001", "QAONE001"] }], "PDF"),
  ).toContain("PDF page 1: marker order/distribution differs");
});
test("pagination fixtures are deterministic and markers are unique", () => {
  const first = paginationFixture("studio3", { works: 12, paragraphs: 14, largeEntry: true });
  expect(first).toEqual(
    paginationFixture("studio3", { works: 12, paragraphs: 14, largeEntry: true }),
  );
  for (const markers of Object.values(first.markers))
    expect(new Set(markers).size).toBe(markers.length);
});
