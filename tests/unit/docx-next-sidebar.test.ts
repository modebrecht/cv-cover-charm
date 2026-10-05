import { expect, test } from "bun:test";
import { SIDEBAR_FIXTURES, sidebarFixture } from "../fixtures/docx-next/sidebar";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { walkBlocks, type ParallelFlowBlock } from "../../src/lib/docx-next/model";
import { readZipEntries } from "../../src/lib/docx-next/zip";

const flow = (kind: Parameters<typeof sidebarFixture>[0] = "left") =>
  buildDossierDocModel(sidebarFixture(kind)).cv.blocks.find(
    (block): block is ParallelFlowBlock => block.kind === "parallel-flow",
  )!;
const ids = (blocks: Parameters<typeof walkBlocks>[0]) =>
  walkBlocks(blocks).map((block) => block.id);

test("Brief sidebar keeps explicit source data deterministic and immutable", () => {
  for (const kind of SIDEBAR_FIXTURES) {
    const input = sidebarFixture(kind),
      before = structuredClone(input);
    const model = buildDossierDocModel(input);
    expect(input).toEqual(before);
    expect(model).toEqual(buildDossierDocModel(JSON.parse(JSON.stringify(input))));
    expect(model.cv.layout.mode).toBe("sidebar");
    expect(model.issues).toEqual([]);
    const semanticIds = ids(model.cv.blocks);
    expect(new Set(semanticIds).size).toBe(semanticIds.length);
  }
});

test("default and custom placements route semantic rubrics into independent tracks", () => {
  const left = flow();
  expect(ids(left.tracks[0].blocks)).toContain("cv.section.person");
  expect(ids(left.tracks[0].blocks)).toContain("cv.section.hobbys");
  expect(ids(left.tracks[1].blocks)).toContain("cv.section.schule");
  expect(ids(left.tracks[1].blocks)).toContain("cv.person.name");
  const placed = flow("placements");
  expect(ids(placed.tracks[0].blocks)).toContain("cv.section.custom:sidebar-custom");
  expect(ids(placed.tracks[0].blocks)).toContain("cv.section.schule");
  expect(ids(placed.tracks[1].blocks)).toContain("cv.section.person");
  expect(ids(placed.tracks[1].blocks)).toContain("cv.section.hobbys");
});

test("mirroring changes physical track order and border, without changing ownership", () => {
  const left = flow(),
    right = flow("right");
  expect(ids(right.tracks[1].blocks)).toEqual(ids(left.tracks[0].blocks));
  expect(ids(right.tracks[0].blocks)).toEqual(ids(left.tracks[1].blocks));
  expect(right.tracks[1].decoration?.border?.side).toBe("left");
  expect(flow("narrow").tracks[0].weight).toBe(0.22);
  expect(flow("wide").tracks[0].weight).toBe(0.42);
  expect(flow("hidden-paint").tracks[0].decoration?.fillColor).toBeUndefined();
});

test("sidebar photographs become native inline pictures in their selected physical track", () => {
  for (const [kind, index] of [
    ["photo-left", 0],
    ["photo-right", 1],
    ["photo-main", 1],
  ] as const) {
    const photo = walkBlocks(flow(kind).tracks[index].blocks).find(
      (block) => block.kind === "image",
    );
    expect(photo?.kind === "image" && photo.placement).toBe("inline");
    expect(photo?.kind === "image" && photo.frame?.zoom).toBe(1.25);
    expect(photo?.kind === "image" && photo.widthMm).toBe(34);
  }
});

test("unsupported free photos, page starts, and widths fail before output", () => {
  const input = sidebarFixture("photo-left");
  input.settings.cvPhotoPlacement!.mode = "frei";
  expect(() => buildDossierDocModel(input)).toThrow("free photo positioning is unsupported");
  input.cv.data.person.foto = null;
  input.cv.data.sectionLayouts = { schule: { page: 2 } };
  expect(() => buildDossierDocModel(input)).toThrow(
    "unsupported parallel-flow content cv.section.schule",
  );
  input.cv.data.sectionLayouts = {};
  input.cv.design.sidebarPct = 0.1;
  expect(() => buildDossierDocModel(input)).toThrow("sidebar fraction");
  input.cv.design.sidebarPct = 0.22;
  input.cv.data.person.foto = "native-photo";
  input.settings.cvPhotoPlacement!.mode = "auto";
  expect(() => buildDossierDocModel(input)).toThrow("photo exceeds its native track");
});

test("running header text explicitly blocks parallel flow after the failed long native pagination probe", async () => {
  for (const kind of ["contact", "chrome-continuation"] as const)
    await expect(renderDossierDocx(buildDossierDocModel(sidebarFixture(kind)))).rejects.toThrow(
      "parallel flow with running headers is unsupported",
    );
  const sameHeader = sidebarFixture("chrome-continuation");
  sameHeader.settings.chrome!.shared.headerDifferentFirstPage = false;
  await expect(renderDossierDocx(buildDossierDocModel(sameHeader))).rejects.toThrow(
    "parallel flow with running headers is unsupported",
  );
});

test("the renderer requires first-class sidebar flow and never accepts a classic substitute", async () => {
  const model = buildDossierDocModel(sidebarFixture());
  const blob = await renderDossierDocx(model);
  const doc = new TextDecoder().decode(
    readZipEntries(new Uint8Array(await blob.arrayBuffer())).find(
      (entry) => entry.name === "word/document.xml",
    )!.bytes,
  );
  expect(doc).toContain('w:tblCaption w:val="cv.sidebar"');
  expect(doc).toContain('w:tag w:val="cv.person.email"');
  expect(doc).not.toContain("<w:txbxContent");
  model.cv.blocks = [];
  await expect(renderDossierDocx(model)).rejects.toThrow("sidebar requires native parallel flow");
});

test("native entry grouping keeps short entries together and oversized descriptions remain splittable", async () => {
  const model = buildDossierDocModel(sidebarFixture("paragraph-long"));
  const entry = walkBlocks(model.cv.blocks).find(
    (block) => block.id === "cv.entry.custom:long-paragraph:long-paragraph-entry",
  );
  expect(entry?.kind === "entry" && entry.keepTogether).toBe(true);
  const blob = await renderDossierDocx(model);
  const doc = new TextDecoder().decode(
    readZipEntries(new Uint8Array(await blob.arrayBuffer())).find(
      (file) => file.name === "word/document.xml",
    )!.bytes,
  );
  expect(doc).toContain("<w:cantSplit/>");
  expect(doc).toContain("Sichtbarer Langtext-Abschluss.");
  expect(doc).not.toContain("<w:trHeight");
});

test("unsupported differing page margins fail explicitly and stored field styles remain native", () => {
  expect(() => buildDossierDocModel(sidebarFixture("continuation"))).toThrow(
    "differing first/continuation top margins are unsupported",
  );
  const equal = sidebarFixture();
  equal.settings.cvContinuationTopMarginMm = 20;
  expect(buildDossierDocModel(equal).cv.layout.pagination?.firstPageLeadMm).toBe(0);
  const name = walkBlocks(flow("styled").tracks[1].blocks).find(
    (block) => block.id === "cv.person.name",
  );
  expect(
    name?.kind === "paragraph" &&
      name.runs.find((run) => run.fieldId === "cv.person.firstName")?.style.color,
  ).toBe("9B2349");
});
