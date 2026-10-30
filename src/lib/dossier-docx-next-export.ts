import { resolveDossierChromeSnapshot } from "./dossier-resolved-chrome";
import { DEFAULT_DOSSIER_CHROME_STATE } from "./dossier-chrome";
import { normalizedCoverLabels, coverTextPresentation } from "@/components/cover/presentation";
import { captureCoverTextMetrics } from "@/components/cover/resolve";
import { FONT_STACKS, lineText } from "@/components/cover/types";
import { measureLines } from "./text-fit";
import { downloadBlob, safeFileName } from "./download";
import {
  assertAppDocxNextSource,
  captureSavedAppDocxNextSource,
  DocxDownloadError,
} from "./docx-next/app-source";
import { prepareBriefFontProfile } from "./docx-next/brief-fonts.browser";
import { captureCoverBadgeAdvances } from "./docx-next/cover-badges.browser";
import { captureCvSidebarTextMetrics } from "./docx-next-sidebar-metrics.browser";
import { captureInteriorTextMetrics } from "./docx-next-interior-metrics.browser";
import { buildDossierDocModel } from "./docx-next/build-model";
import { renderDossierDocx } from "./docx-next/renderer";
import { walkBlocks, type DossierDocModel, type DocumentPart } from "./docx-next/model";
import type { DossierAppSnapshot } from "./docx-next/source";
import type { CoverTextMetrics } from "@/components/cover/text-metrics";
import type { CvSidebarTextMetrics } from "./docx-next/cv-sidebar-text-metrics";
import type { InteriorTextMetrics } from "./docx-next/interior-metrics";

export function buildAppDocxNextModel(
  source: DossierAppSnapshot,
  measured: {
    cover?: CoverTextMetrics;
    sidebar?: CvSidebarTextMetrics;
    interior?: InteriorTextMetrics;
  },
  part?: DocumentPart["id"],
): DossierDocModel {
  const includeCover = !part || part === "cover",
    includeLetter = !part || part === "letter",
    includeCv = !part || part === "cv";
  assertAppDocxNextSource(source, part);
  if (includeCover && !measured.cover)
    throw new Error("DOCX Next: Titelblatt-Schriftmesswerte fehlen.");
  if (includeCv && !measured.sidebar) throw new Error("DOCX Next: CV-Schriftmesswerte fehlen.");
  if ((includeLetter || includeCv) && !measured.interior)
    throw new Error("DOCX Next: Header-Schriftmesswerte fehlen.");
  const model = buildDossierDocModel(source, {
    ...(part ? { exportPart: part } : {}),
    coverComposition: "authored-frames",
    ...(includeCover ? { coverTextMetrics: measured.cover, coverBadgePlacement: "body" } : {}),
    ...(includeCv
      ? {
          cvSidebarComposition: "shared-body-stories",
          cvSidebarTextMetrics: measured.sidebar,
          cvPhotoComposition: "ordinary-picture",
        }
      : {}),
    ...(includeLetter || includeCv ? { interiorTextMetrics: measured.interior } : {}),
    chromeFirstPageIdentity: "distinct-stories",
    ...(includeLetter ? { letterFlowComposition: "source-lines" } : {}),
  });
  // The renderer's diagnostic switch also covers unrelated experiments. This
  // application entry admits exactly the composition above, never all issues.
  if (
    (includeLetter
      ? model.issues.length !== 1 || model.issues[0].code !== "letter-source-flow-unaccepted"
      : model.issues.length !== 0) ||
    model.floatingTableTextFlow !== undefined ||
    [model.cover, model.letter, model.cv].some((part) =>
      walkBlocks(part.blocks).some(
        (block) =>
          block.kind === "parallel-flow" ||
          (block.kind === "table" && block.position !== undefined) ||
          (block.kind === "image" &&
            block.nativeOwner !== undefined &&
            (part.id !== "cv" ||
              block.id !== "cv.person.photo" ||
              block.nativeOwner !== "page-picture")),
      ),
    )
  )
    throw Error("DOCX Next: Dieser Entwurf enthält noch nicht unterstützte Layout-Einstellungen.");
  return model;
}

