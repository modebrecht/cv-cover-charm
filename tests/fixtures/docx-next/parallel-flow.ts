import { buildDossierDocModel } from "../../../src/lib/docx-next/build-model";
import {
  walkBlocks,
  type Paragraph,
  type ParallelFlowBlock,
} from "../../../src/lib/docx-next/model";
import { briefFixture } from "./brief";

export function parallelFlowFixture(kind: "short" | "main-long" | "side-long" | "both-long") {
  const model = buildDossierDocModel(
    briefFixture(kind.includes("main") || kind === "both-long" ? "long-cv" : "normal"),
  );
  const prototype = walkBlocks(model.cv.blocks).find(
    (block): block is Paragraph => block.kind === "paragraph" && block.role === "body",
  )!;
  const side: Paragraph[] = Array.from(
    { length: kind.includes("side") || kind === "both-long" ? 55 : 5 },
    (_, index) => ({
      ...prototype,
      id: `parallel.side:${index}`,
      keepNext: false,
      keepLines: false,
      runs: [
        {
          ...prototype.runs[0],
          id: `parallel.side:${index}.run`,
          text: `Seitentext ${index + 1}. Editierbare Fähigkeiten und persönliche Interessen bleiben in ihrer eigenen Word-Spur.`,
        },
      ],
    }),
  );
  const parallel: ParallelFlowBlock = {
    kind: "parallel-flow",
    id: "parallel.proof",
    gapMm: 6,
    tracks: [
      {
        weight: 0.3,
        blocks: side,
        decoration: {
          fillColor: "EDF2F7",
          paddingXMm: 3,
          paddingYMm: 3,
          border: { color: "315A80", widthMm: 0.3, side: "right" },
        },
      },
      { weight: 0.7, blocks: model.cv.blocks },
    ],
  };
  model.cv.blocks = [parallel];
  return model;
}
