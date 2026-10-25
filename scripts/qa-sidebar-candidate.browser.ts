import { captureDossierDocxNextSnapshot } from "@/lib/docx-next/snapshot";
import * as project from "@/lib/dossier-project";
import * as documents from "@/lib/dossier-pdf-document";
import { createSavedDesignDocxNext } from "@/lib/design-docx-next-export";
import { normalizedCoverLabels } from "@/components/cover/presentation";
import { captureCoverTextMetrics } from "@/components/cover/resolve";
import { captureCoverBadgeAdvances } from "@/lib/docx-next/cover-badges.browser";
import { prepareBriefFontProfile } from "@/lib/docx-next/brief-fonts.browser";
import { captureCvSidebarTextMetrics } from "@/lib/docx-next-sidebar-metrics.browser";
import { captureInteriorTextMetrics } from "@/lib/docx-next-interior-metrics.browser";
import { resolveDossierChromeSnapshot } from "@/lib/dossier-resolved-chrome";
import { DEFAULT_DOSSIER_CHROME_STATE } from "@/lib/dossier-chrome";
import { buildDossierDocModel, type BuildModelOptions } from "@/lib/docx-next/build-model";
import { normalizeBrowserImage } from "@/lib/docx-next/images";
import { renderDossierDocx } from "@/lib/docx-next/renderer";

/** Internal QA only. The regular guarded product entry must still reject Sidebar. */
export async function captureSharedSidebarQaCandidate(
  composition: "body-stories" | "shared-body-stories",
  expectedSyntheticPhoto: string | null,
) {
  const cover = documents.coverPdfDocumentFromSaved(
    project.readStoredDossierPart(project.COVER_STORAGE_KEY),
  );
  const letter = documents.letterPdfDocumentFromSaved(
    project.readStoredDossierPart(project.LETTER_STORAGE_KEY),
  );
  const cv = documents.cvPdfDocumentFromSaved(
    project.readStoredDossierPart(project.CV_STORAGE_KEY),
  );
  if (!cover || !letter || !cv) throw Error("QA requires three saved dossier parts");
  const snapshot = captureDossierDocxNextSnapshot(cover, letter, cv);
  if (snapshot.cover.data.foto || (snapshot.cv.data.person.foto ?? null) !== expectedSyntheticPhoto)
    throw Error("QA picture differs from the checked synthetic fixture");
  let guardError: string | undefined;
  try {
    await createSavedDesignDocxNext();
  } catch (e) {
    guardError = (e as Error).message;
  }
  if (!guardError?.includes("Standard-CV-Layout"))
    throw Error("Existing Sidebar product guard changed");
  const blocks = normalizedCoverLabels(snapshot.cover.blocks, snapshot.cover.data.labelKontakt);
  const fonts = await prepareBriefFontProfile(
    blocks.filter((b) => !b.style.hidden && b.kind === "text"),
    [400, 600, 650, 700, 800],
  );
  try {
    const metrics = captureCoverTextMetrics(blocks, snapshot.cover.fontScale, fonts.profile);
    captureCoverBadgeAdvances(blocks, "modern", snapshot.cover.colors, metrics);
    const contact =
      resolveDossierChromeSnapshot(
        snapshot,
        snapshot.settings.chrome ?? DEFAULT_DOSSIER_CHROME_STATE,
      ).cv.options.headerMode === "contact";
    if (contact && composition !== "shared-body-stories")
      throw Error("Legacy Sidebar contact trial remains frozen");
    const sidebarMetrics =
      composition === "shared-body-stories"
        ? await captureCvSidebarTextMetrics(snapshot, fonts.profile)
        : undefined;
    const interiorMetrics = contact
      ? await captureInteriorTextMetrics(snapshot, fonts.profile, { headersOnly: true })
      : undefined;
    const options: BuildModelOptions = {
      coverComposition: "authored-frames",
      coverTextMetrics: metrics,
      coverBadgePlacement: "body",
      cvSidebarComposition: composition,
      chromeFirstPageIdentity: "distinct-stories",
      ...(contact
        ? { interiorTextMetrics: interiorMetrics }
        : { compactChromeComposition: "source-bands" }),
    };
    const model = buildDossierDocModel(snapshot, {
      ...options,
      cvSidebarTextMetrics: sidebarMetrics,
    });
    if (
      model.letter.footer.length ||
      (contact
        ? !model.letter.headerFrames?.length || !model.cv.headerFrames?.length
        : !model.letter.headerShapes?.some((s) => s.id === "letter.compact.footer"))
    )
      throw Error("Diagnostic lost the current shared chrome");
    if (sidebarMetrics && model.cv.headerShapes?.some((s) => s.id.startsWith("cv.compact.")))
      throw Error("Duplicate CV band owners");
    if (model.issues.length) throw Error("Unrelated model gates: " + JSON.stringify(model.issues));
    let picture;
    if (snapshot.cv.data.person.foto) {
      const source = snapshot.cv.data.person.foto,
        normalized = await normalizeBrowserImage(source);
      const digest = async (bytes: Uint8Array | Uint8ClampedArray) =>
        Array.from(
          new Uint8Array(await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes).buffer)),
        )
          .map((n) => n.toString(16).padStart(2, "0"))
          .join("");
      const pixels = async (src: string) => {
        const im = new Image();
        im.src = src;
        await im.decode();
        const c = document.createElement("canvas");
        c.width = im.naturalWidth;
        c.height = im.naturalHeight;
        const ctx = c.getContext("2d", { colorSpace: "srgb" })!;
        ctx.drawImage(im, 0, 0);
        return {
          width: c.width,
          height: c.height,
          rgbaSha256: await digest(ctx.getImageData(0, 0, c.width, c.height).data),
        };
      };
      const data =
        "data:image/png;base64," +
        btoa(Array.from(normalized.bytes, (c) => String.fromCharCode(c)).join(""));
      picture = {
        source: await pixels(source),
        normalized: await pixels(data),
        normalizedFileSha256: await digest(normalized.bytes),
      };
    }
    const blob = await renderDossierDocx(model, {
      allowUnacceptedModelIssues: true,
      onDecorationFailure: (id, error) => {
        throw Error("Decoration failed " + id, { cause: error });
      },
    });
    const adjacent = buildDossierDocModel(snapshot, options);
    if (
      JSON.stringify(model.cover) !== JSON.stringify(adjacent.cover) ||
      JSON.stringify(model.letter) !== JSON.stringify(adjacent.letter)
    )
      throw Error("Sidebar typography altered cover or letter");
    return {
      snapshot,
      metrics,
      sidebarMetrics,
      interiorMetrics,
      adjacentPartsUnchanged: true,
      model,
      picture,
      guardError,
      bytes: Array.from(new Uint8Array(await blob.arrayBuffer())),
    };
  } finally {
    fonts.dispose();
  }
}
