import type { CoverData } from "@/components/cover/types";
import type { CvData } from "@/components/cv/types";
import type { LetterData } from "@/components/letter/types";
import {
  coverPdfDocumentFromSaved,
  cvPdfDocumentFromSaved,
  letterPdfDocumentFromSaved,
} from "@/lib/dossier-pdf-document";
import {
  COVER_STORAGE_KEY,
  CV_STORAGE_KEY,
  LETTER_STORAGE_KEY,
  readStoredDossierPart,
} from "@/lib/dossier-project";
import type { DossierChromeContact } from "@/lib/dossier-chrome";

import {
  dossierContactFromCover,
  dossierContactFromCv,
  dossierContactFromLetter,
  resolveDossierContact,
} from "./dossier-contact-data";
export {
  dossierContactFromCover,
  dossierContactFromCv,
  dossierContactFromLetter,
  resolveDossierContact,
} from "./dossier-contact-data";

/**
 * Resolve the same synchronized header contact in either editor. The currently
 * edited document can be supplied as an override so its in-memory changes do
 * not have to wait for autosave before the header updates.
 */
export function readDossierContact({
  cover,
  cv,
  letter,
}: {
  cover?: CoverData | null;
  cv?: CvData | null;
  letter?: LetterData | null;
} = {}): DossierChromeContact {
  const storedCover =
    cover === undefined
      ? coverPdfDocumentFromSaved(readStoredDossierPart(COVER_STORAGE_KEY))?.data
      : cover;
  const storedCv =
    cv === undefined ? cvPdfDocumentFromSaved(readStoredDossierPart(CV_STORAGE_KEY))?.data : cv;
  const storedLetter =
    letter === undefined
      ? letterPdfDocumentFromSaved(readStoredDossierPart(LETTER_STORAGE_KEY))?.data
      : letter;
  const stored = { cover: storedCover, cv: storedCv, letter: storedLetter };
  const fallback = resolveDossierContact(stored);
  const preferredSources = [
    cover !== undefined ? dossierContactFromCover(cover) : null,
    cv !== undefined ? dossierContactFromCv(cv) : null,
    letter !== undefined ? dossierContactFromLetter(letter) : null,
  ].filter((source): source is DossierChromeContact => source !== null);

  // The editor currently on screen is the live authority. Otherwise a stale
  // title-page name can mask freshly entered CV/letter values until autosave.
  // Keep the dossier-wide sources only as field-wise fallbacks for blanks.
  const pick = (key: keyof DossierChromeContact) =>
    preferredSources.map((source) => source[key]).find((value) => !!value) ?? fallback[key];

  return {
    name: pick("name"),
    address: pick("address"),
    place: pick("place"),
    phone: pick("phone"),
    email: pick("email"),
  };
}
