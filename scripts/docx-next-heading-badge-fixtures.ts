/** Bounded badge policy evidence, reusing the existing native/package/render QA. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { briefFixture, briefVariantFixture } from "../tests/fixtures/docx-next/brief";
import { headingBadgeModel } from "../tests/fixtures/docx-next/heading-badges";
import { buildDossierDocModel } from "../src/lib/docx-next/build-model";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import { walkBlocks, type TextRun } from "../src/lib/docx-next/model";

const out = process.argv[2];
if (!out) throw new Error("Usage: bun scripts/docx-next-heading-badge-fixtures.ts DIRECTORY");
await mkdir(out, { recursive: true });
const manifest = [],
  restoration = [];
for (const variant of ["classic", "timeline", "editorial"] as const)
  for (const choice of ["default-on", "saved-off", "legacy-off"] as const) {
    const input = variant === "classic" ? briefFixture() : briefVariantFixture(`${variant}-short`);
    delete input.cv.design.sectionTitlePill;
    delete input.cv.design.citrusRubricPill;
    if (choice === "saved-off") input.cv.design.sectionTitlePill = false;
    if (choice === "legacy-off") input.cv.design.citrusRubricPill = false;
    const before = JSON.stringify(input),
      started = performance.now();
    const model = headingBadgeModel(input, true);
    const restored = headingBadgeModel(JSON.parse(before), true);
    assert.deepEqual(restored, model);
    assert.equal(JSON.stringify(input), before);
    const bytes = new Uint8Array(await (await renderDossierDocx(model)).arrayBuffer());
    assert.deepEqual(
      new Uint8Array(await (await renderDossierDocx(restored)).arrayBuffer()),
      bytes,
    );
    if (choice !== "default-on") {
      const unchanged = buildDossierDocModel(input);
      unchanged.templateId = model.templateId;
      assert.deepEqual(unchanged, model);
      assert.deepEqual(
        new Uint8Array(await (await renderDossierDocx(unchanged)).arrayBuffer()),
        bytes,
      );
    }
    const fixture = `badge-${variant}-${choice}`;
    await writeFile(`${out}/${fixture}.docx`, bytes);
    const text = (run: TextRun) =>
      run.style.allCaps ? run.text.toLocaleUpperCase("de-CH") : run.text;
    const parts = [model.cover, model.letter, model.cv].map((part) => ({
      id: part.id,
      expectedPages: part.id === "cv" && variant === "classic" ? 2 : 1,
      contentBoxMm: part.page.margins,
      semanticText: walkBlocks(part.blocks).flatMap((b) =>
        b.kind === "paragraph" ? b.runs.map(text) : [],
      ),
      artwork: part.artwork,
      pageScopedShapes: part.headerShapes ?? [],
    }));
    manifest.push({
      fixture,
      headingBadgesEnabled: choice === "default-on",
      expectedPages: parts.reduce((sum, p) => sum + p.expectedPages, 0),
      expectedImages: 0,
      bytes: bytes.length,
      durationMs: Math.round(performance.now() - started),
      parts,
      semanticText: [model.cover, model.letter, model.cv].flatMap((part) =>
        walkBlocks([...part.blocks, ...part.header, ...part.footer]).flatMap((b) =>
          b.kind === "paragraph" ? b.runs.map(text) : [],
        ),
      ),
    });
    restoration.push({
      fixture,
      input: "pass",
      model: "pass",
      immutable: "pass",
      docxSha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
await writeFile(`${out}/manifest.json`, JSON.stringify(manifest, null, 2));
await writeFile(`${out}/json-restoration-report.json`, JSON.stringify(restoration, null, 2));
console.log(
  `Generated ${manifest.length} immutable badge policy fixtures with unchanged saved-off models/packages.`,
);
