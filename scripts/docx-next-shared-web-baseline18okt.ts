/** Same effective authored settings, previous checkout: first-page Web regression capture. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require(
  path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES!, "playwright"),
);
const [checkout, inputProject, output] = process.argv.slice(2);
assert(checkout && inputProject && output, "Usage: SCRIPT BASELINE_CHECKOUT INPUT_PROJECT OUTPUT");
const out = path.resolve(output),
  base = "http://127.0.0.1:4174";
await mkdir(out, { recursive: true });
const server = Bun.spawn({
  cwd: path.resolve(checkout),
  cmd: [
    process.env.CODEX_PRIMARY_RUNTIME_NODE!,
    "node_modules/vite/bin/vite.js",
    "dev",
    "--host",
    "127.0.0.1",
    "--port",
    "4174",
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
  const source = JSON.parse(await readFile(inputProject, "utf8"));
  for (const template of ["brief", "modern", "freundlich", "verlauf", "neon"]) {
    const folder = path.join(out, template);
    await mkdir(folder, { recursive: true });
    const project = structuredClone(source);
    project.cover.template = template;
    project.letter.design.template = template;
    project.cv.design.template = template;
    project.cv.design.sectionTitleFontSizePx = 14;
    project.cv.portableState = { ...project.cv.portableState, continuationTopMarginMm: 20 };
    await writeFile(path.join(folder, "project.json"), JSON.stringify(project, null, 2));
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1200 },
      deviceScaleFactor: 1,
    });
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
      page
        .locator('input[type="file"][accept="application/json,.json"]')
        .setInputFiles({
          name: "shared-baseline.json",
          mimeType: "application/json",
          buffer: Buffer.from(JSON.stringify(project)),
        }),
    ]);
    await page.waitForLoadState("networkidle");
    for (const [scope, route, selector] of [
      ["cv", "lebenslauf", "[data-cv-page]"],
      ["letter", "anschreiben", "[data-letter-page]"],
    ] as const) {
      await page.goto(`${base}/${route}`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      const root = page.locator(`main [data-dossier-document="${scope}"]`).first();
      if (scope === "letter")
        await page.waitForFunction(
          () =>
            document
              .querySelector("main [data-letter-document-root]")
              ?.getAttribute("data-letter-pagination-ready") === "true",
        );
      await root.locator(selector).nth(1).waitFor();
      await root
        .locator(selector)
        .first()
        .screenshot({ path: path.join(folder, `web-${scope}-first.png`), animations: "disabled" });
    }
    await context.close();
    console.log(`${template} previous first pages captured`);
  }
} finally {
  if (browser) await browser.close();
  server.kill();
}
