import { buildDossierDocModel } from "../../../src/lib/docx-next/build-model";
import { parallelFlowTable } from "../../../src/lib/docx-next/parallel-flow";
import { walkBlocks, type ParallelFlowBlock } from "../../../src/lib/docx-next/model";
import { sidebarFixture } from "./sidebar";

export const PARALLEL_PAGINATION_CASES = [
  { id: "baseline", header: "none", entry: "row", topMm: 20, missingTail: false, detached: false },
  {
    id: "smaller-body",
    header: "none",
    entry: "row",
    topMm: 60,
    missingTail: true,
    detached: false,
  },
  {
    id: "contact-header",
    header: "contact",
    entry: "row",
    topMm: 60,
    missingTail: true,
    detached: false,
  },
  {
    id: "first-header",
    header: "first",
    entry: "row",
    topMm: 60,
    missingTail: true,
    detached: false,
  },
  {
    id: "paragraph-flow",
    header: "none",
    entry: "paragraph",
    topMm: 60,
    missingTail: false,
    detached: false,
  },
  {
    id: "paragraph-header",
    header: "first",
    entry: "paragraph",
    topMm: 60,
    missingTail: false,
    detached: true,
  },
  {
    id: "paragraph-keep-lines",
    header: "none",
    entry: "paragraph-keep-lines",
    topMm: 20,
    missingTail: false,
    detached: true,
  },
  {
    id: "paragraph-default-margin",
    header: "none",
    entry: "paragraph",
    topMm: 20,
    missingTail: false,
    detached: true,
  },
] as const;
export type ParallelPaginationCase = (typeof PARALLEL_PAGINATION_CASES)[number];

/** QA-only native-table counterexample, never a supported Sidebar candidate.
 * Lowering into an ordinary table isolates Word structures without changing any
 * production guard, renderer option, visible text, or serialized XML.
 */
export function parallelPaginationFixture(value: ParallelPaginationCase) {
  const input = sidebarFixture("main-long");
  if (value.header !== "none")
    input.settings.chrome = sidebarFixture(
      value.header === "first" ? "chrome-continuation" : "contact",
    ).settings.chrome;
  const model = buildDossierDocModel(input);
  const flow = model.cv.blocks.find(
    (block): block is ParallelFlowBlock => block.kind === "parallel-flow",
  )!;
  // Preserve the original independent-row counterexamples as candidate policy evolves.
  delete flow.rowAlignment;
  delete flow.spanningTracks;
  // Declare the comparison explicitly rather than inheriting future entry policy.
  for (const block of walkBlocks(flow.tracks.flatMap((track) => track.blocks))) {
    if (block.kind !== "entry") continue;
    if (block.id.startsWith("cv.entry.schule:") || block.id.startsWith("cv.entry.erfahrung:"))
      block.keepTogether = value.entry === "row";
  }
  if (value.entry !== "row")
    for (const block of walkBlocks(flow.tracks.flatMap((track) => track.blocks)))
      if (block.kind === "entry") {
        block.keepTogether = false;
        if (value.entry === "paragraph-keep-lines")
          block.blocks = block.blocks.map((p) =>
            p.kind === "paragraph" ? { ...p, keepLines: true } : p,
          );
      }
  model.cv.page.margins.top = value.topMm;
  const width = model.cv.page.widthMm - model.cv.page.margins.left - model.cv.page.margins.right;
  model.cv.blocks = [parallelFlowTable(flow, width)];
  model.cv.layout.mode = "classic";
  return { model, flow };
}
