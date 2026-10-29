import { expect, test, type Page } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import catalog from "../fixtures/import/historical-projects-28okt.json" with { type: "json" };
import approvedProject from "../fixtures/import/modern-sidebar-from-23okt.json" with { type: "json" };
import { readZipEntries } from "../../src/lib/docx-next/zip";

const BASE = "http://127.0.0.1:4174";
const OUT = "artifacts/historical-import-28okt/browser";
const keys = { cover: "titelblatt:v3", letter: "anschreiben:v1", cv: "lebenslauf:v1" } as const;
type InputProject = typeof approvedProject;
const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const provenance = () => ({
  sourceSha: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  sourceDirty: !!execFileSync("git", ["status", "--porcelain", "--untracked-files=no"], {
    encoding: "utf8",
  }).trim(),
});

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Dossier laden", exact: true })).toBeVisible();
  await page.waitForLoadState("networkidle");
}

async function loadFile(page: Page, input: Buffer, name: string) {
  const reload = page.waitForEvent("domcontentloaded");
  await page
    .locator('input[type="file"][accept*="json"]')
    .setInputFiles({ name, mimeType: "application/json", buffer: input });
  await reload;
  await expect(page.getByRole("button", { name: "Dossier laden", exact: true })).toBeVisible();
  await page.waitForLoadState("networkidle");
}

async function storedParts(page: Page) {
  return page.evaluate(
    (keys) =>
      Object.fromEntries(
        Object.entries(keys).map(([part, key]) => [
          part,
          JSON.parse(localStorage.getItem(key) ?? "null"),
        ]),
      ),
    keys,
  );
}

async function openDownload(page: Page) {
  await page.getByRole("button").filter({ hasText: "Gesamtdossier herunterladen" }).click();
  const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.beforeEach(async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await mkdir(OUT, { recursive: true });
  await boot(page);
});

for (const [index, item] of catalog.entries()) {
  const id = String(index + 1).padStart(3, "0");
  test(`historical ${id}: ${item.path}`, async ({ page }) => {
    const raw = await readFile(item.path);
    expect(sha256(raw)).toBe(item.sha256);
    const input = JSON.parse(raw.toString("utf8")) as InputProject;
    await writeFile(join(OUT, `${id}-input.json`), raw);
    await page.evaluate(() => {
      localStorage.setItem("lebenslauf:layout:v1", "timeline");
      localStorage.setItem("lebenslauf:photo:v2", '{"zoom":1.8}');
      localStorage.setItem("historical-import-unrelated", "keep");
    });
    await loadFile(page, raw, `${id}-historical.json`);
    const first = await storedParts(page);
    for (const part of ["cover", "letter", "cv"] as const) {
      expect(first[part].data, `${part}: imported document content`).toEqual(input[part].data);
      // Shared chrome is migrated and projected into the saved letter design.
      // Content and authored template/font/colour choices must still survive.
      const design = (input[part] as Record<string, unknown>).design as
        | Record<string, unknown>
        | undefined;
      if (design) {
        for (const key of ["template", "font", "fontOverride", "colors"])
          if (design[key] !== undefined)
            expect(first[part].design[key], `${part}: ${key}`).toEqual(design[key]);
      }
    }
    const sidecars = await page.evaluate(() => ({
      layout: localStorage.getItem("lebenslauf:layout:v1"),
      unrelated: localStorage.getItem("historical-import-unrelated"),
      journal: localStorage.getItem("cv-cover-charm:import-journal:v1"),
    }));
    expect(sidecars).toEqual({ layout: null, unrelated: "keep", journal: null });
    const availability = await page.evaluate(async () => {
      const path = "/src/lib/docx-next/app-source.ts";
      return (await import(path)).savedAppDocxNextAvailability();
    });
    expect(availability.available, "original files have no saved Sidebar choice").toBe(false);
    expect(availability.reason).toContain("seitlicher Spalte");
    const dialog = await openDownload(page);
    await expect(
      dialog.getByRole("radio", { name: "Bearbeitbares Dossier (DOCX)", exact: true }),
    ).toBeDisabled();
    await dialog.getByRole("radio", { name: /Projektdatei \(JSON\)/ }).click();
    const downloading = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Projekt speichern", exact: true }).click();
    const download = await downloading;
    const savedPath = join(OUT, `${id}-saved.json`);
    await download.saveAs(savedPath);
    const saved = JSON.parse(await readFile(savedPath, "utf8"));
    for (const part of ["cover", "letter", "cv"] as const)
      expect(saved[part].data).toEqual(input[part].data);
    await boot(page);
    await page.evaluate(() => localStorage.clear());
    await boot(page);
    await loadFile(page, Buffer.from(JSON.stringify(saved)), `${id}-saved.json`);
    const second = await storedParts(page);
    for (const part of ["cover", "letter", "cv"] as const)
      expect(second[part].data).toEqual(input[part].data);
    const decodedImages = await page.evaluate(async (project) => {
      const sources = [project.cover.data.foto, project.cv.data.person.foto].filter(
        (value): value is string => typeof value === "string" && value.length > 0,
      );
      for (const src of sources) {
        const image = new Image();
        image.src = src;
        await image.decode();
        if (!image.naturalWidth || !image.naturalHeight)
          throw Error("Imported photo has no pixels");
      }
      return sources.length;
    }, input);
    for (const [route, root, name] of [
      ["titelblatt", '[data-dossier-document="cover"]', input.cover.data.vorname],
      [
        "lebenslauf",
        '[data-dossier-document="cv"][data-export-mode="false"]',
        input.cv.data.person.vorname,
      ],
      ["anschreiben", "main [data-letter-document-root]", input.letter.data.betreff],
    ] as const) {
      await page.goto(`${BASE}/${route}`, { waitUntil: "domcontentloaded" });
      await expect(page.locator('button[data-editor-ready="true"]').first()).toBeVisible();
      await expect(page.locator(root).first()).toBeVisible();
      await expect(page.locator(root).first()).toContainText(name);
    }
    await writeFile(
      join(OUT, `${id}-result.json`),
      JSON.stringify(
        {
          id,
          fixture: item.path,
          fixtureSha256: item.sha256,
          savedSha256: sha256(await readFile(savedPath)),
          status: "PASS",
          ...provenance(),
          docxAvailability: availability,
          decodedImages,
          checks: [
            "native file input",
            "document content and saved font/template/colour choices",
            "stale Sidebar cleared",
            "unrelated state preserved",
            "JSON download",
            "clear/load roundtrip",
            "DOCX support boundary",
            "all three editors hydrate after restore",
            "imported photos decode",
          ],
        },
        null,
        2,
      ),
    );
  });
}

