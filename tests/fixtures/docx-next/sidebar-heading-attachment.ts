/** Neutral native diagnostics; these never enable an application Sidebar export. */
import assert from "node:assert/strict";
import { buildDossierDocModel } from "../../../src/lib/docx-next/build-model";
import { parallelFlowTable } from "../../../src/lib/docx-next/parallel-flow";
import { sectionHeadingPrefix } from "../../../src/lib/docx-next/heading-prefix";
import { semanticFlowUnits } from "../../../src/lib/docx-next/semantic-flow-units";
import {
  walkBlocks,
  type ParallelFlowBlock,
  type DocBlock,
  type Paragraph,
} from "../../../src/lib/docx-next/model";
import { briefFixture } from "./brief";
import { sidebarFixture, sidebarOpeningFieldIds } from "./sidebar";

export const SIDEBAR_HEADING_CASES = [
  ...[false, true].flatMap((photo) =>
    [false, true].flatMap((rail) =>
      [false, true].map((nested) => ({
        name: `minimum-${photo ? "photo" : "plain"}-${rail ? "rail" : "empty"}-${nested ? "nested" : "row"}`,
        kind: "minimum" as const,
        photo,
        rail,
        nested,
        disableHeadingAttachment: false,
      })),
    ),
  ),
  ...[false, true].flatMap((disableHeadingAttachment) => [
    {
      name: `overflow-${disableHeadingAttachment ? "heading-off" : "control"}`,
      kind: "overflow" as const,
      photo: true,
      rail: true,
      nested: false,
      disableHeadingAttachment,
    },
    {
      name: `oversized-${disableHeadingAttachment ? "heading-off" : "control"}`,
      kind: "oversized" as const,
      photo: false,
      rail: true,
      nested: false,
      disableHeadingAttachment,
    },
  ]),
];
export type SidebarHeadingCase = (typeof SIDEBAR_HEADING_CASES)[number] & {
  boundaryLeadMm?: number;
  descriptionAttachmentExpected?: boolean;
};
export const SIDEBAR_PREFIX_BOUNDARY_CASES: SidebarHeadingCase[] = [
  220, 224, 226, 228, 230, 234,
].map((boundaryLeadMm) => ({
  name: `boundary-${boundaryLeadMm}`,
  kind: "oversized",
  photo: false,
  rail: true,
  nested: false,
  disableHeadingAttachment: false,
  boundaryLeadMm,
  descriptionAttachmentExpected: boundaryLeadMm >= 226,
}));

