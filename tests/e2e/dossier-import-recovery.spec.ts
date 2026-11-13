import { expect, test, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import historicalProjects from "../fixtures/import/historical-projects-28okt.json" with { type: "json" };
import modernSidebar from "../fixtures/import/modern-sidebar-from-23okt.json" with { type: "json" };
import { expectUnreviewedDocxBlocked } from "./support/native-docx-fixture";

const BASE = "http://127.0.0.1:4173";
const photo =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aCioAAAAASUVORK5CYII=";
const project = {
  kind: "cv-cover-charm-dossier",
  version: 1,
  savedAt: "2026-10-28T08:00:00.000Z",
  cover: {
    version: 9,
    template: "brief",
    data: { vorname: "Neue", nachname: "Person", beruf: "Informatikerin EFZ", foto: photo },
  },
  cv: {
    version: 6,
    data: { person: { vorname: "Neue", nachname: "Person", foto: photo }, schule: [] },
    design: { template: "brief" },
    portableState: { layout: "modern", mirrored: true, textAlign: "justify", sectionGapMm: 8 },
  },
  letter: {
    version: 1,
    data: {
      absenderName: "Neue Person",
      betreff: "Neuer Brief",
      text: "Ein unverwechselbarer neuer Text.",
      images: [{ id: "photo", src: photo }],
    },
    design: {
      template: "brief",
      headerMode: "contact",
      footerMode: "attachments",
      headerInlineSeparator: "icons",
    },
  },
};
const oldEntries: Record<string, string> = {
  "titelblatt:v3": JSON.stringify({
    version: 9,
    template: "brief",
    data: { vorname: "Bisherige", nachname: "Person", foto: photo },
  }),
  "lebenslauf:v1": JSON.stringify({
    version: 6,
    data: { person: { vorname: "Bisherige", foto: photo }, schule: [] },
    design: { template: "brief" },
  }),
  "anschreiben:v1": JSON.stringify({
    version: 1,
    data: { absenderName: "Bisherige Person", text: "Bisheriger Brief", images: [{ src: photo }] },
    design: { template: "brief" },
  }),
  "lebenslauf:layout:v1": "timeline",
  "lebenslauf:placement:v1": '{ "schule": "side" }',
  "bewerbungsdossier:hyphenation:v1": '{"version":1,"enabled":false}',
  "titelblatt:history": "[]",
};

async function boot(page: Page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Dossier laden", exact: true })).toBeVisible({
    timeout: 60_000,
  });
}

async function seed(page: Page, entries = oldEntries) {
  await page.evaluate(async (values) => {
    localStorage.clear();
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);
    localStorage.setItem("unrelated-app", "must survive");
    const path = "/src/lib/dossier-storage-write.ts";
    (await import(path)).resetDossierStorageCaches();
  }, entries);
}

test("successful full replacement retains every imported photo and commits before reload", async ({
  page,
}) => {
  await boot(page);
  await seed(page);
  const result = await page.evaluate(async (value) => {
    const path = "/src/lib/dossier-import.ts";
    const api = await import(path);
    const loaded = await api.importDossierProjectSafely(value, { replace: true });
    return { loaded, status: api.getDossierImportStatus(), values: { ...localStorage } };
  }, project);
  expect(result.loaded).toEqual({ cover: true, cv: true, letter: true });
  expect(result.status.phase).toBe("reload");
  expect(JSON.parse(result.values["titelblatt:v3"]).data.foto).toBe(photo);
  expect(JSON.parse(result.values["lebenslauf:v1"]).data.person.foto).toBe(photo);
  expect(JSON.parse(result.values["anschreiben:v1"]).data.images[0].src).toBe(photo);
  expect(result.values["cv-cover-charm:import-journal:v1"]).toBeUndefined();
  expect(result.values["unrelated-app"]).toBe("must survive");
  const chrome = JSON.parse(result.values["bewerbungsdossier:chrome:v1"]);
  expect(chrome.shared.headerMode).toBe("contact");
  expect(chrome.shared.footerMode).toBe("details");
  expect(chrome.shared.headerInlineSeparator).toBe("dot");
  await page.reload();
  await expect(page.getByRole("button", { name: "Dossier laden", exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("titelblatt:v3")!).data.vorname),
  ).toBe("Neue");
});

test("a valid empty project remains loadable as an explicitly selected full replacement", async ({
  page,
}) => {
  await boot(page);
  await seed(page);
  const result = await page.evaluate(async () => {
    const path = "/src/lib/dossier-import.ts";
    const api = await import(path);
    const loaded = await api.importDossierProjectSafely(
      { kind: "cv-cover-charm-dossier", version: 1, savedAt: "2026-10-28T08:00:00.000Z" },
      { replace: true },
    );
    return { loaded, values: { ...localStorage }, phase: api.getDossierImportStatus().phase };
  });
  expect(result.loaded).toEqual({ cover: false, letter: false, cv: false });
  for (const key of [
    "titelblatt:v3",
    "anschreiben:v1",
    "lebenslauf:v1",
    "cv-cover-charm:import-journal:v1",
  ])
    expect(result.values[key]).toBeUndefined();
  expect(result.values["unrelated-app"]).toBe("must survive");
  expect(result.phase).toBe("reload");
});

for (const key of [
  "titelblatt:v3",
  "anschreiben:v1",
  "lebenslauf:v1",
  "lebenslauf:layout:v1",
  "lebenslauf:text-align:v1",
  "bewerbungsdossier:chrome:v1",
  "bewerbungsdossier:hyphenation:v1",
]) {
  test(`one failed native write rolls back exact raw state: ${key}`, async ({ page }) => {
    await boot(page);
    await seed(page);
    const result = await page.evaluate(
      async ({ value, key }) => {
        const before = { ...localStorage };
        const original = Storage.prototype.setItem;
        let fired = false;
        Storage.prototype.setItem = function (name, data) {
          if (!fired && name === key) {
            fired = true;
            throw new DOMException("injected full storage", "QuotaExceededError");
          }
          return original.call(this, name, data);
        };
        let error = "";
        try {
          const path = "/src/lib/dossier-import.ts";
          await (await import(path)).importDossierProjectSafely(value, { replace: true });
        } catch (failure) {
          error = String(failure);
        } finally {
          Storage.prototype.setItem = original;
        }
        return { before, after: { ...localStorage }, fired, error };
      },
      { value: project, key },
    );
    expect(result.fired).toBe(true);
    expect(result.error).toContain("injected full storage");
    expect(result.after).toEqual(result.before);
    await page.reload();
    await boot(page);
    expect(
      await page.evaluate(() => JSON.parse(localStorage.getItem("titelblatt:v3")!).data.foto),
    ).toBe(photo);
  });
}

for (const phase of ["pending", "committed"]) {
  test(`aborted IndexedDB ${phase} transaction never accepts partial import`, async ({ page }) => {
    await boot(page);
    await seed(page);
    const result = await page.evaluate(
      async ({ value, phase }) => {
        const before = { ...localStorage };
        const original = IDBObjectStore.prototype.put;
        let fired = false;
        IDBObjectStore.prototype.put = function (record, key) {
          const request = original.call(this, record, key);
          if (!fired && record?.phase === phase) {
            fired = true;
            this.transaction.abort();
          }
          return request;
        };
        let error = "";
        try {
          const path = "/src/lib/dossier-import.ts";
          await (await import(path)).importDossierProjectSafely(value, { replace: true });
        } catch (failure) {
          error = String(failure);
        } finally {
          IDBObjectStore.prototype.put = original;
        }
        return { before, after: { ...localStorage }, fired, error };
      },
      { value: project, phase },
    );
    expect(result.fired).toBe(true);
    expect(result.error).not.toBe("");
    expect(result.after).toEqual(result.before);
  });
}

