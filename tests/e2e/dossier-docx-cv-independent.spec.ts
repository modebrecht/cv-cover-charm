import { expect, test } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { importNativeDossier } from "./support/native-docx-fixture";
import { readZipEntries } from "../../src/lib/docx-next/zip";

const OUT = process.env.DOCX_CV_INDEPENDENT_ARTIFACTS ?? "artifacts/dossier-docx-cv-independent";

test("CV Word download ignores unsupported cover and letter settings without changing saved data", async ({
  page,
}) => {
  test.setTimeout(120000);
  await importNativeDossier(page, (project) => {
    project.cover.template = "citrus";
    project.letter.design.template = "warm";
    project.letter.design.font = "serif";
    project.letter.data.richTextHtml = "<p><strong>Nur im Brief formatiert</strong></p>";
  });
  await page.goto("http://127.0.0.1:4173/lebenslauf", { waitUntil: "networkidle" });
  const before = await page.evaluate(() => ({
    cover: localStorage.getItem("titelblatt:v3"),
    letter: localStorage.getItem("anschreiben:v1"),
    cv: localStorage.getItem("lebenslauf:v1"),
  }));
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const menu = page.locator("[data-editor-download-menu]");
  await expect(menu.getByRole("menuitem", { name: "DOCX", exact: true })).toBeEnabled();
  await expect(menu.getByRole("menuitem", { name: "Dossier DOCX", exact: true })).toBeDisabled();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    menu.getByRole("menuitem", { name: "DOCX", exact: true }).click(),
  ]);
  await mkdir(OUT, { recursive: true });
  await download.saveAs(`${OUT}/independent-cv.docx`);
  const bytes = await readFile((await download.path())!);
  const parts = readZipEntries(bytes);
  const xml = new TextDecoder().decode(
    parts.find((part) => part.name === "word/document.xml")!.bytes,
  );
  expect(xml).toContain("cv.person.name");
  expect(xml).not.toContain("letter.");
  expect(xml).not.toContain("cover.");
  expect((xml.match(/<w:sectPr>/g) ?? []).length).toBe(1);
  expect(
    await page.evaluate(() => ({
      cover: localStorage.getItem("titelblatt:v3"),
      letter: localStorage.getItem("anschreiben:v1"),
      cv: localStorage.getItem("lebenslauf:v1"),
    })),
  ).toEqual(before);
});

test("CV download works with absent cover and letter and does not recreate them", async ({
  page,
}) => {
  test.setTimeout(120000);
  await importNativeDossier(page);
  await page.goto("http://127.0.0.1:4173/lebenslauf", { waitUntil: "networkidle" });
  // Isolate the export from the editor's existing font-sync initialization.
  await page.evaluate(() => {
    localStorage.removeItem("titelblatt:v3");
    localStorage.removeItem("anschreiben:v1");
  });
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const menu = page.locator("[data-editor-download-menu]");
  await expect(menu.getByRole("menuitem", { name: "DOCX", exact: true })).toBeEnabled();
  await expect(menu.getByRole("menuitem", { name: "Dossier DOCX", exact: true })).toBeDisabled();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    menu.getByRole("menuitem", { name: "DOCX", exact: true }).click(),
  ]);
  await mkdir(OUT, { recursive: true });
  await download.saveAs(`${OUT}/cv-without-other-parts.docx`);
  expect(
    await page.evaluate(() => [
      localStorage.getItem("titelblatt:v3"),
      localStorage.getItem("anschreiben:v1"),
    ]),
  ).toEqual([null, null]);
});

