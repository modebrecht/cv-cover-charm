import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
const directory = process.env.PAGINATION_QA_DIR ?? "artifacts/pagination-2page";
const rows = [];
for (const file of (await readdir(directory)).sort()) {
  if (
    !/^(matrix|boundary|variant|live|fragmentation|chrome)-.*\.json$/.test(file) ||
    /-(search|calibration)\.json$/.test(file)
  )
    continue;
  const row = JSON.parse(await readFile(join(directory, file), "utf8"));
  if (!row.sourceSha) continue;
  const compactPage = ({ text, issues, ...page }) => ({ ...page, issues });
  rows.push({
    name: row.name,
    kind: row.kind,
    status: row.status,
    sourceSha: row.sourceSha,
    sourceDirty: row.sourceDirty,
    runtimeDiff: row.runtimeDiff,
    runtimeBlobs: row.runtimeBlobs,
    fixtureSha256: row.fixtureSha256,
    web: row.web.map(compactPage),
    canonical: row.canonical.map(compactPage),
    pdf: row.pdf && { ...row.pdf, pages: row.pdf.pages.map(({ text, ...p }) => p) },
    findings: row.findings,
  });
}
const summary = {
  sourceShas: [...new Set(rows.map((r) => r.sourceSha))],
  documents: rows.length,
  pass: rows.filter((r) => r.status === "PASS").length,
  fail: rows.filter((r) => r.status === "FAIL").length,
  pdfs: rows.filter((r) => r.pdf && !r.pdf.blocked).length,
  pdfBlocked: rows.filter((r) => r.pdf?.blocked).length,
  templates: [
    ...new Set(
      rows
        .filter((r) => r.name.startsWith("matrix-"))
        .map((r) => r.name.replace(/^matrix-/, "").replace(/-(one|two)-(cv|letter)$/, "")),
    ),
  ],
  rows,
};
await writeFile(join(directory, "summary.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ ...summary, rows: undefined }));