for (const phase of ["pending", "committed"]) {
  test(`startup honors a ${phase} journal before any editor mounts`, async ({ page }) => {
    await boot(page);
    await seed(page);
    await page.evaluate(
      async ({ oldEntries, phase }) => {
        const id = "interrupted-import";
        await new Promise<void>((resolve, reject) => {
          const request = indexedDB.open("cv-cover-charm-import-backup-v1", 1);
          request.onupgradeneeded = () => request.result.createObjectStore("backup");
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction("backup", "readwrite");
            transaction.objectStore("backup").put(
              {
                version: 1,
                id,
                phase,
                entries: Object.entries(oldEntries).sort(([a], [b]) => a.localeCompare(b)),
              },
              "current",
            );
            transaction.oncomplete = () => {
              db.close();
              resolve();
            };
            transaction.onabort = () => {
              db.close();
              reject(transaction.error);
            };
          };
        });
        localStorage.setItem("cv-cover-charm:import-journal:v1", id);
        localStorage.setItem(
          "titelblatt:v3",
          JSON.stringify({
            version: 9,
            template: "brief",
            data: { vorname: "Neue", nachname: "Person" },
          }),
        );
        localStorage.setItem(
          "lebenslauf:v1",
          JSON.stringify({
            version: 6,
            data: { person: { vorname: "Neue", nachname: "Person" }, schule: [] },
            design: { template: "brief" },
          }),
        );
      },
      { oldEntries, phase },
    );
    await page.goto(`${BASE}/lebenslauf`);
    await expect(
      page.locator('[data-dossier-document="cv"][data-export-mode="false"]').first(),
    ).toBeVisible({ timeout: 60_000 });
    const expected = phase === "pending" ? "Bisherige" : "Neue";
    await expect
      .poll(() =>
        page.evaluate(() => JSON.parse(localStorage.getItem("lebenslauf:v1")!).data.person.vorname),
      )
      .toBe(expected);
    await expect(
      page.locator('[data-dossier-document="cv"][data-export-mode="false"]').first(),
    ).toContainText(expected);
    expect(
      await page.evaluate(() => localStorage.getItem("cv-cover-charm:import-journal:v1")),
    ).toBeNull();
  });
}

test("missing journal backup blocks editors and preserves all remaining state", async ({
  page,
}) => {
  await boot(page);
  await seed(page);
  await page.evaluate(() => localStorage.setItem("cv-cover-charm:import-journal:v1", "missing"));
  const before = await page.evaluate(() => ({ ...localStorage }));
  await page.goto(`${BASE}/lebenslauf`);
  await expect(page.getByRole("alert")).toContainText(
    "Importsicherung konnte nicht sicher gelesen",
  );
  await expect(page.locator('[data-dossier-document="cv"][data-export-mode="false"]')).toHaveCount(
    0,
  );
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(before);
});

test("malformed supplied part and future format cannot create a backup or alter state", async ({
  page,
}) => {
  await boot(page);
  await seed(page);
  const result = await page.evaluate(async (value) => {
    const path = "/src/lib/dossier-import.ts";
    const api = await import(path);
    const before = { ...localStorage };
    const errors = [];
    for (const bad of [
      { ...value, cv: { data: [] } },
      { ...value, kind: "future-dossier" },
      { ...value, version: 99 },
    ]) {
      try {
        await api.importDossierProjectSafely(bad, { replace: true });
      } catch (error) {
        errors.push(String(error));
      }
    }
    return { errors, before, after: { ...localStorage }, databases: await indexedDB.databases() };
  }, project);
  expect(result.errors).toHaveLength(3);
  expect(result.after).toEqual(result.before);
  expect(result.databases.some((db) => db.name === "cv-cover-charm-import-backup-v1")).toBe(false);
});

test("corrupt settings are rejected through the real file input before confirmation or storage writes", async ({
  page,
}) => {
  await boot(page);
  await seed(page, {
    ...oldEntries,
    "lebenslauf:photo:v2": '{"shape":"circle","zoom":1.7,"x":30,"y":70,"borderWidth":1}',
    "bewerbungsdossier:page-margins:v1": '{"letter":{"top":24,"right":22,"bottom":24,"left":22}}',
  });
  const before = await page.evaluate(() => ({ ...localStorage }));
  const dialogs: { type: string; message: string }[] = [];
  page.on("dialog", async (dialog) => {
    dialogs.push({ type: dialog.type(), message: dialog.message() });
    await dialog.dismiss();
  });
  const files = [
    { ...project, chrome: [] },
    { ...project, pageMargins: { letter: { top: "broken", right: 10, bottom: 10, left: 10 } } },
    { ...project, fieldTypography: { cv: [] } },
    { ...project, cv: { ...project.cv, portableState: { photoStyle: [] } } },
  ];
  for (const [index, value] of files.entries()) {
    await page.locator('input[type="file"][accept*="json"]').setInputFiles({
      name: `corrupt-settings-${index}.json`,
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(value)),
    });
    await expect.poll(() => dialogs.length).toBe(index + 1);
    expect(dialogs[index].type).toBe("alert");
    expect(dialogs[index].message).toContain("Dossier");
    expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(before);
  }
  expect(
    await page.evaluate(() => localStorage.getItem("cv-cover-charm:import-journal:v1")),
  ).toBeNull();
  expect(
    await page.evaluate(async () =>
      (await indexedDB.databases()).some((db) => db.name === "cv-cover-charm-import-backup-v1"),
    ),
  ).toBe(false);
});

test("corrupt CV rubric layouts are rejected before confirmation and preserve the existing draft", async ({
  page,
}) => {
  await boot(page);
  const oldCv = JSON.parse(oldEntries["lebenslauf:v1"]);
  oldCv.data.sectionLayouts = {
    erfahrung: { page: 2, positioning: "free", width: "half", x: 31.25, y: 44.75, widthMm: 78 },
  };
  await seed(page, { ...oldEntries, "lebenslauf:v1": JSON.stringify(oldCv) });
  const before = await page.evaluate(() => ({ ...localStorage }));
  const dialogs: { type: string; message: string }[] = [];
  page.on("dialog", async (dialog) => {
    dialogs.push({ type: dialog.type(), message: dialog.message() });
    await dialog.dismiss();
  });
  const layouts = [
    [],
    { erfahrung: [] },
    { erfahrung: { page: 3 } },
    { erfahrung: { width: "narrow" } },
    { erfahrung: { page: 2, positioning: "free", x: "broken", y: 44 } },
    { "custom:skills": { packing: "grid" } },
  ];
  for (const [index, sectionLayouts] of layouts.entries()) {
    await page.locator('input[type="file"][accept*="json"]').setInputFiles({
      name: `corrupt-cv-layout-${index}.json`,
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          ...project,
          cv: {
            ...project.cv,
            data: { ...project.cv.data, sectionLayouts },
          },
        }),
      ),
    });
    await expect.poll(() => dialogs.length).toBe(index + 1);
    expect(dialogs[index].type).toBe("alert");
    expect(dialogs[index].message).toContain("Dossier");
    expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(before);
  }
  expect(
    await page.evaluate(() => localStorage.getItem("cv-cover-charm:import-journal:v1")),
  ).toBeNull();
  expect(
    await page.evaluate(async () =>
      (await indexedDB.databases()).some((db) => db.name === "cv-cover-charm-import-backup-v1"),
    ),
  ).toBe(false);
});

test("corrupt appearance settings are rejected without touching the previous draft", async ({
  page,
}) => {
  await boot(page);
  await seed(page);
  const before = await page.evaluate(() => ({ ...localStorage }));
  const dialogs: { type: string; message: string }[] = [];
  page.on("dialog", async (dialog) => {
    dialogs.push({ type: dialog.type(), message: dialog.message() });
    await dialog.dismiss();
  });
  const files = [
    { ...project, cv: { ...project.cv, design: { bodyScale: "broken" } } },
    { ...project, cv: { ...project.cv, data: { person: { nameStyle: { bold: "false" } } } } },
    { ...project, letter: { ...project.letter, design: { subjectTypography: [] } } },
    { ...project, letter: { ...project.letter, design: { bodyFontSizePt: "broken" } } },
    {
      ...project,
      letter: { ...project.letter, data: { images: [{ src: photo, widthMm: "broken" }] } },
    },
    {
      ...project,
      letter: {
        ...project.letter,
        data: { images: [{ src: photo, placement: "free", xMm: "31" }] },
      },
    },
    {
      ...project,
      letter: { ...project.letter, data: { images: [{ src: photo, placement: "absolute" }] } },
    },
    { ...project, letter: { ...project.letter, data: { unterschriftAbstandMm: false } } },
    { ...project, cv: { ...project.cv, design: { chromeContent: [] } } },
    {
      ...project,
      letter: {
        ...project.letter,
        design: { chromeContent: { footerText: "Eigener Text", footerTextEnabled: "false" } },
      },
    },
    {
      ...project,
      cover: { ...project.cover, layout: { brief: { "custom-cover": { x: "broken" } } } },
    },
    {
      ...project,
      cv: { ...project.cv, elementStyles: { "custom-cv": { imgZoom: {} } } },
    },
    {
      ...project,
      cv: { ...project.cv, elements: [{ id: "custom-cv", page: "2" }] },
    },
  ];
  for (const [index, value] of files.entries()) {
    await page.locator('input[type="file"][accept*="json"]').setInputFiles({
      name: `corrupt-appearance-${index}.json`,
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(value)),
    });
    await expect.poll(() => dialogs.length).toBe(index + 1);
    expect(dialogs[index].type).toBe("alert");
    expect(dialogs[index].message).toContain("Dossier");
    expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(before);
  }
  expect(
    await page.evaluate(() => localStorage.getItem("cv-cover-charm:import-journal:v1")),
  ).toBeNull();
  expect(
    await page.evaluate(async () =>
      (await indexedDB.databases()).some((db) => db.name === "cv-cover-charm-import-backup-v1"),
    ),
  ).toBe(false);
});

