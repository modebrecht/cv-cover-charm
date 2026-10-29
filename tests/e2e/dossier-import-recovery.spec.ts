import { expect, test, type Page } from "@playwright/test";

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
