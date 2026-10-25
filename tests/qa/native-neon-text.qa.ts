import { expect, test, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  BASE_URL,
  GALLERY_CASES,
  applyGalleryCase,
  seedCanonicalDossier,
} from "../e2e/support/dossier-gallery-shared";

const output = "artifacts/native-neon-14okt";
const hash = (value: Buffer | string) => createHash("sha256").update(value).digest("hex");
const sheetSelector = "[data-dossier-pdf-canvas] [data-cv-page]";
const fields = "[data-cv-name], [data-cv-doc-title], [data-cv-subtitle], [data-cv-entry-title]";

async function snapshot(page: Page) {
  return page.locator(sheetSelector).evaluateAll(
    (sheets, fields) =>
      sheets.map((sheet) => {
        const s = sheet.getBoundingClientRect();
        return {
          text: sheet.textContent,
          nodes: Array.from(sheet.querySelectorAll<HTMLElement>(fields), (node) => {
            const range = document.createRange();
            range.selectNodeContents(node);
            const r = range.getBoundingClientRect(),
              style = getComputedStyle(node);
            return {
              text: node.textContent ?? "",
              kind: node.hasAttribute("data-cv-name")
                ? "name"
                : node.hasAttribute("data-cv-doc-title")
                  ? "title"
                  : node.hasAttribute("data-cv-subtitle")
                    ? "subtitle"
                    : "entry",
              box: [
                ((r.x - s.x) * 210) / s.width,
                ((r.y - s.y) * 297) / s.height,
                (r.width * 210) / s.width,
                (r.height * 297) / s.height,
              ],
              font: [
                style.fontFamily,
                style.fontSize,
                style.fontWeight,
                style.fontStyle,
                style.letterSpacing,
              ],
            };
          }),
        };
      }),
    fields,
  );
}

async function readPdf(bytes: Buffer) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({ data: new Uint8Array(bytes), disableFontFace: true });
  const pdf = await task.promise,
    pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i),
      content = await page.getTextContent();
    const items = content.items.filter((item) => "str" in item);
    pages.push({
      text: items.map((item) => item.str + (item.hasEOL ? "\n" : "")).join(""),
      items,
      box: page.view,
    });
  }
  await task.destroy();
  return pages;
}

