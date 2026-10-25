import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import fixture from "../fixtures/docx-next/sidebar-contact-chrome-23okt.json";
import { buildAppDocxNextModel } from "../../src/lib/dossier-docx-next-export";
import { assertAppDocxNextSource } from "../../src/lib/docx-next/app-source";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { walkBlocks } from "../../src/lib/docx-next/model";
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

test("normal export dialog exposes DOCX Next without an experimental URL", () => {
  const html = renderToStaticMarkup(
    <DossierExportDialog
      open
      cvPageCount={2}
      warnings={[]}
      coverChanged={false}
      downloading={false}
      jsonAvailable
      pdfAvailable={false}
      docxAvailable={false}
      onClose={() => {}}
      onDownload={() => {}}
    />,
  );
  expect(html).toContain("DOCX Next herunterladen");
  expect(html).toContain("Word mit DOCX Next");
  expect(html).toContain("Bitte zuerst Titelblatt");
});
