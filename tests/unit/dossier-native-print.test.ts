import { describe, expect, test } from "bun:test";
import {
  dossierNativePrintPages,
  dossierNativePrintReadiness,
} from "../../src/lib/dossier-native-print";

function fixture(letterCount = 1, cvCount = 1) {
  const layer = { scrollHeight: 100, clientHeight: 100 };
  const sheet = (kind: "cover" | "letter" | "cv") => ({
    dataset: kind === "cover" ? { dossierDocument: "cover" } : {},
    hasAttribute: (name: string) => name === `data-${kind}-page`,
    querySelector: () => layer,
  });
  const pages = [
    sheet("cover"),
    ...Array.from({ length: letterCount }, () => sheet("letter")),
    ...Array.from({ length: cvCount }, () => sheet("cv")),
  ];
  const letter = {
    dataset: {
      letterPaginationReady: "true",
      letterPageCount: String(letterCount),
      letterPaginationError: "",
      letterPaginationErrorMessage: "",
    },
  };
  const dataset = { dossierCvReady: "true", dossierCvPageCount: String(cvCount) };
  const root = {
    dataset,
    querySelectorAll: () => pages,
    querySelector: () => letter,
  } as unknown as HTMLElement;
  return { root, pages, dataset, letter, layer };
}

describe("native dossier preparation", () => {
  test("collects the original canonical pages in DOM order without copies", () => {
    const { root, pages } = fixture(2, 3);
    const collected = dossierNativePrintPages(root);
    expect(collected).toHaveLength(6);
    collected.forEach((page, index) => expect(page).toBe(pages[index]));
    expect(dossierNativePrintReadiness(root).ready).toBe(true);
  });

  test("waits for CV pagination and matching mounted counts", () => {
    const { root, dataset } = fixture();
    dataset.dossierCvReady = "false";
    expect(dossierNativePrintReadiness(root).ready).toBe(false);
    dataset.dossierCvReady = "true";
    dataset.dossierCvPageCount = "2";
    expect(dossierNativePrintReadiness(root).ready).toBe(false);
  });

  test("waits for Letter pagination and matching mounted counts", () => {
    const { root, letter } = fixture(2);
    letter.dataset.letterPaginationReady = "false";
    expect(dossierNativePrintReadiness(root).ready).toBe(false);
    letter.dataset.letterPaginationReady = "true";
    letter.dataset.letterPageCount = "3";
    expect(dossierNativePrintReadiness(root).ready).toBe(false);
  });

  test("blocks actual Letter overflow even when pagination reports ready", () => {
    const { root, layer } = fixture();
    layer.scrollHeight = 110;
    const result = dossierNativePrintReadiness(root);
    expect(result.ready).toBe(false);
    expect(result.error).toContain("läuft über");
  });

  test("preserves a blocking Letter error for the user", () => {
    const { root, letter } = fixture();
    letter.dataset.letterPaginationError = "physical-overflow";
    letter.dataset.letterPaginationErrorMessage = "Briefinhalt prüfen";
    expect(dossierNativePrintReadiness(root)).toMatchObject({
      ready: false,
      error: "Briefinhalt prüfen",
    });
  });

  test("does not accept a dossier with missing physical parts", () => {
    expect(dossierNativePrintReadiness(fixture(0).root).ready).toBe(false);
    expect(dossierNativePrintReadiness(fixture(1, 0).root).ready).toBe(false);
    const { root, pages } = fixture();
    pages.shift();
    expect(dossierNativePrintReadiness(root).ready).toBe(false);
  });
});
