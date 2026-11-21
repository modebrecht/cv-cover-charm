import { expect, test } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import project from "../fixtures/import/modern-sidebar-from-23okt.json" with { type: "json" };
import { DEFAULT_DOSSIER_CHROME_STATE } from "../../src/lib/dossier-chrome";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { importNativeDossier, waitForNativeEditorSaved } from "../e2e/support/native-docx-fixture";

const out = "artifacts/word-default-chrome";
const base = "http://127.0.0.1:4173";

function configureContactCv(input: typeof project, mode: "compact" | "none", count: number) {
  input.chrome.sync = false;
  Object.assign(input.chrome.cv, {
    headerDifferentFirstPage: true,
    headerContinuationMode: mode,
    headerHeightMm: null,
    headerBackgroundColor: "#183456",
  });
  input.cv.portableState.mirrored = mode === "none";
  input.cv.portableState.infoPosition = mode === "none" ? "mirrored" : "standard";
  fillCvExperience(input, count);
}

function fillCvExperience(input: typeof project, count: number) {
  input.cv.data.erfahrung = Array.from({ length: count }, (_, index) => ({
    id: `follow-up-${index}`,
    zeit: "2026",
    titel: `WordPraxis${index + 1}`,
    ort: "Beispiel AG, Hubersdorf",
    beschreibung:
      "Support und kleine Automatisierungen. Zusammenarbeit im Team und sorgfältige Dokumentation der Arbeitsschritte.",
  }));
  input.cv.data.referenzen[0].name = "WordEndreferenz";
}

