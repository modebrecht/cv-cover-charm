import { createSavedAuthoredCoverDocxNext } from "./brief-docx-next-export";
import { designDocxNextUiEnabled } from "./docx-next/design-visibility";
import { downloadBlob, safeFileName } from "./download";

/** Modern only. Other audited templates remain explicitly outside this candidate. */
export async function createSavedDesignDocxNext() {
  try {
    return await createSavedAuthoredCoverDocxNext("modern", designDocxNextUiEnabled());
  } catch (error) {
    if (error instanceof Error)
      throw new Error(
        error.message
          .replaceAll("Brief DOCX Next", "Design DOCX Next")
          .replaceAll("Vorlage Brief", "Vorlage Modern"),
      );
    throw error;
  }
}

export async function downloadSavedDesignDocxNext() {
  const { blob, snapshot } = await createSavedDesignDocxNext();
  const name = [snapshot.cover.data.vorname, snapshot.cover.data.nachname]
    .filter(Boolean)
    .join(" ");
  downloadBlob(blob, `${safeFileName(`Bewerbungsdossier-${name}-Modern-Test`)}.docx`);
}