export function sidebarHeadingAttachmentFixture(value: SidebarHeadingCase, nativePrefix = false) {
  const source = buildDossierDocModel(
    sidebarFixture(value.kind === "oversized" ? "paragraph-long" : "photo-free-main"),
  );
  const flow = source.cv.blocks.find(
    (block): block is ParallelFlowBlock => block.kind === "parallel-flow",
  )!;
  const model = buildDossierDocModel(briefFixture("normal"));
  const width = model.cv.page.widthMm - model.cv.page.margins.left - model.cv.page.margins.right;
  let mainCell: number;
  let mainWidth: number;
  if (value.kind === "oversized") {
    const diagnostic = structuredClone(flow);
    const section = diagnostic.tracks[1].blocks.find(
      (block) => block.id === "cv.section.custom:long-paragraph",
    );
    assert(section?.kind === "section");
    // Authored flow content, not a renderer page measurement or user-text lookup.
    diagnostic.tracks[1].blocks = [
      { kind: "spacer", id: "probe.boundary-lead", heightMm: value.boundaryLeadMm ?? 230 },
      section,
    ];
    diagnostic.tracks[0].blocks = [];
    const table = parallelFlowTable(diagnostic, width);
    if (value.disableHeadingAttachment)
      for (const block of walkBlocks(table.rows[1].cells[2]))
        if (block.kind === "section" && block.heading) block.heading.keepNext = false;
    model.cv.blocks = [table];
    mainCell = 2;
    mainWidth = table.widths[mainCell];
  } else {
    const [main, side] = structuredClone(flow.tracks).reverse();
    side.decoration!.border!.side = "left";
    const zone = main.blocks[0];
    assert(zone.kind === "image-zone");
    zone.leftInsetMm = 6;
    const prefixCounts = [4, 1]; // picture/title/name/Family; Contact
    const opening: ParallelFlowBlock = {
      ...flow,
      id: `probe.${value.name}`,
      rowAlignment: undefined,
      spanningTracks: undefined,
      leadingInsetMm: undefined,
      tracks: [
        { ...main, blocks: main.blocks.slice(value.photo ? 0 : 1, prefixCounts[0]) },
        {
          ...side,
          blocks: value.rail ? side.blocks.slice(0, prefixCounts[1]) : [],
          decoration: value.rail ? side.decoration : undefined,
        },
      ],
    };
    const table = parallelFlowTable(opening, width);
    if (value.kind === "minimum") {
      const school = main.blocks[prefixCounts[0]];
      assert(school.kind === "section");
      const first = { ...school, blocks: school.blocks.slice(0, 1) };
      table.rows.push({
        cells: [value.nested ? [first] : semanticFlowUnits([first])[0], [], []],
        keepTogether: true,
        cellDecorations: [
          { paddingXMm: 0, paddingYMm: 0 },
          { paddingXMm: 0, paddingYMm: 0 },
          value.rail ? { ...side.decoration!, paddingTopMm: 0 } : undefined,
        ],
      });
    } else {
      const continuation: ParallelFlowBlock = {
        ...flow,
        id: `${opening.id}.continuation`,
        spanningTracks: [],
        leadingInsetMm: 0,
        tracks: [
          { ...main, blocks: main.blocks.slice(prefixCounts[0]) },
          { ...side, blocks: side.blocks.slice(prefixCounts[1]) },
        ],
      };
      const tail = parallelFlowTable(continuation, width);
      if (value.disableHeadingAttachment)
        for (const row of tail.rows)
          for (const block of walkBlocks(row.cells[0]))
            if (block.kind === "section" && block.heading) block.heading.keepNext = false;
      table.rows.push(...tail.rows);
    }
    model.cv.blocks = [table];
    mainCell = 0;
    mainWidth = table.widths[mainCell];
  }
  if (nativePrefix) {
    // Compose before rendering. These authored fixture boundaries use paragraph attachment,
    // never visible values, geometry estimates, templates or exported package repair.
    const lower = (blocks: DocBlock[]): DocBlock[] =>
      blocks.map((block) => {
        if (block.kind === "section" && block.heading && block.blocks.length) {
          const first = block.blocks[0];
          if (first.kind !== "paragraph" && first.kind !== "entry") return block;
          if (first.kind === "entry" && first.blocks[0]?.kind !== "paragraph") return block;
          let count = 1;
          if (first.kind === "entry") {
            count = 0;
            while (
              first.blocks[count]?.kind === "paragraph" &&
              (first.blocks[count] as Paragraph).keepNext
            )
              count++;
            count = Math.max(1, count);
          }
          return sectionHeadingPrefix(block, count);
        }
        if (block.kind === "table")
          return {
            ...block,
            rows: block.rows.map((row) => ({ ...row, cells: row.cells.map(lower) })),
          };
        if (block.kind === "entry" || block.kind === "group")
          return { ...block, blocks: lower(block.blocks) };
        return block;
      });
    model.cv.blocks = lower(model.cv.blocks);
  }
  const table = model.cv.blocks[0];
  assert(table.kind === "table");
  const leftMm =
    model.cv.page.margins.left + table.widths.slice(0, mainCell).reduce((a, b) => a + b, 0);
  const paragraphs = walkBlocks(model.cv.blocks).filter((block) => block.kind === "paragraph");
  const field = (fieldId: string) => {
    const paragraph = paragraphs.find((block) => block.id === fieldId);
    assert(paragraph, `Missing diagnostic field ${fieldId}`);
    return {
      fieldId,
      text: paragraph.runs.map((run) => run.text).join(""),
      leftMm,
      rightMm: leftMm + mainWidth,
    };
  };
  const firstPageFields =
    value.kind === "oversized"
      ? []
      : [
          ...sidebarOpeningFieldIds("photo-free-mirrored-main"),
          "cv.entry.schule:demo-s1.date",
          "cv.entry.schule:demo-s1.title",
          "cv.entry.schule:demo-s1.place",
          "cv.entry.schule:demo-s1.description",
        ].map(field);
  return {
    model,
    fixture: {
      fixture: `${nativePrefix ? "prefix-" : ""}${value.name}`,
      nativePrefix,
      diagnostic: value,
      // Whole units survive model/portable-style JSON serialization unchanged.
      cvSemanticText: paragraphs.map((paragraph) => paragraph.runs.map((run) => run.text).join("")),
      parts: [
        { expectedPages: 1, contentBoxMm: model.cover.page.margins },
        { expectedPages: 1, contentBoxMm: model.letter.page.margins },
        { contentBoxMm: model.cv.page.margins, firstPageFlowProbes: firstPageFields },
      ],
      ...(value.kind === "oversized"
        ? {
            headingAttachmentProbe: {
              heading: field("cv.section.custom:long-paragraph.heading"),
              entry: field("cv.entry.custom:long-paragraph:long-paragraph-entry.title"),
            },
          }
        : {}),
    },
  };
}
