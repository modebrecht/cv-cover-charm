import { expect, test } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { BASE_URL } from "../e2e/support/dossier-gallery-shared";
import { paginationFixture, type FixtureOptions } from "./pagination-fixtures";
import {
  collectDocument,
  documentRoots,
  loadFixture,
  runtimeProvenance,
} from "./pagination-browser";
import { contentFindings, distributionFindings, normalizeContent } from "./pagination-assertions";

const directory = process.env.PAGINATION_COMBINED_QA_DIR ?? "artifacts/pagination-2page-combined";
const cases: [string, string, FixtureOptions][] = [
  "studio3",
  "studio2",
  "ledger",
  "ribbon",
  "gallery",
  "brief",
  "terracotta",
].map((template) => [template, template, { works: 8, schools: 4, paragraphs: 10 }]);
cases.push(
  [
    "joint-brief-large-entry-long-word-margins",
    "brief",
    { works: 12, schools: 6, paragraphs: 14, largeEntry: true, longWord: true, custom: true },
  ],
  [
    "joint-ledger-columns-long-word-margins",
    "ledger",
    {
      works: 12,
      schools: 6,
      paragraphs: 14,
      columns: true,
      largeEntry: true,
      longWord: true,
      custom: true,
    },
  ],
  [
    "joint-ledger-masonry-long-word-margins",
    "ledger",
    {
      works: 12,
      schools: 6,
      paragraphs: 14,
      masonry: true,
      largeEntry: true,
      longWord: true,
      custom: true,
    },
  ],
  [
    "joint-studio3-right-sidebar-long-word-margins",
    "studio3",
    {
      works: 12,
      schools: 6,
      paragraphs: 14,
      layout: "modern",
      mirrored: true,
      largeEntry: true,
      longWord: true,
      custom: true,
    },
  ],
);
for (const [name, template, options] of cases) {
  test(`combined long dossier preserves Web pages and logical PDF content: ${name}`, async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await mkdir(directory, { recursive: true });
    const fixture = paginationFixture(template, options);
    await loadFixture(page, fixture, "cv");
    const webCv = await collectDocument(page, documentRoots("cv").web, "cv");
    await loadFixture(page, fixture, "letter");
    const webLetter = await collectDocument(page, documentRoots("letter").web, "letter");
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Gesamtdossier herunterladen/ }).click();
    const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
    const button = dialog.getByRole("button", { name: "PDF herunterladen", exact: true });
    await expect(button).toBeEnabled({ timeout: 30_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(700);
    const cv = await collectDocument(
      page,
      '[data-dossier-document="cv"][data-export-mode="true"]',
      "cv",
    );
    const letter = await collectDocument(
      page,
      '[data-dossier-document="letter"] [data-letter-document-root]',
      "letter",
    );
    const findings = [
      ...distributionFindings(webCv, cv, "combined CV"),
      ...distributionFindings(webLetter, letter, "combined letter"),
    ];
    if (name.startsWith("joint-")) {
      if (webCv.length <= 2) findings.push("joint fixture requires a genuinely long CV");
      if (webLetter.length <= 2) findings.push("joint fixture requires a genuinely long letter");
    }
    for (const [kind, pages, expected] of [
      ["cv", cv, webCv],
      ["letter", letter, webLetter],
    ] as const) {
      findings.push(
        ...contentFindings(
          pages,
          fixture.markers[kind],
          fixture.sequences[kind],
          fixture.segments[kind],
        ).map((s) => `${kind} ${s}`),
      );
      for (const [i, p] of pages.entries()) {
        findings.push(...p.issues.map((s) => `${kind} page ${i + 1}: ${s}`));
        for (const key of [
          "main",
          "sidebar",
          "sidebarSide",
          "headerMode",
          "footerMode",
          "archetype",
        ] as const)
          if (JSON.stringify(p[key]) !== JSON.stringify(expected[i]?.[key]))
            findings.push(`${kind} page ${i + 1} geometry/style differs: ${key}`);
      }
    }
    const promise = page.waitForEvent("download", { timeout: 120_000 });
    await button.click();
    const pdfPath = join(directory, `${name}.pdf`);
    await (await promise).saveAs(pdfPath);
    const bytes = await readFile(pdfPath);
    const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const loading = getDocument({ data: new Uint8Array(bytes), disableFontFace: true });
    const pdfDocument = await loading.promise;
    const pdfPages = [];
    try {
      for (let i = 1; i <= pdfDocument.numPages; i++) {
        const content = await (await pdfDocument.getPage(i)).getTextContent();
        const text = content.items.map((x) => ("str" in x ? x.str : "")).join(" ");
        pdfPages.push({ text, markers: normalizeContent(text).match(/QA[A-Z]+\d{3}/g) ?? [] });
      }
    } finally {
      await loading.destroy();
    }
    if (pdfPages.length !== 1 + letter.length + cv.length)
      findings.push(
        `combined physical count ${pdfPages.length} != ${1 + letter.length + cv.length}`,
      );
    const pdfLetter = pdfPages.slice(1, 1 + letter.length),
      pdfCv = pdfPages.slice(1 + letter.length);
    for (const [kind, pages, web] of [
      ["cv", pdfCv, webCv],
      ["letter", pdfLetter, webLetter],
    ] as const)
      findings.push(
        ...contentFindings(
          pages,
          fixture.markers[kind],
          fixture.sequences[kind],
          fixture.segments[kind],
        ).map((s) => `PDF ${kind} ${s}`),
        ...distributionFindings(web, pages, `PDF ${kind}`),
      );
    await writeFile(
      join(directory, `${name}.json`),
      JSON.stringify(
        {
          name,
          template,
          options,
          status: findings.length ? "FAIL" : "PASS",
          ...runtimeProvenance(),
          fixtureSha256: createHash("sha256").update(JSON.stringify(fixture.storage)).digest("hex"),
          storage: fixture.storage,
          webCv,
          webLetter,
          cv,
          letter,
          pdfPages,
          pdfSha256: createHash("sha256").update(bytes).digest("hex"),
          findings,
        },
        null,
        2,
      ),
    );
    expect(findings).toEqual([]);
  });
}
