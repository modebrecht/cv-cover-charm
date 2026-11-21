export const OBFUSCATED_FONT_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.obfuscatedFont";

type CabinFace = {
  fileName: string;
  partName: string;
  relId: string;
  embedTag: "embedRegular" | "embedBold" | "embedItalic" | "embedBoldItalic";
  fontKey: string;
};

const CABIN_FACES: readonly CabinFace[] = [
  {
    fileName: "Cabin-Regular.ttf",
    partName: "word/fonts/Cabin-Regular.odttf",
    relId: "rIdCabinRegular",
    embedTag: "embedRegular",
    fontKey: "{0A4C0C1E-4B3A-4A7C-8B36-8DF50F034991}",
  },
  {
    fileName: "Cabin-Bold.ttf",
    partName: "word/fonts/Cabin-Bold.odttf",
    relId: "rIdCabinBold",
    embedTag: "embedBold",
    fontKey: "{B73AC3CB-7D42-4FEF-925B-85F5C20D9E62}",
  },
  {
    fileName: "Cabin-Italic.ttf",
    partName: "word/fonts/Cabin-Italic.odttf",
    relId: "rIdCabinItalic",
    embedTag: "embedItalic",
    fontKey: "{61D3908B-6B96-4C6A-BA37-2A5FC86E4C91}",
  },
  {
    fileName: "Cabin-BoldItalic.ttf",
    partName: "word/fonts/Cabin-BoldItalic.odttf",
    relId: "rIdCabinBoldItalic",
    embedTag: "embedBoldItalic",
    fontKey: "{CCF65E33-AE8F-4190-8144-473FA63BC205}",
  },
] as const;

export type DossierDocxFontLoader = (fileName: string) => Promise<Uint8Array | null>;

function fontKeyBytes(fontKey: string) {
  const hex = fontKey.replace(/[{}-]/g, "");
  if (!/^[0-9A-F]{32}$/i.test(hex)) throw new Error(`Ungültiger DOCX fontKey: ${fontKey}`);
  const bytes = new Uint8Array(16);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** ECMA-376 font obfuscation is symmetric: applying this twice restores the TTF. */
export function obfuscateOoxmlFont(bytes: Uint8Array, fontKey: string) {
  const key = fontKeyBytes(fontKey);
  const output = bytes.slice();
  for (let i = 0; i < Math.min(32, output.length); i += 1) {
    output[i] ^= key[15 - (i % 16)];
  }
  return output;
}

async function browserCabinFontLoader(fileName: string) {
  if (typeof window === "undefined" || typeof fetch !== "function") return null;
  const url = new URL(`/fonts/${fileName}`, window.location.origin);
  const response = await fetch(url, { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`Cabin-Font für DOCX konnte nicht geladen werden: ${fileName}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

export async function loadCabinFontParts(loadFont: DossierDocxFontLoader = browserCabinFontLoader) {
  const loaded = await Promise.all(
    CABIN_FACES.map(async (face) => ({ face, source: await loadFont(face.fileName) })),
  );
  if (loaded.every(({ source }) => source === null)) return [];
  return loaded.map(({ face, source }) => {
    if (!source?.length)
      throw new Error("DOCX-Font-Embedding: Cabin konnte nicht vollständig geladen werden.");
    return { ...face, bytes: obfuscateOoxmlFont(source, face.fontKey) };
  });
}

export function cabinFontEmbedsXml() {
  return CABIN_FACES.map(
    (face) => `<w:${face.embedTag} r:id="${face.relId}" w:fontKey="${face.fontKey}"/>`,
  ).join("");
}