/** Fresh saved inputs and actual browser measurements; no fixture or frozen asset replay. */
export async function createSavedDossierDocxNext(part?: DocumentPart["id"]) {
  const source = captureSavedAppDocxNextSource(part);
  const key = JSON.stringify(source);
  const unchanged = () => {
    if (JSON.stringify(captureSavedAppDocxNextSource(part)) !== key)
      throw new DocxDownloadError(
        "Der Entwurf wurde während des Exports geändert. Bitte erneut herunterladen.",
      );
  };
  const includeCover = !part || part === "cover",
    includeLetter = !part || part === "letter",
    includeCv = !part || part === "cv";
  const blocks = includeCover
    ? normalizedCoverLabels(source.cover.blocks, source.cover.data.labelKontakt)
    : [];
  const visible = blocks
    .filter(
      (b) =>
        !b.style.hidden &&
        (!["empfaenger", "anTitel"].includes(b.id) ||
          source.cover.data.showBetriebOnCover !== false) &&
        (!["beilagen", "beilagenTitel"].includes(b.id) ||
          source.cover.data.showBeilagenOnCover !== false),
    )
    .map((b) => ({
      ...b,
      style: coverTextPresentation(b, source.cover.template, source.cover.colors).style,
    }));
  const fonts = await prepareBriefFontProfile(
    !includeCover
      ? []
      : visible.flatMap((b) => {
          if (b.kind === "text") return [b];
          if (b.kind !== "photo" || source.cover.data.foto) return [];
          return [
            {
              ...b,
              lines: [
                [source.cover.data.vorname, source.cover.data.nachname]
                  .map((name) => name?.[0])
                  .filter(Boolean)
                  .join("")
                  .toUpperCase(),
              ],
            },
          ];
        }),
    [400, 600, 650, 700, 800],
  );
  try {
    unchanged();
    fonts.verify();
    const cover = includeCover
      ? captureCoverTextMetrics(blocks, source.cover.fontScale, fonts.profile)
      : undefined;
    if (cover) captureCoverBadgeAdvances(blocks, "modern", source.cover.colors, cover);
    for (const block of (cover ? visible : []).filter(
      (b) => b.kind === "text" && b.lines.some((l) => lineText(l).trim()),
    )) {
      const measured = cover!.blocks[block.id];
      const sizePt = Math.round(measured.sizePt * 2) / 2;
      const input = {
        text: block.lines.map(lineText).join("\n"),
        widthPx: (block.style.w * 96) / 25.4,
        fontFamily: FONT_STACKS[block.style.font],
        weight: block.style.weight,
        italic: block.style.italic,
        tracking: Math.round(block.style.tracking * measured.sizePt * 20) / 20 / sizePt,
        uppercase: block.style.uppercase,
        sizePt,
      };
      if (measureLines(input) !== measured.lines)
        throw Error(
          `DOCX Next: Die Word-Schriftgrösse verändert den Umbruch in «${block.id}». Bitte Text oder Breite anpassen.`,
        );
    }
    const interior =
      includeLetter || includeCv
        ? await captureInteriorTextMetrics(source, fonts.profile, {
            headersOnly: true,
            ...(part === "cv" || part === "letter" ? { scope: part } : {}),
          })
        : undefined;
    const sidebar = includeCv
      ? await captureCvSidebarTextMetrics(source, fonts.profile)
      : undefined;
    unchanged();
    fonts.verify();
    const model = buildAppDocxNextModel(source, { cover, interior, sidebar }, part);
    const blob = await renderDossierDocx(model, {
      part,
      allowUnacceptedModelIssues: true,
      onDecorationFailure: () => {
        throw new DocxDownloadError(
          `Ein Gestaltungselement konnte nicht erstellt werden. Bitte versuche den Download erneut.`,
        );
      },
    });
    unchanged();
    fonts.verify();
    return { blob, source, model };
  } finally {
    fonts.dispose();
  }
}

export async function downloadSavedDossierDocxNext(part?: DocumentPart["id"]) {
  const { blob, source } = await createSavedDossierDocxNext(part);
  const person = part === "cv" ? source.cv.data.person : source.cover.data;
  const name =
    part === "letter"
      ? source.letter.data.absenderName ||
        resolveDossierChromeSnapshot(source, source.settings.chrome ?? DEFAULT_DOSSIER_CHROME_STATE)
          .letter.contact.name
      : [person.vorname, person.nachname].filter(Boolean).join(" ");
  const label = part
    ? { cover: "Titelblatt", letter: "Motivationsschreiben", cv: "Lebenslauf" }[part]
    : "Bewerbungsdossier";
  downloadBlob(blob, `${safeFileName(name ? `${label}-${name}` : label)}.docx`);
}
