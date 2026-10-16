/** Real app restore -> opt-in button -> downloaded native DOCX. No candidate XML edits. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  BRIEF_PROJECT_CASES,
  briefProjectFixture,
} from "../tests/fixtures/docx-next/brief-project";

const require = createRequire(import.meta.url);
const { chromium } = require(
  path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES!, "playwright"),
);
const out = path.resolve(process.argv[2] ?? "/tmp/brief37c-app");
const base = process.env.DOCX_NEXT_APP_URL ?? "http://127.0.0.1:4173";
await mkdir(out, { recursive: true });
// Own the server in the same network namespace as the test browser.
const server = process.env.DOCX_NEXT_APP_URL
  ? undefined
  : Bun.spawn({
      cmd: [
        process.env.CODEX_PRIMARY_RUNTIME_NODE!,
        "node_modules/vite/bin/vite.js",
        "dev",
        "--host",
        "127.0.0.1",
        "--port",
        "4173",
      ],
      stdout: Bun.file(path.join(out, "dev-server.log")),
      stderr: Bun.file(path.join(out, "dev-server-errors.log")),
    });
let baselineServer: ReturnType<typeof Bun.spawn> | undefined;
let ready = false;
for (let n = 0; n < 300; n++) {
  try {
    if ((await fetch(base)).ok) {
      ready = true;
      break;
    }
  } catch {
    /* startup */
  }
  await new Promise((resolve) => setTimeout(resolve, 100));
}
assert(ready, "Local app server did not become ready; inspect dev-server logs");
const browser = await chromium.launch({
  executablePath: process.env.DOCX_NEXT_CHROMIUM_PATH,
  headless: true,
  args: ["--no-sandbox"],
});
const results: unknown[] = [];
const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
try {
  for (const name of process.env.DOCX_NEXT_ONLY_NEGATIVES
    ? []
    : (process.env.DOCX_NEXT_COVER_CASES?.split(",") ?? BRIEF_PROJECT_CASES)) {
    const folder = path.join(out, name);
    await mkdir(folder, { recursive: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1200 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e: Error) => errors.push(e.message));
    page.on("dialog", (dialog: { accept: () => Promise<void> }) => void dialog.accept());
    await page.route(
      "**/*",
      (route: {
        request: () => { url: () => string };
        continue: () => Promise<void>;
        abort: () => Promise<void>;
      }) => (route.request().url().startsWith(base) ? route.continue() : route.abort()),
    );
    await page.goto(base + "/?docx-next-brief-qa=1", { waitUntil: "networkidle" });
    const photo = await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = 120;
      c.height = 180;
      const x = c.getContext("2d")!;
      x.fillStyle = "#ff2418";
      x.fillRect(0, 0, 60, 180);
      x.fillStyle = "#1854d8";
      x.fillRect(60, 0, 60, 180);
      x.fillStyle = "#f6dd32";
      x.fillRect(10, 10, 20, 20);
      return c.toDataURL("image/png");
    });
    const project = briefProjectFixture(name as (typeof BRIEF_PROJECT_CASES)[number], photo);
    await writeFile(path.join(folder, "project.json"), JSON.stringify(project, null, 2));
    await Promise.all([
      page.waitForEvent("load"),
      page.locator('input[type="file"][accept="application/json,.json"]').setInputFiles({
        name: "brief-project.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(project)),
      }),
    ]);
    await page.waitForLoadState("networkidle");
    const storedBefore = await page.evaluate(() =>
      ["titelblatt:v3", "anschreiben:v1", "lebenslauf:v1"].map((key) => localStorage.getItem(key)),
    );
    await page.getByRole("button").filter({ hasText: "Gesamtdossier herunterladen" }).click();
    const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
    assert.equal(
      await dialog
        .getByRole("radio", { name: "Fertiges Dossier (PDF)" })
        .getAttribute("aria-checked"),
      "true",
    );
    const downloadEvent = page.waitForEvent("download", { timeout: 30000 });
    await dialog.getByRole("button", { name: "Brief DOCX Next testen", exact: true }).click();
    const download = await Promise.race([
      downloadEvent,
      dialog
        .locator('[data-brief-docx-next-qa] [role="alert"]')
        .waitFor()
        .then(async () => {
          await dialog.screenshot({ path: path.join(folder, "export-error.png") });
          throw new Error(
            await dialog.locator('[data-brief-docx-next-qa] [role="alert"]').innerText(),
          );
        }),
    ]);
    await download.saveAs(path.join(folder, "candidate.docx"));
    assert.deepEqual(
      await page.evaluate(() =>
        ["titelblatt:v3", "anschreiben:v1", "lebenslauf:v1"].map((key) =>
          localStorage.getItem(key),
        ),
      ),
      storedBefore,
    );
    const captured = await page.evaluate(async () => {
      // This is the same app entry called by the button, inspected separately
      // for source/metric/model evidence and byte equality with its UI download.
      const { createSavedBriefDocxNext } = await import("/src/lib/brief-docx-next-export.ts");
      const { buildDossierDocModel } = await import("/src/lib/docx-next/build-model.ts");
      const { renderDossierDocx } = await import("/src/lib/docx-next/renderer.ts");
      const result = await createSavedBriefDocxNext();
      const baseline = buildDossierDocModel(result.snapshot);
      const bytes = Array.from(new Uint8Array(await result.blob.arrayBuffer()));
      const baselineBytes = Array.from(
        new Uint8Array(await (await renderDossierDocx(baseline)).arrayBuffer()),
      );
      return {
        snapshot: result.snapshot,
        metrics: result.metrics,
        model: result.model,
        neighborsIdentical:
          JSON.stringify(result.model.letter) === JSON.stringify(baseline.letter) &&
          JSON.stringify(result.model.cv) === JSON.stringify(baseline.cv),
        bytes,
        baselineBytes,
      };
    });
    assert(captured.neighborsIdentical);
    assert.deepEqual(captured.snapshot.cover.data, project.cover!.data);
    const candidate = new Uint8Array(await readFile(path.join(folder, "candidate.docx")));
    assert.deepEqual(candidate, Uint8Array.from(captured.bytes));
    for (const key of ["snapshot", "metrics", "model"] as const)
      await writeFile(path.join(folder, key + ".json"), JSON.stringify(captured[key], null, 2));
    await writeFile(path.join(folder, "baseline.docx"), Uint8Array.from(captured.baselineBytes));
    // Capture the real visible editor after restore, not a synthetic mounted canvas.
    await page.goto(base + "/titelblatt?docx-next-brief-qa=1", { waitUntil: "networkidle" });
    const cover = page.locator('[data-dossier-document="cover"]:visible').first();
    await cover.waitFor();
    await page.evaluate(() => document.fonts.ready);
    const webSource = await page.evaluate(async () => {
      const { captureSavedBriefSnapshot } = await import("/src/lib/brief-docx-next-export.ts");
      return captureSavedBriefSnapshot().cover;
    });
    assert.deepEqual(webSource, captured.snapshot.cover);
    const cdp = await context.newCDPSession(page);
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    const dom = await cdp.send("DOM.getDocument");
    const node = await cdp.send("DOM.querySelector", {
      nodeId: dom.root.nodeId,
      selector: '[data-dossier-document="cover"] [data-block-id="beruf"]',
    });
    const platformFonts = await cdp.send("CSS.getPlatformFontsForNode", { nodeId: node.nodeId });
    assert(
      platformFonts.fonts.every((f: { familyName: string }) =>
        ["Arial", "Liberation Sans"].includes(f.familyName),
      ),
    );
    await cover.screenshot({ path: path.join(folder, "web.png"), animations: "disabled" });
    const web = await cover.evaluate((element: HTMLElement) => {
      const root = element.getBoundingClientRect();
      return Array.from(element.querySelectorAll<HTMLElement>("[data-block-id]")).map((b) => {
        const r = b.getBoundingClientRect(),
          s = getComputedStyle(b);
        return {
          id: b.dataset.blockId,
          text: b.innerText,
          xMm: ((r.x - root.x) / root.width) * 210,
          yMm: ((r.y - root.y) / root.height) * 297,
          widthMm: (r.width / root.width) * 210,
          heightMm: (r.height / root.height) * 297,
          font: s.fontFamily,
          sizePx: s.fontSize,
        };
      });
    });
    assert.deepEqual(errors, []);
    const evidence = {
      name,
      restoredThroughAppFileInput: true,
      clickedAppExport: true,
      defaultFormatStillPdf: true,
      savedDocumentsUnchangedByExport: true,
      webSourceEqualsExportSource: true,
      platformFonts,
      uiDownloadEqualsAppEntry: true,
      neighborModelsIdentical: true,
      candidateSha256: sha(candidate),
      measuredProfile: captured.metrics.profile,
      web,
      pageErrors: errors,
    };
    await writeFile(path.join(folder, "app-evidence.json"), JSON.stringify(evidence, null, 2));
    results.push(evidence);
    console.log(JSON.stringify({ case: name, sha256: sha(candidate), result: "app export PASS" }));
    await context.close();
  }
  if (!process.env.DOCX_NEXT_COVER_CASES) {
    const rejected: unknown[] = [];
    for (const scenario of [
      "unsupported-font",
      "substituted-font",
      "missing-measurements",
      "stale-before-capture",
      "stale-after-render",
      "overflow",
      "non-brief",
    ]) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(base + "/?docx-next-brief-qa=1", { waitUntil: "networkidle" });
      await page.evaluate(async (project) => {
        const { replaceDossierProject } = await import("/src/lib/dossier-project.ts");
        replaceDossierProject(project);
      }, briefProjectFixture("normal"));
      await page.reload({ waitUntil: "networkidle" });
      await page.getByRole("button").filter({ hasText: "Gesamtdossier herunterladen" }).click();
      await page.evaluate(async (scenario) => {
        const mutate = () => {
          const c = JSON.parse(localStorage.getItem("titelblatt:v3")!);
          c.data.vorname += " changed";
          localStorage.setItem("titelblatt:v3", JSON.stringify(c));
        };
        if (scenario === "unsupported-font" || scenario === "overflow") {
          const c = JSON.parse(localStorage.getItem("titelblatt:v3")!);
          if (scenario === "unsupported-font") c.font = "maschine";
          else c.data.email = "x".repeat(250) + "@example.ch";
          localStorage.setItem("titelblatt:v3", JSON.stringify(c));
        }
        if (scenario === "non-brief") {
          const l = JSON.parse(localStorage.getItem("anschreiben:v1")!);
          l.design.template = "freundlich";
          localStorage.setItem("anschreiben:v1", JSON.stringify(l));
        }
        if (scenario === "substituted-font") {
          for (const weight of [400, 700]) {
            const f = new FontFace(
              "Helvetica Neue",
              `local("DejaVu Sans${weight === 700 ? " Bold" : ""}")`,
              { weight: String(weight) },
            );
            document.fonts.add(await f.load());
          }
        }
        if (scenario === "missing-measurements") {
          HTMLCanvasElement.prototype.getContext = () => null;
        }
        if (scenario === "stale-before-capture") {
          const original = FontFace.prototype.load;
          let changed = false;
          FontFace.prototype.load = function () {
            if (!changed) {
              changed = true;
              mutate();
            }
            return original.call(this);
          };
        }
        if (scenario === "stale-after-render") {
          const original = HTMLCanvasElement.prototype.toDataURL;
          let changed = false;
          HTMLCanvasElement.prototype.toDataURL = function (...args) {
            if (!changed) {
              changed = true;
              mutate();
            }
            return original.apply(this, args);
          };
        }
      }, scenario);
      let downloads = 0;
      page.on("download", () => downloads++);
      await page.getByRole("button", { name: "Brief DOCX Next testen", exact: true }).click();
      const alert = page.locator('[data-brief-docx-next-qa] [role="alert"]');
      await alert.waitFor({ state: "visible" });
      const message = await alert.innerText();
      const expected =
        scenario === "unsupported-font"
          ? "Nicht unterstützte Schrift"
          : scenario === "substituted-font"
            ? "Browser-Ersatzschrift"
            : scenario === "missing-measurements"
              ? "nicht verfügbar"
              : scenario.startsWith("stale")
                ? "Daten haben sich"
                : scenario === "overflow"
                  ? "Feldbreite"
                  : "Vorlage Brief";
      assert(message.includes(expected), `${scenario}: unexpected diagnostic ${message}`);
      assert.equal(downloads, 0);
      rejected.push({ scenario, message, downloads, result: "PASS explicit rejection" });
      console.log(JSON.stringify({ scenario, result: "rejection PASS" }));
      await context.close();
    }
    // Default route has no test control and direct entry also requires the flag.
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(base, { waitUntil: "networkidle" });
    await page.evaluate(async (project) => {
      const { replaceDossierProject } = await import("/src/lib/dossier-project.ts");
      replaceDossierProject(project);
    }, briefProjectFixture("normal"));
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("button").filter({ hasText: "Gesamtdossier herunterladen" }).click();
    assert.equal(await page.getByRole("button", { name: "Brief DOCX Next testen" }).count(), 0);
    const offMessage = await page.evaluate(async () => {
      try {
        const { createSavedBriefDocxNext } = await import("/src/lib/brief-docx-next-export.ts");
        await createSavedBriefDocxNext();
      } catch (e) {
        return String(e);
      }
      return "unexpected success";
    });
    assert(offMessage.includes("nicht aktiviert"));
    rejected.push({
      scenario: "opt-in-off",
      message: offMessage,
      result: "PASS hidden and rejected",
    });
    await context.close();
    await writeFile(path.join(out, "rejections.json"), JSON.stringify(rejected, null, 2));
  }
  if (process.env.DOCX_NEXT_DEV_CHECKOUT) {
    server?.kill();
    const baseline = "http://127.0.0.1:4174";
    baselineServer = Bun.spawn({
      cmd: [
        process.env.CODEX_PRIMARY_RUNTIME_NODE!,
        "node_modules/vite/bin/vite.js",
        "dev",
        "--host",
        "127.0.0.1",
        "--port",
        "4174",
      ],
      cwd: path.resolve(process.env.DOCX_NEXT_DEV_CHECKOUT),
      stdout: Bun.file(path.join(out, "dev-baseline.log")),
      stderr: Bun.file(path.join(out, "dev-baseline-errors.log")),
    });
    let baselineReady = false;
    for (let n = 0; n < 300; n++) {
      try {
        if ((await fetch(baseline)).ok) {
          baselineReady = true;
          break;
        }
      } catch {
        /* startup */
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert(baselineReady);
    for (const name of BRIEF_PROJECT_CASES) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1200 },
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", (e: Error) => errors.push(e.message));
      page.on("dialog", (d: { accept: () => Promise<void> }) => void d.accept());
      await page.goto(baseline, { waitUntil: "networkidle" });
      await Promise.all([
        page.waitForEvent("load"),
        page.locator('input[type="file"][accept="application/json,.json"]').setInputFiles({
          name: "brief-project.json",
          mimeType: "application/json",
          buffer: await readFile(path.join(out, name, "project.json")),
        }),
      ]);
      await page.waitForLoadState("networkidle");
      await page.goto(baseline + "/titelblatt?docx-next-brief-qa=1", { waitUntil: "networkidle" });
      const cover = page.locator('[data-dossier-document="cover"]:visible').first();
      await cover.waitFor();
      await page.evaluate(() => document.fonts.ready);
      await cover.screenshot({ path: path.join(out, name, "web-dev.png"), animations: "disabled" });
      const devBaseline = await page.evaluate(
        async (snapshot) => {
          const { buildDossierDocModel } = await import("/src/lib/docx-next/build-model.ts");
          const { renderDossierDocx } = await import("/src/lib/docx-next/renderer.ts");
          return Array.from(
            new Uint8Array(
              await (await renderDossierDocx(buildDossierDocModel(snapshot))).arrayBuffer(),
            ),
          );
        },
        JSON.parse(await readFile(path.join(out, name, "snapshot.json"), "utf8")),
      );
      assert.deepEqual(
        Uint8Array.from(devBaseline),
        new Uint8Array(await readFile(path.join(out, name, "baseline.docx"))),
      );
      await writeFile(
        path.join(out, name, "dev-default-evidence.json"),
        JSON.stringify(
          { defaultNextPackageByteIdenticalToDev: true, sha256: sha(Uint8Array.from(devBaseline)) },
          null,
          2,
        ),
      );
      assert.deepEqual(errors, []);
      console.log(JSON.stringify({ case: name, baseline: "actual dev editor captured" }));
      await context.close();
    }
  }
} finally {
  await browser.close();
  server?.kill();
  baselineServer?.kill();
}
if (results.length)
  await writeFile(path.join(out, "app-results.json"), JSON.stringify(results, null, 2));
