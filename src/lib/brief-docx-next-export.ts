import { normalizedCoverLabels, coverTextPresentation } from "@/components/cover/presentation";
import { captureCoverTextMetrics } from "@/components/cover/resolve";
import { FONT_STACKS, lineText } from "@/components/cover/types";
import { measureLines } from "@/lib/text-fit";
import { letterReadiness } from "@/components/letter/preflight";
import {
  coverPdfDocumentFromSaved,
  coverPdfHasContent,
  letterPdfDocumentFromSaved,
  cvPdfDocumentFromSaved,
  cvPdfHasContent,
} from "@/lib/dossier-pdf-document";
import {
  COVER_STORAGE_KEY,
  LETTER_STORAGE_KEY,
  CV_STORAGE_KEY,
  readStoredDossierPart,
} from "@/lib/dossier-project";
import { downloadBlob, safeFileName } from "@/lib/download";
import { captureDossierDocxNextSnapshot } from "./docx-next/snapshot";
import { buildDossierDocModel } from "./docx-next/build-model";
import { renderDossierDocx } from "./docx-next/renderer";
import { walkBlocks, type DossierDocModel } from "./docx-next/model";
import { prepareBriefFontProfile } from "./docx-next/brief-fonts.browser";
import { briefDocxNextUiEnabled } from "./docx-next/brief-visibility";

/** Capture the same saved application inputs used by the actual dossier workflow. */
export function captureSavedBriefSnapshot() {
  const cover = coverPdfDocumentFromSaved(readStoredDossierPart(COVER_STORAGE_KEY));
  const letter = letterPdfDocumentFromSaved(readStoredDossierPart(LETTER_STORAGE_KEY));
  const cv = cvPdfDocumentFromSaved(readStoredDossierPart(CV_STORAGE_KEY));
  if (
    !cover ||
    !letter ||
    !cv ||
    !coverPdfHasContent(cover.data) ||
    !cvPdfHasContent(cv.data) ||
    !letterReadiness(letter.data).readyToSend
  )
    throw new Error("Brief DOCX Next: Bitte alle drei Dossierteile vollständig ausfüllen.");
  if (
    cover.template !== "brief" ||
    letter.design.template !== "brief" ||
    cv.design.template !== "brief"
  )
    throw new Error("Brief DOCX Next: Alle drei Dossierteile müssen die Vorlage Brief verwenden.");
  const snapshot = captureDossierDocxNextSnapshot(cover, letter, cv);
  if (snapshot.settings.cvLayout !== "classic")
    throw new Error("Brief DOCX Next: Dieser Test unterstützt nur das Standard-CV-Layout.");
  return snapshot;
}

/** The renderer's broad diagnostic switch must not waive unrelated model gates. */
export function validateBriefIntegrationModel(model: DossierDocModel) {
  if (model.issues.length)
    throw new Error(
      `Brief DOCX Next: Nicht unterstützte Einstellungen (${model.issues.map((i) => i.code).join(", ")}).`,
    );
  if (model.templateId !== "brief" || model.floatingTableTextFlow !== undefined)
    throw new Error("Brief DOCX Next: Nicht freigegebene Vorlage oder Dokumentkomposition.");
  for (const part of [model.cover, model.letter, model.cv]) {
    if (
      part.firstFooter ||
      walkBlocks([
        ...part.blocks,
        ...part.header,
        ...(part.firstHeader ?? []),
        ...part.footer,
      ]).some(
        (b) =>
          (b.kind === "paragraph-frame" && (part.id !== "cover" || !part.blocks.includes(b))) ||
          b.kind === "parallel-flow" ||
          (b.kind === "paragraph" && b.controlPlacement !== undefined) ||
          (b.kind === "table" &&
            (b.position ||
              b.bodyBoundary !== undefined ||
              b.identityCarrier !== undefined ||
              b.rows.some((r) => r.cellEndKeepNext !== undefined))),
      )
    )
      throw new Error(
        "Brief DOCX Next: Diese Dokumentkomposition ist für den Brief-Test nicht freigegeben.",
      );
  }
}