test("CV's own unsupported font remains blocked with a CV-specific explanation", async ({
  page,
}) => {
  await importNativeDossier(page, (project) => {
    project.cv.design.font = "serif";
  });
  await page.goto("http://127.0.0.1:4173/lebenslauf", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const menu = page.locator("[data-editor-download-menu]");
  await expect(menu.getByRole("menuitem", { name: "DOCX", exact: true })).toBeDisabled();
  await expect(menu).toContainText("Bitte im Lebenslauf die Schrift «Sans» wählen.");
});

test("valid dossier keeps both CV and dossier Word downloads available", async ({ page }) => {
  await importNativeDossier(page);
  await page.goto("http://127.0.0.1:4173/lebenslauf", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const menu = page.locator("[data-editor-download-menu]");
  await expect(menu.getByRole("menuitem", { name: "DOCX", exact: true })).toBeEnabled();
  await expect(menu.getByRole("menuitem", { name: "Dossier DOCX", exact: true })).toBeEnabled();
});

test("corrupt unrelated stored JSON cannot block or be overwritten by the CV download", async ({
  page,
}) => {
  test.setTimeout(120000);
  await importNativeDossier(page);
  await page.goto("http://127.0.0.1:4173/lebenslauf", { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.setItem("titelblatt:v3", "broken-cover-json");
    localStorage.setItem("anschreiben:v1", "{broken-letter-json");
  });
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const menu = page.locator("[data-editor-download-menu]");
  await expect(menu.getByRole("menuitem", { name: "DOCX", exact: true })).toBeEnabled();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    menu.getByRole("menuitem", { name: "DOCX", exact: true }).click(),
  ]);
  await mkdir(OUT, { recursive: true });
  await download.saveAs(`${OUT}/cv-with-corrupt-other-parts.docx`);
  expect(
    await page.evaluate(() => [
      localStorage.getItem("titelblatt:v3"),
      localStorage.getItem("anschreiben:v1"),
    ]),
  ).toEqual(["broken-cover-json", "{broken-letter-json"]);
});

test("mirrored mobile CV keeps its ordinary photo in the independent Word package", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 390, height: 844 });
  await importNativeDossier(page, (project) => {
    project.cover.template = "citrus";
    project.letter.data.richTextHtml = "<p><em>Formatierter Brief</em></p>";
    project.cv.portableState.infoPosition = "mirrored";
    project.cv.portableState.mirrored = true;
  });
  await page.goto("http://127.0.0.1:4173/lebenslauf", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const item = page
    .locator("[data-editor-download-menu]")
    .getByRole("menuitem", { name: "DOCX", exact: true });
  await expect(item).toBeEnabled();
  const [download] = await Promise.all([page.waitForEvent("download"), item.click()]);
  await mkdir(OUT, { recursive: true });
  await download.saveAs(`${OUT}/cv-mirrored-mobile.docx`);
  const parts = readZipEntries(await readFile((await download.path())!));
  const xml = new TextDecoder().decode(
    parts.find((part) => part.name === "word/document.xml")!.bytes,
  );
  expect(xml).toContain('name="cv.person.photo"');
  expect(xml).toContain('layoutInCell="0"');
  expect(xml).not.toContain("letter.");
});

test("unreadable unrelated document structures remain untouched during CV export", async ({
  page,
}) => {
  test.setTimeout(120000);
  await importNativeDossier(page);
  await page.goto("http://127.0.0.1:4173/lebenslauf", { waitUntil: "networkidle" });
  const damaged = await page.evaluate(() => {
    const cover = JSON.stringify({ template: "citrus", data: {}, customs: [null] });
    const letter = JSON.stringify({
      data: { empfaengerFirma: { invalid: true } },
      design: { template: "warm", font: "serif" },
    });
    localStorage.setItem("titelblatt:v3", cover);
    localStorage.setItem("anschreiben:v1", letter);
    return [cover, letter];
  });
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const item = page
    .locator("[data-editor-download-menu]")
    .getByRole("menuitem", { name: "DOCX", exact: true });
  await expect(item).toBeEnabled();
  const [download] = await Promise.all([page.waitForEvent("download"), item.click()]);
  await mkdir(OUT, { recursive: true });
  await download.saveAs(`${OUT}/cv-with-unreadable-other-structures.docx`);
  expect(
    await page.evaluate(() => [
      localStorage.getItem("titelblatt:v3"),
      localStorage.getItem("anschreiben:v1"),
    ]),
  ).toEqual(damaged);
});
