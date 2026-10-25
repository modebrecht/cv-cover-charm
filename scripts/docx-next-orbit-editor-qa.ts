/** Live editor -> portable JSON -> explicit snapshot -> independent Orbit candidate. */
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { orbitFixture } from "../tests/fixtures/docx-next/orbit";
import { DEFAULT_DOSSIER_CHROME_STATE } from "../src/lib/dossier-chrome";
const out = path.resolve(process.argv[2] ?? "/tmp/docx-next-orbit-editor");
await mkdir(out, { recursive: true });
const require = createRequire(import.meta.url),
  { chromium } = require(
    process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
      ? path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, "playwright")
      : "playwright",
  );
const server = Bun.spawn(
  [
    "node",
    "node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    "--port",
    "4173",
    "--strictPort",
  ],
  { stdout: "pipe", stderr: "pipe" },
);
const output = new Response(server.stdout).text(),
  error = new Response(server.stderr).text();
let browser;
try {
  const base = "http://127.0.0.1:4173";
  let ready = false;
  for (let n = 0; n < 100; n++) {
    try {
      ready = (await fetch(base)).ok;
      if (ready) break;
    } catch {
      /* starting */
    }
    await Bun.sleep(100);
  }
  if (!ready) throw new Error("Orbit QA server did not start");
  browser = await chromium.launch({
    headless: true,
    ...(process.env.DOCX_NEXT_CHROMIUM_PATH
      ? { executablePath: process.env.DOCX_NEXT_CHROMIUM_PATH }
      : {}),
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
    errors: string[] = [];
  page.on("pageerror", (e: Error) => errors.push(e.message));
  await page.goto(base, { waitUntil: "networkidle" });
  const photo = process.argv[3]
    ? JSON.parse(await readFile(process.argv[3], "utf8")).png
    : undefined;
  const fixture = orbitFixture(photo ? "images" : "normal", photo);
  const chrome = structuredClone(DEFAULT_DOSSIER_CHROME_STATE);
  Object.assign(chrome.shared, { headerMode: "contact", headerHeightMm: 44, headerGapMm: 4 });
  await page.evaluate(
    ({ fixture, chrome }) => {
      localStorage.clear();
      localStorage.setItem(
        "titelblatt:v3",
        JSON.stringify({
          template: "orbit",
          data: fixture.cover.data,
          font: "sans",
          fontScale: 1,
          colors: { orbit: fixture.cover.colors },
          layout: {},
          customs: [],
        }),
      );
      localStorage.setItem("lebenslauf:v1", JSON.stringify(fixture.cv));
      localStorage.setItem("anschreiben:v1", JSON.stringify(fixture.letter));
      localStorage.setItem("bewerbungsdossier:chrome:v1", JSON.stringify(chrome));
      localStorage.setItem("lebenslauf:layout:v1", "classic");
    },
    { fixture, chrome },
  );
  await page.goto(base + "/lebenslauf", { waitUntil: "networkidle" });
  await page.locator('[data-dossier-document="cv"][data-cv-template="orbit"]').first().waitFor();
  await page
    .locator('[data-dossier-document="cv"]')
    .first()
    .screenshot({ path: path.join(out, "orbit-browser-cv.png") });
  await page.goto(base + "/titelblatt", { waitUntil: "networkidle" });
  await page.locator('[data-dossier-document="cover"]').first().waitFor();
  await page
    .locator('[data-dossier-document="cover"]')
    .first()
    .screenshot({ path: path.join(out, "orbit-browser-cover.png") });
  await page.goto(base + "/lebenslauf", { waitUntil: "networkidle" });
  const name = page.locator('input[data-dossier-field-id="cv.person.firstName"]');
  await name.fill("Orbit Editor");
  await page.waitForFunction(
    () => JSON.parse(localStorage.getItem("lebenslauf:v1")!).data.person.vorname === "Orbit Editor",
  );
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(
    () =>
      (
        document.querySelector(
          'input[data-dossier-field-id="cv.person.firstName"]',
        ) as HTMLInputElement
      )?.value === "Orbit Editor",
  );
  if ((await name.inputValue()) !== "Orbit Editor") throw new Error("Orbit edit/reload lost name");
  const result = await page.evaluate(async () => {
    const project = await import("/src/lib/dossier-project.ts"),
      docs = await import("/src/lib/dossier-pdf-document.ts"),
      snapshot = await import("/src/lib/docx-next/snapshot.ts"),
      model = await import("/src/lib/docx-next/build-model.ts"),
      renderer = await import("/src/lib/docx-next/renderer.ts"),
      blocks = await import("/src/lib/docx-next/model.ts");
    const saved = project.createDossierProject({
      cover: project.readStoredDossierPart(project.COVER_STORAGE_KEY),
      cv: project.readStoredDossierPart(project.CV_STORAGE_KEY),
      letter: project.readStoredDossierPart(project.LETTER_STORAGE_KEY),
    });
    const loaded = project.parseDossierProject(JSON.parse(JSON.stringify(saved)));
    const captured = snapshot.captureDossierDocxNextSnapshot(
      docs.coverPdfDocumentFromSaved(loaded.cover),
      docs.letterPdfDocumentFromSaved(loaded.letter),
      docs.cvPdfDocumentFromSaved(loaded.cv),
    );
    const m = model.buildDossierDocModel(captured);
    if (
      m.templateId !== "orbit" ||
      m.issues.length ||
      !blocks
        .walkBlocks(m.cv.blocks)
        .some((b) => b.kind === "paragraph" && b.runs.some((r) => r.text.includes("Orbit Editor")))
    )
      throw new Error("Orbit portable snapshot lost content or has blocking issues");
    return {
      project: loaded,
      bytes: Array.from(new Uint8Array(await (await renderer.renderDossierDocx(m)).arrayBuffer())),
    };
  });
  await writeFile(path.join(out, "orbit-editor.docx"), Uint8Array.from(result.bytes));
  await writeFile(path.join(out, "orbit-project.json"), JSON.stringify(result.project, null, 2));
  await page.screenshot({ path: path.join(out, "orbit-editor.png") });
  if (errors.length) throw new Error(errors.join("; "));
  console.log(
    "Orbit editor rename/reload, portable JSON, explicit snapshot and independent native candidate passed.",
  );
  await page.getByRole("button", { name: "Download", exact: true }).click();
  await page
    .locator(
      'button[title="Titelblatt, Motivationsschreiben und alle CV-Seiten gemeinsam herunterladen"]',
    )
    .click();
  const download = page.waitForEvent("download", { timeout: 120000 });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Dossier herunterladen", exact: true })
    .click();
  await (await download).saveAs(path.join(out, "orbit-production-dossier.pdf"));
  if (errors.length) throw new Error(errors.join("; "));
  console.log("Orbit production combined PDF download passed.");
} finally {
  if (browser) await browser.close();
  server.kill();
  await server.exited;
  await writeFile(path.join(out, "server.log"), (await output) + (await error));
}
