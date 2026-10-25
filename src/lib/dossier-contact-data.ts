import type { CoverData } from "@/components/cover/types";
import type { CvData } from "@/components/cv/types";
import type { LetterData } from "@/components/letter/types";
import type { DossierChromeContact } from "@/lib/dossier-chrome";

/** Contact semantics only. Saved-document adapters and editor stores stay at the caller edge. */
const emptyContact = (): DossierChromeContact => ({
  name: "",
  address: "",
  place: "",
  phone: "",
  email: "",
});

const clean = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

export function dossierContactFromCover(data: CoverData | null | undefined): DossierChromeContact {
  if (!data) return emptyContact();
  return {
    name: [clean(data.vorname), clean(data.nachname)].filter(Boolean).join(" "),
    address: clean(data.adresse),
    place: clean(data.plzOrt),
    phone: clean(data.telefon),
    email: clean(data.email),
  };
}

export function dossierContactFromCv(data: CvData | null | undefined): DossierChromeContact {
  if (!data?.person) return emptyContact();
  const person = data.person;
  return {
    name: [clean(person.vorname), clean(person.nachname)].filter(Boolean).join(" "),
    address: clean(person.adresse),
    place: clean(person.plzOrt),
    phone: clean(person.telefon),
    email: clean(person.email),
  };
}

export function dossierContactFromLetter(
  data: LetterData | null | undefined,
): DossierChromeContact {
  if (!data) return emptyContact();
  return {
    name: clean(data.absenderName),
    address: clean(data.absenderAdresse),
    place: clean(data.absenderPlzOrt),
    phone: clean(data.absenderTelefon),
    email: clean(data.absenderEmail),
  };
}

/**
 * One dossier-level contact source for synchronized headers.
 *
 * Existing product semantics already prefer the title page for personal data,
 * then the CV, then the motivation letter. Resolve field-by-field so a partly
 * filled title page can still use missing contact details from the CV/letter.
 */
export function resolveDossierContact({
  cover,
  cv,
  letter,
}: {
  cover?: CoverData | null;
  cv?: CvData | null;
  letter?: LetterData | null;
}): DossierChromeContact {
  const sources = [
    dossierContactFromCover(cover),
    dossierContactFromCv(cv),
    dossierContactFromLetter(letter),
  ];
  const pick = (key: keyof DossierChromeContact) =>
    sources.map((source) => source[key]).find((value) => !!value) ?? "";
  return {
    name: pick("name"),
    address: pick("address"),
    place: pick("place"),
    phone: pick("phone"),
    email: pick("email"),
  };
}
