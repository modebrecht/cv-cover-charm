/** Diagnostic-only dossiers. No acceptance inference or production guard bypass. */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  PARALLEL_PAGINATION_CASES,
  parallelPaginationFixture,
} from "../tests/fixtures/docx-next/parallel-pagination";
import { walkBlocks } from "../src/lib/docx-next/model";
import { parallelFlowTable } from "../src/lib/docx-next/parallel-flow";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";

const folder = path.resolve(process.argv[2] ?? "artifacts/docx-next/parallel-pagination");
const rowAligned =
  process.argv.includes("--semantic-rows") || process.argv.includes("--spanning-rows");
const spanning = process.argv.includes("--spanning-rows");
await mkdir(folder, { recursive: true });
const manifest = [];
for (const value of PARALLEL_PAGINATION_CASES) {
  const { model, flow } = parallelPaginationFixture(value);
  if (rowAligned) {
    flow.rowAlignment = "semantic";
    if (spanning) flow.spanningTracks = [0];
    const width = model.cv.page.widthMm - model.cv.page.margins.left - model.cv.page.margins.right;
    model.cv.blocks = [parallelFlowTable(flow, width)];
  }
  const file = `${value.id}.docx`;
  const blob = await renderDossierDocx(model);
  await writeFile(path.join(folder, file), new Uint8Array(await blob.arrayBuffer()));
  const width = model.cv.page.widthMm - model.cv.page.margins.left - model.cv.page.margins.right;
  const available = width - flow.gapMm * (flow.tracks.length - 1);
  const weights = flow.tracks.reduce((sum, track) => sum + track.weight, 0);
  let left = model.cv.page.margins.left;
  const tracks = flow.tracks.map((track) => {
    const right = left + (available * track.weight) / weights;
    const paragraphs = walkBlocks(track.blocks).flatMap((block) =>
      block.kind === "paragraph"
        ? [{ id: block.id, text: block.runs.map((run) => run.text).join("") }]
        : [],
    );
    const entries = walkBlocks(track.blocks).flatMap((block) => {
      if (block.kind !== "entry") return [];
      const children = walkBlocks(block.blocks);
      const title = children.find(
        (child) => child.kind === "paragraph" && child.id.endsWith(".title"),
      );
      const description = children.find(
        (child) => child.kind === "paragraph" && child.id.endsWith(".description"),
      );
      return title?.kind === "paragraph" && description?.kind === "paragraph"
        ? [
            {
              id: block.id,
              title: title.runs.map((run) => run.text).join(""),
              descriptionStart: description.runs
                .map((run) => run.text)
                .join("")
                .slice(0, 40),
            },
          ]
        : [];
    });
    const result = { leftMm: left, rightMm: right, paragraphs, entries };
    left = right + flow.gapMm;
    return result;
  });
  manifest.push({
    ...value,
    ...(rowAligned ? { missingTail: false, detached: false } : {}),
    composition: spanning ? "spanning-rows" : rowAligned ? "semantic-rows" : "independent",
    file,
    page: model.cv.page,
    tracks,
  });
}
await writeFile(path.join(folder, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(
  `Generated ${manifest.length} diagnostic dossiers. These are not accepted Sidebar exports.`,
);
