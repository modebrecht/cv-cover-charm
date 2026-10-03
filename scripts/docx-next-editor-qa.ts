/** Real editor / portable JSON / semantic preview regression. Runs its own local dev server. */
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { briefFixture, briefChromeFixture } from "../tests/fixtures/docx-next/brief";
import { COVER_STORAGE_KEY, CV_STORAGE_KEY, LETTER_STORAGE_KEY } from "../src/lib/dossier-project";
import { DOSSIER_CHROME_STORAGE_KEY } from "../src/lib/dossier-chrome";

const out = path.resolve(process.argv[2] ?? "/tmp/cv-docx-next-editor-qa");
await mkdir(out, { recursive: true });
const require = createRequire(import.meta.url);
const { chromium } = require(
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
const serverOutput = new Response(server.stdout).text(),
  serverError = new Response(server.stderr).text();
let browser;
try {
  const base = "http://127.0.0.1:4173";
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      ready = (await fetch(base)).ok;
      if (ready) break;
    } catch {
      /* Server is starting. */
    }
    await Bun.sleep(100);
  }
  if (!ready) throw new Error("Local QA server did not start");
  browser = await chromium.launch({
    headless: true,
    ...(process.env.DOCX_NEXT_CHROMIUM_PATH
      ? { executablePath: process.env.DOCX_NEXT_CHROMIUM_PATH }
      : {}),
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors: string[] = [];
  page.on("pageerror", (error: Error) => errors.push(error.message));
  page.on("console", (message: { type: () => string; text: () => string }) => {
    if (message.text().includes("Maximum update depth") && !errors.includes(message.text())) {
      console.error(message.text());
      errors.push(message.text());
    }
  });
  await page.goto(base, { waitUntil: "networkidle" });
  if (
    (await page.locator("vite-error-overlay").count()) ||
    !(await page.locator("body").innerText()).trim() ||
    !(await page.locator("button,a").count()) ||
    errors.length
  )
    throw new Error("Dev page verification failed: " + errors.join("; "));
  await page.screenshot({ path: path.join(out, "home.png") });
  console.log(
    "Dev server verified: home loads, meaningful controls render, no page errors/overlay.",
  );
  const fixture = briefFixture("repeated-values");
  const chromeInput = briefChromeFixture();
  fixture.cv.design.chromeContent = chromeInput.cv.design.chromeContent;
  fixture.letter.design.chromeContent = chromeInput.letter.design.chromeContent;
  fixture.cover.colors.bg = "#f4e9da";
  fixture.letter.design.paperColor = "#e8f0f4";
  fixture.cv.design.paperColor = "#eaf2e5";
  const chrome = chromeInput.settings.chrome!;
  Object.assign(chrome.shared, {
    headerContentOffsetYMm: 6,
    footerContentOffsetYMm: -4,
    letterRecipientOffsetYMm: 6,
    headerBackgroundColor: "#bed6e4",
    headerGradientColor: "#e8f0f4",
  });
  await page.evaluate(
    ({
      cover,
      cv,
      letter,
      chrome,
      keys,
    }: {
      cover: unknown;
      cv: unknown;
      letter: unknown;
      chrome: unknown;
      keys: string[];
    }) => {
      localStorage.clear();
      [cover, cv, letter, chrome].forEach((value, index) =>
        localStorage.setItem(keys[index], JSON.stringify(value)),
      );
    },
    {
      cover: {
        template: "brief",
        data: fixture.cover.data,
        font: "sans",
        fontScale: 1,
        colors: { brief: fixture.cover.colors },
        layout: { brief: {} },
        customs: [],
      },
      cv: fixture.cv,
      letter: fixture.letter,
      chrome,
      keys: [COVER_STORAGE_KEY, CV_STORAGE_KEY, LETTER_STORAGE_KEY, DOSSIER_CHROME_STORAGE_KEY],
    },
  );
  await page.goto(base + "/lebenslauf", { waitUntil: "networkidle" });
  await page.locator('[data-dossier-document="cv"][data-cv-template="brief"]').first().waitFor();
  const school = page.locator('[data-editor-section-title="Schulbildung"]');
  const toggle = school.locator("[data-editor-section-toggle]");
  if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
  const field = (id: string) => page.locator(`:is(input,textarea)[data-dossier-field-id="${id}"]`);
  const selectField = async (id: string) => {
    await field(id).focus();
    await field(id).press("ControlOrMeta+A");
    const scope = id.split(".")[0];
    await page
      .locator(
        `[data-dossier-field-selection-toolbar][data-dossier-field-key="field:${scope}:${id}"]`,
      )
      .waitFor();
  };
  const first = field("cv.entry.schule:one.title"),
    second = field("cv.entry.schule:two.title");
  await first.waitFor();
  await second.waitFor();
  await selectField("cv.entry.schule:one.title");
  await page.locator('[data-dossier-field-selection-toolbar] button[aria-label="Kursiv"]').click();
  await selectField("cv.entry.schule:two.title");
  await page
    .locator('[data-dossier-field-selection-toolbar] button[aria-label="Unterstrichen"]')
    .click();
  await first.fill("Changed after styling");
  await page.waitForFunction(() => {
    const raw = localStorage.getItem("lebenslauf:v1");
    return !!raw && JSON.parse(raw).data.schule[0].titel === "Changed after styling";
  });
  await page.reload({ waitUntil: "networkidle" });
  const preview = (id: string) =>
    page.locator(`[data-dossier-document="cv"] [data-dossier-field-id="${id}"]:visible`).first();
  await preview("cv.entry.schule:one.title").waitFor();
  await page.waitForFunction(
    () =>
      document
        .querySelector(
          '[data-dossier-document="cv"] [data-dossier-field-id="cv.entry.schule:two.title"]',
        )
        ?.getAttribute("data-dossier-field-underline") === "true",
  );
  if (
    (await preview("cv.entry.schule:one.title").getAttribute("data-dossier-field-italic")) !==
      "true" ||
    (await preview("cv.entry.schule:two.title").getAttribute("data-dossier-field-italic")) ===
      "true"
  )
    throw new Error("Repeated-value style ownership failed after reload");
  await page.screenshot({ path: path.join(out, "cv-semantic-styles.png") });
  console.log("CV entry styles survive editing and reload.");
  const chromeStyles = {
    "cv.header.title": "Kursiv",
    "cv.header.text": "Unterstrichen",
    "cv.footer.title": "Fett",
    "cv.footer.text": "Kursiv",
    "letter.header.title": "Fett",
    "letter.header.text": "Kursiv",
    "letter.footer.title": "Unterstrichen",
    "letter.footer.text": "Kursiv",
  };
  for (const scope of ["cv", "letter"] as const) {
    console.log(`Checking ${scope} chrome controls.`);
    if (scope === "letter") await page.goto(base + "/anschreiben", { waitUntil: "networkidle" });
    const section = page.locator('[data-editor-section-title="Header & Footer"]');
    const toggle = section.locator("[data-editor-section-toggle]");
    if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
    console.log(`${scope} chrome controls opened.`);
    for (const [id, action] of Object.entries(chromeStyles).filter(([id]) =>
      id.startsWith(scope + "."),
    )) {
      await selectField(id);
      await page
        .locator(`[data-dossier-field-selection-toolbar] button[aria-label="${action}"]`)
        .click();
      console.log(`${id}: ${action} applied.`);
    }
    await field(`${scope}.header.title`).fill(`${scope} header after styling`);
    await page.waitForFunction(
      ({ scope }) => {
        const saved = localStorage.getItem(scope === "cv" ? "lebenslauf:v1" : "anschreiben:v1");
        return (
          saved &&
          JSON.parse(saved).design.chromeContent.headerTitle === `${scope} header after styling`
        );
      },
      { scope },
    );
    console.log(`${scope} chrome edit persisted.`);
    await page.reload({ waitUntil: "networkidle" });
    for (const [id, action] of Object.entries(chromeStyles).filter(([id]) =>
      id.startsWith(scope + "."),
    )) {
      const property = action === "Fett" ? "bold" : action === "Kursiv" ? "italic" : "underline";
      await page.waitForFunction(
        ({ id, property }) =>
          document
            .querySelector(`[data-dossier-document] [data-dossier-field-id="${id}"]`)
            ?.getAttribute(`data-dossier-field-${property}`) === "true",
        { id, property },
      );
    }
    await page.screenshot({ path: path.join(out, `${scope}-chrome-semantic-styles.png`) });
    console.log(`${scope} chrome styles survive editing and reload.`);
  }
  await page.goto(base + "/lebenslauf", { waitUntil: "networkidle" });
  const result = await page.evaluate(async () => {
    const projectModule = await import("/src/lib/dossier-project.ts");
    const docModule = await import("/src/lib/dossier-pdf-document.ts");
    const snapshotModule = await import("/src/lib/docx-next/snapshot.ts");
    const modelModule = await import("/src/lib/docx-next/build-model.ts");
    const rendererModule = await import("/src/lib/docx-next/renderer.ts");
    const project = projectModule.createDossierProject({
      cover: projectModule.readStoredDossierPart(projectModule.COVER_STORAGE_KEY),
      cv: projectModule.readStoredDossierPart(projectModule.CV_STORAGE_KEY),
      letter: projectModule.readStoredDossierPart(projectModule.LETTER_STORAGE_KEY),
    });
    const restored = projectModule.parseDossierProject(JSON.parse(JSON.stringify(project)));
    if (!restored) throw new Error("JSON roundtrip failed");
    const snapshot = snapshotModule.captureDossierDocxNextSnapshot(
      docModule.coverPdfDocumentFromSaved(restored.cover),
      docModule.letterPdfDocumentFromSaved(restored.letter),
      docModule.cvPdfDocumentFromSaved(restored.cv),
    );
    if (snapshot.settings.unresolvedTypography.length)
      throw new Error("Fresh semantic styles became unresolved after JSON save");
    const model = modelModule.buildDossierDocModel(snapshot);
    if (
      model.cover.artwork[0]?.fill.color !== "F4E9DA" ||
      model.letter.artwork[0]?.fill.color !== "E8F0F4" ||
      model.cv.artwork[0]?.fill.color !== "EAF2E5" ||
      model.letter.page.headerDistanceMm !== 22 ||
      model.cv.page.footerDistanceMm !== 16
    )
      throw new Error("Portable JSON/canonical model lost paper or signed chrome settings");
    const blob = await rendererModule.renderDossierDocx(model);
    return {
      project: restored,
      styles: snapshot.settings.fieldStyles,
      bytes: Array.from(new Uint8Array(await blob.arrayBuffer())),
    };
  });
  if (
    !result.styles["cv.entry.schule:one.title"]?.italic ||
    !result.styles["cv.entry.schule:two.title"]?.underline
  )
    throw new Error("Canonical export lost portable styles");
  for (const [id, action] of Object.entries(chromeStyles)) {
    const property = action === "Fett" ? "bold" : action === "Kursiv" ? "italic" : "underline";
    if (!result.styles[id]?.[property])
      throw new Error(`Canonical export lost custom chrome style: ${id}`);
  }
  await writeFile(path.join(out, "editor-roundtrip.docx"), Uint8Array.from(result.bytes));
  await writeFile(path.join(out, "project.json"), JSON.stringify(result.project, null, 2));
  if (errors.length) throw new Error(errors.join("; "));
  console.log(
    "Editor selection, repeated-value styling, rename/reload, portable JSON and independent Next export passed.",
  );
  // Exercise the unchanged production PDF exporter against the edited live preview.
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
  await (await download).saveAs(path.join(out, "production-dossier.pdf"));
  if (errors.length) throw new Error(errors.join("; "));
  console.log("Production combined PDF download passed against the semantic preview.");
} finally {
  if (browser) await browser.close();
  server.kill();
  await server.exited;
  await writeFile(path.join(out, "server.log"), (await serverOutput) + (await serverError));
}
