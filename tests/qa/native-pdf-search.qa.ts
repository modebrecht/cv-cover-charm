/** Diagnostic audit: literal failures are retained, never normalized into PASS. */
import { expect, test, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  BASE_URL,
  GALLERY_CASES,
  applyGalleryCase,
  assertGalleryCatalog,
  seedCanonicalDossier,
} from "../e2e/support/dossier-gallery-shared";

const output = resolve("artifacts/native-pdf-search-13okt");
const hash = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");
const physical =
  '[data-dossier-document="cover"], [data-letter-document-pages] [data-letter-page], [data-cv-page]';
const options = {
  format: "A4" as const,
  printBackground: true,
  preferCSSPageSize: true,
  displayHeaderFooter: false,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  scale: 1,
};

async function pdfText(bytes: Buffer) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({ data: new Uint8Array(bytes), disableFontFace: true });
  const pdf = await task.promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i),
      content = await page.getTextContent();
    pages.push({
      text: content.items
        .map((item) => ("str" in item ? item.str + (item.hasEOL ? "\n" : "") : ""))
        .join(""),
      box: [page.view[2], page.view[3]],
      items: content.items
        .filter((item) => "str" in item)
        .map((item) => ({
          str: item.str,
          width: item.width,
          transform: item.transform,
          fontName: item.fontName,
        })),
    });
  }
  await task.destroy();
  return pages;
}

async function snapshot(page: Page) {
  return page
    .locator("[data-dossier-pdf-canvas]")
    .locator(physical)
    .evaluateAll((sheets) =>
      sheets.map((sheet) => {
        const bounds = sheet.getBoundingClientRect();
        return {
          kind: sheet.hasAttribute("data-cv-page")
            ? "cv"
            : sheet.hasAttribute("data-letter-page")
              ? "letter"
              : "cover",
          text: (sheet as HTMLElement).innerText,
          textContent: sheet.textContent,
          nodes: Array.from(
            sheet.querySelectorAll<HTMLElement>(
              "[data-cv-name], [data-cv-doc-title], [data-cv-section-title], [data-cv-entry-title], [data-cv-main], [data-cv-header], [data-cv-sidebar], [data-cv-photo]",
            ),
          ).map((node) => {
            const r = node.getBoundingClientRect(),
              s = getComputedStyle(node);
            const range = document.createRange();
            range.selectNodeContents(node);
            const text = range.getBoundingClientRect();
            return {
              tag: node.outerHTML.split(">")[0].replace(/style="[^"]*"/g, ""),
              text: node.innerText,
              box: [
                ((r.x - bounds.x) * 210) / bounds.width,
                ((r.y - bounds.y) * 297) / bounds.height,
                (r.width * 210) / bounds.width,
                (r.height * 297) / bounds.height,
              ],
              textBox: [
                ((text.x - bounds.x) * 210) / bounds.width,
                ((text.y - bounds.y) * 297) / bounds.height,
                (text.width * 210) / bounds.width,
                (text.height * 297) / bounds.height,
              ],
              font: [s.fontFamily, s.fontSize, s.fontWeight, s.lineHeight, s.letterSpacing],
            };
          }),
        };
      }),
    );
}

async function prepare(page: Page) {
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Gesamtdossier herunterladen/ }).click();
  const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
  await expect(dialog.getByRole("button", { name: "PDF herunterladen", exact: true })).toBeEnabled({
    timeout: 30000,
  });
  await page.evaluate(async () => {
    const { prepareDossierNativePrint } = await import(String("/src/lib/dossier-native-print.ts"));
    (
      await prepareDossierNativePrint(document.querySelector("[data-dossier-pdf-canvas]")!)
    ).release();
  });
  return dialog;
}

