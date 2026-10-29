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
