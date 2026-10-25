import { expect, test } from "bun:test";
import { briefDocxNextUiEnabled } from "../../src/lib/docx-next/brief-visibility";
import { validateBriefIntegrationModel } from "../../src/lib/brief-docx-next-export";
import { fontDeadline } from "../../src/lib/docx-next/brief-fonts.browser";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { briefFixture } from "../fixtures/docx-next/brief";

test("Brief integration is off unless the exact QA flag is present", () => {
  const before = Object.getOwnPropertyDescriptor(globalThis, "window");
  try {
    Object.defineProperty(globalThis, "window", { configurable: true, value: undefined });
    expect(briefDocxNextUiEnabled()).toBe(false);
    for (const search of [
      "",
      "?docx-next-brief-qa=true",
      "?docx-next-brief-qa=0",
      "?docx-next-brief-qa=1",
    ]) {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: { location: { search } },
      });
      expect(briefDocxNextUiEnabled()).toBe(search.endsWith("=1"));
    }
  } finally {
    if (before) Object.defineProperty(globalThis, "window", before);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("Brief integration cannot use its renderer opt-in to waive unresolved issues or frozen compositions", () => {
  const model = buildDossierDocModel(briefFixture());
  expect(() => validateBriefIntegrationModel(model)).not.toThrow();
  model.issues.push({
    code: "unresolved-legacy-typography",
    fieldId: "old-field",
    message: "needs binding",
  });
  expect(() => validateBriefIntegrationModel(model)).toThrow("unresolved-legacy-typography");
  model.issues = [];
  model.floatingTableTextFlow = "all-pages";
  expect(() => validateBriefIntegrationModel(model)).toThrow("Nicht freigegebene");
  model.floatingTableTextFlow = undefined;
  model.cv.firstFooter = [];
  expect(() => validateBriefIntegrationModel(model)).toThrow("nicht freigegeben");
  model.cv.firstFooter = undefined;
  const paragraph = model.letter.blocks.find((b) => b.kind === "paragraph")!;
  paragraph.controlPlacement = "inline";
  expect(() => validateBriefIntegrationModel(model)).toThrow("nicht freigegeben");
  paragraph.controlPlacement = undefined;
  model.cv.blocks.push({
    kind: "paragraph-frame",
    id: "forbidden.frame",
    xMm: 20,
    yMm: 20,
    widthMm: 100,
    paragraphs: [],
  });
  expect(() => validateBriefIntegrationModel(model)).toThrow("nicht freigegeben");
});

test("font capture has a bounded failure instead of hanging or returning unavailable metrics", async () => {
  expect(await fontDeadline(Promise.resolve("loaded"), 50)).toBe("loaded");
  await expect(fontDeadline(new Promise(() => {}), 10)).rejects.toThrow("Zeitlimit");
  await expect(fontDeadline(Promise.reject(new Error("load failed")), 50)).rejects.toThrow(
    "load failed",
  );
});
