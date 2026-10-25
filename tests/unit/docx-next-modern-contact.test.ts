import { expect, test } from "bun:test";
import snapshot from "../fixtures/docx-next/modern-app-snapshot.json";
import metrics from "../fixtures/docx-next/modern-app-metrics.json";
import type { DossierAppSnapshot } from "../../src/lib/docx-next/source";
import type { CoverTextMetrics } from "../../src/components/cover/text-metrics";
import { coverTextPresentation, coverTextRole } from "../../src/components/cover/presentation";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { walkBlocks } from "../../src/lib/docx-next/model";
import { paintPng } from "../../src/lib/docx-next/artwork";
import { validateBriefIntegrationModel } from "../../src/lib/brief-docx-next-export";
import { briefFixture } from "../fixtures/docx-next/brief";
import type { CvPersonalHeaderMetrics } from "../../src/lib/docx-next/interior-metrics";
import { captureCvPersonalHeaderMetrics } from "../../src/lib/docx-next-cv-personal-metrics.browser";

const input = () => structuredClone(snapshot) as unknown as DossierAppSnapshot;
const opts = () => ({
  coverComposition: "authored-frames" as const,
  coverTextMetrics: structuredClone(metrics) as CoverTextMetrics,
  cvContactComposition: "compact-grid" as const,
});
const contact = (model: ReturnType<typeof buildDossierDocModel>) =>
  walkBlocks(model.cv.blocks).find((b) => b.kind === "table" && b.id === "cv.person.contact")!;
const rasterizeDecoration = async () => ({
  bytes: paintPng({ color: "F44664" }),
  widthPx: 1,
  heightPx: 1,
  extension: "png" as const,
  contentType: "image/png",
});

const measuredContact = (source: DossierAppSnapshot): CvPersonalHeaderMetrics => ({
  version: 1,
  sourceKey: JSON.stringify(source),
  profile: "brief-sans-v1; test-packet",
  valueOffsetMm: 29.5,
  personalGapMm: 1.35,
  contactTopGapMm: 2.5,
  paragraphs: Object.fromEntries(
    ["address", "place", "phone", "email", "geburtsdatum", "geburtsdatum.label"].map((key) => [
      `cv.person.${key}`,
      {
        style: {
          font: "Arial",
          sizePt: 11,
          color: "111111",
          bold: false,
          italic: false,
          underline: false,
        },
        lineHeightPt: 15,
        afterMm: 0,
      },
    ]),
  ),
});

test("personal-header measurement never mounts the frozen Sidebar or unsupported authored header compositions", async () => {
  for (const kind of ["sidebar", "moved", "photo", "elements"] as const) {
    const source = briefFixture();
    source.cv.design.font = "sans";
    if (kind === "sidebar") source.settings.cvLayout = "sidebar";
    if (kind === "moved") source.cv.data.sectionLayouts.person = { page: 2 };
    if (kind === "photo") source.cv.data.person.foto = "pixels";
    if (kind === "elements") source.cv.design.useElements = true;
    // No browser globals exist in this unit process; touching the DOM would fail.
    expect(
      await captureCvPersonalHeaderMetrics(source, "brief-sans-v1; test-packet"),
    ).toBeUndefined();
  }
});