// This release regression uses default chrome with the supported Modern Sidebar
// layout. The application-wide default CV layout has a separate contract.
test("Modern default chrome exports through normal PDF, Word and JSON downloads", async ({
  page,
}) => {
  page.on("dialog", (dialog) => dialog.accept());
  await mkdir(out, { recursive: true });
  await page.goto(base, { waitUntil: "networkidle" });
  const input = structuredClone(project);
  input.chrome = structuredClone(DEFAULT_DOSSIER_CHROME_STATE) as typeof input.chrome;
  const load = page.waitForEvent("domcontentloaded");
  await page.locator('input[type="file"][accept*="json"]').setInputFiles({
    name: "modern-default-chrome.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(input)),
  });
  await load;
  await page.waitForLoadState("networkidle");
  const stored = await page.evaluate(() => ({
    chrome: JSON.parse(localStorage.getItem("bewerbungsdossier:chrome:v1") ?? "null"),
    cv: JSON.parse(localStorage.getItem("lebenslauf:v1") ?? "null"),
    letter: JSON.parse(localStorage.getItem("anschreiben:v1") ?? "null"),
  }));
  expect(stored.chrome).toEqual(DEFAULT_DOSSIER_CHROME_STATE);
  expect(stored.chrome.shared.headerMode).toBe("compact");
  expect(stored.chrome.shared.headerHeightMm).toBeNull();
  expect(stored.chrome.shared.footerMode).toBe("compact");
  expect(stored.cv.design.template).toBe("modern");
  expect(stored.letter.design.template).toBe("modern");

  const web = [];
  for (const [part, route, selector] of [
    ["cover", "titelblatt", 'main [data-dossier-document="cover"]'],
    ["letter", "anschreiben", "main [data-letter-document-pages] [data-letter-page]"],
    ["cv", "lebenslauf", '[data-export-mode="false"] [data-cv-page]'],
  ] as const) {
    await page.goto(`${base}/${route}`, { waitUntil: "networkidle" });
    await expect(page.getByRole("button", { name: "Download", exact: true })).toHaveAttribute(
      "data-editor-ready",
      "true",
    );
    await waitForNativeEditorSaved(page);
    await page.evaluate(() => document.fonts.ready);
    const sheet = page.locator(selector);
    await expect(sheet).toHaveCount(1);
    if (part !== "cover") {
      const colors = await sheet.evaluate((root) => {
        const header = root.querySelector<HTMLElement>("[data-dossier-compact-header]")!;
        const footer = root.querySelector<HTMLElement>('[data-dossier-footer="compact"]')!;
        const h = getComputedStyle(header),
          f = getComputedStyle(footer);
        return { header: h.backgroundColor, footer: f.backgroundColor, opacity: f.opacity };
      });
      expect(colors.header).toBe("rgb(17, 24, 39)");
      expect(colors.footer).toBe(colors.header);
      expect(colors.opacity).toBe("1");
      web.push({ part, ...colors });
    }
    await sheet.screenshot({ path: join(out, `${part}-web.png`), animations: "disabled" });
  }
  await page.goto(base, { waitUntil: "networkidle" });
  const before = await page.evaluate(() =>
    JSON.stringify({
      cv: localStorage.getItem("lebenslauf:v1"),
      letter: localStorage.getItem("anschreiben:v1"),
      cover: localStorage.getItem("titelblatt:v3"),
      chrome: localStorage.getItem("bewerbungsdossier:chrome:v1"),
    }),
  );
  const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
  await page.getByRole("button", { name: /Gesamtdossier herunterladen/ }).click();
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("radio", { name: "Bearbeitbares Dossier (DOCX)", exact: true }),
  ).toBeEnabled();
  const wordAvailability = await page.evaluate(async () => {
    const path = "/src/lib/docx-next/app-source.ts";
    return (await import(path)).savedAppDocxNextAvailability();
  });
  expect(wordAvailability.available).toBe(true);

  for (const [format, radio, button, filename] of [
    [
      "pdf",
      "Fertiges Dossier (PDF)",
      "PDF herunterladen",
      "01_Modern_Sidebar_Standard-Kopf-Fuss.pdf",
    ],
    [
      "docx",
      "Bearbeitbares Dossier (DOCX)",
      "DOCX herunterladen",
      "01_Modern_Sidebar_Standard-Kopf-Fuss.docx",
    ],
    [
      "json",
      /Projektdatei \(JSON\)/,
      "Projekt speichern",
      "01_Modern_Sidebar_Standard-Kopf-Fuss_Projekt.json",
    ],
  ] as const) {
    if (!(await dialog.isVisible()))
      await page.getByRole("button", { name: /Gesamtdossier herunterladen/ }).click();
    await expect(dialog).toBeVisible();
    const option = dialog.getByRole("radio", { name: radio, exact: true });
    await expect(option, format).toBeEnabled();
    await option.click();
    const action = dialog.getByRole("button", { name: button, exact: true });
    await expect(action).toBeEnabled();
    const pending = page.waitForEvent("download", { timeout: 90_000 });
    await action.click();
    const failure = dialog.locator('p[role="alert"]').last();
    const outcome = await Promise.race([
      pending.then((download) => ({ download })),
      failure
        .waitFor({ state: "visible", timeout: 90_000 })
        .then(async () => ({ error: await failure.innerText() })),
    ]);
    if ("error" in outcome) {
      const diagnostic = await page.evaluate(async () => {
        try {
          const path = "/src/lib/dossier-docx-next-export.ts";
          await (await import(path)).createSavedDossierDocxNext();
          return "No diagnostic error";
        } catch (error) {
          return error instanceof Error ? error.stack : String(error);
        }
      });
      throw Error(`${outcome.error}: ${diagnostic}`);
    }
    await outcome.download.saveAs(join(out, filename));
    if (format === "docx") {
      const pkg = readZipEntries(await readFile(join(out, filename)));
      const xml = new TextDecoder().decode(pkg.find((p) => p.name === "word/document.xml")!.bytes);
      const bands = [...xml.matchAll(/<wp:anchor\b[\s\S]*?<\/wp:anchor>/g)]
        .map((m) => m[0])
        .filter((anchor) => /name="(?:letter|cv)\.chrome-paint\.first\./.test(anchor));
      expect(bands).toHaveLength(4);
      for (const band of bands)
        expect(Number(band.match(/<wp:extent cx="\d+" cy="(\d+)"/)![1]) / 36000).toBeLessThan(4.1);
    }
  }
  expect(
    await page.evaluate(() =>
      JSON.stringify({
        cv: localStorage.getItem("lebenslauf:v1"),
        letter: localStorage.getItem("anschreiben:v1"),
        cover: localStorage.getItem("titelblatt:v3"),
        chrome: localStorage.getItem("bewerbungsdossier:chrome:v1"),
      }),
    ),
  ).toBe(before);
  for (const [part, route] of [
    ["letter", "anschreiben"],
    ["cv", "lebenslauf"],
  ] as const) {
    await page.goto(`${base}/${route}`, { waitUntil: "networkidle" });
    await expect(page.getByRole("button", { name: "Download", exact: true })).toHaveAttribute(
      "data-editor-ready",
      "true",
    );
    await waitForNativeEditorSaved(page);
    const prior = await page.evaluate(() => ({
      cv: localStorage.getItem("lebenslauf:v1"),
      letter: localStorage.getItem("anschreiben:v1"),
    }));
    await page.getByRole("button", { name: "Download", exact: true }).click();
    const action = page
      .locator("[data-editor-download-menu]")
      .getByRole("menuitem", { name: "DOCX", exact: true });
    await expect(action).toBeEnabled();
    const pending = page.waitForEvent("download", { timeout: 45_000 });
    await action.click();
    const filename = join(out, `single-${part}-default.docx`);
    await (await pending).saveAs(filename);
    const entries = readZipEntries(await readFile(filename));
    const xml = new TextDecoder().decode(
      entries.find((p) => p.name === "word/document.xml")!.bytes,
    );
    expect((xml.match(/<w:sectPr>/g) ?? []).length).toBe(1);
    expect(xml).toContain(`${part}.`);
    expect(xml).toContain(`name="${part}.chrome-paint.first.header"`);
    expect(xml).toContain(`name="${part}.chrome-paint.first.footer"`);
    expect(xml).not.toContain(part === "cv" ? "letter." : "cv.");
    expect(
      await page.evaluate(() => ({
        cv: localStorage.getItem("lebenslauf:v1"),
        letter: localStorage.getItem("anschreiben:v1"),
      })),
    ).toEqual(prior);
  }
  await writeFile(
    join(out, "evidence.json"),
    JSON.stringify(
      {
        sourceSha: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
        scope:
          "Modern Sidebar with actual default header/footer options and normal Word download. Sidebar remains an explicitly selected layout.",
        chrome: stored.chrome,
        wordAvailability,
        web,
        browser: page.context().browser()!.version(),
      },
      null,
      2,
    ),
  );
});