test("confirmed project settings survive reload, both editors, a real JSON download and reimport", async ({
  page,
}) => {
  await boot(page);
  await seed(page);
  page.on("dialog", (dialog) => dialog.accept());
  const sectionLayouts = {
    erfahrung: {
      page: 2,
      width: "half",
      positioning: "free",
      packing: "rows",
      x: 31.25,
      y: 44.75,
      widthMm: 78,
      heightMm: 42,
    },
    sprachen: {
      page: 1,
      width: "half",
      positioning: "flow",
      packing: "masonry",
      x: null,
      y: null,
      widthMm: null,
      heightMm: null,
    },
  };
  const value = {
    ...project,
    chrome: {
      version: 1,
      sync: false,
      shared: { headerMode: "contact" },
      cv: { headerMode: "contact", footerMode: "compact", headerGapMm: 8 },
      letter: { headerMode: "contact", footerMode: "details", headerInlineSeparator: "pipe" },
    },
    pageMargins: { letter: { top: 24, right: 22, bottom: 26, left: 20 } },
    fieldTypography: {
      version: 1,
      cv: {
        person: { section: "Person", label: "Vorname", value: "Neue", style: { bold: true } },
      },
      letter: {},
    },
    cv: {
      ...project.cv,
      data: {
        ...project.cv.data,
        person: {
          ...project.cv.data.person,
          nameStyle: {
            font: "serif",
            fontSizePt: 27,
            color: "#123456",
            bold: false,
            italic: true,
            underline: false,
          },
        },
        erfahrung: [
          {
            id: "layout-entry",
            zeit: "2026",
            titel: "Layout-Probe",
            ort: "QA",
            beschreibung: "Unveränderter Inhalt.",
          },
        ],
        sprachen: [{ id: "layout-language", name: "Deutsch", niveau: "Muttersprache" }],
        sectionLayouts,
      },
      design: {
        ...project.cv.design,
        titleScale: 1.05,
        headingScale: 0.95,
        bodyScale: 1,
        docTitleFontSizePx: 25,
        docTitleBold: false,
        sectionTitleFontSizePx: 15,
        sectionTitleItalic: true,
        chromeContent: {
          headerTitleEnabled: true,
          headerTitle: "Eigener CV-Kopf",
          headerTextEnabled: false,
          headerText: "Ausgeblendeter CV-Kopftext",
          footerTitleEnabled: false,
          footerTitle: "Ausgeblendeter CV-Fusstitel",
          footerTextEnabled: true,
          footerText: "Eigener CV-Fuss",
        },
      },
      portableState: {
        ...project.cv.portableState,
        photoStyle: { shape: "portrait", zoom: 1.6, x: 30, y: 70, borderWidth: 0.6 },
        photoPlacement: { mode: "frei", xMm: 150, yMm: 20, widthMm: 32, frameColor: "#123456" },
      },
    },
    letter: {
      ...project.letter,
      data: {
        ...project.letter.data,
        grussAbstandMm: 6.5,
        unterschriftAbstandMm: 12,
        images: [
          {
            id: "photo",
            src: photo,
            side: "left",
            placement: "free",
            xMm: 31.5,
            topMm: 8,
            widthMm: 37,
            gapMm: 3,
          },
          {
            id: "legacy-photo",
            src: photo,
            side: "left",
            xMm: 120,
            topMm: "12",
            widthMm: "34",
            gapMm: "4",
          },
        ],
      },
      design: {
        ...project.letter.design,
        headerInlineSeparator: "pipe",
        senderTypography: {
          font: "serif",
          fontSizePt: 12.5,
          color: "#123456",
          bold: false,
          italic: true,
          underline: false,
        },
        recipientTypography: { font: "sans", fontSizePt: 11, bold: true },
        subjectTypography: { font: "humanist", fontSizePt: 14, color: "#654321", underline: true },
        bodyFont: "sans",
        bodyFontSizePt: 11.5,
        dateFont: "serif",
        dateFontSizePt: 10,
        closingFontSizePt: 11,
        signatureFontSizePt: 12,
        attachmentsFontSizePt: 9.5,
        continuationTopMarginMm: null,
        chromeContent: {
          headerTitleEnabled: false,
          headerTitle: "Ausgeblendeter Brieftitel",
          headerTextEnabled: true,
          headerText: "Eigener Briefkopf",
          footerTitleEnabled: true,
          footerTitle: "Eigener Brieffuss",
          footerTextEnabled: false,
          footerText: "Ausgeblendeter Brief-Fusstext",
        },
      },
    },
  };
  const firstReload = page.waitForEvent("domcontentloaded");
  await page.locator('input[type="file"][accept*="json"]').setInputFiles({
    name: "complete-settings.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(value)),
  });
  await firstReload;
  await expect(page.getByRole("button", { name: "Dossier laden", exact: true })).toBeVisible();
  await page.goto(`${BASE}/anschreiben`);
  await expect(page.getByRole("button", { name: "Download", exact: true })).toHaveAttribute(
    "data-editor-ready",
    "true",
  );
  await expect(page.locator('[data-letter-flow-image="photo"]').first()).toHaveAttribute(
    "data-letter-image-placement",
    "free",
  );
  await expect(page.locator('[data-letter-flow-image="photo"]').first()).toHaveAttribute(
    "data-x-mm",
    "31.5",
  );
  await expect(page.locator('[data-letter-flow-image="legacy-photo"]').first()).toHaveAttribute(
    "data-letter-image-placement",
    "left",
  );
  await expect(page.locator('[data-letter-flow-image="legacy-photo"]').first()).toHaveAttribute(
    "data-x-mm",
    "0",
  );
  const letterChrome = page.locator('[data-dossier-chrome="letter"]').first();
  await expect(letterChrome).toContainText("Eigener Briefkopf");
  await expect(letterChrome).toContainText("Eigener Brieffuss");
  await expect(letterChrome).not.toContainText("Ausgeblendeter Brief");
  // This default is absent from the imported file, so it proves the editor's
  // debounced normalization/save ran before the reload (rather than just reading the input).
  await expect
    .poll(async () =>
      page.evaluate(() => JSON.parse(localStorage.getItem("anschreiben:v1")!).design.bgOpacity),
    )
    .toBe(0.25);
  await expect
    .poll(async () =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("anschreiben:v1")!).design.senderTypography,
      ),
    )
    .toEqual(value.letter.design.senderTypography);
  await page.reload();
  await expect(page.getByRole("button", { name: "Download", exact: true })).toHaveAttribute(
    "data-editor-ready",
    "true",
  );
  await page.goto(`${BASE}/lebenslauf`);
  const cvChrome = page.locator('[data-dossier-chrome="cv"]').first();
  await expect(cvChrome).toContainText("Eigener CV-Kopf");
  await expect(cvChrome).toContainText("Eigener CV-Fuss");
  await expect(cvChrome).not.toContainText("Ausgeblendeter CV");
  const button = page.getByRole("button", { name: "Download", exact: true });
  await expect(button).toHaveAttribute("data-editor-ready", "true");
  await button.click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("menuitem", { name: "Dossier JSON", exact: true }).click(),
  ]);
  const bytes = await readFile((await download.path())!);
  const exported = JSON.parse(bytes.toString("utf8"));
  expect(exported.chrome).toMatchObject(value.chrome);
  expect(exported.pageMargins.letter).toEqual(value.pageMargins.letter);
  expect(exported.fieldTypography).toEqual(value.fieldTypography);
  expect(exported.cv.portableState).toMatchObject(value.cv.portableState);
  expect(exported.cv.data.sectionLayouts).toEqual(sectionLayouts);
  expect(exported.cv.data.erfahrung).toEqual(value.cv.data.erfahrung);
  expect(exported.cv.data.sprachen).toEqual(value.cv.data.sprachen);
  expect(exported.cv.data.person.nameStyle).toEqual(value.cv.data.person.nameStyle);
  expect(exported.cv.design).toMatchObject(value.cv.design);
  expect(exported.letter.design).toMatchObject(value.letter.design);
  expect(exported.cv.design.chromeContent).toEqual(value.cv.design.chromeContent);
  expect(exported.letter.design.chromeContent).toEqual(value.letter.design.chromeContent);
  expect(exported.letter.data.images).toEqual(value.letter.data.images);
  expect(exported.letter.data.grussAbstandMm).toBe(6.5);
  expect(exported.letter.data.unterschriftAbstandMm).toBe(12);
  expect(exported.cover.data.foto).toBe(photo);
  expect(exported.cv.data.person.foto).toBe(photo);
  expect(exported.letter.data.images[0].src).toBe(photo);
  await page.goto(BASE);
  await seed(page);
  const secondReload = page.waitForEvent("domcontentloaded");
  await page.locator('input[type="file"][accept*="json"]').setInputFiles({
    name: download.suggestedFilename(),
    mimeType: "application/json",
    buffer: bytes,
  });
  await secondReload;
  await expect(page.getByRole("button", { name: "Dossier laden", exact: true })).toBeVisible();
  const stored = await page.evaluate(() => ({ ...localStorage }));
  expect(JSON.parse(stored["bewerbungsdossier:chrome:v1"])).toEqual(exported.chrome);
  expect(JSON.parse(stored["bewerbungsdossier:page-margins:v1"]).letter).toEqual(
    value.pageMargins.letter,
  );
  expect(JSON.parse(stored["bewerbungsdossier:field-typography:v1"])).toEqual(
    value.fieldTypography,
  );
  expect(JSON.parse(stored["lebenslauf:photo:v2"])).toEqual(value.cv.portableState.photoStyle);
  expect(JSON.parse(stored["lebenslauf:photo-place:v1"])).toEqual(
    value.cv.portableState.photoPlacement,
  );
  expect(stored["lebenslauf:layout-mirror:v1"]).toBe("true");
  expect(stored["lebenslauf:text-align:v1"]).toBe("justify");
  expect(stored["lebenslauf:section-gap:v1"]).toBe("8");
  expect(JSON.parse(stored["titelblatt:v3"]).data.foto).toBe(photo);
  expect(JSON.parse(stored["lebenslauf:v1"]).data.person.foto).toBe(photo);
  expect(JSON.parse(stored["lebenslauf:v1"]).data.sectionLayouts).toEqual(sectionLayouts);
  expect(JSON.parse(stored["lebenslauf:v1"]).data.erfahrung).toEqual(value.cv.data.erfahrung);
  expect(JSON.parse(stored["lebenslauf:v1"]).data.sprachen).toEqual(value.cv.data.sprachen);
  expect(JSON.parse(stored["anschreiben:v1"]).data.images[0].src).toBe(photo);
  expect(JSON.parse(stored["lebenslauf:v1"]).data.person.nameStyle).toEqual(
    value.cv.data.person.nameStyle,
  );
  expect(JSON.parse(stored["lebenslauf:v1"]).design).toMatchObject(value.cv.design);
  expect(JSON.parse(stored["anschreiben:v1"]).design).toMatchObject(value.letter.design);
  expect(JSON.parse(stored["lebenslauf:v1"]).design.chromeContent).toEqual(
    value.cv.design.chromeContent,
  );
  expect(JSON.parse(stored["anschreiben:v1"]).design.chromeContent).toEqual(
    value.letter.design.chromeContent,
  );
  expect(JSON.parse(stored["anschreiben:v1"]).data.images).toEqual(value.letter.data.images);
  expect(stored["unrelated-app"]).toBe("must survive");
});