test("fresh Web contact geometry removes the invented rubric and extra row gaps without changing adjacent documents", () => {
  const source = briefFixture();
  const before = JSON.stringify(source);
  const ordinary = buildDossierDocModel(source, { cvContactComposition: "compact-grid" });
  const model = buildDossierDocModel(source, {
    cvContactComposition: "compact-grid",
    cvPersonalHeaderMetrics: measuredContact(source),
  });
  expect(JSON.stringify(source)).toBe(before);
  expect(model.cover).toEqual(ordinary.cover);
  expect(model.letter).toEqual(ordinary.letter);
  const table = contact(model);
  if (table.kind !== "table") throw Error("missing native contact table");
  expect(table.columnWidthsMm).toEqual([29.5, null]);
  expect(table.decoration?.paddingXMm).toBe(0);
  const blocks = walkBlocks(model.cv.blocks);
  expect(blocks.some((b) => b.id === "cv.section.person.heading")).toBe(false);
  const phone = blocks.find((b) => b.id === "cv.person.phone");
  const birthday = blocks.find((b) => b.id === "cv.person.geburtsdatum");
  if (phone?.kind !== "paragraph" || birthday?.kind !== "paragraph")
    throw Error("missing contact text");
  expect(phone.afterMm).toBe(0);
  expect(birthday.beforeMm).toBe(1.35);
  expect(birthday.minimumLineHeightPt).toBe(15);
  expect(birthday.runs[0].style.sizePt).toBe(11);
  expect(blocks.find((b) => b.id === "cv.person.name")).toMatchObject({ afterMm: 2.5 });
  expect(
    ordinary.cv.blocks.filter(
      (b) => !["cv.person.name", "cv.person.subtitle", "cv.section.person"].includes(b.id),
    ),
  ).toEqual(
    model.cv.blocks.filter(
      (b) => !["cv.person.name", "cv.person.subtitle", "cv.section.person"].includes(b.id),
    ),
  );
});

test("authored rubric indents cannot shift the shared personal header or shrink its measured grid", () => {
  for (const source of [briefFixture(), input()]) {
    source.cv.design.sectionContentIndentMm = 6;
    source.cv.design.sectionTitleOffsetMm = 4;
    const before = JSON.stringify(source);
    const legacy = buildDossierDocModel(source);
    const model = buildDossierDocModel(source, {
      cvContactComposition: "compact-grid",
      cvPersonalHeaderMetrics: measuredContact(source),
    });
    expect(JSON.stringify(source)).toBe(before);
    expect(model.cover).toEqual(legacy.cover);
    expect(model.letter).toEqual(legacy.letter);
    expect(model.cv.page).toEqual(legacy.cv.page);
    const person = model.cv.blocks.find((b) => b.id === "cv.section.person");
    const school = model.cv.blocks.find((b) => b.id === "cv.section.schule");
    expect(person?.kind === "section" && person.contentIndentMm).toBe(0);
    expect(school?.kind === "section" && school.contentIndentMm).toBe(6);
    const table = contact(model);
    expect(table.kind === "table" && table.widthMm).toBe(
      model.cv.page.widthMm - model.cv.page.margins.left - model.cv.page.margins.right,
    );
    // Ordinary export and its established layout policy are unchanged.
    const oldPerson = legacy.cv.blocks.find((b) => b.id === "cv.section.person");
    expect(oldPerson?.kind === "section" && oldPerson.contentIndentMm).toBe(6);
  }
});

test("contact measurements cannot be reused after source edits or bypass supported font/layout guards", () => {
  const source = briefFixture();
  const measurement = measuredContact(source);
  source.cv.data.person.adresse += " changed";
  expect(() =>
    buildDossierDocModel(source, {
      cvContactComposition: "compact-grid",
      cvPersonalHeaderMetrics: measurement,
    }),
  ).toThrow("veraltet");
  const valid = measuredContact(source);
  expect(() => buildDossierDocModel(source, { cvPersonalHeaderMetrics: valid })).toThrow(
    "Messwerte",
  );
  for (const patch of [{ valueOffsetMm: NaN }, { valueOffsetMm: -1 }, { profile: "unverified" }])
    expect(() =>
      buildDossierDocModel(source, {
        cvContactComposition: "compact-grid",
        cvPersonalHeaderMetrics: { ...valid, ...patch },
      }),
    ).toThrow("Messwerte");
});

