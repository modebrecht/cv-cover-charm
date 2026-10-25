import { normalizedCoverLabels, coverTextPresentation } from "@/components/cover/presentation";
import { captureCoverTextMetrics } from "@/components/cover/resolve";
import { FONT_STACKS, lineText } from "@/components/cover/types";
import { measureLines } from "./text-fit";
import { downloadBlob, safeFileName } from "./download";
import { assertAppDocxNextSource, captureSavedAppDocxNextSource } from "./docx-next/app-source";
import { prepareBriefFontProfile } from "./docx-next/brief-fonts.browser";
import { captureCoverBadgeAdvances } from "./docx-next/cover-badges.browser";
import { captureCvSidebarTextMetrics } from "./docx-next-sidebar-metrics.browser";
import { captureInteriorTextMetrics } from "./docx-next-interior-metrics.browser";
import { buildDossierDocModel } from "./docx-next/build-model";
import { renderDossierDocx } from "./docx-next/renderer";
import { walkBlocks, type DossierDocModel } from "./docx-next/model";
import type { DossierAppSnapshot } from "./docx-next/source";
import type { CoverTextMetrics } from "@/components/cover/text-metrics";
import type { CvSidebarTextMetrics } from "./docx-next/cv-sidebar-text-metrics";
import type { InteriorTextMetrics } from "./docx-next/interior-metrics";

export function buildAppDocxNextModel(
  source: DossierAppSnapshot,
  measured: {
    cover: CoverTextMetrics;
    sidebar: CvSidebarTextMetrics;
    interior: InteriorTextMetrics;
  },
): DossierDocModel {
  assertAppDocxNextSource(source);
  const model = buildDossierDocModel(source, {
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
  // The renderer's diagnostic switch also covers unrelated experiments. This
  // application entry admits exactly the composition above, never all issues.
  if (
    model.issues.length !== 1 ||
    model.issues[0].code !== "letter-source-flow-unaccepted" ||
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
export async function createSavedDossierDocxNext() {
  const source = captureSavedAppDocxNextSource();
  const key = JSON.stringify(source);
  const unchanged = () => {
    if (JSON.stringify(captureSavedAppDocxNextSource()) !== key)
      throw Error("Der Entwurf wurde während des Exports geändert. Bitte erneut herunterladen.");
  };
  const blocks = normalizedCoverLabels(source.cover.blocks, source.cover.data.labelKontakt);
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
    visible.flatMap((b) => {
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
    const cover = captureCoverTextMetrics(blocks, source.cover.fontScale, fonts.profile);
    captureCoverBadgeAdvances(blocks, "modern", source.cover.colors, cover);
    for (const block of visible.filter(
      (b) => b.kind === "text" && b.lines.some((l) => lineText(l).trim()),
    )) {
      const measured = cover.blocks[block.id];
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
    const interior = await captureInteriorTextMetrics(source, fonts.profile, { headersOnly: true });
    const sidebar = await captureCvSidebarTextMetrics(source, fonts.profile);
    unchanged();
    fonts.verify();
    const model = buildAppDocxNextModel(source, { cover, interior, sidebar });
    const blob = await renderDossierDocx(model, {
      allowUnacceptedModelIssues: true,
      onDecorationFailure: (id) => {
        throw Error(`DOCX Next: Gestaltungselement «${id}» konnte nicht erstellt werden.`);
      },
    });
    unchanged();
    fonts.verify();
    return { blob, source, model };
  } finally {
    fonts.dispose();
  }
}

export async function downloadSavedDossierDocxNext() {
  const { blob, source } = await createSavedDossierDocxNext();
  const name = [source.cover.data.vorname, source.cover.data.nachname].filter(Boolean).join(" ");
  downloadBlob(blob, `${safeFileName(`Bewerbungsdossier-${name || "Modern"}-DOCX-Next`)}.docx`);
}