const historicalFixturePaths = {
  unsyncedChrome:
    "docs/qa/docx-next-modern-contact-colors-18okt/header-inline-unsynced-project.json",
  spacing20: "docs/qa/docx-next-modern-cv-spacing-settings-18okt/project.json",
  spacing12: "docs/qa/docx-next-modern-defaults-footer-18okt/override-project.json",
  briefSaved: "docs/qa/docx-next-shared-settings-18okt/cohort/brief-saved/project.json",
  verlaufSaved: "docs/qa/docx-next-shared-settings-18okt/cohort/verlauf-saved/project.json",
  noHeader: "docs/qa/docx-next-shared-settings-18okt/no-header-proof/project.json",
  longModernLegacy:
    "docs/qa/docx-next-word-batch-19okt/07-Modern-Lang-115-Prozent/input-project.json",
  longBriefLegacy:
    "docs/qa/docx-next-word-batch-19okt/09-Brief-Lang-115-Prozent/input-project.json",
  longModernV2: "docs/qa/docx-next-word-feedback-19okt-v2/07-Modern-Lang-115-Prozent-project.json",
  longBriefV2: "docs/qa/docx-next-word-feedback-19okt-v2/09-Brief-Lang-115-Prozent-project.json",
  longBriefV3: "docs/qa/docx-next-word-spacing-19okt-v3/09-Brief-Lang-115-Prozent-project.json",
  continuation40:
    "docs/qa/docx-next-word-spacing-19okt-v3/04-Modern-Kontakt-senkrecht-project.json",
  neonSaved: "docs/qa/docx-next-shared-settings-18okt/cohort/neon-saved/project.json",
  twoCvPages: "docs/qa/docx-next-word-feedback-19okt-v2/02-Modern-Zwei-CV-Seiten-project.json",
  portraitPhoto: "docs/qa/docx-next-word-feedback-19okt-v2/10-Brief-Foto-Hochformat-project.json",
  freundlich: "docs/qa/docx-next-design-fidelity-16okt/audit/freundlich/project.json",
  customMargins:
    "docs/qa/docx-next-word-feedback-19okt-v2/05-Modern-Eigene-Werte-Referenzen-project.json",
};
const roundtripFixtures = [
  {
    label: "reviewed Modern Sidebar",
    path: "tests/fixtures/import/modern-sidebar-from-23okt.json",
    sha256: "7dd6742da656b72391b9411c72ef298f767eb068cc8f9f3c4af0a80ad51b2b51",
    word: true,
  },
  {
    label: "historical Freundlich",
    ...historicalProjects.find((fixture) => fixture.path === historicalFixturePaths.freundlich)!,
    word: false,
  },
  {
    label: "historical Modern with custom margins and two references",
    ...historicalProjects.find((fixture) => fixture.path === historicalFixturePaths.customMargins)!,
    word: false,
  },
  ...[
    ["historical Neon with saved spacing", historicalFixturePaths.neonSaved],
    ["historical Modern with two CV pages", historicalFixturePaths.twoCvPages],
    ["historical Brief with portrait photo", historicalFixturePaths.portraitPhoto],
    ["historical long Modern legacy 115 percent", historicalFixturePaths.longModernLegacy],
    ["historical long Brief legacy 115 percent", historicalFixturePaths.longBriefLegacy],
    ["historical long Modern v2 115 percent", historicalFixturePaths.longModernV2],
    ["historical long Brief v2 115 percent", historicalFixturePaths.longBriefV2],
    ["historical long Brief v3 115 percent", historicalFixturePaths.longBriefV3],
    ["historical contact with 40 mm continuation", historicalFixturePaths.continuation40],
    ["historical separate letter and CV chrome", historicalFixturePaths.unsyncedChrome],
    ["historical Modern with 20 mm spacing", historicalFixturePaths.spacing20],
    ["historical Modern with 12 mm spacing", historicalFixturePaths.spacing12],
    ["historical Brief with saved reading settings", historicalFixturePaths.briefSaved],
    ["historical Verlauf with saved reading settings", historicalFixturePaths.verlaufSaved],
    ["historical Brief without header", historicalFixturePaths.noHeader],
  ].map(([label, path]) => ({
    label,
    ...historicalProjects.find((fixture) => fixture.path === path)!,
    word: false,
  })),
];

const legacyFontFixtures: string[] = [
  historicalFixturePaths.neonSaved,
  historicalFixturePaths.longModernLegacy,
  historicalFixturePaths.longBriefLegacy,
  historicalFixturePaths.unsyncedChrome,
  historicalFixturePaths.spacing20,
  historicalFixturePaths.spacing12,
  historicalFixturePaths.briefSaved,
  historicalFixturePaths.verlaufSaved,
];

