import { expect, test } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { BASE_URL } from "../e2e/support/dossier-gallery-shared";
import { paginationFixture } from "./pagination-fixtures";
import { collectDocument, documentRoots, loadFixture } from "./pagination-browser";
import { contentFindings, distributionFindings, normalizeContent } from "./pagination-assertions";

const directory = "artifacts/pagination-2page-combined";
for (const template of [
  "studio3",
  "studio2",
  "ledger",
  "ribbon",
  "gallery",
  "brief",
  "terracotta",
]) {
  test(`combined long dossier preserves Web pages and logical PDF content: ${template}`, async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await mkdir(directory, { recursive: true });
    const fixture = paginationFixture(template, { works: 8, schools: 4, paragraphs: 10 });
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
    const pdfPath = join(directory, `${template}.pdf`);
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
      join(directory, `${template}.json`),
      JSON.stringify(
        {
          template,
          status: findings.length ? "FAIL" : "PASS",
          sourceSha: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
          fixtureSha256: createHash("sha256").update(JSON.stringify(fixture.storage)).digest("hex"),
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
