import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../../src/components/cover/ElementBar.tsx", import.meta.url),
  "utf8",
);

describe("element proportion lock regression", () => {
  test("restores the persistent proportion control without replacing current sizing logic", () => {
    expect(source).toContain('lockRatio?: boolean');
    expect(source).toContain('const lockRatio = st.lockRatio ?? (isPhoto || isImage);');
    expect(source).toContain('checked={lockRatio}');
    expect(source).toContain('lockRatio: e.target.checked');

    const guardedWidthUpdates = source.match(
      /\.\.\.\(lockRatio \? \{\} : keepHeight\(block, w\)\)/g,
    );
    expect(guardedWidthUpdates?.length).toBe(2);
  });
});