async function inspectContinuation40(page: Page) {
  await page.goto(`${BASE}/lebenslauf`);
  await expect(page.getByRole("button", { name: "Download", exact: true })).toHaveAttribute(
    "data-editor-ready",
    "true",
  );
  const sheets = page.locator('[data-export-mode="false"] [data-cv-page]');
  await expect(sheets).toHaveCount(2);
  await page.evaluate(() => document.fonts.ready);
  const geometry = await sheets.nth(1).evaluate((sheet) => {
    const paper = sheet.getBoundingClientRect();
    const main = sheet.querySelector<HTMLElement>("[data-cv-main]")!;
    return {
      topMm: ((main.getBoundingClientRect().top - paper.top) * 297) / paper.height,
      cssTop: main.style.top,
      text: main.textContent,
    };
  });
  expect(geometry.cssTop).toBe("40mm");
  expect(geometry.topMm).toBeCloseTo(40, 1);
  expect(geometry.text).toContain("Referenzen");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("lebenslauf:continuation-top-margin:v1")))
    .toBe("40");
  await boot(page);
  return geometry;
}

type RoundtripParts = Pick<typeof modernSidebar, "cover" | "letter" | "cv">;
type RoundtripInput = RoundtripParts & {
  chrome?: typeof modernSidebar.chrome;
  pageMargins?: typeof modernSidebar.pageMargins;
  hyphenation?: { version: 1; enabled: boolean };
};

const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const withoutWhitespace = (text: string) => text.replace(/[\s\u00ad\u200b]+/g, "");
const partKeys = {
  cover: "titelblatt:v3",
  letter: "anschreiben:v1",
  cv: "lebenslauf:v1",
} as const;

async function confirmProjectFile(page: Page, name: string, buffer: Buffer) {
  const confirmation = page.waitForEvent("dialog");
  const reload = page.waitForEvent("domcontentloaded");
  await page.locator('input[type="file"][accept*="json"]').setInputFiles({
    name,
    mimeType: "application/json",
    buffer,
  });
  const dialog = await confirmation;
  const message = dialog.message();
  const type = dialog.type();
  await dialog.accept();
  expect(type).toBe("confirm");
  expect(message).toContain("Titelblatt, Motivationsschreiben, Lebenslauf");
  await reload;
  await expect(page.getByRole("button", { name: "Dossier laden", exact: true })).toBeVisible();
}

test("free element geometry and the CV page survive a real JSON roundtrip", async ({ page }) => {
  const coverText = {
    id: "custom-cover-position",
    label: "QA-Text",
    text: "Frei platziert",
    kind: "text",
  };
  const cvImage = {
    id: "custom-cv-image",
    label: "QA-Bild",
    text: "",
    kind: "image",
    src: photo,
    page: 2,
  };
  const layout = {
    brief: { [coverText.id]: { x: 41.25, y: 111.5, w: 59.75, h: 9.5, layer: "back" } },
    modern: { [coverText.id]: { x: 92, y: 100, w: 65 } },
  };
  const elementStyles = {
    [cvImage.id]: { x: 36.5, y: 99.25, w: 29.5, ratio: 1.2, imgZoom: 1.5, imgX: 20, imgY: 70 },
  };
  const value = {
    ...project,
    cover: { ...project.cover, customs: [coverText], layout },
    cv: {
      ...project.cv,
      design: { ...project.cv.design, useElements: true },
      elements: [cvImage],
      elementStyles,
    },
  };
  await boot(page);
  await seed(page);
  await confirmProjectFile(page, "free-elements.json", Buffer.from(JSON.stringify(value)));

  async function expectGeometry() {
    await page.goto(`${BASE}/titelblatt`);
    const cover = page
      .locator(`[data-dossier-document="cover"] [data-block-id="${coverText.id}"]`)
      .first();
    await expect(cover).toBeVisible();
    await expect(cover).toContainText(coverText.text);
    await expect(cover).toHaveAttribute("data-element-layer", "back");
    expect(
      await cover.evaluate((node) => [node.style.left, node.style.top, node.style.width]),
    ).toEqual(["41.25mm", "111.5mm", "59.75mm"]);

    await page.goto(`${BASE}/lebenslauf`);
    const cv = page.locator(`[data-cv-page="1"] [data-block-id="${cvImage.id}"]`).first();
    await expect(cv).toBeVisible();
    await expect(page.locator(`[data-cv-page="0"] [data-block-id="${cvImage.id}"]`)).toHaveCount(0);
    expect(
      await cv.evaluate((node) => [node.style.left, node.style.top, node.style.width]),
    ).toEqual(["36.5mm", "99.25mm", "29.5mm"]);
    const image = cv.locator("img");
    await expect(image).toHaveAttribute("src", photo);
    expect(
      await image.evaluate((node) => [node.style.width, node.style.left, node.style.top]),
    ).toEqual(["150%", "-10%", "-35%"]);
  }

  await expectGeometry();
  const button = page.getByRole("button", { name: "Download", exact: true });
  await expect(button).toHaveAttribute("data-editor-ready", "true");
  await button.click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("menuitem", { name: "Dossier JSON", exact: true }).click(),
  ]);
  const bytes = await readFile((await download.path())!);
  const restored = JSON.parse(bytes.toString("utf8"));
  expect(restored.cover.layout).toMatchObject(layout);
  expect(restored.cover.customs).toEqual([coverText]);
  expect(restored.cv.elements).toEqual([cvImage]);
  expect(restored.cv.elementStyles).toEqual(elementStyles);

  await boot(page);
  await seed(page);
  await confirmProjectFile(page, download.suggestedFilename(), bytes);
  await expectGeometry();
});

async function expectRestoredParts(page: Page, input: RoundtripParts) {
  const stored = await page.evaluate((keys) => {
    const read = (key: string) => JSON.parse(localStorage.getItem(key) ?? "null");
    return {
      cover: read(keys.cover),
      letter: read(keys.letter),
      cv: read(keys.cv),
      journal: localStorage.getItem("cv-cover-charm:import-journal:v1"),
      unrelated: localStorage.getItem("unrelated-app"),
    };
  }, partKeys);
  for (const part of ["cover", "letter", "cv"] as const) {
    expect(stored[part].data, `${part} data after confirmed import`).toEqual(input[part].data);
  }
  expect(stored.journal).toBeNull();
  expect(stored.unrelated).toBe("must survive");
}

const dossierFormats = {
  pdf: ["Fertiges Dossier (PDF)", "PDF herunterladen"],
  docx: ["Bearbeitbares Dossier (DOCX)", "DOCX herunterladen"],
  json: ["Projektdatei (JSON) – Projekt speichern", "Projekt speichern"],
} as const;

async function downloadRestoredDossier(
  page: Page,
  format: keyof typeof dossierFormats,
  phase: string,
  word: boolean,
) {
  await page.getByRole("button", { name: /Gesamtdossier herunterladen/ }).click();
  const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
  if (!word) await expectUnreviewedDocxBlocked(page);
  const [option, action] = dossierFormats[format];
  await dialog.getByRole("radio", { name: option, exact: true }).click();
  const button = dialog.getByRole("button", { name: action, exact: true });
  await expect(button).toBeEnabled({ timeout: 30_000 });
  const [download] = await Promise.all([
    Promise.race([
      page.waitForEvent("download", { timeout: 60_000 }),
      dialog
        .getByRole("alert")
        .waitFor({ timeout: 60_000 })
        .then(async () => {
          throw new Error(
            `${format} download failed: ${await dialog.getByRole("alert").innerText()}`,
          );
        }),
    ]),
    button.click(),
  ]);
  const path = test.info().outputPath(`${phase}.${format}`);
  await download.saveAs(path);
  await expect(dialog).toBeHidden();
  const filename = download.suggestedFilename();
  expect(filename).toMatch(new RegExp(`\\.${format}$`, "i"));
  return { bytes: await readFile(path), filename };
}