test("six representative native templates reproduce tracking failures and bound generic experiments", async ({
  page,
  browser,
}) => {
  test.setTimeout(900000);
  await mkdir(output + "/focused", { recursive: true });
  assertGalleryCatalog();
  const stored = await seedCanonicalDossier(page),
    rows = [];
  for (const item of GALLERY_CASES.filter((item) =>
    ["neon", "modern", "sonne", "studio", "aurora", "klassisch"].includes(item.id),
  )) {
    await applyGalleryCase(page, stored, item);
    const dialog = await prepare(page);
    await page.evaluate(() => {
      window.print = () => window.dispatchEvent(new Event("beforeprint"));
    });
    await dialog.getByRole("button", { name: "Drucken / als PDF speichern", exact: true }).click();
    await expect(page.locator("body")).toHaveAttribute("data-dossier-native-print", "true");
    await page.emulateMedia({ media: "print" });
    const baseline = await snapshot(page),
      captures = [];
    for (const variant of ["baseline", "no-synthesis", "no-kerning", "metric-tracking"]) {
      // Chromium's page.pdf dispatches afterprint too. Each independent PDF
      // must prepare the real product path again after its previous release.
      if (!(await page.locator("body").getAttribute("data-dossier-native-print"))) {
        await page.emulateMedia({ media: "screen" });
        await dialog
          .getByRole("button", { name: "Drucken / als PDF speichern", exact: true })
          .click();
        await expect(page.locator("body")).toHaveAttribute("data-dossier-native-print", "true");
        await page.emulateMedia({ media: "print" });
      }
      let style;
      let originalStyles: (string | null)[] | undefined;
      if (variant === "no-synthesis")
        style = await page.addStyleTag({
          content: "[data-cv-section-title] {font-synthesis:none!important}",
        });
      if (variant === "no-kerning")
        style = await page.addStyleTag({
          content:
            "[data-cv-section-title] {font-kerning:none!important;font-variant-ligatures:none!important;text-rendering:optimizeSpeed!important}",
        });
      if (variant === "metric-tracking") {
        originalStyles = await page
          .locator("[data-dossier-pdf-canvas] [data-cv-section-title]")
          .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("style")));
        const styles = await page
          .locator("[data-dossier-pdf-canvas] [data-cv-section-title]")
          .evaluateAll((nodes) =>
            nodes.map((node) => {
              const s = getComputedStyle(node);
              return {
                size: parseFloat(s.fontSize),
                spacing: parseFloat(s.letterSpacing) || 0,
                weight: parseInt(s.fontWeight),
              };
            }),
          );
        const rules = [];
        for (const [i, s] of styles.entries()) {
          // This hypothesis addresses positive tracking only. Negative tracking
          // cannot be encoded as unsigned advances on zero-width mark glyphs.
          if (s.spacing <= 0) continue;
          const fontPath = output + `/focused/${item.id}-font-${i}.ttf`;
          execFileSync("python", [
            "-c",
            `from fontTools.ttLib import TTFont\nf=TTFont('public/fonts/Cabin-${s.weight >= 600 ? "Bold" : "Regular"}.ttf')\nd=round(f['head'].unitsPerEm*${s.spacing / s.size})\nfor g,(a,b) in list(f['hmtx'].metrics.items()): f['hmtx'].metrics[g]=(a+d,b)\nf.save(${JSON.stringify(fontPath)})`,
          ]);
          const font = await readFile(fontPath),
            url = `/native-probe-${item.id}-${i}.ttf`;
          await page.route("**" + url, (route) =>
            route.fulfill({ body: font, contentType: "font/ttf" }),
          );
          await page
            .locator("[data-dossier-pdf-canvas] [data-cv-section-title]")
            .nth(i)
            .evaluate((node, i) => {
              (node as HTMLElement).style.setProperty(
                "font-family",
                `NativeProbe${i}`,
                "important",
              );
              (node as HTMLElement).style.setProperty("letter-spacing", "0", "important");
            }, i);
          rules.push(
            `@font-face {font-family:NativeProbe${i};src:url('${url}');font-weight:100 900}`,
          );
        }
        if (rules.length) style = await page.addStyleTag({ content: rules.join("\n") });
        await page.evaluate(() => document.fonts.ready);
      }
      const geometry = await snapshot(page),
        bytes = await page.pdf(options),
        pages = await pdfText(bytes);
      expect(pages).toHaveLength(baseline.length);
      const file = `${item.id}--${variant}.pdf`;
      await writeFile(output + "/focused/" + file, bytes);
      captures.push({
        variant,
        file,
        sha256: hash(bytes),
        geometry,
        pages,
        literalFamilie: /\bfamilie\b/iu.test(
          pages
            .slice(2)
            .map((p) => p.text)
            .join("\n"),
        ),
      });
      if (style) await style.evaluate((node) => node.parentNode?.removeChild(node));
      if (originalStyles)
        await page.locator("[data-dossier-pdf-canvas] [data-cv-section-title]").evaluateAll(
          (nodes, styles) =>
            nodes.forEach((node, i) => {
              if (styles[i] === null) node.removeAttribute("style");
              else node.setAttribute("style", styles[i]!);
            }),
          originalStyles,
        );
    }
    rows.push({ id: item.id, template: item.label, baseline, captures });
    await page.emulateMedia({ media: "screen" });
    await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
    console.log(
      "FOCUSED NATIVE SEARCH " +
        item.label +
        " " +
        JSON.stringify(captures.map((c) => ({ variant: c.variant, literal: c.literalFamilie }))),
    );
    await writeFile(
      output + "/focused/results.json",
      JSON.stringify(
        {
          source: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
          browser: browser.version(),
          rows,
        },
        null,
        2,
      ),
    );
  }
  expect(rows).toHaveLength(6);
});

