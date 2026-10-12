import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { normalizeContent } from "../tests/qa/pagination-assertions.ts";
const directory = process.env.PAGINATION_QA_DIR ?? "artifacts/pagination-2page";
const rows = [];
for (const file of (await readdir(directory)).sort()) {
  if (
    !/^(matrix|boundary|variant|live|flow)-.*\.json$/.test(file) ||
    /-(search|calibration)\.json$/.test(file)
  )
    continue;
  const row = JSON.parse(await readFile(join(directory, file), "utf8"));
  if (!row.sourceSha) continue;
  const saved = JSON.parse(row.storage[row.kind === "cv" ? "lebenslauf:v1" : "anschreiben:v1"]);
  const data = saved.data;
  const strings = (object, except = []) =>
    Object.entries(object)
      .filter(([k, v]) => !except.includes(k) && typeof v === "string" && v)
      .map(([, v]) => v);
  const fields =
    row.kind === "cv"
      ? [
          data.titel,
          ...strings(data.person, ["foto"]),
          ...data.schule.flatMap((e) => strings(e, ["id"])),
          ...data.erfahrung.flatMap((e) => strings(e, ["id"])),
          ...data.sprachen.flatMap((e) => strings(e, ["id"])),
          ...data.hobbys,
          ...data.staerken,
          ...data.referenzen.flatMap((e) => strings(e, ["id"])),
          ...data.customSections.flatMap((s) => [
            s.title,
            ...s.entries.flatMap((e) => strings(e, ["id"])),
          ]),
        ]
      : [
          ...strings(data, ["richTextHtml", "text"]),
          ...data.text.split(/\n\s*\n/),
          ...data.beilagen,
        ];
  const findings = [];
  const media = [
    ["web", row.web],
    ["canonical", row.canonical],
  ];
  if (row.pdf && !row.pdf.blocked) media.push(["pdf", row.pdf.pages]);
  for (const [medium, pages] of media) {
    const text = normalizeContent(pages.map((p) => p.text).join(" ")).toLocaleLowerCase("de-CH");
    for (const value of fields.filter(Boolean))
      if (!text.includes(normalizeContent(value).toLocaleLowerCase("de-CH")))
        findings.push(`${medium}: missing logical field ${value.slice(0, 80)}`);
  }
  rows.push({
    name: row.name,
    sourceSha: row.sourceSha,
    fields: fields.filter(Boolean).length,
    findings,
  });
}
const result = {
  documents: rows.length,
  fieldChecks: rows.reduce((n, r) => n + r.fields, 0),
  pass: rows.filter((r) => !r.findings.length).length,
  fail: rows.filter((r) => r.findings.length).length,
  rows,
};
await writeFile(join(directory, "logical-fields.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ ...result, rows: undefined }));
process.exitCode = result.fail ? 1 : 0;
