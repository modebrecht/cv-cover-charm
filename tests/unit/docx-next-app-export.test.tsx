import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import fixture from "../fixtures/docx-next/sidebar-contact-chrome-23okt.json";
import { buildAppDocxNextModel } from "../../src/lib/dossier-docx-next-export";
import {
  assertAppDocxNextSource,
  docxDownloadErrorMessage,
  DocxDownloadError,
} from "../../src/lib/docx-next/app-source";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { walkBlocks } from "../../src/lib/docx-next/model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { DossierExportDialog } from "../../src/components/dossier/DossierExportDialog";
import type { DossierAppSnapshot } from "../../src/lib/docx-next/source";
import type { CoverTextMetrics } from "../../src/components/cover/text-metrics";
import type { CvSidebarTextMetrics } from "../../src/lib/docx-next/cv-sidebar-text-metrics";
import type { InteriorTextMetrics } from "../../src/lib/docx-next/interior-metrics";

function setup() {
  return {
    source: structuredClone(fixture.snapshot) as unknown as DossierAppSnapshot,
    measured: {
      cover: structuredClone(fixture.metrics) as CoverTextMetrics,
      sidebar: structuredClone(fixture.sidebarMetrics) as CvSidebarTextMetrics,
      interior: structuredClone(fixture.interiorMetrics) as InteriorTextMetrics,
    },
  };
}

test("application composition retains the reviewed ordinary photo, recipient flow and measured headers", () => {
  const { source, measured } = setup(),
    before = structuredClone(source);
  const model = buildAppDocxNextModel(source, measured);
  const reviewed = buildDossierDocModel(source, {
    coverComposition: "authored-frames",
    coverTextMetrics: measured.cover,
    coverBadgePlacement: "body",
    cvSidebarComposition: "shared-body-stories",
    cvSidebarTextMetrics: measured.sidebar,
    interiorTextMetrics: measured.interior,
    chromeFirstPageIdentity: "distinct-stories",
    letterFlowComposition: "source-lines",
    cvPhotoComposition: "ordinary-picture",
  });
  expect(model).toEqual(reviewed);
  expect(source).toEqual(before);
  const photo = model.cv.blocks.find((b) => b.kind === "image" && b.id === "cv.person.photo");
  expect(photo?.kind === "image" && photo.nativeOwner).toBe("page-picture");
  expect(model.cv.headerFrames?.length).toBeGreaterThan(0);
  expect(
    walkBlocks(model.letter.blocks).some((b) => b.id === "letter.recipient.minimum-block"),
  ).toBe(true);
});

test("app export rejects unrelated model issues instead of applying the broad renderer override", () => {
  const { source, measured } = setup();
  source.settings.unresolvedTypography = ["legacy-unresolved-field"];
  measured.sidebar.sourceKey = measured.interior.sourceKey = JSON.stringify(source);
  expect(() => buildAppDocxNextModel(source, measured)).toThrow(/Layout-Einstellungen/);
});