test("Neon keeps one authored semantic name in real native PDFs and preserves shadow paint", async ({
  page,
  browser,
}) => {
  test.setTimeout(600000);
  await mkdir(output, { recursive: true });
  const runtimeSources = Object.fromEntries(
    await Promise.all(
      ["src/lib/dossier-native-print.ts", "src/components/dossier/dossier-native-print.css"].map(
        async (file) => [file, hash(await readFile(file))],
      ),
    ),
  );
  const stored = await seedCanonicalDossier(page),
    rows = [];
  const cases = [
    { id: "neon", label: "neon" },
    {
      id: "neon",
      label: "neon-unicode",
      name: "Zoë",
      surname: "Müller",
      subtitle: "Élève à Zürich – français",
    },
    { id: "neon", label: "neon-long", long: true },
    ...["brief", "modern", "prism", "aurora", "glow", "ribbon"].map((id) => ({ id, label: id })),
  ];
  for (const fixture of cases) {
    const base = structuredClone(stored);
    if ("name" in fixture) {
      base.cv.data.person.vorname = fixture.name;
      base.cv.data.person.nachname = fixture.surname;
      base.cv.data.person.untertitel = fixture.subtitle;
    }
    if ("long" in fixture) {
      base.cv.data.schule = Array.from({ length: 24 }, (_, i) => ({
        ...base.cv.data.schule[0],
        id: `neon-school-${i}`,
        titel: `Informatik Kurs ${String(i + 1).padStart(2, "0")}`,
        beschreibung: "Programmieren, Gestaltung und französische Texte.",
      }));
    }
    await applyGalleryCase(page, base, GALLERY_CASES.find((item) => item.id === fixture.id)!);
    await page.goto(`${BASE_URL}/?native-print-qa=1`, { waitUntil: "networkidle" });
    await expect(page.getByRole("button", { name: /Gesamtdossier herunterladen/ })).toBeEnabled();
    await page.getByRole("button", { name: /Gesamtdossier herunterladen/ }).click();
    const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
    await expect(
      dialog.getByRole("button", { name: "PDF herunterladen", exact: true }),
    ).toBeEnabled({ timeout: 30000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      window.print = () => {};
    });
    const canonical = await snapshot(page);
    const saved = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    const originalStyles = await page
      .locator(`${sheetSelector} :is(${fields})`)
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("style")));
    const captures = [];
    for (const variant of fixture.id === "neon"
      ? ["baseline", "no-shadow", "fixed"]
      : ["baseline", "fixed"]) {
      await page.emulateMedia({ media: "screen" });
      await dialog
        .getByRole("button", { name: "Drucken / als PDF speichern", exact: true })
        .click();
      await expect(page.locator("body")).toHaveAttribute("data-dossier-native-print", "true");
      const annotations = await page.locator("[data-native-neon-shadow]").count();
      expect(annotations).toBe(
        fixture.id === "neon"
          ? canonical[0].nodes.filter((node) => node.kind !== "entry").length
          : 0,
      );
      await page.emulateMedia({ media: "print" });
      let style;
      if (variant !== "fixed")
        style = await page.addStyleTag({
          content: `
        [data-native-print-active="true"] [data-native-neon-shadow]{position:static;isolation:auto;text-shadow:${variant === "baseline" ? "var(--native-neon-text-shadow)" : "none"}!important}
        [data-native-print-active="true"] [data-native-neon-shadow]::before{content:none!important}
      `,
        });
      const geometry = await snapshot(page);
      expect(geometry.map((sheet) => sheet.text)).toEqual(canonical.map((sheet) => sheet.text));
      for (const [i, sheet] of geometry.entries())
        for (const [j, node] of sheet.nodes.entries()) {
          expect(node.font).toEqual(canonical[i].nodes[j].font);
          node.box.forEach((value, k) =>
            expect(Math.abs(value - canonical[i].nodes[j].box[k])).toBeLessThanOrEqual(0.02),
          );
        }
      if (fixture.label === "neon")
        await page
          .locator(sheetSelector)
          .first()
          .screenshot({
            path: `${output}/${fixture.label}-${variant}-web.png`,
            animations: "disabled",
          });
      const bytes = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        scale: 1,
      });
      const pages = await readPdf(bytes),
        file = `${fixture.label}-${variant}.pdf`;
      await writeFile(`${output}/${file}`, bytes);
      expect(pages).toHaveLength(canonical.length + 2);
      for (const sheet of pages) {
        expect(Math.abs(sheet.box[2] - (210 * 72) / 25.4)).toBeLessThan(0.5);
        expect(Math.abs(sheet.box[3] - (297 * 72) / 25.4)).toBeLessThan(0.5);
        expect(sheet.text).not.toMatch(/Dossier herunterladen|Projekt speichern/);
      }
      const name = `${base.cv.data.person.vorname} ${base.cv.data.person.nachname}`;
      if (variant === "fixed" && ["neon", "neon-unicode"].includes(fixture.label)) {
        // Exercise a real PDF.js browser text layer and browser copy/paste,
        // independently of the Node extraction assertions below.
        await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
        const viewer = await page.context().newPage();
        await viewer.goto(BASE_URL, { waitUntil: "networkidle" });
        await viewer.evaluate(
          async ({ data, name }) => {
            const { getDocument, GlobalWorkerOptions, TextLayer } = await import(
              String("/node_modules/pdfjs-dist/build/pdf.mjs")
            );
            GlobalWorkerOptions.workerSrc = "/node_modules/pdfjs-dist/build/pdf.worker.mjs";
            const pdf = await getDocument({
              data: Uint8Array.from(atob(data), (c) => c.charCodeAt(0)),
            }).promise;
            const pdfPage = await pdf.getPage(3);
            const container = document.createElement("div");
            container.style.position = "relative";
            const paste = document.createElement("textarea");
            paste.id = "pdf-copy-paste";
            document.body.replaceChildren(container, paste);
            const textLayer = new TextLayer({
              textContentSource: await pdfPage.getTextContent(),
              container,
              viewport: pdfPage.getViewport({ scale: 1 }),
            });
            await textLayer.render();
            const names = Array.from(container.querySelectorAll("span")).filter(
              (span) => span.textContent === name,
            );
            if (names.length !== 1)
              throw new Error(`Expected one selectable name, got ${names.length}`);
            const range = document.createRange();
            range.selectNodeContents(names[0]);
            getSelection()!.removeAllRanges();
            getSelection()!.addRange(range);
          },
          { data: bytes.toString("base64"), name },
        );
        await viewer.keyboard.press("Control+C");
        await viewer.locator("#pdf-copy-paste").focus();
        await viewer.keyboard.press("Control+V");
        await expect(viewer.locator("#pdf-copy-paste")).toHaveValue(name);
        await viewer.close();
      }
      const cvText = pages
        .slice(2)
        .map((sheet) => sheet.text)
        .join("\n");
      if (variant === "fixed" || variant === "no-shadow") {
        // Literal raw reader output. No whitespace removal, glyph de-duplication
        // or synthetic spaces are allowed to turn a corrupt name into PASS.
        expect(cvText.split(name).length - 1).toBe(1);
        expect(
          pages
            .slice(2)
            .flatMap((sheet) => sheet.items)
            .filter((item) => item.str === name),
        ).toHaveLength(1);
        for (const node of canonical
          .flatMap((sheet) => sheet.nodes)
          .filter((node) => ["entry", "subtitle"].includes(node.kind)))
          expect(cvText).toContain(node.text);
      }
      captures.push({ variant, file, sha256: hash(bytes), geometry, pages });
      if (style) await style.evaluate((node) => node.parentNode?.removeChild(node));
      await page.emulateMedia({ media: "screen" });
      await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
      expect(await page.locator("[data-native-neon-shadow]").count()).toBe(0);
      expect(
        await page
          .locator(`${sheetSelector} :is(${fields})`)
          .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("style"))),
      ).toEqual(originalStyles);
      expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).toBe(saved);
    }
    if ("long" in fixture) expect(canonical.length).toBeGreaterThan(1);
    rows.push({ fixture, canonical, captures });
    console.log(`NEON SEMANTIC PDF ${fixture.label}: ${captures.length} PDFs passed`);
    await writeFile(
      `${output}/results.json`,
      JSON.stringify(
        {
          source: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
          browser: browser.version(),
          runtimeSources,
          rows,
        },
        null,
        2,
      ),
    );
  }
});
