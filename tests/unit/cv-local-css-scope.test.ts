import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

function cssFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? cssFiles(join(directory, entry.name))
      : entry.name.endsWith(".css")
        ? [join(directory, entry.name)]
        : [],
  );
}

test("no application CV template selector relies on html dossier identity", () => {
  const violations: string[] = [];
  for (const file of cssFiles("src")) {
    const css = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const rule of css.matchAll(/([^{}]+)\{[^{}]*\}/g)) {
      // Inspect comma-separated selector groups too, including shared :is backgrounds.
      const selector = rule[1];
      if (
        /html(?:\[|:)/.test(selector) &&
        /\[data-cv-|\[data-dossier-(?:document|chrome)="cv"/.test(selector)
      ) {
        // Shared declaration groups retain cover rules next to local CV rules.
        // Each global selector must end before a local selector's comma.
        for (const global of selector.matchAll(/html[^{}]+?(?=,\s*(?:html|div)|$)/g)) {
          if (
            global[0].includes("data-dossier-template") &&
            /\[data-cv-|\[data-dossier-(?:document|chrome)="cv"/.test(global[0])
          )
            violations.push(`${file}: ${global[0].trim()}`);
        }
      }
    }
  }
  expect(violations).toEqual([]);
  // Legacy artwork also includes inline style elements; these are part of the
  // application cascade and must obey the same local identity contract.
  expect(readFileSync("src/components/cover/CoverBackground.tsx", "utf8")).not.toContain(
    "html[data-dossier-template",
  );
});