test("Brief contact values and birthday occupy the same editable native table column", async () => {
  const source = briefFixture();
  source.settings.cvLayout = "classic";
  const model = buildDossierDocModel(source, { cvContactComposition: "compact-grid" });
  validateBriefIntegrationModel(model);
  const entries = readZipEntries(
    new Uint8Array(
      await (
        await renderDossierDocx(model, {
          rasterizeDecoration,
        })
      ).arrayBuffer(),
    ),
  );
  const xml = new TextDecoder().decode(entries.find((e) => e.name === "word/document.xml")!.bytes);
  const table = xml
    .match(/<w:tbl>.*?<\/w:tbl>/g)!
    .find((t) => t.includes('w:val="cv.person.contact"'))!;
  const rows = table.match(/<w:tr>.*?<\/w:tr>/g)!;
  for (const field of ["place", "email", "geburtsdatum"]) {
    const row = rows.find((r) => r.includes(`w:val="cv.person.${field}"`))!;
    expect(row).toBeDefined();
    const cells = row.match(/<w:tc>.*?<\/w:tc>/g)!;
    expect(cells).toHaveLength(2);
    expect(cells[1]).toContain(`w:val="cv.person.${field}"`);
  }
  expect(xml).not.toContain('w:val="cv.person.details"');
  expect(xml).not.toContain("w:tblpPr");
});

test("only the explicit candidate combines contact and personal details into one native grid", () => {
  const source = input();
  const before = JSON.stringify(source);
  const ordinary = buildDossierDocModel(source);
  const model = buildDossierDocModel(source, { cvContactComposition: "compact-grid" });
  expect(JSON.stringify(source)).toBe(before);
  expect(model.cover).toEqual(ordinary.cover);
  expect(model.letter).toEqual(ordinary.letter);
  expect(model.cv.page).toEqual(ordinary.cv.page);
  const other = (blocks: typeof model.cv.blocks) =>
    blocks.filter((b) => b.id !== "cv.section.person");
  expect(other(model.cv.blocks)).toEqual(other(ordinary.cv.blocks));
  const table = contact(model);
  expect(table.kind).toBe("table");
  if (table.kind !== "table") throw Error("missing contact table");
  expect(table.widthMm).toBeLessThan(110);
  expect(table.widthMm).toBeGreaterThan(60);
  expect(table.rows).toHaveLength(3);
  expect(walkBlocks(model.cv.blocks).some((b) => b.id === "cv.person.details")).toBe(false);
  expect(contact(ordinary)).not.toHaveProperty("widthMm");
});

test("all saved personal fields and one-sided contact rows retain semantic text and colon settings", () => {
  const source = input();
  Object.assign(source.cv.data.person, {
    adresse: "",
    plzOrt: "9999 Testort mit langem Namen",
    geburtsort: "Solothurn",
    heimatort: "Olten",
    nationalitaet: "Schweiz",
  });
  source.cv.design.personalInfoColons = false;
  source.cv.design.bodyScale = 1.15;
  const table = contact(buildDossierDocModel(source, opts()));
  if (table.kind !== "table") throw Error("missing contact table");
  expect(table.rows).toHaveLength(6);
  expect(table.rows[0].cells[0][0].id).toBe("cv.person.place");
  expect(table.rows[0].cells[1]).toEqual([]);
  const paras = walkBlocks([table]).filter((b) => b.kind === "paragraph");
  for (const field of [
    "place",
    "phone",
    "email",
    "geburtsdatum",
    "geburtsort",
    "heimatort",
    "nationalitaet",
  ])
    expect(paras.filter((p) => p.id === `cv.person.${field}`)).toHaveLength(1);
  for (const p of paras) {
    if (p.id.endsWith(".label")) expect(p.runs.map((r) => r.text).join("")).not.toEndWith(":");
    expect(p.runs[0].style.sizePt).toBeCloseTo(10.5 * 1.15, 5);
  }
});

test("unaligned saved contact design remains flowing and empty optional fields stay absent", () => {
  const source = input();
  source.cv.design.personalInfoAligned = false;
  expect(buildDossierDocModel(source, opts()).cv).toEqual(
    buildDossierDocModel(source, {
      coverComposition: "authored-frames",
      coverTextMetrics: opts().coverTextMetrics,
    }).cv,
  );
  for (const key of [
    "adresse",
    "plzOrt",
    "telefon",
    "email",
    "geburtsdatum",
    "geburtsort",
    "heimatort",
    "nationalitaet",
  ] as const)
    source.cv.data.person[key] = "";
  source.cv.design.personalInfoAligned = true;
  expect(
    walkBlocks(buildDossierDocModel(source, opts()).cv.blocks).some(
      (b) => b.id === "cv.person.contact",
    ),
  ).toBe(false);
});

