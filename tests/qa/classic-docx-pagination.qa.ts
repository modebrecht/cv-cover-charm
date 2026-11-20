import { expect, test } from "@playwright/test";
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import type { CvData, CvDesign } from "../../src/components/cv/types";
import { KOLUMNE, STUDIO_3 } from "../../src/lib/docx-next/templates";
import { parityStorage } from "../e2e/support/cv-parity-fixture";
import {
  expectPdfPhotoCrop,
  expectPreviewPhotoCrop,
  usePhotoCropFixture,
} from "../e2e/support/cv-pdf-photo-crop";
import { BASE_URL, waitEditorReady } from "../e2e/support/dossier-gallery-shared";
import { normalizeContent } from "./pagination-assertions";

const run = promisify(execFile);
const out = "artifacts/classic-docx-pagination";
const cases = [
  { template: "terracotta", label: "Kolumne Standard", bodyPt: KOLUMNE.typography.bodyPt },
  { template: "studio3", label: "Studio 3 Standard", bodyPt: STUDIO_3.typography.bodyPt },
].flatMap((testCase) =>
  (["reference", "variable-length"] as const).map((variant) => ({ ...testCase, variant })),
);

async function readPages(path: string) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({
    data: new Uint8Array(await readFile(path)),
    disableFontFace: true,
  });
  const pdf = await task.promise;
  try {
    const pages = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const content = await (await pdf.getPage(n)).getTextContent();
      pages.push(content.items.flatMap((item) => ("str" in item ? [item.str] : [])).join(" "));
    }
    return pages;
  } finally {
    await task.destroy();
  }
}

async function writer(source: string, target: string, format: "docx" | "pdf") {
  const engine = process.env.CLASSIC_CV_QA_LO_KIT;
  if (!engine) throw new Error("Set CLASSIC_CV_QA_LO_KIT to the LibreOfficeKit QA adapter.");
  const uri = (path: string) => pathToFileURL(resolve(path)).href;
  await run(engine, [uri(target + "-profile"), uri(source), uri(target), format], {
    timeout: 120_000,
  });
}

