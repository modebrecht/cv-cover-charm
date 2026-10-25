/** Current synthetic source replay. No browser/Word acceptance or normal export switch.
 * bun scripts/docx-next-letter-source-flow-probe.ts ASSET_DIRECTORY NEW_OUTPUT [--recipient-cases]
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { buildDossierDocModel, type BuildModelOptions } from "../src/lib/docx-next/build-model";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import { walkBlocks } from "../src/lib/docx-next/model";
import { decorationAssetKey } from "../src/lib/docx-next/decoration";
import { compositePagePaint, decorationPageGeometry } from "../src/lib/docx-next/page-artwork";
import { flowSurfacePaint } from "../src/lib/docx-next/flow-surface";
import type { DossierAppSnapshot } from "../src/lib/docx-next/source";
import type { CoverTextMetrics } from "../src/components/cover/text-metrics";
import type { CvSidebarTextMetrics } from "../src/lib/docx-next/cv-sidebar-text-metrics";
import type { InteriorTextMetrics } from "../src/lib/docx-next/interior-metrics";
import type { NormalizedImage } from "../src/lib/docx-next/images";

const controlHash = "5e469d60181f8405fffcb43a57f92377fc6b0daa414d71ac22cd33ed3a6a25e0";
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const assetsDir = path.resolve(process.argv[2]), output = path.resolve(process.argv[3]);
assert.ok(process.argv[4] === undefined || process.argv[4] === "--recipient-cases", "Unknown probe option");
const fixture = JSON.parse(await readFile("tests/fixtures/docx-next/sidebar-contact-chrome-23okt.json", "utf8"));
const long = JSON.parse(await readFile("tests/fixtures/docx-next/sidebar-saved-app-22okt/03-right-continuation.json", "utf8"));
const source = fixture.snapshot as DossierAppSnapshot;
const metrics = fixture.sidebarMetrics as CvSidebarTextMetrics;
const school = long.cv.data.schule as DossierAppSnapshot["cv"]["data"]["schule"];
// Replay the published long-case transformation. These are copied frozen style
// values, not newly measured styles. Exact source-byte reproduction is the gate.
const first = source.cv.data.schule[0].id;
const fields = Object.fromEntries(["date", "title", "place", "description"].map(key =>
  [key, structuredClone(metrics.fields[`cv.entry.schule:${first}.${key}`])]));
const entry = structuredClone(metrics.entries[`cv.entry.schule:${first}`]);
for (const key of Object.keys(metrics.fields)) if (key.startsWith("cv.entry.schule:")) delete metrics.fields[key];
for (const key of Object.keys(metrics.entries)) if (key.startsWith("cv.entry.schule:")) delete metrics.entries[key];
source.cv.data.schule = school;
for (const row of school) {
  const id = `cv.entry.schule:${row.id}`;
  metrics.entries[id] = structuredClone(entry);
  for (const [field, key] of [["date", "zeit"], ["title", "titel"], ["place", "ort"], ["description", "beschreibung"]] as const)
    metrics.fields[`${id}.${field}`] = { ...structuredClone(fields[field]), text: row[key] };
}
metrics.sourceKey = fixture.interiorMetrics.sourceKey = JSON.stringify(source);
const options: BuildModelOptions = {
  coverComposition: "authored-frames", coverTextMetrics: fixture.metrics as CoverTextMetrics,
  coverBadgePlacement: "body", cvSidebarComposition: "shared-body-stories",
  chromeFirstPageIdentity: "distinct-stories", interiorTextMetrics: fixture.interiorMetrics as InteriorTextMetrics,
  cvSidebarTextMetrics: metrics,
};
const baseline = buildDossierDocModel(source, options);
const candidate = buildDossierDocModel(source, { ...options, letterFlowComposition: "source-lines" });
assert.deepEqual(candidate.cover, baseline.cover);
assert.deepEqual(candidate.cv, baseline.cv);
const manifest = JSON.parse(await readFile(path.join(assetsDir, "assets.json"), "utf8")) as {
  controlSha256: string;
  assets: Record<string, Omit<NormalizedImage, "bytes"> & { file: string; sha256: string }>;
};
assert.equal(manifest.controlSha256, controlHash);
const assets = new Map<string, NormalizedImage>();
for (const [id, asset] of Object.entries(manifest.assets)) {
  assert.equal(path.basename(asset.file), asset.file);
  const bytes = new Uint8Array(await readFile(path.join(assetsDir, asset.file)));
  assert.equal(hash(bytes), asset.sha256);
  assets.set(id, { ...asset, bytes });
}
const keyed = new Map<string, NormalizedImage>();
for (const part of [candidate.cover, candidate.letter, candidate.cv]) {
  const paints = part.pagePaintComposition
    ? [false, true].map(firstPage => compositePagePaint(part, firstPage)).filter(p => !!p)
    : (part.headerShapes ?? []);
  for (const block of [...walkBlocks(part.blocks).flatMap(b =>
    b.kind === "paragraph" && b.flowSurface ? [b, flowSurfacePaint(b)] : [b]), ...paints]) {
    if (block.kind !== "decorative-shape") continue;
    const bounds = decorationPageGeometry(block, part.page);
    const paint = { ...block, ...(block.clipToPage ? { viewport: {
      leftMm: bounds.xMm - block.xMm, topMm: bounds.yMm - block.yMm,
      widthMm: bounds.widthMm, heightMm: bounds.heightMm,
    } } : {}) };
    const asset = assets.get(block.id);
    assert.ok(asset, `Missing frozen paint ${block.id}`);
    keyed.set(decorationAssetKey(paint), asset);
  }
}
const render = async (model: typeof baseline) => {
  const blob = await renderDossierDocx(model, {
    allowUnacceptedModelIssues: true,
    normalizeImage: async () => { const a = assets.get("cv.person.photo"); assert.ok(a); return a; },
    rasterizeDecoration: async paint => { const a = keyed.get(decorationAssetKey(paint)); assert.ok(a); return a; },
    onDecorationFailure: (_id, error) => { throw error; },
  });
  return new Uint8Array(await blob.arrayBuffer());
};
const originalBytes = await render(baseline);
assert.equal(hash(originalBytes), controlHash, "Frozen source replay changed; stop rather than accept a stale control");
const candidateBytes = await render(candidate);
assert.ok(candidate.issues.some(i => i.code === "letter-source-flow-unaccepted"));
let exists = false;
try { await access(output); exists = true; } catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}
assert.equal(exists, false, "Use a new output directory");
await mkdir(output, { recursive: true });
await writeFile(path.join(output, "Control.docx"), originalBytes);
await writeFile(path.join(output, "Letter-Candidate.docx"), candidateBytes);
await writeFile(path.join(output, "probe.json"), JSON.stringify({
  sourceRebuiltByteExactly: true, sourceSha256: hash(originalBytes), candidateSha256: hash(candidateBytes),
  coverModelUnchanged: true, cvModelUnchanged: true,
  scope: "Current frozen synthetic long case; full model and native renderer; reused frozen nonsemantic paint",
  normalExportGuard: "CLOSED", wordAcceptance: "UNVERIFIED",
  recipientComposition: "growable-native-minimum-row",
}, null, 2) + "\n");
if (process.argv[4] === "--recipient-cases") {
  const cases = ["wide", "recipient-long", "recipient-huge", "one-row", "right-aligned", "body-long", "attachments"] as const;
  const reports = [];
  for (const name of cases) {
    const synthetic = structuredClone(source);
    if (name === "wide" || name === "recipient-long" || name === "recipient-huge") {
      const count = name === "wide" ? 10 : name === "recipient-long" ? 80 : 700;
      synthetic.letter.data.empfaengerFirma = Array.from({ length: count }, () => "WWWWWW").join(" ");
    }
    if (name === "one-row")
      for (const key of ["empfaengerName", "empfaengerAdresse", "empfaengerPlzOrt"] as const)
        synthetic.letter.data[key] = "";
    if (name === "right-aligned") {
      synthetic.letter.design.recipientAlign = "right";
      synthetic.letter.design.dateAlign = "right";
    }
    if (name === "body-long")
      synthetic.letter.data.text = Array.from({ length: 12 }, (_, i) =>
        `Synthetischer Briefabsatz ${i + 1}. ` +
        "Hier steht editierbarer Testtext zur Prüfung des natürlichen Seitenumbruchs. ".repeat(4)).join("\n\n");
    if (name === "attachments")
      synthetic.letter.data.beilagen = Array.from({ length: 8 }, (_, i) => `Synthetische Beilage ${i + 1}`);
    // Derived synthetic cases reuse frozen styles; these are not fresh browser
    // measurements. The complete unchanged control was verified above first.
    const sourceKey = JSON.stringify(synthetic);
    const derivedOptions: BuildModelOptions = {
      ...options,
      cvSidebarTextMetrics: { ...structuredClone(metrics), sourceKey },
      interiorTextMetrics: { ...structuredClone(fixture.interiorMetrics), sourceKey },
    };
    const control = buildDossierDocModel(synthetic, derivedOptions);
    const trial = buildDossierDocModel(synthetic, { ...derivedOptions, letterFlowComposition: "source-lines" });
    assert.deepEqual(trial.cover, baseline.cover);
    assert.deepEqual(trial.cv, baseline.cv);
    const controlBytes = await render(control), trialBytes = await render(trial);
    await writeFile(path.join(output, `${name}-Control.docx`), controlBytes);
    await writeFile(path.join(output, `${name}-Candidate.docx`), trialBytes);
    reports.push({ name, controlSha256: hash(controlBytes), candidateSha256: hash(trialBytes),
      coverModelUnchanged: true, cvModelUnchanged: true });
  }
  await writeFile(path.join(output, "recipient-cases.json"), JSON.stringify({
    scope: "Derived synthetic inputs with frozen styles; no fresh browser capture",
    verifiedOriginalControlSha256: controlHash, cases: reports, wordAcceptance: "UNVERIFIED",
  }, null, 2) + "\n");
}
console.log("Synthetic control reproduced byte-exactly; complete Letter candidate written.");
