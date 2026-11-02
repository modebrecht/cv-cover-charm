/** Bounded synthetic Word regression; never enables diagnostics in product downloads. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { sidebarFixture } from "../tests/fixtures/docx-next/sidebar";
import { buildDossierDocModel } from "../src/lib/docx-next/build-model";
import { createDossierDocxNextBlob } from "../src/lib/docx-next/export";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";

const out = process.argv[2];
assert(out, "Output directory required");
const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
await mkdir(out, { recursive: true });
const capture = process.env.WORD_QA_CAPTURE_BASELINE_SHA;
if (capture)
  assert.equal(sha, capture, "Baseline capture must use the declared old implementation");
const baseline = capture
  ? undefined
  : JSON.parse(await readFile("tests/fixtures/docx-next/word-consolidation-baseline.json", "utf8"));
const regular: Record<string, string> = {};
// A literal synthetic PNG adapter makes package-byte comparison deterministic.
// It checks renderer stability, not browser image decoding or Word acceptance.
const pixels = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0X8AAAAASUVORK5CYII=",
  ),
  (c) => c.charCodeAt(0),
);
const normalizeImage = async () => ({
  bytes: pixels,
  widthPx: 1,
  heightPx: 1,
  contentType: "image/png" as const,
  extension: "png" as const,
});
for (const kind of ["left", "both-long", "photo-left", "photo-free-portrait"] as const) {
  for (const side of ["left", "right"] as const) {
    const input = sidebarFixture(kind, "synthetic-png");
    input.settings.sidebarSide = side;
    const before = structuredClone(input);
    const model = buildDossierDocModel(input, {
      cvSidebarComposition: "shared-body-stories",
      cvPhotoComposition: "ordinary-picture",
    });
    const bytes = new Uint8Array(
      await (
        await renderDossierDocx(model, { normalizeImage, allowUnacceptedModelIssues: true })
      ).arrayBuffer(),
    );
    assert.deepEqual(input, before);
    const id = kind + "-" + side;
    regular[id] = hash(bytes);
    if (baseline)
      assert.equal(
        regular[id],
        baseline.normal_package_sha256[id],
        "Normal package changed: " + id,
      );
  }
}
if (capture) {
  await writeFile(
    path.join(out, "baseline.json"),
    JSON.stringify(
      {
        baseline_commit: sha,
        scope:
          "Eight deterministic normal packages; explicit synthetic PNG adapter, no browser/Word claim",
        normal_package_sha256: regular,
      },
      null,
      2,
    ) + "\n",
  );
} else {
  assert.equal(Object.keys(baseline.normal_package_sha256).length, 8);
  const rows = [];
  for (const side of ["left", "right"] as const) {
    const input = sidebarFixture("both-long");
    input.settings.sidebarSide = side;
    const before = structuredClone(input);
    const diagnostic = {
      cvSidebarComposition: "body-stories" as const,
      chromeFirstPageIdentity: "distinct-stories" as const,
    };
    await assert.rejects(createDossierDocxNextBlob(input, diagnostic), /is unaccepted/);
    const candidate = new Uint8Array(
      await (
        await createDossierDocxNextBlob(input, { ...diagnostic, allowUnacceptedModelIssues: true })
      ).arrayBuffer(),
    );
    assert.deepEqual(input, before);
    const id = "body-long-" + side;
    await writeFile(path.join(out, id + ".docx"), candidate);
    rows.push({ id, side, sha256: hash(candidate) });
  }
  await writeFile(
    path.join(out, "MANIFEST.json"),
    JSON.stringify(
      {
        sha,
        baseline_commit: baseline.baseline_commit,
        normal_package_sha256: regular,
        normal_packages_identical: 8,
        candidate_scope:
          "Two synthetic long body-story diagnostics; no photos or production/Word approval",
        cases: rows,
      },
      null,
      2,
    ) + "\n",
  );
}
