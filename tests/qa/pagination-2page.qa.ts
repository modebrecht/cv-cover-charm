import { expect, test } from "@playwright/test";
import { GALLERY_CASES, assertGalleryCatalog } from "../e2e/support/dossier-gallery-shared";
import { paginationFixture, type FixtureOptions } from "./pagination-fixtures";
import {
  auditDocument,
  collectDocument,
  documentRoots,
  evidenceDir,
  loadFixture,
  type DocumentKind,
} from "./pagination-browser";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

assertGalleryCatalog();
const selected = process.env.PAGINATION_QA_TEMPLATES?.split(",");
for (const item of GALLERY_CASES.filter((item) => !selected || selected.includes(item.id))) {
  for (const [scenario, options] of [
    ["one", { works: 1, schools: 1, paragraphs: 2 }],
    ["two", { works: 6, schools: 2, paragraphs: 8 }],
  ] as const) {
    for (const kind of ["cv", "letter"] as DocumentKind[]) {
      test(`matrix ${item.id} ${scenario} ${kind}`, async ({ page }) => {
        let fixture = paginationFixture(item.id, options);
        await loadFixture(page, fixture, kind);
        const calibration: { units: number; pages: number }[] = [];
        if (scenario === "two") {
          let units = kind === "cv" ? options.works : options.paragraphs;
          for (let attempt = 0; attempt < 12; attempt++) {
            const pages = await collectDocument(page, documentRoots(kind).web, kind);
            calibration.push({ units, pages: pages.length });
            if (pages.length === 2) break;
            units += pages.length < 2 ? 1 : -1;
            if (units < 1 || units > 30)
              throw new Error("Two-page fixture calibration exceeded its bounded content range");
            fixture = paginationFixture(item.id, {
              ...options,
              ...(kind === "cv" ? { works: units } : { paragraphs: units }),
            });
            await loadFixture(page, fixture, kind);
          }
        }
        const result = await auditDocument(
          page,
          fixture,
          kind,
          `matrix-${item.id}-${scenario}-${kind}`,
        );
        await writeFile(
          join(evidenceDir, `matrix-${item.id}-${scenario}-${kind}-calibration.json`),
          JSON.stringify(calibration),
        );
        expect
          .soft(result.web.length, `fixture expected ${scenario} page(s)`)
          .toBe(scenario === "one" ? 1 : 2);
        expect(result.findings).toEqual([]);
      });
    }
  }
}

const representatives = [
  "studio3",
  "studio2",
  "ledger",
  "ribbon",
  "gallery",
  "brief",
  "terracotta",
];
for (const template of representatives.filter((id) => !selected || selected.includes(id))) {
  for (const kind of ["cv", "letter"] as DocumentKind[]) {
    test(`boundary ${template} ${kind}: last one / first two / last two / first three / restore`, async ({
      page,
    }) => {
      test.setTimeout(240_000);
      const observed: { units: number; pages: number }[] = [];
      const options = (units: number) =>
        kind === "cv" ? { works: units, schools: 1 } : { paragraphs: units };
      const count = async (units: number) => {
        await loadFixture(page, paginationFixture(template, options(units)), kind);
        const pages = await collectDocument(page, documentRoots(kind).web, kind);
        observed.push({ units, pages: pages.length });
        return pages.length;
      };
      // Search observed production output, never calculate or imitate pagination.
      const firstWith = async (target: number) => {
        let low = 1,
          high = kind === "cv" ? 35 : 40;
        expect(await count(low)).toBeLessThan(target);
        expect(await count(high)).toBeGreaterThanOrEqual(target);
        while (high - low > 1) {
          const mid = Math.floor((low + high) / 2);
          if ((await count(mid)) >= target) high = mid;
          else low = mid;
        }
        return high;
      };
      const firstTwo = await firstWith(2),
        firstThree = await firstWith(3);
      const failures: { name: string; findings: string[] }[] = [];
      let shortDistribution: string[][] = [];
      for (const [label, units, expected] of [
        ["last-one", firstTwo - 1, 1],
        ["first-two", firstTwo, 2],
        ["last-two", firstThree - 1, 2],
        ["first-three", firstThree, 3],
        ["restore-short", firstTwo - 1, 1],
        ["restore-long", firstThree - 1, 2],
      ] as const) {
        const fixture = paginationFixture(template, options(units));
        await loadFixture(page, fixture, kind);
        const result = await auditDocument(
          page,
          fixture,
          kind,
          `boundary-${template}-${kind}-${label}`,
          !label.startsWith("restore"),
        );
        expect.soft(result.web.length, `${label} units=${units}`).toBe(expected);
        if (label === "last-one") shortDistribution = result.web.map((p) => p.markers);
        if (label === "restore-short")
          expect.soft(result.web.map((p) => p.markers)).toEqual(shortDistribution);
        if (result.findings.length) failures.push({ name: label, findings: result.findings });
      }
      await writeFile(
        join(evidenceDir, `boundary-${template}-${kind}-search.json`),
        JSON.stringify({ template, kind, firstTwo, firstThree, observed }, null, 2),
      );
      expect(failures).toEqual([]);
    });
  }
}