async function inspectRestoredPdf(bytes: Buffer, input: RoundtripParts, subject: string) {
  const { getDocument, OPS } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({ data: new Uint8Array(bytes), disableFontFace: true });
  try {
    const pdf = await task.promise;
    expect(pdf.numPages).toBeGreaterThanOrEqual(3);
    const pages = [];
    for (let index = 1; index <= pdf.numPages; index += 1) {
      const page = await pdf.getPage(index);
      const content = await page.getTextContent();
      const operators = await page.getOperatorList();
      const images = operators.fnArray.filter(
        (op) => op === OPS.paintImageXObject || op === OPS.paintInlineImageXObject,
      ).length;
      expect(images, `PDF page ${index} contains its rendered artwork`).toBeGreaterThan(0);
      pages.push({
        text: content.items.map((item) => ("str" in item ? item.str : "")).join(" "),
        images,
      });
    }
    // The app produces the cover as a raster page. Text assertions start on the letter.
    expect(withoutWhitespace(pages[1].text)).toContain(withoutWhitespace(subject));
    const cvText = withoutWhitespace(
      pages
        .slice(2)
        .map(({ text }) => text)
        .join(" "),
    );
    for (const marker of [
      ...[...input.cv.data.schule, ...input.cv.data.erfahrung].flatMap(
        ({ titel, ort, beschreibung }) => [titel, ort, beschreibung].filter(Boolean),
      ),
      ...input.cv.data.referenzen.flatMap(({ name, funktion, kontakt, email }) =>
        [name, funktion, kontakt, email].filter(Boolean),
      ),
    ]) {
      expect(cvText).toContain(withoutWhitespace(marker));
    }
    return pages;
  } finally {
    await task.destroy();
  }
}

function inspectRestoredDocx(bytes: Buffer, input: RoundtripParts, subject: string) {
  const entries = readZipEntries(bytes);
  const xml = new TextDecoder().decode(
    entries.find(({ name }) => name === "word/document.xml")!.bytes,
  );
  const text = [...xml.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map((run) => run[1]).join(" ");
  const markers = [
    input.cover.data.beruf,
    subject,
    input.cv.data.erfahrung[0].titel,
    input.cv.data.referenzen[0].funktion,
    input.cv.data.referenzen[0].kontakt,
  ];
  for (const marker of markers)
    expect(withoutWhitespace(text)).toContain(withoutWhitespace(marker));
  expect(xml.match(/<w:sectPr>/g)).toHaveLength(3);
  const photoMarkup = xml.match(/<pic:cNvPr[^>]*name="cv\.person\.photo".*?<\/pic:pic>/)?.[0];
  expect(photoMarkup).toContain("<a:srcRect");
  const imageId = photoMarkup?.match(/r:embed="([^"]+)"/)?.[1];
  const rels = new TextDecoder().decode(
    entries.find(({ name }) => name === "word/_rels/document.xml.rels")!.bytes,
  );
  const imageTarget = rels.match(
    new RegExp(`<Relationship Id="${imageId}"[^>]*Target="(media/[^"]+)"`),
  )?.[1];
  expect(imageTarget).toBeDefined();
  expect(entries.find(({ name }) => name === `word/${imageTarget}`)?.bytes.length).toBeGreaterThan(
    0,
  );
  expect(xml).toContain("<w:headerReference");
  expect(xml).toContain("<w:footerReference");
  // Compare package parts, excluding outer ZIP metadata.
  return Object.fromEntries(entries.map(({ name, bytes }) => [name, sha256(bytes)]));
}

for (const fixture of roundtripFixtures) {
  test(`${fixture.label}: confirmed restore survives save, downloads and JSON reimport`, async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const raw = await readFile(fixture.path);
    expect(sha256(raw)).toBe(fixture.sha256);
    const input: RoundtripInput = JSON.parse(raw.toString("utf8"));
    await boot(page);
    await seed(page);
    await confirmProjectFile(page, basename(fixture.path), raw);
    await expectRestoredParts(page, input);

    // Exercise an actual editor save and track a unique value in the downstream downloads.
    await page.goto(`${BASE}/anschreiben`);
    const subjectField = page.getByRole("textbox", { name: "Titel / Betreff", exact: true });
    await expect(subjectField).toHaveValue(input.letter.data.betreff);
    const subject = "Bewerbung Informatik EFZ – Projektprüfung";
    await subjectField.fill(subject);
    await expect
      .poll(() =>
        page.evaluate(() => JSON.parse(localStorage.getItem("anschreiben:v1")!).data.betreff),
      )
      .toBe(subject);
    await page.reload();
    await expect(subjectField).toHaveValue(subject);
    if (legacyFontFixtures.includes(fixture.path)) {
      expect(input.letter.design).toMatchObject({ font: "freundlich", fontOverride: "sans" });
      expect(input.cv.design.font).toBe("sans");
      await expect(page.locator("[data-letter-canvas]").first()).toHaveAttribute(
        "data-letter-font",
        "sans",
      );
    }
    const continuationBefore =
      fixture.path === historicalFixturePaths.continuation40
        ? await inspectContinuation40(page)
        : undefined;
    await boot(page);

    const beforePdf = await downloadRestoredDossier(page, "pdf", "before", fixture.word);
    const pdfPages = await inspectRestoredPdf(beforePdf.bytes, input, subject);
    if (
      fixture.path === historicalFixturePaths.twoCvPages ||
      fixture.path === historicalFixturePaths.continuation40
    ) {
      expect(pdfPages, "historical two-page CV must retain both CV pages").toHaveLength(4);
    }
    const docxParts = fixture.word
      ? inspectRestoredDocx(
          (await downloadRestoredDossier(page, "docx", "before", true)).bytes,
          input,
          subject,
        )
      : undefined;
    const json = await downloadRestoredDossier(page, "json", "before", fixture.word);
    const exported: typeof modernSidebar & Pick<RoundtripInput, "hyphenation"> = JSON.parse(
      json.bytes.toString("utf8"),
    );
    expect(exported.cover).toMatchObject(
      fixture.word ? { ...input.cover, layout: { modern: {} } } : input.cover,
    );
    expect(exported.letter.data).toMatchObject({ ...input.letter.data, betreff: subject });
    expect(exported.cv.data).toEqual(input.cv.data);
    if (fixture.word) {
      expect(exported.cv.design).toMatchObject(input.cv.design);
      expect(exported.letter.design).toMatchObject({
        template: input.letter.design.template,
        colors: input.letter.design.colors,
        font: input.letter.design.font,
        headerMode: input.letter.design.headerMode,
        footerMode: input.letter.design.footerMode,
      });
      expect({
        ...exported.cv.portableState,
        sectionGapMm: exported.cv.portableState.sectionGapMm ?? null,
      }).toMatchObject(input.cv.portableState);
      expect(exported.chrome).toEqual(input.chrome);
    } else {
      expect(exported.cv).toMatchObject(input.cv);
      // Legacy icon separators are stored as dots by the shared chrome migration.
      expect(exported.letter.design).toMatchObject({
        ...input.letter.design,
        // Existing shared-font reconciliation uses the explicit CV font as
        // tie-breaker. The effective sans selection remains unchanged.
        ...(legacyFontFixtures.includes(fixture.path) ? { font: "sans" } : {}),
        ...([
          historicalFixturePaths.longBriefLegacy,
          historicalFixturePaths.briefSaved,
          historicalFixturePaths.noHeader,
        ].includes(fixture.path)
          ? { fontOverride: null }
          : {}),
        ...(fixture.path === historicalFixturePaths.unsyncedChrome
          ? {
              headerMode: "contact",
              headerTextLayout: "inline",
              headerBackgroundColor: "#183447",
              footerBackgroundColor: "#315665",
              chromeTextFont: "sans",
            }
          : {}),
        ...(fixture.path === historicalFixturePaths.noHeader ? { headerMode: "none" } : {}),
        ...(input.letter.design.headerInlineSeparator === "icons"
          ? { headerInlineSeparator: "dot" }
          : {}),
      });
      if (input.chrome) {
        const expectedChrome = structuredClone(input.chrome);
        if (fixture.path === historicalFixturePaths.unsyncedChrome) {
          for (const scope of ["shared", "cv", "letter"] as const) {
            expect(expectedChrome[scope].headerInlineSeparator).toBe("icons");
            expectedChrome[scope].headerInlineSeparator = "dot";
          }
        }
        expect(exported.chrome).toMatchObject(expectedChrome);
      }
    }
    if (input.pageMargins) expect(exported.pageMargins ?? {}).toEqual(input.pageMargins);
    if (input.hyphenation) expect(exported.hyphenation).toEqual(input.hyphenation);

    await seed(page);
    await boot(page);
    await confirmProjectFile(page, json.filename, json.bytes);
    await expectRestoredParts(page, exported);
    if (legacyFontFixtures.includes(fixture.path)) {
      await page.goto(`${BASE}/anschreiben`);
      await expect(page.locator("[data-letter-canvas]").first()).toHaveAttribute(
        "data-letter-font",
        "sans",
      );
      await boot(page);
    }
    const continuationAfter =
      fixture.path === historicalFixturePaths.continuation40
        ? await inspectContinuation40(page)
        : undefined;
    expect(continuationAfter).toEqual(continuationBefore);

    const afterPdf = await downloadRestoredDossier(page, "pdf", "after", fixture.word);
    expect(await inspectRestoredPdf(afterPdf.bytes, input, subject)).toEqual(pdfPages);
    if (fixture.word) {
      const afterDocx = await downloadRestoredDossier(page, "docx", "after", true);
      expect(inspectRestoredDocx(afterDocx.bytes, input, subject)).toEqual(docxParts);
    }
    const afterJson = await downloadRestoredDossier(page, "json", "after", fixture.word);
    // Import projects canonical chrome into the legacy letter design. The
    // editor may omit these aliases when their effective values live in chrome.
    const chrome = exported.chrome.sync ? exported.chrome.shared : exported.chrome.letter;
    expect(JSON.parse(afterJson.bytes.toString("utf8"))).toEqual({
      ...exported,
      savedAt: expect.any(String),
      letter: {
        ...exported.letter,
        design: {
          ...exported.letter.design,
          headerGapMm: chrome.headerGapMm,
          chromeHeaderTextColor: chrome.headerTextColor,
          chromeFooterTextColor: chrome.footerTextColor,
          chromeHeaderFontSizePt: chrome.headerFontSizePt,
          chromeFooterFontSizePt: chrome.footerFontSizePt,
          // This original stores the explicit continuation mode only in
          // canonical chrome. Reimport also projects it into the legacy alias.
          ...(fixture.path === historicalFixturePaths.noHeader
            ? { headerContinuationMode: "none" }
            : {}),
        },
      },
    });
    await writeFile(
      test.info().outputPath("roundtrip-evidence.json"),
      JSON.stringify(
        {
          label: fixture.label,
          fixture: fixture.path,
          fixtureSha256: fixture.sha256,
          word: fixture.word,
          fixtureKind: fixture.word ? "derived-sidebar-control" : "historical-original",
          coverFontScale: exported.cover.fontScale,
          continuation: continuationAfter,
          chrome: exported.chrome,
          pdfPages: pdfPages.length,
          pdfSha256: { before: sha256(beforePdf.bytes), after: sha256(afterPdf.bytes) },
          jsonSha256: { before: sha256(json.bytes), after: sha256(afterJson.bytes) },
          status: "PASS",
          sourceSha: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
          sourceDirty: !!execFileSync("git", ["status", "--porcelain"], {
            encoding: "utf8",
          }).trim(),
        },
        null,
        2,
      ),
    );
  });
}