for (const part of ["cover", "letter", "cv"] as const)
  test(`single ${part} download excludes the other documents, stories and image assets`, async () => {
    const { source, measured } = setup();
    const model = buildAppDocxNextModel(source, measured);
    const ids = ["cover", "letter", "cv"] as const;
    for (const id of ids) {
      const paragraph = walkBlocks(model[id].blocks).find((block) => block.kind === "paragraph");
      if (!paragraph || paragraph.kind !== "paragraph") throw Error("Missing paragraph fixture");
      model[id].blocks.push({
        ...structuredClone(paragraph),
        id: `${id}.download-marker`,
        runs: [{ ...paragraph.runs[0], text: `Only-this-${id}-document` }],
      });
    }
    const normalized: string[] = [];
    const image = {
      bytes: Uint8Array.from(
        atob(
          "iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR4nGP4z8Dwn4GBgQEADfsB/4fYjl4AAAAASUVORK5CYII=",
        ),
        (c) => c.charCodeAt(0),
      ),
      widthPx: 2,
      heightPx: 1,
      extension: "png" as const,
      contentType: "image/png" as const,
    };
    const blob = await renderDossierDocx(model, {
      part,
      allowUnacceptedModelIssues: true,
      normalizeImage: async (source) => {
        normalized.push(source);
        return image;
      },
      rasterizeDecoration: async () => image,
    });
    const pkg = Object.fromEntries(
      readZipEntries(new Uint8Array(await blob.arrayBuffer())).map((entry) => [
        entry.name,
        new TextDecoder().decode(entry.bytes),
      ]),
    );
    const xml = Object.values(pkg).join("\n");
    expect(xml).toContain(`Only-this-${part}-document`);
    for (const other of ids.filter((id) => id !== part)) {
      expect(xml).not.toContain(`Only-this-${other}-document`);
      expect(
        Object.keys(pkg).some(
          (key) => key.startsWith(`word/${other}-header`) || key.startsWith(`word/${other}-footer`),
        ),
      ).toBe(false);
    }
    const selected = model[part];
    const ownSources = new Set(
      walkBlocks([
        ...selected.blocks,
        ...selected.header,
        ...(selected.firstHeader ?? []),
        ...selected.footer,
        ...(selected.firstFooter ?? []),
        ...(selected.headerImages ?? []),
      ]).flatMap((block) => (block.kind === "image" ? [block.source] : [])),
    );
    expect(new Set(normalized)).toEqual(ownSources);
    if (part === "cv") {
      expect(pkg["word/document.xml"]).toContain("<wp:anchor");
      expect(pkg["word/document.xml"]).not.toContain('w:tag w:val="cv.person.photo"');
    }
  });

test("app export rejects changed inputs with stale browser measurements", () => {
  const { source, measured } = setup();
  source.cv.data.person.vorname = "Changed after measurement";
  expect(() => buildAppDocxNextModel(source, measured)).toThrow(/veraltet/);
});

test("availability keeps other templates, classic layouts and unmeasured font/header modes explicit", () => {
  for (const change of [
    (s: DossierAppSnapshot) => {
      s.cover.template = "brief";
    },
    (s: DossierAppSnapshot) => {
      s.settings.cvLayout = "classic";
    },
    (s: DossierAppSnapshot) => {
      s.cv.design.font = "serif";
    },
    (s: DossierAppSnapshot) => {
      s.settings.chrome!.shared.headerMode = "compact";
    },
  ]) {
    const { source } = setup();
    change(source);
    expect(() => assertAppDocxNextSource(source)).toThrow();
  }
});

test("normal export dialog offers one plainly labelled Word download without technical variants", () => {
  const html = renderToStaticMarkup(
    <DossierExportDialog
      open
      cvPageCount={2}
      warnings={[]}
      coverChanged={false}
      downloading={false}
      jsonAvailable
      pdfAvailable={false}
      onClose={() => {}}
      onDownload={() => {}}
    />,
  );
  expect(html).toContain("Bearbeitbares Dossier (DOCX)");
  expect(html).not.toContain("DOCX Next");
  expect(html).not.toContain("Vorschau");
  expect(html).not.toContain("Testexport");
  expect(html).toContain("Titelblatt:");
  const editor = renderToStaticMarkup(
    <DossierExportDialog
      open
      cvPageCount={2}
      warnings={[]}
      coverChanged={false}
      downloading={false}
      onClose={() => {}}
      onDownload={() => {}}
    />,
  );
  expect(editor).not.toContain("DOCX herunterladen");
  expect(editor).not.toContain("DOCX Next");
  expect(
    docxDownloadErrorMessage(new Error("DOCX Next: native paragraph model unaccepted")),
  ).not.toContain("DOCX Next");
  expect(docxDownloadErrorMessage(new DocxDownloadError("Bitte Schrift wählen."))).toBe(
    "Bitte Schrift wählen.",
  );
});

