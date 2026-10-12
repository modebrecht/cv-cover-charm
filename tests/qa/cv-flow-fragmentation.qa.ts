import { expect, test } from "@playwright/test";
import { paginationFixture, type FixtureOptions } from "./pagination-fixtures";
import { auditDocument, loadFixture } from "./pagination-browser";

const cases: [string, string, FixtureOptions][] = [
  ["ledger", "half-columns-large-entry", { columns: true, largeEntry: true }],
  ["ledger", "masonry-large-entry", { masonry: true, largeEntry: true }],
  [
    "studio3",
    "right-sidebar-large-entry-custom-margins",
    { layout: "modern", mirrored: true, custom: true, largeEntry: true },
  ],
];
for (const [template, name, options] of cases) {
  test(`fragmentation ${template} ${name} cv`, async ({ page }) => {
    const fixture = paginationFixture(template, { works: 12, schools: 6, ...options });
    await loadFixture(page, fixture, "cv");
    const result = await auditDocument(page, fixture, "cv", `fragmentation-${template}-${name}-cv`);
    expect(result.web.length).toBeGreaterThan(2);
    expect(result.findings).toEqual([]);
  });
}