test("large existing image strings are backed up in IndexedDB without a second localStorage copy", async ({
  page,
}) => {
  await boot(page);
  const largePhoto = `data:image/png;base64,${"A".repeat(2 * 1024 * 1024)}`;
  const entries = {
    ...oldEntries,
    "titelblatt:v3": JSON.stringify({ data: { vorname: "Large", foto: largePhoto } }),
  };
  await seed(page, entries);
  const result = await page.evaluate(async (value) => {
    const before = { ...localStorage };
    const original = Storage.prototype.setItem;
    let journalImageBytes = 0;
    Storage.prototype.setItem = function (key, data) {
      if (key === "cv-cover-charm:import-journal:v1") {
        if (data.length > 200) throw new Error("backup duplicated into localStorage");
      }
      if (key === "lebenslauf:v1" && JSON.parse(data).data?.person?.vorname === "Neue") {
        Storage.prototype.setItem = original;
        throw new DOMException("large photo rollback", "QuotaExceededError");
      }
      return original.call(this, key, data);
    };
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (record, key) {
      if (record?.phase === "pending")
        journalImageBytes = record.entries.find(
          ([name]: [string, string]) => name === "titelblatt:v3",
        )[1].length;
      return put.call(this, record, key);
    };
    let error = "";
    try {
      const path = "/src/lib/dossier-import.ts";
      await (await import(path)).importDossierProjectSafely(value, { replace: true });
    } catch (failure) {
      error = String(failure);
    } finally {
      Storage.prototype.setItem = original;
      IDBObjectStore.prototype.put = put;
    }
    return { before, after: { ...localStorage }, journalImageBytes, error };
  }, project);
  expect(result.error).toContain("large photo rollback");
  expect(result.journalImageBytes).toBeGreaterThan(2 * 1024 * 1024);
  expect(result.after).toEqual(result.before);
});

test("failed rollback keeps the backup and blocks editors until recovery succeeds", async ({
  page,
}) => {
  await boot(page);
  await seed(page);
  const result = await page.evaluate(async (value) => {
    const before = { ...localStorage };
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, data) {
      if (
        key === "lebenslauf:v1" ||
        (key === "titelblatt:v3" && JSON.parse(data).data?.vorname === "Bisherige")
      ) {
        throw new DOMException("persistent quota failure", "QuotaExceededError");
      }
      return original.call(this, key, data);
    };
    const path = "/src/lib/dossier-import.ts";
    const api = await import(path);
    let error = "";
    try {
      await api.importDossierProjectSafely(value, { replace: true });
    } catch (failure) {
      error = String(failure);
    } finally {
      Storage.prototype.setItem = original;
    }
    return {
      before,
      error,
      status: api.getDossierImportStatus(),
      marker: localStorage.getItem("cv-cover-charm:import-journal:v1"),
    };
  }, project);
  expect(result.status.phase).toBe("blocked");
  expect(result.marker).not.toBeNull();
  await expect(
    page.getByRole("button", { name: "Wiederherstellung erneut versuchen" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Wiederherstellung erneut versuchen" }).click();
  await expect(page.getByRole("button", { name: "Dossier laden", exact: true })).toBeVisible();
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(result.before);
});

for (const [route, part, expectedName] of [
  ["titelblatt", "cover", "LegacyCover"],
  ["lebenslauf", "cv", "LegacyCV"],
] as const) {
  test(`legacy ${part} loads through the real file input, persists immediately and survives reload`, async ({
    page,
  }) => {
    await boot(page);
    await seed(page);
    await page.goto(`${BASE}/${route}`);
    await page.getByRole("button", { name: "Menü", exact: true }).click();
    const input = page.locator('input[type="file"][accept*="json"]').first();
    await expect(input).toBeAttached({ timeout: 60_000 });
    const saved =
      part === "cover"
        ? {
            ...project.cover,
            data: { ...project.cover.data, vorname: expectedName },
            font: "freundlich",
            customs: [{ id: "custom-legacy", label: "Legacy", text: "Legacy-Text" }],
            layout: { "custom-legacy": { x: 37.5, y: 103, w: 42 } },
          }
        : {
            ...project.cv,
            data: {
              ...project.cv.data,
              person: { ...project.cv.data.person, vorname: expectedName },
            },
            design: { ...project.cv.design, font: "freundlich" },
          };
    const reloaded = page.waitForEvent("domcontentloaded");
    await input.setInputFiles({
      name: `legacy-${part}.json`,
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(saved)),
    });
    await reloaded;
    const key = part === "cover" ? "titelblatt:v3" : "lebenslauf:v1";
    await expect
      .poll(() =>
        page.evaluate(
          ({ key, part }) => {
            const stored = JSON.parse(localStorage.getItem(key)!);
            return part === "cover" ? stored.data.vorname : stored.data.person.vorname;
          },
          { key, part },
        ),
      )
      .toBe(expectedName);
    const content = await page.evaluate(
      ({ key, part }) => {
        const stored = JSON.parse(localStorage.getItem(key)!);
        return {
          photo: part === "cover" ? stored.data.foto : stored.data.person.foto,
          font: part === "cover" ? stored.font : stored.design.font,
        };
      },
      { key, part },
    );
    expect(content.photo).toBe(photo);
    expect(content.font).toBe("freundlich");
    if (part === "cover") {
      const element = page
        .locator('[data-dossier-document="cover"] [data-block-id="custom-legacy"]')
        .first();
      await expect(element).toBeVisible();
      expect(await element.evaluate((node) => node.style.left)).toBe("37.5mm");
    }
    await page.reload();
    await expect(page.getByRole("button", { name: "Menü", exact: true })).toBeVisible();
    expect(
      await page.evaluate(
        ({ key, part }) => {
          const stored = JSON.parse(localStorage.getItem(key)!);
          return part === "cover" ? stored.data.vorname : stored.data.person.vorname;
        },
        { key, part },
      ),
    ).toBe(expectedName);
  });
}

for (const [route, part, foreignFile, malformedFile] of [
  [
    "titelblatt",
    "cover",
    project.cv,
    { ...project.cover, data: { ...project.cover.data, beilagen: "kaputt" } },
  ],
  ["lebenslauf", "cv", project.cover, { ...project.cv, data: { ...project.cv.data, person: [] } }],
] as const) {
  test(`legacy ${part} rejects the wrong editor file and malformed data without a backup`, async ({
    page,
  }) => {
    const letter = JSON.stringify({
      ...JSON.parse(oldEntries["anschreiben:v1"]),
      design: { template: "brief", font: "freundlich" },
    });
    await boot(page);
    await seed(page, { ...oldEntries, "anschreiben:v1": letter });
    for (const [name, contents] of [
      ["wrong-editor.json", foreignFile],
      ["malformed.json", malformedFile],
    ] as const) {
      await page.goto(`${BASE}/${route}`);
      await page.getByRole("button", { name: "Menü", exact: true }).click();
      const fileInput = page.locator('input[type="file"][accept*="json"]').first();
      await expect(fileInput).toBeAttached();
      await fileInput.setInputFiles({
        name,
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(contents)),
      });
      await expect(
        page.getByRole("banner").getByText(/Datei konnte nicht sicher geladen werden/),
      ).toBeVisible();
      const storage = await page.evaluate(async () => ({
        cover: JSON.parse(localStorage.getItem("titelblatt:v3")!).data.vorname,
        cv: JSON.parse(localStorage.getItem("lebenslauf:v1")!).data.person.vorname,
        letter: localStorage.getItem("anschreiben:v1"),
        journal: localStorage.getItem("cv-cover-charm:import-journal:v1"),
        databases: (await indexedDB.databases()).map(({ name }) => name),
      }));
      expect(storage).toEqual({
        cover: "Bisherige",
        cv: "Bisherige",
        letter,
        journal: null,
        databases: [],
      });
    }
  });
}

