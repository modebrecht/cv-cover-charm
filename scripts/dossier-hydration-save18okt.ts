/** Deterministic browser fault injection: fire autosave before hydration state commits.
 * The old ref gate admits empty render data; the state gate must never admit it.
 * This timing injection is separate from the actual project-import/reload gate. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require(
  path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES!, "playwright"),
);
const [checkout, projectPath, output] = process.argv.slice(2);
assert(checkout && projectPath && output);
const out = path.resolve(output),
  base = "http://127.0.0.1:4174";
await mkdir(out, { recursive: true });
const project = JSON.parse(await readFile(projectPath, "utf8"));
type SavedFixture = typeof project;
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
const results: unknown[] = [];
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
  for (const [scope, route, key] of [
    ["cover", "titelblatt", "titelblatt:v3"],
    ["cv", "lebenslauf", "lebenslauf:v1"],
  ] as const) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
    await context.addInitScript(
      ({ project, scope, key }: { project: SavedFixture; scope: string; key: string }) => {
        localStorage.setItem("titelblatt:v3", JSON.stringify(project.cover));
        localStorage.setItem("anschreiben:v1", JSON.stringify(project.letter));
        localStorage.setItem("lebenslauf:v1", JSON.stringify(project.cv));
        const records: { template: string; entries: number; firstName: string; valid: boolean }[] =
          [];
        const originalWrite = Storage.prototype.setItem;
        const target = scope === "cover" ? project.cover : project.cv;
        Storage.prototype.setItem = function (k: string, raw: string) {
          if (k === key) {
            const saved = JSON.parse(raw);
            records.push({
              template: saved.template ?? saved.design?.template,
              entries: saved.data.erfahrung?.length ?? 0,
              firstName: saved.data.vorname ?? saved.data.person?.vorname ?? "",
              valid:
                scope === "cover"
                  ? saved.template === target.template && saved.data.vorname === target.data.vorname
                  : saved.design.template === target.design.template &&
                    saved.data.erfahrung.length === target.data.erfahrung.length &&
                    saved.data.person.vorname === target.data.person.vorname,
            });
          }
          return originalWrite.call(this, k, raw);
        };
        Object.assign(window, { __earlySaveRecords: records });
        const originalTimer = window.setTimeout;
        window.setTimeout = ((callback: TimerHandler, delay?: number, ...args: unknown[]) => {
          if (delay === 400 && typeof callback === "function") {
            callback(...args);
            return 0;
          }
          return originalTimer(callback, delay, ...args);
        }) as typeof window.setTimeout;
      },
      { project, scope, key },
    );
    const page = await context.newPage();
    await page.route(
      "**/*",
      (r: {
        request: () => { url: () => string };
        continue: () => Promise<void>;
        abort: () => Promise<void>;
      }) => (r.request().url().startsWith(base) ? r.continue() : r.abort()),
    );
    await page.goto(`${base}/${route}`, { waitUntil: "networkidle" });
    await page.waitForFunction(
      () =>
        ((window as unknown as { __earlySaveRecords: unknown[] }).__earlySaveRecords?.length ?? 0) >
        0,
    );
    const records = await page.evaluate(
      () => (window as unknown as { __earlySaveRecords: { valid: boolean }[] }).__earlySaveRecords,
    );
    const lost = records.some((r) => !r.valid);
    results.push({ scope, earlyTimerInjection: true, lostAuthoredState: lost, records });
    if (process.env.HYDRATION_EXPECT_LOSS === "1")
      assert(lost, `${scope}: old defect not reproduced`);
    else assert(!lost, `${scope}: unhydrated data reached autosave`);
    await context.close();
    console.log(`${scope}: ${lost ? "old data loss reproduced" : "hydration guard PASS"}`);
  }
} finally {
  await writeFile(path.join(out, "results.json"), JSON.stringify(results, null, 2));
  if (browser) await browser.close();
  server.kill();
}