test("Word availability rejects formatted letter text before promising a download", () => {
  const { source } = setup();
  source.letter.data.richTextHtml = '<div data-align="left">Formatierter Brief</div>';
  const before = structuredClone(source);
  expect(() => assertAppDocxNextSource(source)).toThrow("formatierten Brieftext noch nicht");
  expect(source).toEqual(before);
});

test("Word availability shares the existing source-letter layout gate", () => {
  for (const customize of [
    (source: DossierAppSnapshot) => {
      source.letter.design.bodyFontSizePt = 13;
    },
    (source: DossierAppSnapshot) => {
      source.letter.design.ruleAfterSubject = true;
    },
    (source: DossierAppSnapshot) => {
      source.settings.margins = { letter: { top: 30, right: 20, bottom: 20, left: 20 } };
    },
  ]) {
    const { source } = setup();
    customize(source);
    expect(() => assertAppDocxNextSource(source)).toThrow("Brief-Einstellungen");
  }
});

test("CV-only model retains the reviewed CV when other document templates and typography are unsupported", () => {
  const { source, measured } = setup();
  const baseline = buildAppDocxNextModel(source, measured);
  source.cover.template = "citrus";
  source.letter.design.template = "warm";
  source.letter.design.font = "serif";
  source.letter.data.richTextHtml = "<p><strong>Only in the letter</strong></p>";
  measured.sidebar.sourceKey = measured.interior.sourceKey = JSON.stringify(source);
  delete measured.interior.headers.letter;
  const before = structuredClone(source);
  expect(() => assertAppDocxNextSource(source)).toThrow();
  const result = buildAppDocxNextModel(
    source,
    { sidebar: measured.sidebar, interior: measured.interior },
    "cv",
  );
  expect(result.cv).toEqual(baseline.cv);
  expect(result.cover.blocks).toEqual([]);
  expect(result.letter.blocks).toEqual([]);
  expect(result.issues).toEqual([]);
  expect(source).toEqual(before);
});

test("CV-only download keeps the CV's own unsupported template and font blocked", () => {
  for (const change of [
    (source: DossierAppSnapshot) => {
      source.cv.design.template = "citrus";
    },
    (source: DossierAppSnapshot) => {
      source.cv.design.font = "serif";
    },
    (source: DossierAppSnapshot) => {
      source.settings.cvLayout = "classic";
    },
  ]) {
    const { source } = setup();
    change(source);
    expect(() => assertAppDocxNextSource(source, "cv")).toThrow();
  }
});

test("unresolved CV typography remains blocking in a CV-only model", () => {
  const { source, measured } = setup();
  source.settings.unresolvedTypography = ["cv.legacy-unknown"];
  measured.sidebar.sourceKey = measured.interior.sourceKey = JSON.stringify(source);
  expect(() => buildAppDocxNextModel(source, measured, "cv")).toThrow(/Layout-Einstellungen/);
});

test("unresolved letter typography does not block a CV-only model", () => {
  const { source, measured } = setup();
  source.settings.unresolvedTypography = ["letter.legacy-unknown"];
  measured.sidebar.sourceKey = measured.interior.sourceKey = JSON.stringify(source);
  expect(buildAppDocxNextModel(source, measured, "cv").issues).toEqual([]);
  expect(() => buildAppDocxNextModel(source, measured)).toThrow(/Layout-Einstellungen/);
});

test("CV-only metadata uses the CV name and never unrelated cover metadata", () => {
  const { source, measured } = setup();
  source.cover.data.meta = {
    title: "PRIVATE COVER TITLE",
    author: "OTHER PERSON",
    subject: "PRIVATE SUBJECT",
    keywords: "PRIVATE KEYWORDS",
  };
  measured.sidebar.sourceKey = measured.interior.sourceKey = JSON.stringify(source);
  const model = buildAppDocxNextModel(source, measured, "cv");
  expect(model.metadata.author).toBe(
    [source.cv.data.person.vorname, source.cv.data.person.nachname].filter(Boolean).join(" "),
  );
  expect(JSON.stringify(model.metadata)).not.toContain("PRIVATE");
});

