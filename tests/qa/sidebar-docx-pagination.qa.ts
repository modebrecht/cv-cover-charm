import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { CvData, CvDesign } from "../../src/components/cv/types";
import { parityStorage } from "../e2e/support/cv-parity-fixture";
import {
  expectPdfPhotoCrop,
  expectPreviewPhotoCrop,
  usePhotoCropFixture,
} from "../e2e/support/cv-pdf-photo-crop";
import { BASE_URL, waitEditorReady } from "../e2e/support/dossier-gallery-shared";
import { readDocxDocument, readTextPages, writer } from "./docx-writer";
import { normalizeContent } from "./pagination-assertions";
import { obfuscateOoxmlFont } from "../../src/lib/docx-cabin-fonts";
import { readZipEntries } from "../../src/lib/docx-next/zip";

for (const template of ["terracotta", "studio3"]) {
  for (const variant of [
    "reference",
    "mixed-lengths",
    "template-font",
    "cabin-legacy",
    "cabin-legacy-mixed",
  ] as const) {
    test(`${template} Sidebar rechts preserves every native entry: ${variant}`, async ({
      page,
    }) => {
      test.setTimeout(240_000);
      const directory = resolve("artifacts/sidebar-docx-pagination", template, variant);
      await mkdir(directory, { recursive: true });
      const storage = parityStorage(template, true, true);
      const cv: { data: CvData; design: CvDesign } = JSON.parse(storage["lebenslauf:v1"]);
      cv.design.sidebarPct = 0.3;
      const cabin = variant.startsWith("cabin-");
      if (cabin) delete cv.design.font;
      else cv.design.font = "sans";
      if (variant === "mixed-lengths" || variant === "cabin-legacy-mixed")
        for (const [i, entry] of cv.data.erfahrung.entries()) {
          if (i % 3 === 0) entry.beschreibung = entry.beschreibung.split(". ")[0] + ".";
          if (i % 3 === 1)
            entry.beschreibung += " Das Ergebnis wurde anschliessend gemeinsam getestet.";
        }
      storage["lebenslauf:v1"] = JSON.stringify(cv);
      storage["lebenslauf:photo-place:v1"] = JSON.stringify({ mode: "auto" });
      usePhotoCropFixture(storage);
      await page.addInitScript((values) => {
        if (sessionStorage.getItem("sidebar-docx-qa-seeded")) return;
        Object.entries(values).forEach(([key, value]) => localStorage.setItem(key, value));
        sessionStorage.setItem("sidebar-docx-qa-seeded", "true");
      }, storage);
      await page.goto(BASE_URL + "/lebenslauf", { waitUntil: "networkidle" });
      await waitEditorReady(page);
      if (variant === "template-font") {
        const showFonts = async () => {
          const toggle = page.locator(
            '[data-editor-section-title="Schrift"] [data-editor-section-toggle]',
          );
          if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
          return page.getByLabel(/Schriftart gesamtes Dossier/);
        };
        const savedFont = () =>
          page.evaluate(() => JSON.parse(localStorage.getItem("lebenslauf:v1")!).design.font);
        await (await showFonts()).selectOption("template");
        await expect.poll(savedFont).toBeNull();
        await page.reload({ waitUntil: "networkidle" });
        await waitEditorReady(page);
        await expect(await showFonts()).toHaveValue("template");
        expect(await savedFont()).toBeNull();
      }
      await page.evaluate(() => document.fonts.ready);

      const visible = page.locator('[data-dossier-document="cv"][data-export-mode="false"]');
      await expect(visible).toHaveAttribute("data-cv-variant", "modern");
      await expect(visible).toHaveAttribute("data-cv-info-position", "mirrored");
      const photoPoints = await expectPreviewPhotoCrop(visible.locator('[data-cv-page="0"]'));
      const continuationEntry = await visible
        .locator(
          '[data-cv-page="1"] [data-dossier-field-id^="cv.entry.erfahrung:"][data-dossier-field-id$=".title"]',
        )
        .evaluateAll((titles) => {
          // Keep the seam inside page two. It is a flowing row, not a forced page break.
          const field = titles[Math.floor(titles.length / 2)] as HTMLElement | undefined;
          return field?.dataset.dossierFieldId?.slice(
            "cv.entry.erfahrung:".length,
            -".title".length,
          );
        });
      if (!continuationEntry) throw Error("Missing experience entry on the second App page");
      await page.getByRole("button", { name: "Download", exact: true }).click();
      const download = page.waitForEvent("download");
      await page.getByRole("menuitem", { name: "PDF", exact: true }).click();
      const appPath = resolve(directory, "app.pdf");
      await (await download).saveAs(appPath);
      await expectPdfPhotoCrop(appPath, 1, photoPoints);

      const exported = await page.evaluate(async (entryId) => {
        const project = (await import(
          String("/src/lib/dossier-project.ts")
        )) as typeof import("../../src/lib/dossier-project");
        const documents = (await import(
          String("/src/lib/dossier-pdf-document.ts")
        )) as typeof import("../../src/lib/dossier-pdf-document");
        const { captureDossierDocxNextSnapshot } = (await import(
          String("/src/lib/docx-next/snapshot.ts")
        )) as typeof import("../../src/lib/docx-next/snapshot");
        const { prepareBriefFontProfile } = (await import(
          String("/src/lib/docx-next/brief-fonts.browser.ts")
        )) as typeof import("../../src/lib/docx-next/brief-fonts.browser");
        const { captureCvSidebarTextMetrics } = (await import(
          String("/src/lib/docx-next-sidebar-metrics.browser.tsx")
        )) as typeof import("../../src/lib/docx-next-sidebar-metrics.browser");
        const { buildDossierDocModel } = (await import(
          String("/src/lib/docx-next/build-model.ts")
        )) as typeof import("../../src/lib/docx-next/build-model");
        const { renderDossierDocx } = (await import(
          String("/src/lib/docx-next/renderer.ts")
        )) as typeof import("../../src/lib/docx-next/renderer");
        const { savedAppDocxNextAvailability } = (await import(
          String("/src/lib/docx-next/app-source.ts")
        )) as typeof import("../../src/lib/docx-next/app-source");
        const get = project.readStoredDossierPart;
        const keys = [
          project.COVER_STORAGE_KEY,
          project.LETTER_STORAGE_KEY,
          project.CV_STORAGE_KEY,
        ];
        const saved = () => keys.map((key) => localStorage.getItem(key)).join("\u0000");
        const before = saved();
        const source = captureDossierDocxNextSnapshot(
          documents.coverPdfDocumentFromSaved(get(project.COVER_STORAGE_KEY))!,
          documents.letterPdfDocumentFromSaved(get(project.LETTER_STORAGE_KEY))!,
          documents.cvPdfDocumentFromSaved(get(project.CV_STORAGE_KEY))!,
          {},
          "cv",
        );
        const fonts = await prepareBriefFontProfile([]);
        try {
          if (source.cv.design.font === "sans")
            source.settings.fontPolicy = { availableFonts: ["Liberation Sans"] };
          const metrics = await captureCvSidebarTextMetrics(source, fonts.profile, false, true);
          const model = buildDossierDocModel(source, {
            exportPart: "cv",
            cvSidebarComposition: "shared-body-stories",
            cvPhotoComposition: "ordinary-picture",
            cvSidebarTextMetrics: metrics,
            cvSidebarContinuationEntryId: entryId,
          });
          const table = model.cv.blocks.find((b) => b.kind === "table" && b.id === "cv.sidebar");
          const cabinFailures = metrics.cabin
            ? await Promise.all([
                renderDossierDocx(model).then(
                  () => "",
                  (error) => String(error),
                ),
                renderDossierDocx(model, {
                  allowUnacceptedModelIssues: true,
                  cabinFontLoader: async (file) =>
                    file === "Cabin-Italic.ttf" ? null : new Uint8Array([1]),
                }).then(
                  () => "",
                  (error) => String(error),
                ),
              ])
            : undefined;
          const blob = await renderDossierDocx(model, {
            part: "cv",
            allowUnacceptedModelIssues: true,
            onDecorationFailure: (id, cause) => {
              throw Error(id, { cause });
            },
          });
          return {
            bytes: Array.from(new Uint8Array(await blob.arrayBuffer())),
            rows: table?.kind === "table" ? table.rows.length : null,
            issues: model.issues,
            footerDistance: model.cv.page.footerDistanceMm,
            unchanged: saved() === before,
            available: savedAppDocxNextAvailability("cv").available,
            savedFont: source.cv.design.font ?? null,
            embedding: model.fonts.embedding,
            cabinFailures,
          };
        } finally {
          fonts.dispose();
        }
      }, continuationEntry);
      expect(exported).toMatchObject({
        rows: 2,
        issues: [],
        footerDistance: 0,
        unchanged: true,
        available: false,
        savedFont: variant === "template-font" ? null : cabin ? "freundlich" : "sans",
        embedding: cabin ? "cabin" : "disabled",
      });
      if (cabin)
        expect(exported.cabinFailures).toEqual([
          expect.stringContaining("diagnostic opt-in"),
          expect.stringContaining("Cabin konnte nicht vollständig geladen werden"),
        ]);

      const markers = [
        "Sekundarschule, Niveau A",
        ...cv.data.erfahrung.map(({ titel }) => titel),
        "Referenzmarker",
      ];
      const sidebarMarkers = [
        "Kontakt",
        cv.data.person.adresse,
        cv.data.person.plzOrt,
        cv.data.person.telefon,
        "Sprachen",
        "Hobbys",
      ];
      async function inspect(path: string) {
        const text = await readTextPages(path);
        const pages = text.map((page) => normalizeContent(page.map((item) => item.str).join(" ")));
        const locations = Object.fromEntries(
          markers.map((marker) => {
            const name = normalizeContent(marker);
            return [
              marker,
              pages.flatMap((text, i) => Array<number>(text.split(name).length - 1).fill(i + 1)),
            ];
          }),
        );
        expect(pages).toHaveLength(3);
        for (const [marker, matches] of Object.entries(locations))
          expect(matches, marker).toHaveLength(1);
        expect(locations.Referenzmarker).toEqual([3]);
        for (const [i, entry] of cv.data.erfahrung.entries()) {
          const text = pages[locations[entry.titel][0] - 1];
          const afterTitle = text.split(normalizeContent(entry.titel))[1];
          const nextTitle = cv.data.erfahrung[i + 1]?.titel;
          const description = nextTitle
            ? afterTitle.split(normalizeContent(nextTitle))[0]
            : afterTitle;
          expect(description, entry.titel).toContain(normalizeContent(entry.beschreibung));
        }
        const sidebar = sidebarMarkers.map((marker) => {
          const item = text[0].find((part) =>
            part.str.trim().toLowerCase().startsWith(marker.toLowerCase()),
          );
          if (!item) throw Error(`Missing first-page sidebar text ${marker} in ${path}`);
          return item;
        });
        return {
          locations,
          sidebarX: sidebar.map((item) => (item.transform[4] * 25.4) / 72),
          sidebarFontFamilies: sidebar.map((item) => item.fontFamily),
        };
      }

      const app = await inspect(appPath);
      if (!cabin) expect(app.sidebarFontFamilies).toEqual(sidebarMarkers.map(() => "sans-serif"));
      const sourceDocx = resolve(directory, "source.docx");
      const bytes = Buffer.from(exported.bytes);
      await writeFile(sourceDocx, bytes);
      const parts = new Map(readZipEntries(bytes).map(({ name, bytes }) => [name, bytes]));
      const partText = (name: string) => new TextDecoder().decode(parts.get(name));
      expect(partText("word/settings.xml")).toContain(
        `<w:embedTrueTypeFonts w:val="${cabin ? "1" : "0"}"/>`,
      );
      if (cabin) {
        expect(
          execFileSync("fc-match", ["--format=%{family}", "Cabin"], { encoding: "utf8" }),
        ).not.toMatch(/\bCabin\b/);
        const table = partText("word/fontTable.xml");
        const relationships = partText("word/_rels/fontTable.xml.rels");
        const contentTypes = partText("[Content_Types].xml");
        for (const face of ["Regular", "Bold", "Italic", "BoldItalic"]) {
          const rel = `rIdCabin${face}`;
          const file = `Cabin-${face}.odttf`;
          const key = table.match(new RegExp(`r:id="${rel}" w:fontKey="([^"]+)"`))?.[1];
          expect(key).toBeTruthy();
          expect(relationships).toContain(`Id="${rel}"`);
          expect(relationships).toContain(`Target="fonts/${file}"`);
          expect(contentTypes).toContain(`PartName="/word/fonts/${file}"`);
          const embedded = parts.get(`word/fonts/${file}`);
          expect(embedded).toBeDefined();
          const font = await readFile(`public/fonts/Cabin-${face}.ttf`);
          expect(Buffer.from(obfuscateOoxmlFont(embedded!, key!)).equals(font)).toBe(true);
        }
      } else {
        expect(parts.has("word/_rels/fontTable.xml.rels")).toBe(false);
      }
      const files = [sourceDocx];
      const rendered = [];
      for (const phase of ["source", "save-1", "save-2"]) {
        const docxPath = resolve(directory, `${phase}.docx`);
        if (phase !== "source") {
          await writer(files.at(-1)!, docxPath, "docx");
          files.push(docxPath);
        }
        const pdfPath = resolve(directory, `${phase}.pdf`);
        await writer(docxPath, pdfPath, "pdf");
        const result = await inspect(pdfPath);
        if (cabin) {
          const usedFonts = execFileSync("pdffonts", [pdfPath], { encoding: "utf8" });
          expect(usedFonts).toContain("Cabin-Regular");
          expect(usedFonts).toContain("Cabin-Bold");
        }
        expect(result.locations).toEqual(app.locations);
        result.sidebarX.forEach((xMm, index) =>
          expect(Math.abs(xMm - app.sidebarX[index]), sidebarMarkers[index]).toBeLessThan(0.5),
        );
        rendered.push(result);
        await expectPdfPhotoCrop(pdfPath, 1, photoPoints);
      }

      const xml = await Promise.all(files.map(readDocxDocument));
      if (variant === "template-font") {
        for (const doc of xml) expect(doc).toContain('w:ascii="Arial"');
      }
      if (cabin) {
        for (const doc of xml) expect(doc).toContain('w:ascii="Cabin"');
        if (template === "terracotta") expect(xml[0]).toContain('w:ascii="Arial"');
      }
      const [before, ...reopened] = await page.evaluate((xml) => {
        const w = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
        const parser = new DOMParser();
        return xml.map((value) =>
          Array.from(parser.parseFromString(value, "text/xml").getElementsByTagNameNS(w, "sdt"))
            .flatMap((field) => {
              const props = Array.from(field.children).find((child) => child.localName === "sdtPr");
              const contents = Array.from(field.children).find(
                (child) => child.localName === "sdtContent",
              );
              const tag = props?.getElementsByTagNameNS(w, "tag")[0]?.getAttributeNS(w, "val");
              const text =
                contents &&
                Array.from(
                  contents.getElementsByTagNameNS(w, "t"),
                  (node) => node.textContent,
                ).join("");
              return tag && text ? [JSON.stringify([tag, text])] : [];
            })
            .sort(),
        );
      }, xml);
      if (cabin) expect(before).toHaveLength(111);
      else expect(before.length).toBeGreaterThan(markers.length);
      expect(reopened).toEqual([before, before]);
      await writeFile(
        resolve(directory, "evidence.json"),
        JSON.stringify({ continuationEntry, app, rendered, fieldCount: before.length }, null, 2),
      );
      if (variant === "template-font") {
        const letterFont = () =>
          page.evaluate(() => JSON.parse(localStorage.getItem("anschreiben:v1")!).design.font);
        expect(await letterFont()).toBe("sans");
        await page.getByLabel(/Schriftart gesamtes Dossier/).selectOption("freundlich");
        await expect.poll(letterFont).toBe("freundlich");
      }
    });
  }
}
