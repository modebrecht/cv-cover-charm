const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const optional = (value: unknown, accepts: (value: unknown) => boolean) =>
  value === undefined || accepts(value);
const text = (value: unknown) => typeof value === "string";
const image = (value: unknown) => value === null || text(value);
const strings = (value: unknown) => Array.isArray(value) && value.every(text);
const records = (value: unknown) => Array.isArray(value) && value.every(record);
const fields = (value: Record<string, unknown>, keys: string[], accepts = text) =>
  keys.every((key) => optional(value[key], accepts));
const stringMap = (value: unknown) => record(value) && Object.values(value).every(text);
const entryList = (value: unknown) =>
  records(value) &&
  (value as Record<string, unknown>[]).every((entry) =>
    fields(entry, [
      "id",
      "zeit",
      "titel",
      "ort",
      "beschreibung",
      "name",
      "niveau",
      "funktion",
      "kontakt",
      "email",
      "zusatz",
    ]),
  );
const elements = (value: unknown) =>
  records(value) &&
  (value as Record<string, unknown>[]).every(
    (entry) =>
      fields(entry, ["id", "label", "text", "kind", "shape", "path"]) && optional(entry.src, image),
  );

/** Validate supplied structures that editors consume as strings/arrays. Missing
 * historical fields and unknown additive fields remain compatible. This is a
 * file-load boundary, not a migration of the active browser storage format. */
export function validDossierProjectPart(kind: "cover" | "letter" | "cv", value: unknown): boolean {
  if (!record(value) || !record(value.data)) return false;
  const data = value.data;
  if (
    !optional(value.design, record) ||
    !optional(value.elements, elements) ||
    !optional(value.customs, elements) ||
    !optional(value.elementStyles, record)
  )
    return false;
  if (
    record(value.design) &&
    (!optional(value.design.colors, stringMap) ||
      !fields(value.design, ["template"]) ||
      !optional(value.design.font, image))
  )
    return false;

  if (kind === "cover") {
    return (
      fields(data, [
        "kicker",
        "eyebrow",
        "beruf",
        "lehrbeginn",
        "vorname",
        "nachname",
        "adresse",
        "plzOrt",
        "telefon",
        "email",
        "geburtsdatum",
        "lehrbetrieb",
        "ansprechperson",
        "betriebAdresse",
        "ort",
        "datum",
        "labelKontakt",
        "labelEmpfaenger",
      ]) &&
      optional(data.foto, image) &&
      optional(data.beilagen, strings) &&
      optional(data.meta, stringMap) &&
      fields(value, ["template"]) &&
      optional(value.font, image) &&
      optional(value.colors, (colors) => record(colors) && Object.values(colors).every(stringMap))
    );
  }
  if (kind === "letter") {
    return (
      fields(data, [
        "absenderName",
        "absenderAdresse",
        "absenderPlzOrt",
        "absenderTelefon",
        "absenderEmail",
        "empfaengerFirma",
        "empfaengerName",
        "empfaengerAdresse",
        "empfaengerPlzOrt",
        "ort",
        "datum",
        "betreff",
        "anrede",
        "text",
        "richTextHtml",
        "gruss",
        "unterschrift",
      ]) &&
      optional(data.beilagen, strings) &&
      optional(data.attachmentIds, strings) &&
      optional(
        data.images,
        (images) =>
          records(images) &&
          (images as Record<string, unknown>[]).every((entry) =>
            fields(entry, ["id", "src", "side"]),
          ),
      )
    );
  }
  if (
    !optional(
      data.person,
      (person) =>
        record(person) &&
        fields(person, [
          "vorname",
          "nachname",
          "adresse",
          "plzOrt",
          "telefon",
          "email",
          "geburtsdatum",
          "geburtsort",
          "heimatort",
          "nationalitaet",
          "untertitel",
        ]) &&
        optional(person.foto, image),
    )
  )
    return false;
  if (
    !["schule", "erfahrung", "sprachen", "referenzen"].every((key) =>
      optional(data[key], entryList),
    )
  )
    return false;
  if (!["hobbys", "staerken", "sectionOrder"].every((key) => optional(data[key], strings)))
    return false;
  return (
    optional(data.labels, stringMap) &&
    optional(
      data.hidden,
      (hidden) =>
        record(hidden) && Object.values(hidden).every((value) => typeof value === "boolean"),
    ) &&
    optional(data.titel, text) &&
    optional(
      data.customSections,
      (sections) =>
        records(sections) &&
        (sections as Record<string, unknown>[]).every(
          (section) =>
            fields(section, ["id", "title", "preset"]) && optional(section.entries, entryList),
        ),
    )
  );
}