test("39-template actual-byte literal search audit preserves automatic compatibility and reports native failures", async ({
  page,
  browser,
}) => {
  test.setTimeout(1200000);
  await mkdir(output + "/catalog", { recursive: true });
  assertGalleryCatalog();
  const stored = await seedCanonicalDossier(page),
    rows = [];
  for (const item of GALLERY_CASES) {
    await applyGalleryCase(page, stored, item);
    let dialog = await prepare(page);
    const canonical = await snapshot(page);
    const savedBefore = await page.evaluate(() =>
      Object.fromEntries(
        [
          "titre",
          "titelblatt:v3",
          "anschreiben:v1",
          "lebenslauf:v1",
          "bewerbungsdossier:chrome:v1",
        ].map((key) => [key, localStorage.getItem(key)]),
      ),
    );
    const promise = page.waitForEvent("download", { timeout: 120000 });
    await dialog.getByRole("button", { name: "PDF herunterladen", exact: true }).click();
    const download = await promise,
      automatic = await readFile((await download.path())!);
    dialog = await prepare(page);
    await page.evaluate(() => {
      window.print = () => window.dispatchEvent(new Event("beforeprint"));
    });
    await dialog.getByRole("button", { name: "Drucken / als PDF speichern", exact: true }).click();
    await expect(page.locator("body")).toHaveAttribute("data-dossier-native-print", "true");
    await page.emulateMedia({ media: "print" });
    const printGeometry = await snapshot(page),
      native = await page.pdf(options);
    expect(printGeometry.map((p) => p.textContent)).toEqual(canonical.map((p) => p.textContent));
    for (const [i, sheet] of canonical.entries()) {
      expect(printGeometry[i].nodes).toHaveLength(sheet.nodes.length);
      for (const [j, node] of sheet.nodes.entries())
        for (const [axis, value] of node.box.entries())
          expect(
            Math.abs(value - printGeometry[i].nodes[j].box[axis]),
            item.label,
          ).toBeLessThanOrEqual(0.02);
    }
    await page.emulateMedia({ media: "screen" });
    await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
    await expect(page.locator("body")).not.toHaveAttribute("data-dossier-native-print", "true");
    expect(
      await page.evaluate(() =>
        Object.fromEntries(
          [
            "titre",
            "titelblatt:v3",
            "anschreiben:v1",
            "lebenslauf:v1",
            "bewerbungsdossier:chrome:v1",
          ].map((key) => [key, localStorage.getItem(key)]),
        ),
      ),
    ).toEqual(savedBefore);
    const captures = [];
    for (const [kind, bytes] of [
      ["automatic", automatic],
      ["native", native],
    ] as const) {
      const pages = await pdfText(bytes);
      expect(pages).toHaveLength(canonical.length);
      for (const p of pages) {
        expect(p.box[0]).toBeCloseTo((210 * 72) / 25.4, 0);
        expect(p.box[1]).toBeCloseTo((297 * 72) / 25.4, 0);
        expect(p.text).not.toMatch(/Dossier herunterladen|Projekt speichern/);
      }
      const cv = pages
        .filter((_, i) => canonical[i].kind === "cv")
        .map((p) => p.text)
        .join("\n");
      const letter = pages
        .filter((_, i) => canonical[i].kind === "letter")
        .map((p) => p.text)
        .join("\n");
      const literalFamilie = /\bfamilie\b/iu.test(cv);
      if (kind === "automatic") {
        expect(literalFamilie, item.label).toBe(true);
        for (const phrase of [
          stored.letter.data.empfaengerName,
          stored.letter.data.empfaengerAdresse,
          stored.letter.data.anrede,
        ])
          expect(letter, item.label).toContain(phrase);
      }
      const queries = canonical.flatMap((p, index) =>
        p.nodes
          .filter((n) => /data-cv-(name|doc-title|section-title|entry-title)/.test(n.tag))
          .map((n) => ({
            page: index,
            tag: n.tag,
            phrase: n.text,
            literal: pages[index].text
              .toLocaleLowerCase("de")
              .includes(n.text.toLocaleLowerCase("de")),
          })),
      );
      const file = `${item.id}--${kind}.pdf`;
      await writeFile(output + "/catalog/" + file, bytes);
      captures.push({ kind, file, sha256: hash(bytes), pages, literalFamilie, queries });
    }
    rows.push({
      id: item.id,
      template: item.label,
      fixtureHash: hash(JSON.stringify(savedBefore)),
      canonical,
      printGeometry,
      captures,
      recipient: [
        stored.letter.data.empfaengerName,
        stored.letter.data.empfaengerAdresse,
        stored.letter.data.anrede,
      ],
    });
    await writeFile(
      output + "/catalog/results.json",
      JSON.stringify(
        {
          source: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
          browser: browser.version(),
          rows,
        },
        null,
        2,
      ),
    );
    console.log("CATALOG NATIVE SEARCH " + item.label + " " + captures[1].literalFamilie);
  }
  expect(rows).toHaveLength(39);
});
