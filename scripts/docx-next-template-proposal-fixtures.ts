/** Template-only stopped assessments reuse the existing fixture runner in an isolated process. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { NEXT_TEMPLATES, type TemplateDefinition } from "../src/lib/docx-next/templates";
const descriptorFile = process.argv[3];
if (!process.argv[2] || !descriptorFile)
  throw new Error(
    "Usage: bun scripts/docx-next-template-proposal-fixtures.ts OUTPUT DESCRIPTOR_JSON",
  );
const descriptor = JSON.parse(await readFile(descriptorFile, "utf8")) as TemplateDefinition;
const registry = NEXT_TEMPLATES as Record<string, TemplateDefinition>;
const previous = registry[descriptor.id];
assert(descriptor.id && descriptor.cover && descriptor.cv, "Invalid QA descriptor");
registry[descriptor.id] = descriptor;
process.argv = [
  process.argv[0],
  process.argv[1],
  process.argv[2],
  `--${descriptor.id}`,
  "--verify-json",
];
try {
  await import("./docx-next-fixtures");
} finally {
  if (previous) registry[descriptor.id] = previous;
  else delete registry[descriptor.id];
}
