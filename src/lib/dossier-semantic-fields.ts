/** App/editor identities shared by native exports. Never derived from visible text. */
export const CV_PERSON_FIELD_IDS = {
  vorname: "cv.person.firstName",
  nachname: "cv.person.lastName",
  untertitel: "cv.person.subtitle",
  adresse: "cv.person.address",
  plzOrt: "cv.person.place",
  telefon: "cv.person.phone",
  email: "cv.person.email",
  geburtsdatum: "cv.person.geburtsdatum",
  geburtsort: "cv.person.geburtsort",
  heimatort: "cv.person.heimatort",
  nationalitaet: "cv.person.nationalitaet",
} as const;
export const LETTER_FIELD_IDS = {
  absenderName: "letter.sender.name",
  absenderAdresse: "letter.sender.address",
  absenderPlzOrt: "letter.sender.place",
  absenderTelefon: "letter.sender.phone",
  absenderEmail: "letter.sender.email",
  empfaengerFirma: "letter.recipient.company",
  empfaengerName: "letter.recipient.name",
  empfaengerAdresse: "letter.recipient.address",
  empfaengerPlzOrt: "letter.recipient.place",
  ort: "letter.date.place",
  datum: "letter.date.value",
  betreff: "letter.subject",
  anrede: "letter.salutation",
  text: "letter.body",
  gruss: "letter.closing",
  unterschrift: "letter.signature",
} as const;
export const CV_ENTRY_FIELDS = {
  zeit: "date",
  titel: "title",
  ort: "place",
  beschreibung: "description",
} as const;
export function dossierChromeFieldId(
  scope: "cv" | "letter",
  surface: "header" | "footer",
  field: "title" | "text",
): string {
  return `${scope}.${surface}.${field}`;
}
export function cvEntryFieldId(section: string, entryId: string, field: string): string {
  return `cv.entry.${section}:${entryId}.${field}`;
}
export function dossierElementFieldId(scope: "cv" | "cover", elementId: string): string {
  return scope === "cover" ? `cover.${elementId}` : `cv.element:${elementId}`;
}
export function cvLineFieldId(
  section: "hobbys" | "staerken",
  index: number,
  ids?: string[],
): string {
  return `cv.entry.${section}:${semanticListItemIds(index + 1, ids)[index]}`;
}
export function semanticListItemIds(length: number, ids?: readonly string[]): string[] {
  const used = new Set<string>();
  return Array.from({ length }, (_, index) => {
    const saved = Array.isArray(ids) && typeof ids[index] === "string" ? ids[index].trim() : "";
    let id = saved && !used.has(saved) ? saved : String(index);
    while (used.has(id)) id = `line:${id}`;
    used.add(id);
    return id;
  });
}
let nextListId = 0;
const CHROME_FIELD_ID = /^(cv|letter)\.(?:header|footer)\.(?:title|text)$/;
/** Called only by editor add actions; never by deterministic model construction. */
export function newSemanticListItemId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `new-${Date.now().toString(36)}-${(++nextListId).toString(36)}`;
}
/** Legacy kontakt stores these same explicit suffix fields; split them once in app data. */
export function referenceContactFields(reference: {
  kontakt: string;
  email?: string;
  zusatz?: string;
}): { contact: string; email: string; extra: string } {
  const lines = reference.kontakt.split("\n");
  const email = reference.email?.trim() ?? "",
    extra = reference.zusatz?.trim() ?? "";
  if (extra && lines.at(-1)?.trim() === extra) lines.pop();
  if (email && lines.at(-1)?.trim() === email) lines.pop();
  return { contact: lines.join("\n").trim(), email, extra };
}
export function isSemanticDossierFieldId(scope: "cv" | "letter", id: string): boolean {
  if (CHROME_FIELD_ID.exec(id)?.[1] === scope) return true;
  if (scope === "letter")
    return (
      Object.values(LETTER_FIELD_IDS).some((value) => value === id) ||
      /^letter\.attachment:.+$/.test(id)
    );
  return (
    Object.values(CV_PERSON_FIELD_IDS).some((value) => value === id) ||
    id === "cv.person.name" ||
    id === "cv.documentTitle" ||
    /^cv\.element:.+$/.test(id) ||
    /^cv\.section\..+\.heading$/.test(id) ||
    /^cv\.entry\.(?:hobbys|staerken):.+$/.test(id) ||
    /^cv\.entry\.(?:schule|erfahrung|sprachen|referenzen|custom:.+):.+\.(?:date|title|place|description|name|level|role|contact|email|extra)$/.test(
      id,
    )
  );
}
