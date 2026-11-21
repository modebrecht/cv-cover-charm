import {
  DOCX_MIME_TYPE,
  readStoredDocxEntries,
  writeStoredDocxEntries,
  type StoredDocxEntry,
} from "@/lib/dossier-docx-package";

import {
  cabinFontEmbedsXml,
  loadCabinFontParts,
  OBFUSCATED_FONT_CONTENT_TYPE,
  type DossierDocxFontLoader,
} from "./docx-cabin-fonts";

export { obfuscateOoxmlFont, type DossierDocxFontLoader } from "./docx-cabin-fonts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const RELATIONSHIPS_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const FONT_RELATIONSHIP =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/font";
const OFFICE_RELATIONSHIPS_NS =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
function textEntry(entries: StoredDocxEntry[], name: string) {
  const entry = entries.find((candidate) => candidate.name === name);
  if (!entry) throw new Error(`DOCX-Font-Embedding: ${name} fehlt.`);
  return entry;
}

function replaceTextEntry(
  entries: StoredDocxEntry[],
  name: string,
  transform: (source: string) => string,
) {
  const entry = textEntry(entries, name);
  entry.bytes = encoder.encode(transform(decoder.decode(entry.bytes)));
}

function patchContentTypes(source: string) {
  if (source.includes('Extension="odttf"')) return source;
  return source.replace(
    "</Types>",
    `<Default Extension="odttf" ContentType="${OBFUSCATED_FONT_CONTENT_TYPE}"/></Types>`,
  );
}

function patchFontTable(source: string) {
  let xml = source.includes("xmlns:r=")
    ? source
    : source.replace("<w:fonts ", `<w:fonts xmlns:r="${OFFICE_RELATIONSHIPS_NS}" `);

  const embeds = cabinFontEmbedsXml();
  const cabinPattern = /(<w:font w:name="Cabin">)([\s\S]*?)(<\/w:font>)/;
  if (!cabinPattern.test(xml))
    throw new Error("DOCX-Font-Embedding: Cabin fehlt in fontTable.xml.");
  xml = xml.replace(cabinPattern, (_match, open: string, body: string, close: string) => {
    const cleanBody = body.replace(/<w:embed(?:Regular|Bold|Italic|BoldItalic)\b[^>]*\/>/g, "");
    return `${open}${cleanBody}${embeds}${close}`;
  });
  return xml;
}

function patchSettings(source: string) {
  if (source.includes("<w:embedTrueTypeFonts")) return source;
  return source.replace("</w:settings>", "<w:embedTrueTypeFonts/></w:settings>");
}

function fontRelationshipsXml(parts: Awaited<ReturnType<typeof loadCabinFontParts>>) {
  const relationships = parts
    .map(
      (face) =>
        `<Relationship Id="${face.relId}" Type="${FONT_RELATIONSHIP}" Target="fonts/${face.partName.split("/").pop()}"/>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${RELATIONSHIPS_NS}">${relationships}</Relationships>`;
}

export async function embedCabinFontsInDossierDocxBlob(
  blob: Blob,
  loadFont?: DossierDocxFontLoader,
) {
  const loaded = await loadCabinFontParts(loadFont);
  if (!loaded.length) return blob;

  const entries = readStoredDocxEntries(
    new Uint8Array(await blob.arrayBuffer()),
    "DOCX-Font-Embedding",
  ).filter(
    (entry) =>
      entry.name !== "word/_rels/fontTable.xml.rels" &&
      !loaded.some((face) => face.partName === entry.name),
  );

  replaceTextEntry(entries, "[Content_Types].xml", patchContentTypes);
  replaceTextEntry(entries, "word/fontTable.xml", patchFontTable);
  replaceTextEntry(entries, "word/settings.xml", patchSettings);

  entries.push({
    name: "word/_rels/fontTable.xml.rels",
    bytes: encoder.encode(fontRelationshipsXml(loaded)),
  });
  for (const { partName, bytes } of loaded) entries.push({ name: partName, bytes });

  return new Blob([writeStoredDocxEntries(entries)], { type: DOCX_MIME_TYPE });
}
