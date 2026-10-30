import { expect, test, type Page } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { importNativeDossier, waitForNativeEditorSaved } from "./support/native-docx-fixture";
import { readZipEntries } from "../../src/lib/docx-next/zip";

const OUT =
  process.env.DOCX_PART_INDEPENDENT_ARTIFACTS ?? "artifacts/dossier-docx-part-independent";
const keys = { cover: "titelblatt:v3", letter: "anschreiben:v1", cv: "lebenslauf:v1" } as const;
async function stored(page: Page) {
  return page.evaluate(
    (keys) =>
      Object.fromEntries(
        Object.entries(keys).map(([part, key]) => [part, localStorage.getItem(key)]),
      ),
    keys,
  );
}
async function downloadOnly(page: Page, part: "cover" | "letter", filename: string) {
  const before = await stored(page);
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const menu = page.locator("[data-editor-download-menu]");
  await expect(menu.getByRole("menuitem", { name: "DOCX", exact: true })).toBeEnabled();
  await expect(menu.getByRole("menuitem", { name: "Dossier DOCX", exact: true })).toBeDisabled();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    menu.getByRole("menuitem", { name: "DOCX", exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(
    part === "cover" ? /^Titelblatt-/ : /^Motivationsschreiben-/,
  );
  await mkdir(OUT, { recursive: true });
  await download.saveAs(`${OUT}/${filename}.docx`);
  const pkg = readZipEntries(await readFile((await download.path())!));
  const xml = new TextDecoder().decode(pkg.find((p) => p.name === "word/document.xml")!.bytes);
  expect((xml.match(/<w:sectPr>/g) ?? []).length).toBe(1);
  expect(xml).toContain(`${part}.`);
  for (const other of ["cover", "letter", "cv"].filter((id) => id !== part)) {
    expect(xml).not.toContain(`${other}.`);
    expect(pkg.some((entry) => entry.name.startsWith(`word/${other}-header`))).toBe(false);
  }
  expect(await stored(page)).toEqual(before);
}

for (const part of ["cover", "letter"] as const) {
  const path = part === "cover" ? "titelblatt" : "anschreiben";
  test(`${part} downloads independently of unsupported CV and other-document designs`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    await importNativeDossier(page, (project) => {
      project.cv.design.template = "citrus";
      project.cv.design.font = "serif";
      if (part === "cover") {
        project.letter.design.template = "warm";
        project.letter.design.font = "serif";
        project.letter.data.richTextHtml = "<p><strong>Nur im Brief</strong></p>";
      } else project.cover.template = "citrus";
    });
    await page.goto(`http://127.0.0.1:4173/${path}`, { waitUntil: "networkidle" });
    await waitForNativeEditorSaved(page);
    await downloadOnly(page, part, `${part}-mixed-designs`);
  });

  test(`${part} downloads with absent other parts and leaves them absent`, async ({ page }) => {
    test.setTimeout(120000);
    await importNativeDossier(page);
    await page.goto(`http://127.0.0.1:4173/${path}`, { waitUntil: "networkidle" });
    await waitForNativeEditorSaved(page);
    await page.evaluate(
      ({ keys, part }) => {
        for (const [id, key] of Object.entries(keys)) if (id !== part) localStorage.removeItem(key);
      },
      { keys, part },
    );
    await downloadOnly(page, part, `${part}-without-other-parts`);
  });

  test(`${part} downloads with corrupt unrelated JSON without overwriting it`, async ({ page }) => {
    test.setTimeout(120000);
    await importNativeDossier(page);
    await page.goto(`http://127.0.0.1:4173/${path}`, { waitUntil: "networkidle" });
    await waitForNativeEditorSaved(page);
    await page.evaluate(
      ({ keys, part }) => {
        for (const [id, key] of Object.entries(keys))
          if (id !== part) localStorage.setItem(key, `{corrupt-${id}`);
      },
      { keys, part },
    );
    await downloadOnly(page, part, `${part}-corrupt-other-json`);
  });

  test(`${part} downloads with unreadable unrelated structures without changing them`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    await importNativeDossier(page);
    await page.goto(`http://127.0.0.1:4173/${path}`, { waitUntil: "networkidle" });
    await waitForNativeEditorSaved(page);
    await page.evaluate(
      ({ keys, part }) => {
        localStorage.setItem(
          keys.cv,
          JSON.stringify({ data: { schule: [null] }, design: { template: "citrus" } }),
        );
        if (part === "cover")
          localStorage.setItem(
            keys.letter,
            JSON.stringify({ data: { empfaengerFirma: { invalid: true } } }),
          );
        else localStorage.setItem(keys.cover, JSON.stringify({ data: {}, customs: [null] }));
      },
      { keys, part },
    );
    await downloadOnly(page, part, `${part}-unreadable-other-structures`);
  });

  test(`${part} keeps its own unsupported setting blocked`, async ({ page }) => {
    await importNativeDossier(page, (project) => {
      if (part === "cover") project.cover.font = "serif";
      else project.letter.data.richTextHtml = "<p><strong>Formatierter Brief</strong></p>";
    });
    await page.goto(`http://127.0.0.1:4173/${path}`, { waitUntil: "networkidle" });
    await waitForNativeEditorSaved(page);
    await page.getByRole("button", { name: "Download", exact: true }).click();
    const menu = page.locator("[data-editor-download-menu]");
    await expect(menu.getByRole("menuitem", { name: "DOCX", exact: true })).toBeDisabled();
    await expect(menu).toContainText(
      part === "cover" ? "Titelblatt die Schrift «Sans»" : "formatierten Brieftext",
    );
  });

  test(`${part} cannot download an empty selected document`, async ({ page }) => {
    await importNativeDossier(page);
    await page.goto(`http://127.0.0.1:4173/${path}`, { waitUntil: "networkidle" });
    await waitForNativeEditorSaved(page);
    await page.evaluate((key) => localStorage.removeItem(key), keys[part]);
    await page.getByRole("button", { name: "Download", exact: true }).click();
    const menu = page.locator("[data-editor-download-menu]");
    await expect(menu.getByRole("menuitem", { name: "DOCX", exact: true })).toBeDisabled();
    await expect(menu).toContainText(
      part === "cover" ? "zuerst das Titelblatt" : "zuerst das Motivationsschreiben",
    );
  });
}
