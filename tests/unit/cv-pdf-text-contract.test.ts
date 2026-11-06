import { expect, test } from "bun:test";
import { DEMO_CV } from "../../src/components/cv/types";
import { cvBodyData } from "../../src/lib/dossier-body-contact";
import { cvPdfTextContract, readCvPdfTextContract } from "../../src/lib/cv-pdf-text-contract";
import { DEFAULT_DOSSIER_CHROME_OPTIONS } from "../../src/lib/dossier-chrome";

const read = (data = structuredClone(DEMO_CV), showDocumentTitle = true) =>
  readCvPdfTextContract(cvPdfTextContract(data, { showDocumentTitle }))!;

test("CV contract retains source fields, stable line IDs and split descriptions without mutating data", () => {
  const data = structuredClone(DEMO_CV);
  data.lineIds = { hobbys: ["empty", "saved"] };
  data.hobbys = ["  ", " Musik und Sport "];
  data.erfahrung[0].beschreibung = "Anfang\n" + "mehrseitiger Text ".repeat(60) + "Ende";
  const before = JSON.stringify(data);
  const fields = read(data);
  expect(fields.find((f) => f.id === "cv.person.name")?.text).toBe(
    [data.person.vorname, data.person.nachname].filter(Boolean).join("").replace(/\s+/g, ""),
  );
  expect(fields.find((f) => f.id === "cv.entry.hobbys:saved")?.text).toBe("MusikundSport");
  expect(fields.some((f) => f.id === "cv.entry.hobbys:empty")).toBe(false);
  expect(
    fields.find((f) => f.id === `cv.entry.erfahrung:${data.erfahrung[0].id}.description`),
  ).toEqual({
    id: `cv.entry.erfahrung:${data.erfahrung[0].id}.description`,
    text: data.erfahrung[0].beschreibung.replace(/\s+/g, ""),
    split: true,
  });
  expect(new Set(fields.map((f) => f.id)).size).toBe(fields.length);
  expect(JSON.stringify(data)).toBe(before);
});

test("explicitly hidden sections, hidden document title and header-owned body contact need no body copy", () => {
  const data = structuredClone(DEMO_CV);
  data.hidden = { erfahrung: true, sprachen: true, referenzen: true };
  const body = cvBodyData(data, {
    ...DEFAULT_DOSSIER_CHROME_OPTIONS,
    headerMode: "contact",
    headerShowAddress: true,
    headerShowPhone: true,
    headerShowEmail: true,
  });
  const fields = read(body, false);
  for (const prefix of [
    "cv.entry.erfahrung:",
    "cv.entry.sprachen:",
    "cv.entry.referenzen:",
    "cv.section.erfahrung.",
  ])
    expect(fields.some((f) => f.id.startsWith(prefix))).toBe(false);
  for (const id of [
    "cv.documentTitle",
    "cv.person.address",
    "cv.person.place",
    "cv.person.phone",
    "cv.person.email",
  ])
    expect(fields.some((f) => f.id === id)).toBe(false);
  expect(fields.some((f) => f.id === "cv.person.name")).toBe(true);
});

test("family omits its legacy date, while custom entries and explicit reference suffixes remain required", () => {
  const data = structuredClone(DEMO_CV);
  data.customSections = [
    {
      id: "family",
      title: "Familie",
      preset: "familie",
      entries: [
        {
          id: "parent",
          zeit: "not printed",
          titel: "Vater",
          ort: "Markus",
          beschreibung: "Lehrer",
        },
      ],
    },
    {
      id: "project",
      title: "Mein Projekt",
      entries: [
        { id: "app", zeit: "2026", titel: "App", ort: "Bern", beschreibung: "Entwicklung" },
      ],
    },
  ];
  data.referenzen = [
    {
      id: "ref",
      name: "Ada",
      funktion: "Leitung",
      kontakt: "031 123\nada@example.ch\nNach Absprache",
      email: "ada@example.ch",
      zusatz: "Nach Absprache",
    },
  ];
  const fields = read(data);
  expect(fields.some((f) => f.id === "cv.entry.custom:family:parent.date")).toBe(false);
  expect(fields.find((f) => f.id === "cv.entry.custom:family:parent.title")?.text).toBe("Vater:");
  data.customSections[0].rowLayout = { showColons: false };
  expect(read(data).find((f) => f.id === "cv.entry.custom:family:parent.title")?.text).toBe(
    "Vater",
  );
  expect(fields.find((f) => f.id === "cv.entry.custom:project:app.date")?.text).toBe("2026");
  expect(fields.find((f) => f.id === "cv.entry.referenzen:ref.contact")?.text).toBe("031123");
  expect(fields.find((f) => f.id === "cv.entry.referenzen:ref.email")?.text).toBe("ada@example.ch");
  expect(fields.find((f) => f.id === "cv.entry.referenzen:ref.extra")?.text).toBe("NachAbsprache");
});

test("missing, malformed, duplicate and unsupported CV contracts fail closed", () => {
  for (const value of [
    undefined,
    "",
    "{",
    "null",
    "[]",
    '{"version":2,"fields":[]}',
    '{"version":1}',
    '{"version":1,"fields":[null]}',
    '{"version":1,"fields":[{"id":"name","text":7}]}',
    '{"version":1,"fields":[{"id":"","text":"name"}]}',
    '{"version":1,"fields":[{"id":"name","text":""}]}',
    '{"version":1,"fields":[{"id":"name","text":"Ada","split":false}]}',
    '{"version":1,"fields":[{"id":"name","text":"Ada"},{"id":"name","text":"Ada"}]}',
  ])
    expect(readCvPdfTextContract(value)).toBeNull();
  expect(readCvPdfTextContract('{"version":1,"fields":[]}')).toEqual([]);
});
