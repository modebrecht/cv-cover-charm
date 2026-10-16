import { modernProjectFixture } from "./modern-project";
import { DEFAULT_DOSSIER_CHROME_STATE } from "../../../src/lib/dossier-chrome";

export const MODERN_INTERIOR_CASES = [
  "header-inline",
  "header-stacked",
  "header-inline-pipe",
  "header-reduced",
  "cv-pills",
  "cv-pills-offset",
] as const;

/** New audit cases only; the reviewed normal/Brief saved fixtures stay unchanged. */
export function modernInteriorProjectFixture(kind: string, photo?: string) {
  const project = modernProjectFixture("normal", photo);
  if (kind.startsWith("header-")) {
    project.chrome = structuredClone(DEFAULT_DOSSIER_CHROME_STATE);
    Object.assign(project.chrome.shared, {
      headerMode: "contact",
      headerTextLayout: kind === "header-stacked" ? "stacked" : "inline",
      headerDifferentFirstPage: kind === "header-reduced",
      headerInlineSeparator: kind === "header-inline-pipe" ? "pipe" : "icons",
      textFont: "sans",
    });
  }
  if (kind.startsWith("cv-pills")) {
    project.cv!.design.sectionTitlePill = true;
    if (kind === "cv-pills-offset") {
      project.cv!.design.sectionTitleOffsetMm = 4;
      project.cv!.design.sectionContentIndentMm = 6;
    }
  }
  if (kind === "header-reduced") {
    const example = project.cv!.data.erfahrung[0];
    project.cv!.data.erfahrung.push(
      ...Array.from({ length: 4 }, (_, i) => ({
        ...structuredClone(example),
        id: `header-followup-${i}`,
        ort: `Fortsetzung ${i + 1}, Hubersdorf`,
      })),
    );
  }
  return project;
}
