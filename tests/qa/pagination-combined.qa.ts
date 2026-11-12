import { expect, test, type Locator } from "@playwright/test";
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
async function photoBoxMm(sheet: Locator) {
  return sheet.evaluate((sheet) => {
    const page = sheet.getBoundingClientRect();
    const image = sheet.querySelector("[data-cv-photo]")!.getBoundingClientRect();
    return [
      ((image.x - page.x) * 210) / page.width,
      ((image.y - page.y) * 297) / page.height,
      (image.width * 210) / page.width,
      (image.height * 297) / page.height,
    ];
  });
}
type CombinedOptions = FixtureOptions & { photo?: "circle" | "portrait" };
const cases: [string, string, CombinedOptions][] = [
  "studio3",
  "studio2",
  "ledger",
  "ribbon",
  "gallery",
  "brief",
  "terracotta",
].map((template) => [template, template, { works: 8, schools: 4, paragraphs: 10 }]);
cases.push(
  ...(["terracotta", "studio3"] as const).map((template): [string, string, CombinedOptions] => [
    `joint-${template}-mirrored-photo-crop`,
    template,
    {
      works: 12,
      schools: 6,
      paragraphs: 14,
      layout: "modern",
      mirrored: true,
      custom: true,
      photo: template === "terracotta" ? "circle" : "portrait",
    },
  ]),
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
    if (options.photo) {
      await page.goto(`${BASE_URL}/fonts/Cabin-OFL.txt`);
      const photo = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 160;
        canvas.height = 200;
        const context = canvas.getContext("2d")!;
        context.fillStyle = "#c94838";
        context.fillRect(0, 0, 160, 200);
        context.fillStyle = "#246baf";
        context.fillRect(80, 0, 80, 200);
        context.fillStyle = "#e5c551";
        context.fillRect(0, 140, 160, 60);
        context.fillStyle = "#172c39";
        context.beginPath();
        context.arc(47, 62, 26, 0, 2 * Math.PI);
        context.fill();
        return canvas.toDataURL();
      });
      const cv = JSON.parse(fixture.storage["lebenslauf:v1"]);
      cv.data.person.foto = photo;
      fixture.storage["lebenslauf:v1"] = JSON.stringify(cv);
      fixture.storage["lebenslauf:photo-place:v1"] = JSON.stringify({ mode: "auto" });
      fixture.storage["lebenslauf:photo:v2"] = JSON.stringify({
        shape: options.photo,
        zoom: options.photo === "circle" ? 1.35 : 1.65,
        x: options.photo === "circle" ? 30 : 85,
        y: options.photo === "circle" ? 70 : 20,
        borderWidth: options.photo === "circle" ? 0.3 : 1.2,
      });
    }
    // These positives stress Letter/CV fragmentation with one common safe
    // production Cover. Original unsafe covers have separate hard-negative QA.
    const cover = JSON.parse(fixture.storage["titelblatt:v3"]);
    cover.template = "brief";
    fixture.storage["titelblatt:v3"] = JSON.stringify(cover);
    await loadFixture(page, fixture, "cv");
    const webCv = await collectDocument(page, documentRoots("cv").web, "cv");
    const photoBox = options.photo
      ? await photoBoxMm(page.locator(`${documentRoots("cv").web} [data-cv-page="0"]`))
      : null;
    if (options.photo) {
      const webRoot = page.locator(documentRoots("cv").web);
      await expect(webRoot).toHaveAttribute("data-cv-mirrored", "true");
      await expect(webRoot.locator("[data-cv-photo] img")).toHaveCount(1);
      await webRoot.locator('[data-cv-page="0"]').screenshot({
        path: join(directory, `${name}--cv-web.png`),
        animations: "disabled",
      });
    }
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
    let canonicalPhotoBox: number[] | null = null;
    if (options.photo) {
      const root = page.locator('[data-dossier-document="cv"][data-export-mode="true"]');
      await expect(root).toHaveAttribute("data-cv-mirrored", "true");
      await expect(root).toHaveAttribute("data-cv-photo-shape", options.photo);
      await expect(root.locator("[data-cv-photo] img")).toHaveCount(1);
      canonicalPhotoBox = await photoBoxMm(root.locator('[data-cv-page="0"]'));
      for (const [axis, value] of canonicalPhotoBox.entries())
        expect(Math.abs(value - photoBox![axis])).toBeLessThanOrEqual(0.3);
    }
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
          photo: photoBox
            ? {
                boxMm: photoBox,
                canonicalBoxMm: canonicalPhotoBox,
                pdfPageIndex: 1 + letter.length,
                webPng: `${name}--cv-web.png`,
                style: JSON.parse(fixture.storage["lebenslauf:photo:v2"]),
              }
            : null,
          findings,
        },
        null,
        2,
      ),
    );
    expect(findings).toEqual([]);
  });
}
