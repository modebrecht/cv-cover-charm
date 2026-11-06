import { CV_BLOCK_LABELS, type CvData, type CvDesign } from "@/components/cv/types";
import {
  CV_PERSON_FIELD_IDS,
  cvLineFieldId,
  referenceContactFields,
} from "@/lib/dossier-semantic-fields";

export type CvPdfTextField = { id: string; text: string; split?: true };

/** Effective renderer input, before pagination or sidebar assignment. Deliberately
 * hidden sections are excluded; body contact delegated to the header is already resolved. */
export function cvPdfTextContract(
  data: CvData,
  design: Pick<CvDesign, "showDocumentTitle">,
): string {
  const fields: CvPdfTextField[] = [];
  const add = (id: string, value: string | undefined, split?: true) => {
    const text = (value ?? "").replace(/\s+/g, "");
    if (text) fields.push({ id, text, ...(split ? { split } : {}) });
  };
  // Keep the existing single name text node: native Chromium PDF may merge
  // inline fragments, while print geometry probes need the whole authored run.
  add("cv.person.name", [data.person.vorname, data.person.nachname].filter(Boolean).join(" "));
  for (const [key, id] of Object.entries(CV_PERSON_FIELD_IDS)) {
    if (key === "vorname" || key === "nachname") continue;
    add(id, data.person[key as keyof typeof CV_PERSON_FIELD_IDS]);
  }
  if (design.showDocumentTitle !== false) add("cv.documentTitle", data.titel?.trim());
  const heading = (key: keyof typeof CV_BLOCK_LABELS) =>
    add(`cv.section.${key}.heading`, data.labels[key]?.trim() || CV_BLOCK_LABELS[key]);
  const entries = (key: string, rows: CvData["schule"], family = false, familyColons = true) => {
    for (const row of rows) {
      const base = `cv.entry.${key}:${row.id}`;
      if (!family) add(`${base}.date`, row.zeit);
      add(
        `${base}.title`,
        row.titel.trim() ? `${row.titel}${family && familyColons && row.ort ? ":" : ""}` : "",
      );
      add(`${base}.place`, row.ort);
      add(`${base}.description`, row.beschreibung, true);
    }
  };
  for (const key of ["schule", "erfahrung"] as const) {
    if (data.hidden[key]) continue;
    if (
      data[key].some((row) =>
        [row.zeit, row.titel, row.ort, row.beschreibung].some((text) => text.trim()),
      )
    )
      heading(key);
    entries(key, data[key]);
  }
  if (!data.hidden.sprachen) {
    if (data.sprachen.some((row) => row.name.trim() || row.niveau.trim())) heading("sprachen");
    for (const row of data.sprachen) {
      add(`cv.entry.sprachen:${row.id}.name`, row.name);
      add(`cv.entry.sprachen:${row.id}.level`, row.niveau);
    }
  }
  for (const key of ["hobbys", "staerken"] as const) {
    if (data.hidden[key]) continue;
    if (data[key].some((text) => text.trim())) heading(key);
    data[key].forEach((text, index) => add(cvLineFieldId(key, index, data.lineIds?.[key]), text));
  }
  if (!data.hidden.referenzen) {
    const before = fields.length;
    for (const row of data.referenzen) {
      const base = `cv.entry.referenzen:${row.id}`;
      add(`${base}.name`, row.name);
      add(`${base}.role`, row.funktion);
      for (const [key, text] of Object.entries(referenceContactFields(row)))
        add(`${base}.${key}`, text);
    }
    if (fields.length > before) heading("referenzen");
  }
  for (const section of data.customSections ?? []) {
    const before = fields.length;
    entries(
      `custom:${section.id}`,
      section.entries,
      section.preset === "familie",
      section.rowLayout?.showColons !== false,
    );
    if (fields.length > before)
      add(`cv.section.custom:${section.id}.heading`, section.title.trim() || "Eigene Rubrik");
  }
  return JSON.stringify({ version: 1, fields });
}

export function readCvPdfTextContract(value: string | undefined): CvPdfTextField[] | null {
  try {
    const contract = JSON.parse(value ?? "null");
    if (contract?.version !== 1 || !Array.isArray(contract.fields)) return null;
    const ids = new Set<string>();
    for (const field of contract.fields) {
      if (
        !field ||
        typeof field.id !== "string" ||
        !field.id ||
        ids.has(field.id) ||
        typeof field.text !== "string" ||
        !field.text ||
        (field.split !== undefined && field.split !== true)
      )
        return null;
      ids.add(field.id);
    }
    return contract.fields;
  } catch {
    return null;
  }
}