test("home file input uses full replacement and removes absent documents", async ({ page }) => {
  await boot(page);
  await seed(page);
  page.on("dialog", (dialog) => dialog.accept());
  const reloaded = page.waitForEvent("domcontentloaded");
  await page.locator('input[type="file"][accept*="json"]').setInputFiles({
    name: "cover-only.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ ...project, letter: undefined, cv: undefined })),
  });
  await reloaded;
  await expect(page.getByRole("button", { name: "Dossier laden", exact: true })).toBeVisible();
  const stored = await page.evaluate(() => ({ ...localStorage }));
  expect(stored["lebenslauf:v1"]).toBeUndefined();
  expect(stored["anschreiben:v1"]).toBeUndefined();
  expect(JSON.parse(stored["titelblatt:v3"]).data.foto).toBe(photo);
});

for (const [route, part] of [
  ["titelblatt", "cover"],
  ["lebenslauf", "cv"],
  ["anschreiben", "letter"],
] as const) {
  test(`${route} project input preserves absent neighbours and reloads imported data`, async ({
    page,
  }) => {
    await boot(page);
    await seed(page);
    await page.goto(`${BASE}/${route}`);
    await page.getByRole("button", { name: "Menü", exact: true }).click();
    const reloaded = page.waitForEvent("domcontentloaded");
    await page
      .locator('input[type="file"][accept*="json"]')
      .first()
      .setInputFiles({
        name: "partial-project.json",
        mimeType: "application/json",
        buffer: Buffer.from(
          JSON.stringify({
            kind: project.kind,
            version: project.version,
            savedAt: project.savedAt,
            [part]: project[part],
          }),
        ),
      });
    await reloaded;
    await expect(page.getByRole("button", { name: "Menü", exact: true })).toBeVisible();
    const parts = await page.evaluate(() => ({
      cover: JSON.parse(localStorage.getItem("titelblatt:v3")!),
      cv: JSON.parse(localStorage.getItem("lebenslauf:v1")!),
      letter: JSON.parse(localStorage.getItem("anschreiben:v1")!),
      marker: localStorage.getItem("cv-cover-charm:import-journal:v1"),
    }));
    expect(parts.cover.data.vorname).toBe(part === "cover" ? "Neue" : "Bisherige");
    expect(parts.cv.data.person.vorname).toBe(part === "cv" ? "Neue" : "Bisherige");
    expect(parts.letter.data.absenderName).toBe(
      part === "letter" ? "Neue Person" : "Bisherige Person",
    );
    expect(parts.cover.data.foto).toBe(photo);
    expect(parts.cv.data.person.foto).toBe(photo);
    expect(parts.letter.data.images[0].src).toBe(photo);
    expect(parts.marker).toBeNull();
  });
}

test("another tab holding the import lock delays mutation until the lock is released", async ({
  page,
  context,
}) => {
  await boot(page);
  await seed(page);
  await page.evaluate(() => {
    const state = window as unknown as { releaseImportLock: () => void };
    void navigator.locks.request(
      "cv-cover-charm-dossier-import",
      () =>
        new Promise<void>((resolve) => {
          state.releaseImportLock = resolve;
        }),
    );
  });
  await expect
    .poll(() =>
      page.evaluate(async () =>
        (await navigator.locks.query()).held?.some(
          (lock) => lock.name === "cv-cover-charm-dossier-import",
        ),
      ),
    )
    .toBe(true);
  const other = await context.newPage();
  await boot(other);
  const imported = other.evaluate(async (value) => {
    const path = "/src/lib/dossier-import.ts";
    const api = await import(path);
    await api.importDossierProjectSafely(value, { replace: true });
    return api.getDossierImportStatus().phase;
  }, project);
  await expect
    .poll(() =>
      page.evaluate(
        async () =>
          (await navigator.locks.query()).pending?.filter(
            (lock) => lock.name === "cv-cover-charm-dossier-import",
          ).length,
      ),
    )
    .toBe(1);
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("titelblatt:v3")!).data.vorname),
  ).toBe("Bisherige");
  await page.evaluate(() =>
    (window as unknown as { releaseImportLock: () => void }).releaseImportLock(),
  );
  expect(await imported).toBe("reload");
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("titelblatt:v3")!).data.vorname),
  ).toBe("Neue");
});

test("rollback restores cached photo, placement, typography and chrome as well as raw storage", async ({
  page,
}) => {
  await boot(page);
  await seed(page, {
    ...oldEntries,
    "lebenslauf:photo:v2": '{"zoom":1.2}',
    "lebenslauf:text-align:v1": "left",
    "bewerbungsdossier:page-margins:v1": '{"letter":{"top":24,"right":22,"bottom":24,"left":22}}',
  });
  const result = await page.evaluate(async (value) => {
    const paths = [
      "/src/lib/dossier-chrome.ts",
      "/src/components/cv/photo.ts",
      "/src/components/cv/photo-place.ts",
      "/src/components/cv/placement.ts",
      "/src/components/cv/text-alignment.ts",
      "/src/lib/dossier-page-margins.ts",
    ];
    const [chrome, photo, place, placements, align, margins] = await Promise.all(
      paths.map((path) => import(path)),
    );
    const read = () =>
      JSON.parse(
        JSON.stringify({
          chrome: chrome.getDossierChromeState(),
          photo: photo.getCvPhotoStyle(),
          place: place.getCvPhotoPlacement(),
          placements: placements.getCvPlacements(),
          align: align.getCvTextAlignment(),
          margins: margins.getDossierPageMarginsState(),
        }),
      );
    const before = read(),
      rawBefore = { ...localStorage };
    const original = Storage.prototype.setItem;
    let fired = false;
    Storage.prototype.setItem = function (key, data) {
      if (!fired && key === "bewerbungsdossier:hyphenation:v1") {
        fired = true;
        throw new DOMException("late failure after cache changes", "QuotaExceededError");
      }
      return original.call(this, key, data);
    };
    let error = "";
    try {
      const path = "/src/lib/dossier-import.ts";
      await (
        await import(path)
      ).importDossierProjectSafely(
        {
          ...value,
          cv: {
            ...value.cv,
            portableState: {
              ...value.cv.portableState,
              photoStyle: { zoom: 2, shape: "circle" },
              photoPlacement: { mode: "frei", xMm: 120 },
              placements: { schule: "main" },
            },
          },
        },
        { replace: true },
      );
    } catch (failure) {
      error = String(failure);
    } finally {
      Storage.prototype.setItem = original;
    }
    return { before, after: read(), rawBefore, rawAfter: { ...localStorage }, error, fired };
  }, project);
  expect(result.fired).toBe(true);
  expect(result.error).toContain("late failure");
  expect(result.rawAfter).toEqual(result.rawBefore);
  expect(result.after).toEqual(result.before);
});