test("the compact contact grid uses existing fixed native tables and keeps all editable fields", async () => {
  const model = buildDossierDocModel(input(), { cvContactComposition: "compact-grid" });
  const entries = readZipEntries(
    new Uint8Array(
      await (
        await renderDossierDocx(model, {
          rasterizeDecoration,
        })
      ).arrayBuffer(),
    ),
  );
  const xml = new TextDecoder().decode(entries.find((e) => e.name === "word/document.xml")!.bytes);
  const tables = xml.match(/<w:tbl>.*?<\/w:tbl>/g)!;
  const table = tables.find((t) => t.includes('w:val="cv.person.contact"'))!;
  expect(table).toContain('<w:tblLayout w:type="fixed"/>');
  expect(table).not.toContain('w:hRule="exact"');
  for (const field of ["address", "place", "phone", "email", "geburtsdatum"])
    expect(table).toContain(`w:val="${field.startsWith("cv.") ? field : "cv.person." + field}"`);
});

test("compact contact requires a classic CV and preserves field-level typography", () => {
  const source = input();
  source.settings.cvLayout = "timeline";
  expect(() => buildDossierDocModel(source, opts())).toThrow("classic CV candidate");
  source.settings.cvLayout = "classic";
  source.settings.fieldStyles = { "cv.person.address": { sizePt: 18, bold: true } };
  const model = buildDossierDocModel(source, opts());
  validateBriefIntegrationModel(model, "modern");
  const field = walkBlocks(model.cv.blocks).find((b) => b.id === "cv.person.address");
  if (field?.kind !== "paragraph") throw Error("missing semantic field");
  expect(field.runs[0].style.sizePt).toBe(18);
  expect(field.runs[0].style.bold).toBe(true);
});

test("Modern badge uses the same default accent alpha as labels and retains authored overrides", () => {
  const source = input();
  const badge = source.cover.blocks.find((b) => b.id === "lehrbeginn")!;
  expect(coverTextRole(badge, "modern")).toBe("badge");
  expect(coverTextRole(badge, "brief")).toBe("muted");
  const v = coverTextPresentation(badge, "modern", source.cover.colors);
  expect(v.style.opacity * v.paintOpacity).toBe(0.96);
  const label = source.cover.blocks.find((b) => b.id === "kontaktTitel")!;
  expect(v.paintOpacity).toBe(
    coverTextPresentation(label, "modern", source.cover.colors).paintOpacity,
  );
  const authored = {
    ...badge,
    style: { ...badge.style, opacity: 0.35 },
    userStyleKeys: ["opacity" as const],
  };
  const override = coverTextPresentation(authored, "modern", source.cover.colors);
  expect(override.style.opacity * override.paintOpacity).toBe(0.35);
  const model = buildDossierDocModel(source, opts());
  const paint = model.cover.headerShapes!.find((b) => b.id.endsWith(".badge-paint"))!;
  expect(paint.opacity).toBe(1);
  expect(paint.fill?.color).toBe("F44664");
});

test("compact contact retains the full header width despite rubric indentation and rejects half-width contact blocks", () => {
  const source = input();
  source.cv.design.sectionContentIndentMm = 12;
  source.cv.data.person.adresse = "A long address ".repeat(12);
  source.cv.data.person.email = "long.email.address.".repeat(8) + "@example.ch";
  const model = buildDossierDocModel(source, opts());
  const table = contact(model);
  if (table.kind !== "table") throw Error("missing table");
  expect(table.widthMm).toBeCloseTo(
    model.cv.page.widthMm - model.cv.page.margins.left - model.cv.page.margins.right,
    6,
  );
  source.cv.data.sectionLayouts.person = { width: "half" };
  expect(() => buildDossierDocModel(source, opts())).toThrow("ganze Breite");
});