test("a CV-only model exports one document by default and preserves that scope through JSON", async () => {
  const { source, measured } = setup();
  const model = buildAppDocxNextModel(source, measured, "cv");
  const image = {
    bytes: Uint8Array.from(
      atob(
        "iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR4nGP4z8Dwn4GBgQEADfsB/4fYjl4AAAAASUVORK5CYII=",
      ),
      (c) => c.charCodeAt(0),
    ),
    widthPx: 2,
    heightPx: 1,
    extension: "png" as const,
    contentType: "image/png" as const,
  };
  const options = {
    allowUnacceptedModelIssues: true,
    normalizeImage: async () => image,
    rasterizeDecoration: async () => image,
  };
  const bytes = new Uint8Array(await (await renderDossierDocx(model, options)).arrayBuffer());
  const restored = new Uint8Array(
    await (await renderDossierDocx(JSON.parse(JSON.stringify(model)), options)).arrayBuffer(),
  );
  expect(restored).toEqual(bytes);
  const parts = readZipEntries(bytes);
  const xml = new TextDecoder().decode(
    parts.find((part) => part.name === "word/document.xml")!.bytes,
  );
  expect((xml.match(/<w:sectPr>/g) ?? []).length).toBe(1);
  expect(xml).toContain("cv.person.name");
  expect(xml).not.toContain("letter.");
  expect(xml).not.toContain("cover.");
  await expect(renderDossierDocx(model, { ...options, part: "cover" })).rejects.toThrow(
    /ausgewählten Dossierteil/,
  );
});

