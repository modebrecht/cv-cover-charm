import { expect, test } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import project from "../fixtures/import/modern-sidebar-from-23okt.json" with { type: "json" };
import { DEFAULT_DOSSIER_CHROME_STATE } from "../../src/lib/dossier-chrome";
import { readZipEntries } from "../../src/lib/docx-next/zip";

const out = "artifacts/word-default-chrome";
const base = "http://127.0.0.1:4173";

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