/** Fresh, uncached capture at the application export boundary. No caller-supplied packet. */
export async function createSavedBriefDocxNext() {
  if (!briefDocxNextUiEnabled())
    throw new Error("Brief DOCX Next: Testexport ist nicht aktiviert.");
  const snapshot = captureSavedBriefSnapshot();
  const source = JSON.stringify(snapshot);
  const unchanged = () => {
    if (JSON.stringify(captureSavedBriefSnapshot()) !== source)
      throw new Error(
        "Brief DOCX Next: Gespeicherte Daten haben sich während des Exports geändert. Bitte erneut exportieren.",
      );
  };
  const blocks = normalizedCoverLabels(snapshot.cover.blocks, snapshot.cover.data.labelKontakt);
  const visible = blocks
    .filter(
      (b) =>
        !b.style.hidden &&
        (!["empfaenger", "anTitel"].includes(b.id) ||
          snapshot.cover.data.showBetriebOnCover !== false) &&
        (!["beilagen", "beilagenTitel"].includes(b.id) ||
          snapshot.cover.data.showBeilagenOnCover !== false),
    )
    .map((b) => ({
      ...b,
      style: coverTextPresentation(b, snapshot.cover.template, snapshot.cover.colors).style,
    }));
  const fontBlocks = visible.flatMap((b) => {
    if (b.kind === "text") return [b];
    if (b.kind === "photo" && !snapshot.cover.data.foto) {
      const initials = [snapshot.cover.data.vorname, snapshot.cover.data.nachname]
        .map((v) => v?.[0])
        .filter(Boolean)
        .join("")
        .toUpperCase();
      return [{ ...b, lines: [initials] }];
    }
    return [];
  });
  const fonts = await prepareBriefFontProfile(fontBlocks);
  try {
    unchanged();
    fonts.verify();
    const metrics = captureCoverTextMetrics(blocks, snapshot.cover.fontScale, fonts.profile);
    const context = document.createElement("canvas").getContext("2d");
    if (!context) throw new Error("Brief DOCX Next: Schriftmessung ist nicht verfügbar.");
    for (const b of visible.filter(
      (b) => b.kind === "text" && b.lines.some((line) => lineText(line).trim()),
    )) {
      const measured = metrics.blocks[b.id];
      const sizePt = Math.round(measured.sizePt * 2) / 2;
      const text = b.lines.map(lineText).join("\n");
      const input = {
        text,
        widthPx: (b.style.w * 96) / 25.4,
        fontFamily: FONT_STACKS[b.style.font],
        weight: b.style.weight,
        italic: b.style.italic,
        tracking: Math.round(b.style.tracking * measured.sizePt * 20) / 20 / sizePt,
        uppercase: b.style.uppercase,
        sizePt,
      };
      if (text && measureLines(input) !== measured.lines)
        throw new Error(
          `Brief DOCX Next: Word-Schriftgrössen ändern den Umbruch in «${b.id}». Bitte Text oder Breite anpassen.`,
        );
      context.font = `${b.style.weight} ${(sizePt * 96) / 72}px ${input.fontFamily}`;
      const shown = b.style.uppercase ? text.toUpperCase() : text;
      if (
        shown
          .split(/\s+/)
          .some(
            (word) =>
              context.measureText(word).width +
                ((input.tracking * sizePt * 96) / 72) * word.length >
              input.widthPx,
          )
      )
        throw new Error(
          `Brief DOCX Next: Ein Wort in «${b.id}» überschreitet die Feldbreite. Bitte Text oder Breite anpassen.`,
        );
    }
    const model = buildDossierDocModel(snapshot, {
      coverComposition: "authored-frames",
      coverTextMetrics: metrics,
    });
    validateBriefIntegrationModel(model);
    const blob = await renderDossierDocx(model, {
      allowUnacceptedModelIssues: true,
      onDecorationFailure: (id) => {
        throw new Error(
          `Brief DOCX Next: Gestaltungselement «${id}» konnte nicht erstellt werden.`,
        );
      },
    });
    unchanged();
    fonts.verify();
    return { blob, snapshot, metrics, model };
  } finally {
    fonts.dispose();
  }
}

export async function downloadSavedBriefDocxNext() {
  const { blob, snapshot } = await createSavedBriefDocxNext();
  const author = [snapshot.cover.data.vorname, snapshot.cover.data.nachname]
    .filter(Boolean)
    .join(" ");
  downloadBlob(blob, `${safeFileName(`Bewerbungsdossier-${author || "Brief"}-Brief-Test`)}.docx`);
}
