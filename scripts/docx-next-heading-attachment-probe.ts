/** Bounded generic Sidebar diagnostics; never an application support-policy bypass. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { paintPng } from "../src/lib/docx-next/artwork";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import {
  SIDEBAR_HEADING_CASES,
  sidebarHeadingAttachmentFixture,
} from "../tests/fixtures/docx-next/sidebar-heading-attachment";
const directory = process.argv[2];
if (!directory || process.argv.length !== 3)
  throw new Error("Usage: bun scripts/docx-next-heading-attachment-probe.ts QA_DIRECTORY");
await mkdir(directory, { recursive: true });
const png = paintPng({ color: "E61414", endColor: "1432D2" });
for (const value of SIDEBAR_HEADING_CASES) {
  const { model, fixture } = sidebarHeadingAttachmentFixture(value);
  assert.deepEqual(sidebarHeadingAttachmentFixture(value).model, model);
  const imageOptions = {
    normalizeImage: async () => ({
      bytes: png,
      widthPx: 1,
      heightPx: 256,
      extension: "png" as const,
      contentType: "image/png" as const,
    }),
  };
  const docx = new Uint8Array(await (await renderDossierDocx(model, imageOptions)).arrayBuffer());
  const restored = new Uint8Array(
    await (await renderDossierDocx(JSON.parse(JSON.stringify(model)), imageOptions)).arrayBuffer(),
  );
  assert.deepEqual(restored, docx, "Model JSON roundtrip changed the native package");
  await writeFile(path.join(directory, value.name + ".docx"), docx);
  await writeFile(
    path.join(directory, value.name + ".json"),
    JSON.stringify(fixture, null, 2) + "\n",
  );
}
await writeFile(
  path.join(directory, "heading-attachment-manifest.json"),
  JSON.stringify(SIDEBAR_HEADING_CASES, null, 2) + "\n",
);
console.log(
  `Created ${SIDEBAR_HEADING_CASES.length} native heading/continuation diagnostics; application guard unchanged.`,
);
