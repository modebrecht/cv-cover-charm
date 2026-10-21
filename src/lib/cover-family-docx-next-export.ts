import { letterReadiness } from "@/components/letter/preflight";
import {
  coverPdfDocumentFromSaved,
  coverPdfHasContent,
  cvPdfDocumentFromSaved,
  cvPdfHasContent,
  letterPdfDocumentFromSaved,
} from "@/lib/dossier-pdf-document";
import {
  COVER_STORAGE_KEY,
  LETTER_STORAGE_KEY,
  CV_STORAGE_KEY,
  readStoredDossierPart,
} from "@/lib/dossier-project";
import { downloadBlob, safeFileName } from "@/lib/download";
import { captureDossierDocxNextSnapshot } from "@/lib/docx-next/snapshot";
import { buildDossierDocModel, type DossierAppSnapshot } from "@/lib/docx-next/build-model";
import { renderDossierDocx } from "@/lib/docx-next/renderer";
import { walkBlocks } from "@/lib/docx-next/model";

/** Three unaccepted cover families. This flag never changes normal PDF/DOCX export. */
const families = ["verlauf", "neon", "freundlich"] as const;
export function isCoverFamilyDocxQaTemplate(
  value: unknown,
): value is (typeof families)[number] {
  return typeof value === "string" && families.some((family) => family === value);
}

export function coverFamilyDocxQaEnabled() {
  return typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("docx-next-cover-family-qa") === "1";
}

/** Only the explicit developer QA path may build a full unaccepted family dossier. */
export function buildFullCoverFamilyQaModel(snapshot: DossierAppSnapshot) {
  const family = snapshot.cover.template;
  if (!isCoverFamilyDocxQaTemplate(family) ||
      snapshot.letter.design.template !== family ||
      snapshot.cv.design.template !== family)
    throw Error("DOCX Next Cover QA: Titelblatt, Anschreiben und CV müssen dieselbe geprüfte Vorlage verwenden.");
  if (snapshot.settings.cvLayout !== "classic")
    throw Error("DOCX Next Cover QA: Das Sidebar-CV ist hier nicht freigegeben.");

  const photo = snapshot.cover.blocks.find((block) => block.kind === "photo");
  const emptyVisiblePhoto = !snapshot.cover.data.foto && !!photo && !photo.style.hidden;
  const model = buildDossierDocModel(snapshot, emptyVisiblePhoto
    ? { nativeAvatarComposition: "writer-vml" }
    : {});
  if (model.issues.length || model.templateId !== family)
    throw Error("DOCX Next Cover QA: Nicht unterstützte Modell-Einstellungen.");

  // The renderer's broad diagnostic allowance is required for the native
  // editable avatar shape. Refuse unrelated unaccepted structures explicitly.
  for (const part of [model.cover, model.letter, model.cv]) {
    if (part.firstFooter || model.floatingTableTextFlow ||
        walkBlocks(part.blocks).some((block) =>
          (block.kind === "paragraph-frame" &&
            (part.id !== "cover" ||
              block.id !== "cover.photo.native-avatar" ||
              block.surface?.diagnosticShapeFormat !== "legacy-vml")) ||
          (block.kind === "table" &&
            (block.position !== undefined ||
              block.bodyBoundary !== undefined ||
              block.identityCarrier !== undefined ||
              block.afterMm !== undefined)) ||
          (block.kind === "parallel-flow") ||
          (block.kind === "paragraph" &&
            (block.controlPlacement !== undefined ||
              block.flowSurface !== undefined ||
              block.tabStopsMm !== undefined))))
      throw Error("DOCX Next Cover QA: Diese Dokumentstruktur hat noch keine Exportfreigabe.");
  }
  return model;
}

/** Fresh capture at the real app boundary; never accepts an invented fixture. */
export async function createSavedCoverFamilyDocxNext() {
  if (!coverFamilyDocxQaEnabled())
    throw Error("DOCX Next Cover QA: Testexport ist nicht aktiviert.");
  const cover = coverPdfDocumentFromSaved(readStoredDossierPart(COVER_STORAGE_KEY));
  const letter = letterPdfDocumentFromSaved(readStoredDossierPart(LETTER_STORAGE_KEY));
  const cv = cvPdfDocumentFromSaved(readStoredDossierPart(CV_STORAGE_KEY));
  if (!cover || !letter || !cv ||
      !coverPdfHasContent(cover.data) ||
      !cvPdfHasContent(cv.data) ||
      !letterReadiness(letter.data).readyToSend)
    throw Error("DOCX Next Cover QA: Alle drei gespeicherten Dossierteile müssen vollständig sein.");

  const capture = () => captureDossierDocxNextSnapshot(
    coverPdfDocumentFromSaved(readStoredDossierPart(COVER_STORAGE_KEY))!,
    letterPdfDocumentFromSaved(readStoredDossierPart(LETTER_STORAGE_KEY))!,
    cvPdfDocumentFromSaved(readStoredDossierPart(CV_STORAGE_KEY))!,
  );
  const snapshot = captureDossierDocxNextSnapshot(cover, letter, cv);
  const before = JSON.stringify(snapshot);
  const model = buildFullCoverFamilyQaModel(snapshot);
  const blob = await renderDossierDocx(model, {
    // Diagnostic only. This never alters the production exporter gate.
    allowUnacceptedModelIssues: true,
    onDecorationFailure: (id) => {
      throw Error(`DOCX Next Cover QA: Gestaltungselement ${id} konnte nicht gerendert werden.`);
    },
  });
  if (JSON.stringify(capture()) !== before)
    throw Error("DOCX Next Cover QA: Gespeicherte Daten haben sich während des Exports verändert.");
  if (blob.size < 2000)
    throw Error("DOCX Next Cover QA: DOCX-Ausgabe ist unvollständig.");
  return { blob, snapshot, model };
}

export async function downloadSavedCoverFamilyDocxNext() {
  const { blob, snapshot } = await createSavedCoverFamilyDocxNext();
  const person = [snapshot.cover.data.vorname, snapshot.cover.data.nachname]
    .filter(Boolean).join(" ");
  downloadBlob(blob,
    safeFileName(`Bewerbungsdossier-${person}-${snapshot.cover.template}-DOCX-QA`) + ".docx");
}
