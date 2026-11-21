import { expect, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CV_INFO_POSITION_STORAGE_KEY } from "../../src/components/cv/layout";
import { BASE_URL, type CanonicalDossier } from "../e2e/support/dossier-gallery-shared";
import { expectUnreviewedDocxBlocked } from "../e2e/support/native-docx-fixture";

export function hasGalleryCvPreview(template: string) {
  return template === "terracotta" || template === "studio3";
}

export function galleryFixtureForDocx(stored: CanonicalDossier, template: string) {
  if (hasGalleryCvPreview(template)) {
    const fixture = structuredClone(stored);
    fixture.cv.design.font = "sans";
    fixture.cv.design.sidebarPct = 0.3;
    return fixture;
  }
  if (template !== "modern" && template !== "brief") return stored;
  const fixture = structuredClone(stored);
  fixture.cover.font = "sans";
  fixture.letter.design.font = "sans";
  fixture.letter.design.fontOverride = "sans";
  fixture.cv.design.font = "sans";
  return fixture;
}

export async function galleryInputHash(page: Page) {
  const input = await page.evaluate(
    (keys) => keys.map((key) => localStorage.getItem(key)),
    [
      "titelblatt:v3",
      "anschreiben:v1",
      "lebenslauf:v1",
      "bewerbungsdossier:chrome:v1",
      "lebenslauf:layout:v1",
      CV_INFO_POSITION_STORAGE_KEY,
      "lebenslauf:photo:v2",
      "lebenslauf:photo-place:v1",
    ],
  );
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

async function captureGalleryCvPreview(page: Page, directory: string, base: string) {
  const bytes = await page.evaluate(async () => {
    const [project, documents, snapshot, profiles, sidebar, builder, renderer] = await Promise.all([
      import(String("/src/lib/dossier-project.ts")) as Promise<
        typeof import("../../src/lib/dossier-project")
      >,
      import(String("/src/lib/dossier-pdf-document.ts")) as Promise<
        typeof import("../../src/lib/dossier-pdf-document")
      >,
      import(String("/src/lib/docx-next/snapshot.ts")) as Promise<
        typeof import("../../src/lib/docx-next/snapshot")
      >,
      import(String("/src/lib/docx-next/brief-fonts.browser.ts")) as Promise<
        typeof import("../../src/lib/docx-next/brief-fonts.browser")
      >,
      import(String("/src/lib/docx-next-sidebar-metrics.browser.tsx")) as Promise<
        typeof import("../../src/lib/docx-next-sidebar-metrics.browser")
      >,
      import(String("/src/lib/docx-next/build-model.ts")) as Promise<
        typeof import("../../src/lib/docx-next/build-model")
      >,
      import(String("/src/lib/docx-next/renderer.ts")) as Promise<
        typeof import("../../src/lib/docx-next/renderer")
      >,
    ]);
    const get = project.readStoredDossierPart;
    const cover = documents.coverPdfDocumentFromSaved(get(project.COVER_STORAGE_KEY));
    const letter = documents.letterPdfDocumentFromSaved(get(project.LETTER_STORAGE_KEY));
    const cv = documents.cvPdfDocumentFromSaved(get(project.CV_STORAGE_KEY));
    if (!cover || !letter || !cv) throw Error("Missing saved dossier for the CV preview.");
    const source = snapshot.captureDossierDocxNextSnapshot(cover, letter, cv, {}, "cv");
    source.settings.fontPolicy = { availableFonts: ["Liberation Sans"] };
    const fonts = await profiles.prepareBriefFontProfile([]);
    try {
      const metrics = await sidebar.captureCvSidebarTextMetrics(source, fonts.profile, false, true);
      const model = builder.buildDossierDocModel(source, {
        exportPart: "cv",
        cvSidebarComposition: "shared-body-stories",
        cvPhotoComposition: "ordinary-picture",
        cvSidebarTextMetrics: metrics,
      });
      if (model.issues.length) throw Error("Unexpected model issues in the mirrored CV preview.");
      const photo = model.cv.blocks.find((block) => block.id === "cv.person.photo");
      if (photo?.kind !== "image" || !photo.measuredPageAnchor)
        throw Error("The CV preview must use the measured photo position.");
      const blob = await renderer.renderDossierDocx(model, {
        part: "cv",
        allowUnacceptedModelIssues: true,
        onDecorationFailure: (id, cause) => {
          throw Error(id, { cause });
        },
      });
      return Array.from(new Uint8Array(await blob.arrayBuffer()));
    } finally {
      fonts.dispose();
    }
  });
  const file = `${base}--preview.docx`;
  await writeFile(join(directory, file), Buffer.from(bytes));
  return { ...(await documentRecord(directory, file)), part: "cv" as const };
}

async function documentRecord(directory: string, file: string) {
  const bytes = await readFile(join(directory, file));
  expect(bytes.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  return {
    status: "exported" as const,
    file,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

export async function captureGalleryDocx(
  page: Page,
  directory: string,
  base: string,
  template: string,
) {
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Gesamtdossier herunterladen/ }).click();
  const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
  const docx = dialog.getByRole("radio", { name: "Bearbeitbares Dossier (DOCX)" });
  const designIssue = dialog.locator("[data-dossier-docx-design-issue]");
  if (template === "modern") {
    await expect(docx, (await designIssue.allTextContents()).join(" ")).toBeEnabled();
    await docx.click();
    const button = dialog.getByRole("button", { name: "DOCX herunterladen", exact: true });
    await expect(button).toBeEnabled();
    const download = page.waitForEvent("download");
    await button.click();
    const file = `${base}--regular.docx`;
    await (await download).saveAs(join(directory, file));
    return {
      regular: await documentRecord(directory, file),
      preview: { status: "not-configured" },
    };
  }

  await expectUnreviewedDocxBlocked(page);
  const reason = (await designIssue.textContent())?.trim();
  expect(reason).toBeTruthy();
  const regular = { status: "blocked", reason };
  if (hasGalleryCvPreview(template))
    return { regular, preview: await captureGalleryCvPreview(page, directory, base) };
  if (template !== "brief") return { regular, preview: { status: "not-configured" } };

  await page.goto(`${BASE_URL}/?docx-next-brief-qa=1`, { waitUntil: "networkidle" });
  const bytes = await page.evaluate(async () => {
    const path = "/src/lib/brief-docx-next-export.ts";
    const { createSavedBriefDocxNext } = await import(path);
    const { blob, model } = await createSavedBriefDocxNext();
    if (model.templateId !== "brief" || model.issues.length)
      throw Error("Unexpected Brief document model.");
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  const file = `${base}--preview.docx`;
  await writeFile(join(directory, file), Buffer.from(bytes));
  return { regular, preview: await documentRecord(directory, file) };
}
