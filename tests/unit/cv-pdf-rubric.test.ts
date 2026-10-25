import { expect, test } from "bun:test";
import { normalizeCvRubricPillsForPdf } from "../../src/lib/cv-pdf-rubric";

test("PDF clone removes inset shadow only for enabled CV rubric pills", () => {
  const edited: Array<[string, string, string]> = [];
  const ignored: Array<[string, string, string]> = [];
  const eligible = {
    closest: (selector: string) => (selector === '[data-cv-rubric-pill="true"]' ? {} : null),
    style: { setProperty: (...args: [string, string, string]) => edited.push(args) },
  } as unknown as HTMLElement;
  const ordinary = {
    closest: () => null,
    style: { setProperty: (...args: [string, string, string]) => ignored.push(args) },
  } as unknown as HTMLElement;
  const clone = {
    querySelectorAll: (selector: string) => {
      expect(selector).toBe("[data-cv-section-title]");
      return [eligible, ordinary];
    },
  } as unknown as HTMLElement;
  normalizeCvRubricPillsForPdf(clone);
  expect(edited).toEqual([["box-shadow", "none", "important"]]);
  expect(ignored).toEqual([]);
});