for (const [mode, count] of [
  ["compact", 10],
  ["none", 10],
  ["compact", 17],
  ["none", 17],
] as const) {
  test(`contact CV with ${count} entries and ${mode} follow-up exports through both Word menus`, async ({
    page,
  }, info) => {
    await importNativeDossier(page, (input) => configureContactCv(input, mode, count));
    await page.goto(`${base}/lebenslauf`, { waitUntil: "networkidle" });
    await waitForNativeEditorSaved(page);
    const sheets = page.locator('[data-export-mode="false"] [data-cv-page]');
    await expect(sheets).toHaveCount(count === 10 ? 2 : 3);
    await expect(sheets.last().locator("[data-dossier-effective-header-mode]")).toHaveAttribute(
      "data-dossier-effective-header-mode",
      mode,
    );
    await expect(sheets.last()).toContainText("WordEndreferenz");
    await page.getByRole("button", { name: "Download", exact: true }).click();
    const [single] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("menuitem", { name: "DOCX", exact: true }).click(),
    ]);

    await page.goto(base, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Gesamtdossier herunterladen/ }).click();
    const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
    await dialog.getByRole("radio", { name: "Bearbeitbares Dossier (DOCX)", exact: true }).click();
    const [combined] = await Promise.all([
      page.waitForEvent("download"),
      dialog.getByRole("button", { name: "DOCX herunterladen" }).click(),
    ]);

    for (const [part, download] of [
      ["single", single],
      ["combined", combined],
    ] as const) {
      await download.saveAs(info.outputPath(`${part}.docx`));
      const entries = readZipEntries(await readFile((await download.path())!));
      const bytes = (name: string) => entries.find((entry) => entry.name === name)!.bytes;
      const xml = (name: string) => new TextDecoder().decode(bytes(name));
      expect(xml("word/cv-header-first.xml")).toContain("cv.person.address");
      expect(xml("word/cv-header.xml")).not.toMatch(/cv\.person\.(?:name|address|email)/);
      if (part === "combined")
        expect(xml("word/letter-header.xml")).toContain("letter.sender.address");
      const body = xml("word/document.xml");
      expect(body.match(/>WordPraxis\d+</g)).toEqual(
        Array.from({ length: count }, (_, index) => `>WordPraxis${index + 1}<`),
      );
      expect(body).toContain(">WordEndreferenz<");
      const photos = [...body.matchAll(/<wp:anchor\b[\s\S]*?<\/wp:anchor>/g)].filter(([anchor]) =>
        /<wp:docPr[^>]+name="cv\.person\.photo"/.test(anchor),
      );
      expect(photos).toHaveLength(1);
      const photo = photos[0][0];
      expect(photo).toContain("<wp:wrapNone/>");
      const choice = photo.match(/<mc:Choice Requires="a14">([\s\S]*?)<\/mc:Choice>/)?.[1];
      const fallback = photo.match(/<mc:Fallback>([\s\S]*?)<\/mc:Fallback>/)?.[1];
      expect(choice).toContain("<pic:pic>");
      expect(choice).toContain('<a:srcRect l="0" t="8333" r="0" b="8333"/>');
      expect(fallback).toContain("<a:tile ");
      expect(fallback).toMatch(/<a:tile tx="0" ty="0" [^>]*algn="ctr"/);
      const original = choice?.match(/<a:blip r:embed="([^"]+)"/)?.[1];
      expect(original).toBeTruthy();
      expect(fallback).toContain(`<a:blip r:embed="${original}"/>`);
      const top = Number(
        photo.match(/<wp:positionV relativeFrom="margin"><wp:posOffset>(\d+)/)?.[1],
      );
      const margins = [...body.matchAll(/<w:pgMar\b[^>]*w:top="(\d+)"/g)].at(-1)!;
      expect(top / 36000 + (Number(margins[1]) * 25.4) / 1440).toBeCloseTo(52, 1);
      const paintFile = xml("word/_rels/cv-header.xml.rels").match(
        /Target="(media\/decoration-\d+\.png)"/,
      )![1];
      const color = await page.evaluate(
        async (data) => {
          const image = await createImageBitmap(
            new Blob([new Uint8Array(data)], { type: "image/png" }),
          );
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = 1;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(
            image,
            Math.floor(image.width / 2),
            Math.floor((image.height * 2) / 297),
            1,
            1,
            0,
            0,
            1,
            1,
          );
          return Array.from(ctx.getImageData(0, 0, 1, 1).data.slice(0, 3));
        },
        Array.from(bytes(`word/${paintFile}`)),
      );
      if (mode === "compact") expect(color).toEqual([24, 52, 86]);
      else expect(color.every((value) => value >= 248)).toBe(true);
    }
  });
}