for (const variant of ["baseline", "mirrored", "embedded-legacy-chrome"] as const) {
  test(`docx after import: ${variant}`, async ({ page }) => {
    const input = structuredClone(approvedProject);
    if (variant === "mirrored") {
      input.cv.portableState.infoPosition = "mirrored";
      input.cv.portableState.mirrored = true;
    }
    if (variant === "embedded-legacy-chrome") {
      const options = input.chrome.shared;
      Object.assign(input.letter.design, {
        headerMode: options.headerMode,
        footerMode: options.footerMode,
        headerTextLayout: options.headerTextLayout,
        headerInlineSeparator: options.headerInlineSeparator,
        headerBackgroundColor: options.headerBackgroundColor,
        footerBackgroundColor: options.footerBackgroundColor,
        chromeTextFont: options.textFont,
      });
      delete (input as Partial<InputProject>).chrome;
    }
    const inputBytes = Buffer.from(JSON.stringify(input, null, 2));
    await writeFile(join(OUT, `docx-${variant}-input.json`), inputBytes);
    await loadFile(page, inputBytes, `docx-${variant}.json`);
    const persisted = await storedParts(page);
    expect(persisted.cv.data.person.foto).toBe(input.cv.data.person.foto);
    const source = await page.evaluate(async () => {
      const path = "/src/lib/docx-next/app-source.ts";
      return (await import(path)).captureSavedAppDocxNextSource();
    });
    expect(source.settings.cvLayout).toBe("sidebar");
    expect(source.settings.sidebarSide).toBe(variant === "mirrored" ? "right" : "left");
    expect(source.cv.data.person.foto).toBe(input.cv.data.person.foto);
    await writeFile(join(OUT, `docx-${variant}-source.json`), JSON.stringify(source, null, 2));
    const dialog = await openDownload(page);
    const option = dialog.getByRole("radio", { name: "Bearbeitbares Dossier (DOCX)", exact: true });
    await expect(option).toBeEnabled();
    await option.click();
    const downloading = page.waitForEvent("download", { timeout: 90_000 });
    const errorMessage = dialog.locator('p[role="alert"]').last();
    const exportError = errorMessage
      .waitFor({ state: "visible", timeout: 90_000 })
      .then(async () => ({ error: await errorMessage.innerText() }));
    await dialog.getByRole("button", { name: "DOCX herunterladen", exact: true }).click();
    const outcome = await Promise.race([
      downloading.then((download) => ({ download })),
      exportError,
    ]);
    if ("error" in outcome) {
      const diagnostic = await page.evaluate(async () => {
        try {
          const path = "/src/lib/dossier-docx-next-export.ts";
          const result = await (await import(path)).createSavedDossierDocxNext();
          return { reproduced: false, bytes: result.blob.size };
        } catch (error) {
          return {
            reproduced: true,
            message: String(error),
            stack: error instanceof Error ? error.stack : "",
          };
        }
      });
      await writeFile(
        join(OUT, `docx-${variant}-failure.json`),
        JSON.stringify({ ...provenance(), uiError: outcome.error, diagnostic }, null, 2),
      );
      throw Error(`DOCX UI export failed: ${outcome.error}; ${JSON.stringify(diagnostic)}`);
    }
    const download = outcome.download;
    const file = join(OUT, `docx-${variant}.docx`);
    await download.saveAs(file);
    const bytes = await readFile(file);
    expect(bytes.length).toBeGreaterThan(5000);
    const entries = readZipEntries(bytes);
    const xml = entries
      .filter((e) => /^word\/(document|header\d+|footer\d+)\.xml$/.test(e.name))
      .map((e) => new TextDecoder().decode(e.bytes))
      .join("\n");
    expect(xml).toContain('name="cv.person.photo"');
    expect(entries.some((e) => /^word\/media\//.test(e.name))).toBe(true);
    const expectedFields = [
      input.cover.data.vorname,
      input.cover.data.nachname,
      input.cover.data.beruf,
      input.letter.data.betreff,
      input.letter.data.anrede,
      input.letter.data.text,
      input.letter.data.gruss,
      input.letter.data.unterschrift,
      ...input.cv.data.erfahrung.flatMap((entry) => [entry.titel, entry.ort, entry.beschreibung]),
    ].filter(Boolean);
    await writeFile(
      join(OUT, `docx-${variant}-result.json`),
      JSON.stringify(
        {
          variant,
          status: "PASS",
          ...provenance(),
          fixtureSource: "tests/fixtures/docx-next/sidebar-contact-chrome-23okt.json",
          fixtureKind: "derived restore control, not an unmodified historical project",
          inputSha256: sha256(inputBytes),
          docxSha256: sha256(bytes),
          docxBytes: bytes.length,
          expectedFields,
        },
        null,
        2,
      ),
    );
  });
}