for (const { template, label, bodyPt, variant } of cases) {
  test(`${label} DOCX reading flow: ${variant}`, async ({ page }) => {
    test.setTimeout(240_000);
    const directory = resolve(out, template, variant);
    await mkdir(directory, { recursive: true });
    const storage = parityStorage(template, true);
    const cv: { data: CvData; design: CvDesign } = JSON.parse(storage["lebenslauf:v1"]);
    cv.design.sidebarPct = 0.3;
    if (variant === "variable-length")
      for (const [i, entry] of cv.data.erfahrung.entries()) {
        if (i % 3 === 0) entry.beschreibung = entry.beschreibung.split(". ")[0] + ".";
        if (i % 3 === 1)
          entry.beschreibung += " Das Ergebnis wurde anschliessend gemeinsam getestet.";
      }
    storage["lebenslauf:v1"] = JSON.stringify(cv);
    storage["lebenslauf:photo-place:v1"] = JSON.stringify({ mode: "auto" });
    usePhotoCropFixture(storage);
    await page.addInitScript((values) => {
      for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);
    }, storage);
    await page.goto(BASE_URL + "/lebenslauf", { waitUntil: "networkidle" });
    await waitEditorReady(page);
    await page.evaluate(() => document.fonts.ready);

    const visible = page.locator('[data-dossier-document="cv"][data-export-mode="false"]');
    await expect(visible).toHaveAttribute("data-cv-variant", "classic");
    const fit = await visible.evaluate((cv, bodyPt) => {
      const first = cv.querySelector('[data-cv-page="0"]')!;
      const page = first.getBoundingClientRect();
      const main = first.querySelector("[data-cv-main]")!.getBoundingClientRect();
      const toX = 210 / page.width;
      const toY = 297 / page.height;
      const photo = first.querySelector("[data-cv-photo]")!.getBoundingClientRect();
      const name = first.querySelector("[data-cv-name]")!.getBoundingClientRect();
      const halfMm = (mm: number) => Math.round(mm * 2) / 2;
      const zoom = (node: Element) =>
        (node as HTMLElement & { currentCSSZoom: number }).currentCSSZoom;
      const scale = (node: Element) => zoom(node) / zoom(first);
      const margins = {
        left: halfMm((main.left - page.left) * toX),
        right: halfMm((page.right - main.right) * toX),
        top: halfMm((main.top - page.top) * toY),
        bottom: halfMm((page.bottom - main.bottom) * toY),
      };
      const entries = Array.from(cv.querySelectorAll("[data-cv-page] [data-cv-entry]"));
      const entryGaps: Record<string, number> = {};
      const entryFragments: Record<string, number> = {};
      const dateWidths = entries.flatMap((entry) => {
        const date = entry.querySelector<HTMLElement>('[data-dossier-field-id$=".date"]');
        const title = entry.querySelector<HTMLElement>('[data-dossier-field-id$=".title"]');
        if (!date) return [];
        const rail = date.dataset.dossierFieldId!.replace(/\.date$/, ".dateRail");
        entryFragments[rail] = (entryFragments[rail] ?? 0) + 1;
        if (!title) return [];
        const offset = title.getBoundingClientRect().left - date.getBoundingClientRect().left;
        entryGaps[rail] =
          (parseFloat(getComputedStyle(entry).marginBottom) * scale(entry) * 25.4) / 96;
        return offset > 0 ? [[rail, offset * toX] as const] : [];
      });
      const leading = Array.from(
        cv.querySelectorAll<HTMLElement>("[data-cv-page] [data-dossier-field-id]"),
        (field) =>
          [
            field.dataset.dossierFieldId!,
            parseFloat(getComputedStyle(field).lineHeight) * 0.75 * scale(field),
          ] as const,
      ).filter(([, height]) => Number.isFinite(height) && height > 0);
      const canvas = document.createElement("canvas").getContext("2d")!;
      canvas.font = `${bodyPt}pt "Liberation Sans"`;
      const trackingPt: Record<string, number> = {};
      // Align the fallback advance with the Web line budget in the plain fixture text.
      // Round to twentieths of a point, which the native paragraph can represent.
      const prose = cv.querySelectorAll<HTMLElement>(
        '[data-cv-page] [data-dossier-field-id$=".description"], [data-cv-page] [data-dossier-field-id^="cv.entry.custom:familie:"][data-dossier-field-id$=".place"]',
      );
      for (const field of prose) {
        const availablePt = (field.getBoundingClientRect().width * toX * 72) / 25.4 - 0.2;
        const lines = new Map<number, string[]>();
        const cursor = document.createTreeWalker(field, NodeFilter.SHOW_TEXT);
        while (cursor.nextNode()) {
          for (const word of cursor.currentNode.textContent!.matchAll(/\S+/g)) {
            const range = document.createRange();
            range.setStart(cursor.currentNode, word.index);
            range.setEnd(cursor.currentNode, word.index + word[0].length);
            const row = Math.round(range.getBoundingClientRect().y * 4);
            lines.set(row, [...(lines.get(row) ?? []), word[0]]);
          }
        }
        const measured = Array.from(lines.values(), (line) => {
          const text = line.join(" ");
          return (
            (availablePt - canvas.measureText(text).width * 0.75) / Math.max(1, text.length - 1)
          );
        });
        trackingPt[field.dataset.dossierFieldId!] = Math.max(
          -0.3,
          Math.floor(Math.min(0, ...measured) * 20) / 20,
        );
      }
      return {
        margins,
        dateWidths: Object.fromEntries(dateWidths),
        leading: Object.fromEntries(leading),
        entryGaps,
        entryFragments,
        trackingPt,
        photo: { widthMm: photo.width * toX, gapMm: (name.left - photo.right) * toX },
        openingInsetMm: halfMm((photo.top - main.top) * toY),
      };
    }, bodyPt);
    expect(Object.keys(fit.dateWidths).length).toBeGreaterThanOrEqual(cv.data.erfahrung.length);
    const photoPoints = await expectPreviewPhotoCrop(visible.locator('[data-cv-page="0"]'));
    const appPdf = resolve(directory, "app.pdf");
    await page.getByRole("button", { name: "Download", exact: true }).click();
    const download = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: "PDF", exact: true }).click();
    await (await download).saveAs(appPdf);

    const result = await page.evaluate(async (fit) => {
      const project = "/src/lib/dossier-project.ts";
      const docs = "/src/lib/dossier-pdf-document.ts";
      const snapshot = "/src/lib/docx-next/snapshot.ts";
      const builder = "/src/lib/docx-next/build-model.ts";
      const renderer = "/src/lib/docx-next/renderer.ts";
      const blocks = "/src/lib/docx-next/model.ts";
      const app = "/src/lib/docx-next/app-source.ts";
      const boundaries = "/src/lib/docx-next/flow-boundaries.ts";
      const { COVER_STORAGE_KEY, LETTER_STORAGE_KEY, CV_STORAGE_KEY, readStoredDossierPart } =
        (await import(project)) as typeof import("../../src/lib/dossier-project");
      const { coverPdfDocumentFromSaved, letterPdfDocumentFromSaved, cvPdfDocumentFromSaved } =
        (await import(docs)) as typeof import("../../src/lib/dossier-pdf-document");
      const { captureDossierDocxNextSnapshot } = (await import(
        snapshot
      )) as typeof import("../../src/lib/docx-next/snapshot");
      const { buildDossierDocModel } = (await import(
        builder
      )) as typeof import("../../src/lib/docx-next/build-model");
      const { renderDossierDocx } = (await import(
        renderer
      )) as typeof import("../../src/lib/docx-next/renderer");
      const { walkBlocks } = (await import(
        blocks
      )) as typeof import("../../src/lib/docx-next/model");
      const { savedAppDocxNextAvailability } = (await import(
        app
      )) as typeof import("../../src/lib/docx-next/app-source");
      const { datedFlowAfterMm } = (await import(
        boundaries
      )) as typeof import("../../src/lib/docx-next/flow-boundaries");
      const saved = () =>
        JSON.stringify(
          [COVER_STORAGE_KEY, LETTER_STORAGE_KEY, CV_STORAGE_KEY].map((key) =>
            localStorage.getItem(key),
          ),
        );
      const before = saved();
      const source = captureDossierDocxNextSnapshot(
        coverPdfDocumentFromSaved(readStoredDossierPart(COVER_STORAGE_KEY))!,
        letterPdfDocumentFromSaved(readStoredDossierPart(LETTER_STORAGE_KEY))!,
        cvPdfDocumentFromSaved(readStoredDossierPart(CV_STORAGE_KEY))!,
        {},
        "cv",
      );
      const baseline = buildDossierDocModel(source, { exportPart: "cv" });
      const candidateSource = structuredClone(source);
      candidateSource.settings.fontPolicy = { availableFonts: ["Liberation Sans"] };
      candidateSource.settings.margins = { ...candidateSource.settings.margins, cv: fit.margins };
      const candidate = buildDossierDocModel(candidateSource, {
        exportPart: "cv",
        cvContentComposition: "reading-rows",
        cvFooterComposition: "painted-compact",
        cvContactComposition: "compact-grid",
      });
      // Studio 3's masthead moves the opening photo and text down inside the
      // body box. Keep the continuation margins and insert the measured gap once.
      if (fit.openingInsetMm > 0)
        candidate.cv.blocks.unshift({
          kind: "spacer",
          id: "cv.qa.opening-inset",
          heightMm: fit.openingInsetMm,
        });
      for (const block of walkBlocks(candidate.cv.blocks)) {
        if (
          block.kind === "image" &&
          block.id === "cv.person.photo" &&
          block.placement === "left"
        ) {
          block.widthMm = fit.photo.widthMm;
          block.gapMm = fit.photo.gapMm;
        }
        if (block.kind === "table" && block.columnWidthsMm && fit.dateWidths[block.id]) {
          // Reading rows have a 5 mm indent between the date cell and the text.
          block.columnWidthsMm[0] = fit.dateWidths[block.id] - 5;
          const row = block.rows[0];
          row.keepTogether = fit.entryFragments[block.id] === 1;
          const last = row.cells[1].at(-1);
          if (last?.kind === "paragraph") last.afterMm = datedFlowAfterMm(fit.entryGaps[block.id]);
        }
        if (block.kind === "paragraph") {
          if (block.role !== "contact" && fit.leading[block.id])
            block.minimumLineHeightPt = fit.leading[block.id];
          if (fit.trackingPt[block.id])
            for (const run of block.runs) run.style.trackingPt = fit.trackingPt[block.id];
        }
      }
      const pack = async (model: typeof candidate) => {
        const blob = await renderDossierDocx(model, {
          part: "cv",
          onDecorationFailure: (id, error) => {
            throw new Error(id, { cause: error });
          },
        });
        return Array.from(new Uint8Array(await blob.arrayBuffer()));
      };
      const baselineBytes = await pack(baseline);
      const candidateBytes = await pack(candidate);
      return {
        baselineBytes,
        candidateBytes,
        available: savedAppDocxNextAvailability("cv"),
        sourceUnchanged: before === saved(),
        issues: candidate.issues,
        footer: {
          distanceMm: candidate.cv.page.footerDistanceMm,
          paragraphs: candidate.cv.footer.length,
        },
      };
    }, fit);
    expect(result.available).toMatchObject({ available: false });
    expect(result.sourceUnchanged).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.footer).toEqual({ distanceMm: 0, paragraphs: 0 });

    const docs = [
      [resolve(directory, "baseline.docx"), result.baselineBytes],
      [resolve(directory, "candidate.docx"), result.candidateBytes],
    ] as const;
    for (const [path, bytes] of docs) {
      await writeFile(path, Buffer.from(bytes));
      await writer(path, path.replace(/\.docx$/, ".pdf"), "pdf");
    }
    const markers = [
      "Sekundarschule, Niveau A",
      ...cv.data.erfahrung.map(({ titel }) => titel),
      "Referenzmarker",
    ];
    const locate = (pages: string[]) =>
      Object.fromEntries(
        markers.map((marker) => [
          marker,
          pages.flatMap((text, i) => Array<number>(text.split(marker).length - 1).fill(i + 1)),
        ]),
      );
    const baselinePdf = await readPages(resolve(directory, "baseline.pdf"));
    const candidatePdf = await readPages(resolve(directory, "candidate.pdf"));
    await expectPdfPhotoCrop(resolve(directory, "candidate.pdf"), 1, photoPoints);
    const app = await readPages(appPdf);
    const expected = locate(app);
    const wholeEntries = (pages: string[]) =>
      cv.data.erfahrung.map((entry, i) => {
        const title = normalizeContent(entry.titel);
        const page = pages.map(normalizeContent).find((text) => text.includes(title)) ?? "";
        const following = cv.data.erfahrung[i + 1]?.titel;
        const from = page.indexOf(title) + title.length;
        const to = following ? page.indexOf(normalizeContent(following), from) : -1;
        return page
          .slice(from, to < 0 ? undefined : to)
          .includes(normalizeContent(entry.beschreibung));
      });
    const replay = [];
    let original = docs[1][0];
    for (const cycle of [1, 2]) {
      const saved = resolve(directory, `save-${cycle}.docx`);
      const pdf = resolve(directory, `save-${cycle}.pdf`);
      await writer(original, saved, "docx");
      await writer(saved, pdf, "pdf");
      const pages = await readPages(pdf);
      await expectPdfPhotoCrop(pdf, 1, photoPoints);
      replay.push({
        pages: pages.length,
        markers: locate(pages),
        wholeEntries: wholeEntries(pages),
      });
      original = saved;
    }
    const evidence = {
      fit,
      baseline: { pages: baselinePdf.length, markers: locate(baselinePdf) },
      app: { pages: app.length, markers: expected, wholeEntries: wholeEntries(app) },
      candidate: {
        pages: candidatePdf.length,
        markers: locate(candidatePdf),
        wholeEntries: wholeEntries(candidatePdf),
      },
      replay,
    };
    await writeFile(resolve(directory, "evidence.json"), JSON.stringify(evidence, null, 2));
    for (const locations of [
      evidence.app.markers,
      evidence.baseline.markers,
      evidence.candidate.markers,
    ]) {
      for (const [marker, found] of Object.entries(locations))
        expect(found, marker).toHaveLength(1);
    }
    expect(evidence.app.wholeEntries.every(Boolean)).toBe(true);
    expect(evidence.candidate).toEqual(evidence.app);
    for (const saved of replay) expect(saved).toEqual(evidence.candidate);
  });
}
