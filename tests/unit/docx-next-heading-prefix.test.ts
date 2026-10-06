import { expect, test } from "bun:test";
import { sectionHeadingPrefix } from "../../src/lib/docx-next/heading-prefix";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { walkBlocks, type SectionBlock } from "../../src/lib/docx-next/model";
import { briefFixture } from "../fixtures/docx-next/brief";

const school = () =>
  walkBlocks(buildDossierDocModel(briefFixture("normal")).cv.blocks).find(
    (block): block is SectionBlock => block.kind === "section" && block.id === "cv.section.schule",
  )!;

test("native heading prefix attaches declared metadata and leaves the description outside the atomic prefix", () => {
  const source = school();
  const before = structuredClone(source);
  const result = sectionHeadingPrefix(source, 3);
  const entry = result.blocks[0];
  expect(entry.kind).toBe("entry");
  if (entry.kind !== "entry") throw new Error("Missing first entry");
  expect(entry.keepTogether).toBe(false);
  const prefix = entry.blocks[0];
  expect(prefix.kind).toBe("entry");
  if (prefix.kind !== "entry") throw new Error("Missing attachment prefix");
  expect(prefix.keepTogether).toBe(true);
  const ids = walkBlocks([prefix]).map((b) => b.id);
  expect(ids).toContain("cv.section.schule.heading");
  expect(ids).toContain("cv.entry.schule:demo-s1.place");
  expect(ids).not.toContain("cv.entry.schule:demo-s1.description");
  expect(walkBlocks(entry.blocks.slice(1)).map((b) => b.id)).toContain(
    "cv.entry.schule:demo-s1.description",
  );
  const fields = (value: SectionBlock) =>
    walkBlocks([value])
      .filter((b) => b.kind === "paragraph")
      .map((b) => ({ id: b.id, runs: b.runs }))
      .sort((a, b) => a.id.localeCompare(b.id));
  expect(fields(result)).toEqual(fields(source));
  expect(source).toEqual(before);
});

test("prefix keeps the heading at section origin and preserves body inset on metadata and following entries", () => {
  const source = school();
  source.contentIndentMm = 7;
  const result = sectionHeadingPrefix(source, 3);
  expect(result.contentIndentMm).toBe(0);
  const first = result.blocks[0];
  if (first.kind !== "entry" || first.blocks[0].kind !== "entry") throw new Error("Missing prefix");
  const prefix = first.blocks[0];
  expect(prefix.blocks[0]).toMatchObject({
    id: source.heading!.id,
    indentMm: source.heading!.indentMm,
  });
  expect(prefix.blocks[1]).toMatchObject({ kind: "section", contentIndentMm: 7 });
  expect(first.blocks[1]).toMatchObject({ kind: "section", contentIndentMm: 7 });
  expect(result.blocks[1]).toMatchObject({ kind: "section", contentIndentMm: 7 });
  expect(source.contentIndentMm).toBe(7);
  const ids = walkBlocks([result]).map((b) => b.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test("native prefix rejects undeclared or unusable boundaries instead of estimating content size", () => {
  const source = school();
  for (const count of [0, -1, 1.5, Infinity, NaN, 100])
    expect(() => sectionHeadingPrefix(source, count)).toThrow("invalid heading prefix");
  expect(() => sectionHeadingPrefix({ ...source, heading: undefined }, 1)).toThrow(
    "invalid heading prefix",
  );
  expect(() => sectionHeadingPrefix({ ...source, blocks: [] }, 1)).toThrow(
    "invalid heading prefix",
  );
  expect(() =>
    sectionHeadingPrefix({ ...source, blocks: [{ kind: "spacer", id: "space", heightMm: 5 }] }, 1),
  ).toThrow("invalid heading prefix");
});
