/** Rebuild every captured App model without recapturing or changing saved data. */
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildDossierDocModel } from "../src/lib/docx-next/build-model";

const folder = path.resolve("docs/qa/docx-next-brief-reading-20okt");
const items = JSON.parse(await readFile(path.join(folder, "app-results.json"), "utf8"));
const results = [];
for (const item of items) {
  const proof = JSON.parse(await readFile(path.join(folder, item.id, "proof.json"), "utf8"));
  const before = JSON.stringify(proof.snapshot);
  const modern = item.template === "modern";
  const model = buildDossierDocModel(proof.snapshot, {
    coverComposition: "authored-frames",
    coverTextMetrics: proof.metrics,
    cvContactComposition: "compact-grid",
    cvContentComposition: "reading-rows",
    ...(proof.cvPersonalHeaderMetrics
      ? { cvPersonalHeaderMetrics: proof.cvPersonalHeaderMetrics }
      : {}),
    ...(proof.interiorMetrics ? { interiorTextMetrics: proof.interiorMetrics } : {}),
    ...(modern
      ? {
          coverBadgePlacement: "body" as const,
          cvRubricSpacing: "previous-block" as const,
          ...(Object.keys(proof.interiorMetrics?.headers ?? {}).length
            ? {}
            : {
                compactChromeComposition: "source-bands" as const,
              }),
        }
      : {}),
  });
  assert.deepEqual(
    JSON.parse(JSON.stringify(model)),
    proof.model,
    item.id + ": captured App model differs",
  );
  assert.equal(JSON.stringify(proof.snapshot), before, item.id + ": source changed");
  results.push({ id: item.id, exactCapturedModel: true, sourcePreserved: true });
}
await writeFile(path.join(folder, "model-rebuild.json"), JSON.stringify(results, null, 2) + "\n");
console.log(JSON.stringify(results));
