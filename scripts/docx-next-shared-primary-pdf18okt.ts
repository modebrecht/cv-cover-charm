/** Read-only existing automatic PDF export, using the exact native candidate source. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require(
  path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES!, "playwright"),
);
const [packet, output] = process.argv.slice(2);
assert(packet && output);
const out = path.resolve(output),
  base = "http://127.0.0.1:4173";
await mkdir(out, { recursive: true });
const project = JSON.parse(await readFile(path.join(packet, "project.json"), "utf8"));
const expected = JSON.parse(await readFile(path.join(packet, "snapshot.json"), "utf8"));
const server = Bun.spawn({
  cmd: [
    process.env.CODEX_PRIMARY_RUNTIME_NODE!,
    "node_modules/vite/bin/vite.js",
    "dev",
    "--host",
    "127.0.0.1",
    "--port",
    "4173",
  ],
  stdout: Bun.file(path.join(out, "server.log")),
  stderr: Bun.file(path.join(out, "server-errors.log")),
});
let browser;
try {
  let ready = false;
  for (let n = 0; n < 300; n++) {
    try {
      if ((await fetch(base)).ok) {
        ready = true;
        break;
      }
    } catch {
      /*startup*/
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  assert(ready);
  browser = await chromium.launch({
    executablePath: process.env.DOCX_NEXT_CHROMIUM_PATH,
    headless: true,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  const page = await context.newPage();
  page.on("dialog", (d: { accept: () => Promise<void> }) => void d.accept());
  await page.route(
    "**/*",
    (r: {
      request: () => { url: () => string };
      continue: () => Promise<void>;
      abort: () => Promise<void>;
    }) => (r.request().url().startsWith(base) ? r.continue() : r.abort()),
  );
  await page.goto(base, { waitUntil: "networkidle" });
  await Promise.all([
    page.waitForEvent("load"),
    page.locator('input[type="file"][accept="application/json,.json"]').setInputFiles({
      name: "same-source.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(project)),
    }),
  ]);
  await page.waitForLoadState("networkidle");
  await page.goto(base + "/lebenslauf", { waitUntil: "networkidle" });
  await page.goto(base, { waitUntil: "networkidle" });
  const before = await page.evaluate(async () =>
    (await import("/src/lib/brief-docx-next-export.ts")).captureSavedAuthoredSnapshot("modern"),
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(before)),
    expected,
    "PDF source must equal the actual native candidate source JSON",
  );
  await page.getByRole("button").filter({ hasText: "Gesamtdossier herunterladen" }).click();
  const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
  assert.equal(
    await dialog
      .getByRole("radio", { name: "Fertiges Dossier (PDF)" })
      .getAttribute("aria-checked"),
    "true",
  );
  const downloadEvent = page.waitForEvent("download", { timeout: 120000 });
  await dialog.getByRole("button", { name: "PDF herunterladen", exact: true }).click();
  const download = await downloadEvent;
  await download.saveAs(path.join(out, "primary.pdf"));
  const after = await page.evaluate(async () =>
    (await import("/src/lib/brief-docx-next-export.ts")).captureSavedAuthoredSnapshot("modern"),
  );
  assert.deepEqual(after, before);
  await writeFile(
    path.join(out, "verification.json"),
    JSON.stringify(
      {
        actualAppPdfDownload: true,
        sourceEqualsNativeCandidate: true,
        sourceUnchangedByExport: true,
        defaultFormatPdf: true,
      },
      null,
      2,
    ),
  );
  console.log("Same-source actual primary PDF export PASS");
} finally {
  if (browser) await browser.close();
  server.kill();
}
