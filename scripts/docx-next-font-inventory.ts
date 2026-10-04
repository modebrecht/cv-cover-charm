/** Read-only app/font inventory; never imports a legacy DOCX renderer. */
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { TEMPLATES, FONT_STACKS } from "../src/components/cover/types";
import { buildBlocks } from "../src/components/cover/layouts";
import { DEMO_DATA } from "../src/components/cover/types";
import { dossierThemeFor } from "../src/lib/dossier-theme";
import { WORD_FONTS } from "../src/lib/docx-next/fonts";

const fonts = [];
const selectionSource = "src/components/cover/TemplatePicker.tsx";
const retiredDeclaration = (await readFile(selectionSource, "utf8")).match(
  /const RETIRED_TEMPLATE_IDS = new Set\((\[[^\]]*\])\);/,
);
if (!retiredDeclaration)
  throw new Error("Active template retirement declaration changed; review inventory scope");
const retired = new Set<string>(JSON.parse(retiredDeclaration[1]));
for (const file of [
  "Cabin-Regular.ttf",
  "Cabin-Bold.ttf",
  "Cabin-Italic.ttf",
  "Cabin-BoldItalic.ttf",
]) {
  const path = `public/fonts/${file}`;
  const bytes = await readFile(path);
  let fsType: number | undefined;
  for (let i = 0; i < bytes.readUInt16BE(4); i++) {
    const entry = 12 + i * 16;
    if (bytes.toString("ascii", entry, entry + 4) === "OS/2")
      fsType = bytes.readUInt16BE(bytes.readUInt32BE(entry + 8) + 8);
  }
  if (fsType === undefined) throw new Error(`Missing OS/2 table: ${path}`);
  fonts.push({
    path,
    bytes: bytes.length,
    fsType,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
const report = {
  selectionSource,
  registeredCount: TEMPLATES.length,
  retiredFromPicker: [...retired].sort(),
  appStacks: FONT_STACKS,
  docxMappings: WORD_FONTS,
  embedding: "disabled",
  localFonts: {
    license: "public/fonts/Cabin-OFL.txt",
    licenseSha256: createHash("sha256")
      .update(await readFile("public/fonts/Cabin-OFL.txt"))
      .digest("hex"),
    files: fonts,
  },
  templates: TEMPLATES.filter((template) => !retired.has(template.id)).map((template) => ({
    id: template.id,
    familyStack: dossierThemeFor(template.id).typography.fontStack,
    coverTextKeys: [
      ...new Set(
        buildBlocks(template.id, structuredClone(DEMO_DATA), [], {}, template.slots)
          .filter((block) => block.kind === "text")
          .map((block) => block.style.font),
      ),
    ].sort(),
  })),
};
if (report.templates.length !== 39)
  throw new Error(`Active font inventory expected 39 templates, found ${report.templates.length}`);
await writeFile("docs/docx-next/font-inventory.json", JSON.stringify(report, null, 2) + "\n");
console.log(
  `Inventoried ${report.templates.length} active templates, ${Object.keys(WORD_FONTS).length} font keys and ${fonts.length} local faces.`,
);
