import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

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

test("confirmed project settings survive reload, a real JSON download and reimport", async ({
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
      cv: { headerMode: "none", footerMode: "compact", headerGapMm: 8 },
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
      portableState: {
        ...project.cv.portableState,
        photoStyle: { shape: "portrait", zoom: 1.6, x: 30, y: 70, borderWidth: 0.6 },
        photoPlacement: { mode: "frei", xMm: 150, yMm: 20, widthMm: 32, frameColor: "#123456" },
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
  await page.goto(`${BASE}/lebenslauf`);
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
  expect(stored["unrelated-app"]).toBe("must survive");
});

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
