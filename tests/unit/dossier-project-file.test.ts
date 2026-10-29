import { afterEach, describe, expect, test } from "bun:test";
import {
  dossierProjectFileName,
  parseDossierProjectText,
  parseLegacyDossierPart,
  serializeDossierProject,
} from "../../src/lib/dossier-project-file";
import {
  COVER_STORAGE_KEY,
  CV_STORAGE_KEY,
  LETTER_STORAGE_KEY,
  replaceDossierProject,
  type DossierProject,
} from "../../src/lib/dossier-project";

const originalWindow = globalThis.window;

function installStorage(entries: Record<string, string>) {
  const storage = new Map(Object.entries(entries));
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
      dispatchEvent: () => true,
      addEventListener: () => {},
      removeEventListener: () => {},
    },
  });
  return storage;
}

afterEach(() => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: originalWindow,
  });
});

const project: DossierProject = {
  kind: "cv-cover-charm-dossier",
  version: 1,
  savedAt: "2026-09-13T17:00:00.000Z",
  cover: {
    version: 3,
    data: { vorname: "Léa", nachname: "Müller", beruf: "Informatikerin EFZ" },
  },
  cv: {
    version: 6,
    data: { person: { vorname: "Léa", nachname: "Müller" }, titel: "Lebenslauf" },
  },
};

describe("dossier JSON project files", () => {
  test("serializes, parses and derives a safe filename", () => {
    const text = serializeDossierProject(project);
    const parsed = parseDossierProjectText(text);

    expect(text.endsWith("\n")).toBe(true);
    expect(parsed?.cover?.data).toEqual(project.cover?.data);
    expect(parsed?.cv?.data).toEqual(project.cv?.data);
    expect(dossierProjectFileName(project)).toBe("Bewerbungsdossier-LeaMueller.json");
  });

  test("rejects malformed or unrelated JSON before changing browser state", () => {
    expect(parseDossierProjectText("{ nope")).toBeNull();
    expect(parseDossierProjectText(JSON.stringify({ hello: "world" }))).toBeNull();
  });

  test("a malformed supplied document cannot silently become a destructive partial project", () => {
    for (const part of ["cover", "letter", "cv"]) {
      for (const bad of [null, [], { data: [] }, { version: 6 }, { data: "not data" }]) {
        expect(parseDossierProjectText(JSON.stringify({ ...project, [part]: bad }))).toBeNull();
      }
    }
    for (const bad of [
      { ...project, cover: { data: { vorname: 42 } } },
      { ...project, cv: { data: { person: [], schule: [] } } },
      { ...project, cv: { data: { schule: "bad" } } },
      { ...project, cv: { data: { hobbys: [{}] } } },
      { ...project, letter: { data: { text: {} } } },
      { ...project, letter: { data: { images: [{ src: {} }] } } },
    ])
      expect(parseDossierProjectText(JSON.stringify(bad))).toBeNull();
  });

  test("legacy editor files need record data and cannot disguise foreign project formats", () => {
    expect(parseLegacyDossierPart({ data: { vorname: "Lea" } })).toEqual({
      data: { vorname: "Lea" },
    });
    for (const bad of [
      [],
      null,
      { data: [] },
      { kind: "future", data: {} },
      { kind: "cv-cover-charm-dossier", version: 99, data: {} },
    ]) {
      expect(parseLegacyDossierPart(bad)).toBeNull();
    }
  });

  test("full replacement migrates legacy letter chrome while explicit project chrome wins", () => {
    const storage = installStorage({});
    const legacy: DossierProject = {
      ...project,
      letter: {
        data: {},
        design: {
          template: "brief",
          headerMode: "contact",
          footerMode: "attachments",
          headerInlineSeparator: "icons",
        },
      },
    };
    replaceDossierProject(legacy);
    const migrated = JSON.parse(storage.get("bewerbungsdossier:chrome:v1") ?? "null");
    expect(migrated.shared.headerMode).toBe("contact");
    expect(migrated.shared.footerMode).toBe("details");
    expect(migrated.shared.headerInlineSeparator).toBe("dot");
    replaceDossierProject({
      ...legacy,
      chrome: { ...migrated, shared: { ...migrated.shared, headerMode: "none" } },
    });
    expect(JSON.parse(storage.get("bewerbungsdossier:chrome:v1") ?? "null").shared.headerMode).toBe(
      "none",
    );
  });

  test("replace restore removes stale parts and portable CV sidecars", () => {
    const storage = installStorage({
      [COVER_STORAGE_KEY]: JSON.stringify({ data: { vorname: "Alt" } }),
      [LETTER_STORAGE_KEY]: JSON.stringify({ data: { betreff: "Alter Brief" } }),
      [CV_STORAGE_KEY]: JSON.stringify({ data: { titel: "Alter CV" } }),
      "lebenslauf:layout:v1": "timeline",
      "lebenslauf:layout-mirror:v1": "true",
      "lebenslauf:section-gap:v1": "8",
      "lebenslauf:placement:v1": JSON.stringify({ schule: "side" }),
      "lebenslauf:photo:v2": JSON.stringify({ zoom: 1.8 }),
      "lebenslauf:photo-place:v1": JSON.stringify({ mode: "frei", xMm: 120 }),
    });

    const partial: DossierProject = {
      kind: "cv-cover-charm-dossier",
      version: 1,
      savedAt: "2026-09-13T18:00:00.000Z",
      cover: { version: 3, data: { vorname: "Neu", nachname: "Projekt" } },
    };

    expect(replaceDossierProject(partial)).toEqual({ cover: true, letter: false, cv: false });
    expect(JSON.parse(storage.get(COVER_STORAGE_KEY) ?? "null")?.data?.vorname).toBe("Neu");
    expect(storage.has(LETTER_STORAGE_KEY)).toBe(false);
    expect(storage.has(CV_STORAGE_KEY)).toBe(false);

    for (const key of [
      "lebenslauf:layout:v1",
      "lebenslauf:layout-mirror:v1",
      "lebenslauf:section-gap:v1",
      "lebenslauf:placement:v1",
      "lebenslauf:photo:v2",
      "lebenslauf:photo-place:v1",
    ]) {
      expect(storage.has(key)).toBe(false);
    }
  });
});