const variants: [string, string, FixtureOptions][] = [
  ["studio3", "sidebar-left", { layout: "modern", custom: true }],
  ["studio3", "sidebar-right", { layout: "modern", mirrored: true, custom: true }],
  ["studio2", "minimal", { layout: "minimal" }],
  ["ledger", "half-columns", { columns: true }],
  ["ledger", "masonry", { masonry: true }],
  ["ribbon", "editorial", { layout: "editorial" }],
  ["gallery", "timeline", { layout: "timeline" }],
  ["terracotta", "sidebar-left", { layout: "modern", custom: true }],
  ["terracotta", "sidebar-right", { layout: "modern", mirrored: true, custom: true }],
  ["brief", "large-entry", { largeEntry: true }],
  ["studio3", "large-entry", { largeEntry: true }],
  ["brief", "custom-margins", { custom: true }],
];
for (const [template, label, options] of variants.filter(
  ([id]) => !selected || selected.includes(id),
)) {
  test(`variant ${template} ${label} cv`, async ({ page }) => {
    const fixture = paginationFixture(template, { works: 12, schools: 6, ...options });
    await loadFixture(page, fixture, "cv");
    const result = await auditDocument(page, fixture, "cv", `variant-${template}-${label}-cv`);
    expect(result.findings).toEqual([]);
  });
}
for (const template of ["brief", "studio3", "gallery"].filter(
  (id) => !selected || selected.includes(id),
))
  for (const [label, options] of [
    ["custom-margins", { custom: true }],
    ["long-word", { longWord: true }],
  ] as const) {
    test(`variant ${template} ${label} letter`, async ({ page }) => {
      const fixture = paginationFixture(template, { paragraphs: 14, ...options });
      await loadFixture(page, fixture, "letter");
      const result = await auditDocument(
        page,
        fixture,
        "letter",
        `variant-${template}-${label}-letter`,
      );
      expect(result.findings).toEqual([]);
    });
  }

for (const template of ["brief", "studio3"].filter((id) => !selected || selected.includes(id)))
  for (const kind of ["cv", "letter"] as DocumentKind[]) {
    test(`live ${template} ${kind}: short long short long without reload`, async ({ page }) => {
      const short = paginationFixture(template, { works: 1, schools: 1, paragraphs: 2 });
      const long = paginationFixture(template, {
        works: 1,
        schools: 1,
        paragraphs: 12,
        descriptionRepeats: 8,
      });
      await loadFixture(page, short, kind);
      const roots = documentRoots(kind),
        failures = [];
      for (const [index, fixture] of [short, long, short, long].entries()) {
        if (kind === "cv") {
          const data = JSON.parse(fixture.storage["lebenslauf:v1"]).data;
          await page
            .locator('input[data-dossier-field-id="cv.entry.erfahrung:qa-work-0.description"]')
            .fill(data.erfahrung[0].beschreibung);
        } else {
          const data = JSON.parse(fixture.storage["anschreiben:v1"]).data;
          await page.getByRole("textbox", { name: "Brieftext", exact: true }).fill(data.text);
        }
        const pages = page.locator(`${roots.web} ${roots.pages}`);
        if (index % 2 === 0) await expect.poll(() => pages.count(), { timeout: 20_000 }).toBe(1);
        else await expect.poll(() => pages.count(), { timeout: 20_000 }).toBeGreaterThan(1);
        await page.waitForTimeout(700);
        const result = await auditDocument(
          page,
          fixture,
          kind,
          `live-${template}-${kind}-${index}`,
          index === 3,
        );
        if (result.findings.length) failures.push({ index, findings: result.findings });
      }
      expect(failures).toEqual([]);
    });
  }