test("adjacent half-width rubrics keep their native columns across long CV rows", async ({
  page,
}) => {
  await importNativeDossier(page, (input) => {
    fillCvExperience(input, 18);
    const half = { width: "half", page: 1, positioning: "flow", packing: "rows" } as const;
    input.cv.data.sectionLayouts = { schule: half, erfahrung: half };
  });
  await page.goto(`${base}/lebenslauf`, { waitUntil: "networkidle" });
  await waitForNativeEditorSaved(page);
  await expect(page.locator('[data-export-mode="false"] [data-cv-page]')).toHaveCount(4);
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 35_000 }),
    page.getByRole("menuitem", { name: "DOCX", exact: true }).click(),
  ]);
  const entries = readZipEntries(await readFile((await download.path())!));
  const body = new TextDecoder().decode(
    entries.find((entry) => entry.name === "word/document.xml")!.bytes,
  );
  expect(body).toContain('w:tblCaption w:val="cv.section.schule.half-row.1"');
  expect(body.match(/>WordPraxis\d+</g)).toEqual(
    Array.from({ length: 18 }, (_, index) => `>WordPraxis${index + 1}<`),
  );
  expect(body).toContain(">WordEndreferenz<");
  expect(body).not.toContain('<w:br w:type="page"/>');
});