for (const part of ["cover", "letter"] as const) {
  test(`${part}-only builds the reviewed document without unrelated templates, fonts or measurements`, () => {
    const { source, measured } = setup();
    const baseline = buildAppDocxNextModel(source, measured);
    source.cv.design.template = "citrus";
    source.cv.design.font = "serif";
    source.settings.cvLayout = "classic";
    source.settings.chrome!.sync = false;
    source.settings.chrome!.cv.headerMode = "compact";
    if (part === "cover") {
      source.letter.design.template = "warm";
      source.letter.design.font = "serif";
      source.letter.data.richTextHtml = "<p><strong>Unrelated</strong></p>";
    } else {
      source.cover.template = "citrus";
      delete measured.interior.headers.cv;
    }
    measured.interior.sourceKey = JSON.stringify(source);
    const before = structuredClone(source);
    const result = buildAppDocxNextModel(
      source,
      part === "cover" ? { cover: measured.cover } : { interior: measured.interior },
      part,
    );
    expect(result[part].blocks).toEqual(baseline[part].blocks);
    expect(result[part].headerFrames).toEqual(baseline[part].headerFrames);
    expect(result[part].artwork).toEqual(baseline[part].artwork);
    for (const other of ["cover", "letter", "cv"] as const)
      if (other !== part) {
        expect(result[other].blocks).toEqual([]);
        expect(result[other].header).toEqual([]);
        expect(result[other].artwork).toEqual([]);
      }
    expect(result.exportPart).toBe(part);
    expect(source).toEqual(before);
    expect(() => assertAppDocxNextSource(source)).toThrow();
  });

  test(`${part}-only retains its own unsupported template and typography gates`, () => {
    const { source } = setup();
    if (part === "cover") source.cover.template = "citrus";
    else source.letter.design.template = "warm";
    expect(() => assertAppDocxNextSource(source, part)).toThrow(/Vorlage/);
    const font = setup().source;
    if (part === "cover")
      font.cover.blocks.find((block) => block.kind === "text" && !block.style.hidden)!.style.font =
        "serif";
    else font.letter.design.fontOverride = "serif";
    expect(() => assertAppDocxNextSource(font, part)).toThrow(/Sans/);
  });

  test(`${part}-only excludes known unrelated legacy typography but retains unresolved own or ambiguous fields`, () => {
    const { source, measured } = setup();
    source.settings.unresolvedTypography = [
      "cv.unknown",
      ...(part === "cover" ? ["letter.unknown"] : ["cover.unknown"]),
    ];
    measured.interior.sourceKey = JSON.stringify(source);
    expect(() => buildAppDocxNextModel(source, measured, part)).not.toThrow();
    for (const field of [`${part}.unknown`, "ambiguous-legacy-field"]) {
      source.settings.unresolvedTypography = [field];
      measured.interior.sourceKey = JSON.stringify(source);
      expect(() => buildAppDocxNextModel(source, measured, part)).toThrow(/Layout-Einstellungen/);
    }
  });

  test(`${part}-only exports a single section by default and retains scope after JSON restore`, async () => {
    const { source, measured } = setup();
    const model = buildAppDocxNextModel(source, measured, part);
    const image = {
      bytes: Uint8Array.from(
        atob(
          "iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR4nGP4z8Dwn4GBgQEADfsB/4fYjl4AAAAASUVORK5CYII=",
        ),
        (c) => c.charCodeAt(0),
      ),
      widthPx: 2,
      heightPx: 1,
      extension: "png" as const,
      contentType: "image/png" as const,
    };
    const options = {
      allowUnacceptedModelIssues: true,
      normalizeImage: async () => image,
      rasterizeDecoration: async () => image,
    };
    const bytes = new Uint8Array(await (await renderDossierDocx(model, options)).arrayBuffer());
    const restored = new Uint8Array(
      await (await renderDossierDocx(JSON.parse(JSON.stringify(model)), options)).arrayBuffer(),
    );
    expect(restored).toEqual(bytes);
    const pkg = readZipEntries(bytes);
    const xml = new TextDecoder().decode(pkg.find((p) => p.name === "word/document.xml")!.bytes);
    expect((xml.match(/<w:sectPr>/g) ?? []).length).toBe(1);
    expect(xml).toContain(`${part}.`);
    if (part === "cover") {
      const sectionStart = xml.indexOf("<w:sectPr>");
      const closingParagraph = xml.slice(xml.lastIndexOf("<w:p>", sectionStart), sectionStart);
      expect(closingParagraph).toContain("</w:p>");
      expect(closingParagraph).not.toContain("<w:framePr");
      expect(closingParagraph).not.toContain("<w:sdt");
    }
    for (const other of ["cover", "letter", "cv"].filter((id) => id !== part)) {
      expect(xml).not.toContain(`${other}.`);
      expect(pkg.some((entry) => entry.name.startsWith(`word/${other}-header`))).toBe(false);
    }
    await expect(renderDossierDocx(model, { ...options, part: "cv" })).rejects.toThrow(
      /ausgewählten Dossierteil/,
    );
  });
}

test("standalone letter still blocks rich text and metadata comes from its own subject and sender", () => {
  const { source, measured } = setup();
  source.cover.data.meta = {
    title: "UNRELATED TITLE",
    author: "UNRELATED AUTHOR",
    subject: "UNRELATED SUBJECT",
    keywords: "UNRELATED KEYWORDS",
  };
  measured.interior.sourceKey = JSON.stringify(source);
  const model = buildAppDocxNextModel(source, measured, "letter");
  expect(model.metadata).toEqual({
    title: "Motivationsschreiben",
    author: [source.cover.data.vorname, source.cover.data.nachname].filter(Boolean).join(" "),
    subject: source.letter.data.betreff,
    keywords: "",
  });
  source.letter.data.richTextHtml = "<p><strong>Formatted</strong></p>";
  expect(() => assertAppDocxNextSource(source, "letter")).toThrow(/formatierten Brieftext/);
});
