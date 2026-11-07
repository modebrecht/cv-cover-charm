import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { paginationFixture, type PaginationFixture } from "./pagination-fixtures";
import {
  DEFAULT_DOSSIER_CHROME_STATE,
  DOSSIER_CHROME_STORAGE_KEY,
} from "../../src/lib/dossier-chrome";
import { collectDocument, loadFixture, runtimeProvenance } from "./pagination-browser";

const exportRoot = "[data-letter-standalone-export] [data-letter-document-root]";
async function loadLetter(page: Page, advisory = true) {
  if (advisory)
    await page.addInitScript(() => {
      const install = () => {
        if (!document.head || document.getElementById("consent-boundary-probe")) return;
        const style = document.createElement("style");
        style.id = "consent-boundary-probe";
        style.textContent =
          "[data-letter-pagination-measurements] [data-letter-text-layer]{height:0!important;min-height:0!important;max-height:0!important;bottom:auto!important}";
        document.head.append(style);
      };
      new MutationObserver(install).observe(document, { childList: true, subtree: true });
      install();
    });
  const fixture = paginationFixture("brief", { paragraphs: 2 });
  await loadFixture(page, fixture, "letter");
  return fixture;
}
async function attach(info: TestInfo, result: unknown) {
  await info.attach("consent-boundary", {
    body: JSON.stringify({ ...runtimeProvenance(), result }, null, 2),
    contentType: "application/json",
  });
}
const openDownload = (page: Page) =>
  page.getByRole("button", { name: "Download", exact: true }).click();
const normal = (page: Page) => page.getByRole("menuitem", { name: "PDF", exact: true });
const override = (page: Page) =>
  page.getByRole("menuitem", { name: "PDF trotzdem herunterladen", exact: true });
async function status(page: Page) {
  return page.locator(exportRoot).evaluate(async (root) => {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const path = "/src/lib/pdf-preflight.ts";
    return (await import(path)).inspectPdfPreflight(root, "letter").status;
  });
}

test("fabricated consent cannot call the actual PDF API", async ({ page }, info) => {
  await loadLetter(page);
  const downloads: string[] = [];
  page.on("download", (download) => downloads.push(download.suggestedFilename()));
  const result = await page.locator(exportRoot).evaluate(async (root) => {
    const path = "/src/lib/dossier-pdf.ts";
    try {
      await (
        await import(path)
      ).downloadLetterPdf(root, "must-not-download.pdf", { title: "QA", author: "QA" }, {});
      return "UNSAFE SUCCESS";
    } catch (error) {
      return String(error);
    }
  });
  expect(result).toContain("abgelaufen");
  expect(downloads).toEqual([]);
  await attach(info, { result, downloads });
});

test("an identical replacement root needs its own consent even when signatures match", async ({
  page,
}, info) => {
  await loadLetter(page);
  const result = await page.locator(exportRoot).evaluate(async (root) => {
    const path = "/src/lib/pdf-preflight.ts";
    const api = await import(path);
    const before = api.inspectPdfPreflight(root, "letter");
    const consent = api.createPdfAdvisoryConsent(root, "letter");
    const clone = root.cloneNode(true) as HTMLElement;
    root.replaceWith(clone);
    const after = api.inspectPdfPreflight(clone, "letter");
    let error = "";
    try {
      api.beginPdfSafetyValidation(clone, "letter", consent)();
    } catch (failure) {
      error = String(failure);
    }
    api.beginPdfSafetyValidation(clone, "letter", api.createPdfAdvisoryConsent(clone, "letter"))();
    return { before, after, error };
  });
  expect(result.before.status).toBe("advisory");
  expect(result.after.status).toBe("advisory");
  expect(result.after.signature).toBe(result.before.signature);
  expect(result.error).toContain("abgelaufen");
  await attach(info, result);
});

test("a rejected cross-document attempt consumes the original letter consent", async ({
  page,
}, info) => {
  await loadLetter(page);
  const result = await page.locator(exportRoot).evaluate(async (root) => {
    const path = "/src/lib/pdf-preflight.ts";
    const api = await import(path);
    const consent = api.createPdfAdvisoryConsent(root, "letter");
    let crossKind = "",
      replay = "";
    try {
      api.beginPdfSafetyValidation(root, "dossier", consent)();
    } catch (error) {
      crossKind = String(error);
    }
    try {
      api.beginPdfSafetyValidation(root, "letter", consent)();
    } catch (error) {
      replay = String(error);
    }
    api.beginPdfSafetyValidation(root, "letter", api.createPdfAdvisoryConsent(root, "letter"))();
    return { crossKind, replay };
  });
  expect(result.crossKind).toContain("vollständig");
  expect(result.replay).toContain("abgelaufen");
  await attach(info, result);
});

for (const change of ["colour", "margin", "source-contract", "unknown-warning"] as const) {
  test(`consent expires after ${change}`, async ({ page }, info) => {
    await loadLetter(page);
    const result = await page.locator(exportRoot).evaluate(async (node, change) => {
      const root = node as HTMLElement;
      const path = "/src/lib/pdf-preflight.ts";
      const api = await import(path);
      const consent = api.createPdfAdvisoryConsent(root, "letter");
      const body = root.querySelector<HTMLElement>('[data-letter-pdf-richtext="body"]')!;
      if (change === "colour") body.style.color = "rgb(30, 40, 50)";
      else if (change === "margin") body.style.marginLeft = "1px";
      else if (change === "source-contract") root.dataset.letterContentHash = "changed-source";
      else root.dataset.letterPaginationWarning = "unrecognised-warning";
      const after = api.inspectPdfPreflight(root, "letter");
      let error = "UNSAFE SUCCESS";
      try {
        api.beginPdfSafetyValidation(root, "letter", consent)();
      } catch (failure) {
        error = String(failure);
      }
      return { after, error };
    }, change);
    expect(result.after.status).toBe(
      change === "colour" || change === "margin" ? "advisory" : "blocked",
    );
    if (change === "colour" || change === "margin") expect(result.error).toContain("abgelaufen");
    else
      expect(
        result.after.issues.some(
          (issue: { code: string }) =>
            issue.code === (change === "source-contract" ? "content-missing" : "pagination-unsafe"),
        ),
      ).toBe(true);
    expect(result.error).not.toBe("UNSAFE SUCCESS");
    await attach(info, result);
  });
}

test("a safe colour edit during actual raster generation invalidates consent before download", async ({
  page,
}, info) => {
  await loadLetter(page);
  const downloads: string[] = [];
  page.on("download", (download) => downloads.push(download.suggestedFilename()));
  const result = await page.locator(exportRoot).evaluate(async (root) => {
    const policyPath = "/src/lib/pdf-preflight.ts",
      exportPath = "/src/lib/dossier-pdf.ts";
    const policy = await import(policyPath),
      api = await import(exportPath);
    const consent = policy.createPdfAdvisoryConsent(root, "letter");
    let applied = false;
    const observer = new MutationObserver(() => {
      if (applied || !document.querySelector("iframe.html2canvas-container")) return;
      applied = true;
      const style = document.createElement("style");
      style.textContent =
        '[data-letter-standalone-export] [data-letter-pdf-richtext="body"]{color:rgb(30,40,50)!important}';
      document.head.append(style);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    let error = "UNSAFE SUCCESS";
    try {
      await api.downloadLetterPdf(
        root,
        "must-not-download.pdf",
        { title: "QA", author: "QA" },
        consent,
      );
    } catch (failure) {
      error = String(failure);
    } finally {
      observer.disconnect();
    }
    return { applied, error, after: policy.inspectPdfPreflight(root, "letter") };
  });
  expect(result.applied).toBe(true);
  expect(result.after.status).toBe("advisory");
  expect(result.error).toContain("verändert");
  expect(downloads).toEqual([]);
  await attach(info, { ...result, downloads });
});

test("an open normal menu follows a physical fault and its repair before actual download", async ({
  page,
}, info) => {
  const fixture = await loadLetter(page, false);
  await openDownload(page);
  expect(await status(page)).toBe("pass");
  await expect(normal(page)).toBeEnabled();
  await expect(override(page)).toHaveCount(0);
  const fault = await page.addStyleTag({
    content: `${exportRoot} [data-letter-pdf-richtext="body"]{transform:translateY(1200px)!important}`,
  });
  expect(await status(page)).toBe("blocked");
  await expect(normal(page)).toBeDisabled();
  await expect(override(page)).toHaveCount(0);
  await fault.evaluate((style) => style.parentNode?.removeChild(style));
  expect(await status(page)).toBe("pass");
  await expect(normal(page)).toBeEnabled();
  const canonical = await collectDocument(page, exportRoot, "letter");
  const pending = page.waitForEvent("download", { timeout: 90_000 });
  await normal(page).click();
  const download = await pending,
    file = info.outputPath("clean-letter.pdf");
  await download.saveAs(file);
  expect(await download.failure()).toBeNull();
  await attach(info, {
    file,
    canonical,
    transitions: ["pass", "blocked", "pass"],
    expectedSegments: fixture.segments.letter,
  });
});

test("the explicit UI override downloads once without saving an override across reopen or reload", async ({
  page,
}, info) => {
  const fixture = await loadLetter(page);
  await openDownload(page);
  await expect(normal(page)).toBeDisabled();
  await expect(override(page)).toBeEnabled();
  const before = await page.evaluate(() => ({ ...localStorage }));
  const canonical = await collectDocument(page, exportRoot, "letter");
  const pending = page.waitForEvent("download", { timeout: 90_000 });
  await override(page).click();
  const download = await pending,
    file = info.outputPath("confirmed-letter.pdf");
  await download.saveAs(file);
  expect(await download.failure()).toBeNull();
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(before);
  await openDownload(page);
  await expect(normal(page)).toBeDisabled();
  await expect(override(page)).toBeEnabled();
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.locator(exportRoot)).toHaveAttribute("data-letter-pagination-ready", "true", {
    timeout: 30_000,
  });
  await openDownload(page);
  await expect(normal(page)).toBeDisabled();
  await expect(override(page)).toBeEnabled();
  await attach(info, {
    file,
    canonical,
    unchangedStorage: true,
    reopened: "advisory",
    reloaded: "advisory",
    expectedSegments: fixture.segments.letter,
  });
});

for (const fault of ["removed-block", "empty-line", "hidden-text", "missing-contract"] as const) {
  test(`combined cover source text blocks ${fault} and recovers after reload`, async ({
    page,
  }, info) => {
    await loadLetter(page, false);
    await page.goto("http://127.0.0.1:4173");
    await page.getByRole("button", { name: /Gesamtdossier herunterladen/ }).click();
    const root = page.locator("[data-dossier-pdf-canvas]");
    const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
    const downloadButton = dialog.getByRole("button", {
      name: /^(PDF herunterladen|Dossier herunterladen)$/,
    });
    const inspect = () =>
      root.evaluate(async (node) => {
        const path = "/src/lib/pdf-preflight.ts";
        const { inspectPdfPreflight } = await import(path);
        return inspectPdfPreflight(node as HTMLElement, "dossier");
      });
    await expect.poll(async () => (await inspect()).status).toBe("pass");
    await expect(downloadButton).toBeEnabled();
    const before = await page.evaluate(() => ({ ...localStorage }));
    const downloads: string[] = [];
    page.on("download", (download) => downloads.push(download.suggestedFilename()));
    await root
      .locator('[data-dossier-document="cover"] [data-block-id="name"]')
      .evaluate((node, fault) => {
        if (fault === "missing-contract")
          node
            .closest('[data-dossier-document="cover"]')!
            .removeAttribute("data-cover-text-contract");
        else if (fault === "removed-block") node.remove();
        else if (fault === "empty-line") node.textContent = "";
        else (node as HTMLElement).style.display = "none";
      }, fault);
    await expect.poll(async () => (await inspect()).status).toBe("blocked");
    const result = await inspect();
    expect(
      result.issues.some(
        (issue: { code: string }) =>
          issue.code ===
          (fault === "missing-contract" ? "cover-content-contract" : "cover-content-missing"),
      ),
    ).toBe(true);
    await expect(downloadButton).toBeDisabled();
    const failure = await root.evaluate(async (node) => {
      const path = "/src/lib/dossier-pdf.ts";
      const { downloadCombinedDossierPdf } = await import(path);
      try {
        await downloadCombinedDossierPdf(node as HTMLElement, "must-not-download.pdf", {
          title: "QA",
          author: "QA",
        });
        return "UNSAFE SUCCESS";
      } catch (error) {
        return String(error);
      }
    });
    expect(failure).toContain("Titelblatt");
    expect(downloads).toEqual([]);
    expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(before);
    await page.reload();
    await page.getByRole("button", { name: /Gesamtdossier herunterladen/ }).click();
    await expect.poll(async () => (await inspect()).status).toBe("pass");
    await expect(downloadButton).toBeEnabled();
    await attach(info, { fault, result, failure, downloads, recovered: true });
  });
}

test("combined cover text missing only in raster clone cannot download", async ({ page }, info) => {
  await loadLetter(page, false);
  await page.goto("http://127.0.0.1:4173");
  await page.getByRole("button", { name: /Gesamtdossier herunterladen/ }).click();
  const root = page.locator("[data-dossier-pdf-canvas]");
  const inspect = () =>
    root.evaluate(async (node) => {
      const path = "/src/lib/pdf-preflight.ts";
      return (await import(path)).inspectPdfPreflight(node as HTMLElement, "dossier");
    });
  await expect.poll(async () => (await inspect()).status).toBe("pass");
  // The live viewport is 1800px; the production raster iframe is 794px wide.
  // This ordinary media query removes text only in that actual export clone.
  await page.addStyleTag({
    content:
      '@media (max-width:800px){[data-dossier-document="cover"] [data-block-id="name"]{display:none!important}}',
  });
  expect((await inspect()).status).toBe("pass");
  const downloads: string[] = [];
  page.on("download", (download) => downloads.push(download.suggestedFilename()));
  const failure = await root.evaluate(async (node) => {
    const path = "/src/lib/dossier-pdf.ts";
    try {
      await (
        await import(path)
      ).downloadCombinedDossierPdf(node as HTMLElement, "must-not-download.pdf", {
        title: "QA",
        author: "QA",
      });
      return "UNSAFE SUCCESS";
    } catch (error) {
      return String(error);
    }
  });
  expect(failure).toContain("Titelblatt");
  expect(downloads).toEqual([]);
  expect((await inspect()).status).toBe("pass");
  await attach(info, { failure, downloads, liveStatus: "pass", cloneText: "missing" });
});

for (const fault of [
  "removed-entry",
  "hidden-text",
  "missing-contract",
  "missing-root",
  "missing-name",
] as const) {
  test(`combined CV source text blocks ${fault} and recovers after reload`, async ({
    page,
  }, info) => {
    await loadLetter(page, false);
    await page.goto("http://127.0.0.1:4173");
    await page.getByRole("button", { name: /Gesamtdossier herunterladen/ }).click();
    const root = page.locator("[data-dossier-pdf-canvas]");
    const downloadButton = page
      .getByRole("dialog", { name: "Dossier herunterladen" })
      .getByRole("button", { name: /^(PDF herunterladen|Dossier herunterladen)$/ });
    const inspect = () =>
      root.evaluate(async (node) => {
        const path = "/src/lib/pdf-preflight.ts";
        return (await import(path)).inspectPdfPreflight(node as HTMLElement, "dossier");
      });
    await expect.poll(async () => (await inspect()).status).toBe("pass");
    const before = await page.evaluate(() => ({ ...localStorage }));
    const downloads: string[] = [];
    page.on("download", (download) => downloads.push(download.suggestedFilename()));
    await root
      .locator(
        fault === "missing-name"
          ? "[data-cv-page] [data-cv-name]"
          : '[data-cv-page] [data-dossier-field-id="cv.entry.erfahrung:qa-work-0.title"]',
      )
      .evaluate((node, fault) => {
        if (fault === "missing-name") node.remove();
        else if (fault === "removed-entry") node.closest("[data-cv-entry]")!.remove();
        else if (fault === "hidden-text") (node as HTMLElement).style.color = "transparent";
        else
          node
            .closest('[data-dossier-document="cv"]')!
            .removeAttribute(
              fault === "missing-root" ? "data-dossier-document" : "data-cv-text-contract",
            );
      }, fault);
    await expect.poll(async () => (await inspect()).status).toBe("blocked");
    const result = await inspect();
    expect(
      result.issues.some(
        (issue: { code: string }) =>
          issue.code ===
          (["missing-contract", "missing-root"].includes(fault)
            ? "cv-content-contract"
            : "cv-content-missing"),
      ),
    ).toBe(true);
    await expect(downloadButton).toBeDisabled();
    const failure = await root.evaluate(async (node) => {
      const path = "/src/lib/dossier-pdf.ts";
      try {
        await (
          await import(path)
        ).downloadCombinedDossierPdf(node as HTMLElement, "must-not-download.pdf", {
          title: "QA",
          author: "QA",
        });
        return "UNSAFE SUCCESS";
      } catch (error) {
        return String(error);
      }
    });
    expect(failure).toContain("Lebenslauf");
    expect(downloads).toEqual([]);
    expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(before);
    await page.reload();
    await page.getByRole("button", { name: /Gesamtdossier herunterladen/ }).click();
    await expect.poll(async () => (await inspect()).status).toBe("pass");
    await expect(downloadButton).toBeEnabled();
    await attach(info, { fault, result, failure, downloads, recovered: true });
  });
}

test("CV split descriptions and sidebar values are checked on physical pages, never their measurement copies", async ({
  page,
}, info) => {
  const fixture = paginationFixture("brief", {
    layout: "modern",
    descriptionRepeats: 30,
    paragraphs: 2,
  });
  const cv = JSON.parse(fixture.storage["lebenslauf:v1"]);
  cv.data.customSections.push({
    id: "family",
    title: "Familie",
    preset: "familie",
    entries: [
      {
        id: "parent",
        zeit: "legacy date omitted",
        titel: "Vater",
        ort: "Markus Beispiel",
        beschreibung: "Lehrer",
      },
    ],
  });
  fixture.storage["lebenslauf:v1"] = JSON.stringify(cv);
  await loadFixture(page, fixture, "letter");
  await page.goto("http://127.0.0.1:4173");
  await page.getByRole("button", { name: /Gesamtdossier herunterladen/ }).click();
  const root = page.locator("[data-dossier-pdf-canvas]");
  const inspect = () =>
    root.evaluate(async (node) => {
      const path = "/src/lib/pdf-preflight.ts";
      return (await import(path)).inspectPdfPreflight(node as HTMLElement, "dossier");
    });
  await expect.poll(async () => (await inspect()).status, { timeout: 30_000 }).toBe("pass");
  const result = await root.evaluate(async (node) => {
    const path = "/src/lib/pdf-preflight.ts";
    const { inspectPdfPreflight } = await import(path);
    const selector = '[data-dossier-field-id="cv.entry.erfahrung:qa-work-0.description"]';
    const fragments = Array.from(node.querySelectorAll<HTMLElement>(`[data-cv-page] ${selector}`));
    const measure = node.querySelector<HTMLElement>(`[data-cv-measure-page] ${selector}`)!;
    const last = fragments.at(-1)!;
    const oldText = last.textContent;
    last.textContent = "";
    const missingFragment = inspectPdfPreflight(node as HTMLElement, "dossier");
    last.textContent = oldText;
    const repaired = inspectPdfPreflight(node as HTMLElement, "dossier");
    const sidebar = node.querySelector<HTMLElement>(
      '[data-cv-page] [data-cv-sidebar] [data-dossier-field-id^="cv.entry.sprachen:"]',
    )!;
    const sidebarId = sidebar.dataset.dossierFieldId!;
    sidebar.style.visibility = "hidden";
    const hiddenSidebar = inspectPdfPreflight(node as HTMLElement, "dossier");
    sidebar.style.removeProperty("visibility");
    return {
      fragmentCount: fragments.length,
      measurementRetained: Boolean(measure?.textContent),
      missingFragment,
      repaired,
      sidebarId,
      hiddenSidebar,
      recovered: inspectPdfPreflight(node as HTMLElement, "dossier"),
    };
  });
  expect(result.fragmentCount).toBeGreaterThan(1);
  expect(result.measurementRetained).toBe(true);
  expect(
    result.missingFragment.issues.some(
      (issue: { code: string }) => issue.code === "cv-content-missing",
    ),
  ).toBe(true);
  expect(result.repaired.status).toBe("pass");
  expect(
    result.hiddenSidebar.issues.some(
      (issue: { code: string; element: string }) =>
        issue.code === "cv-content-missing" && issue.element.includes(result.sidebarId),
    ),
  ).toBe(true);
  expect(result.recovered.status).toBe("pass");
  await attach(info, result);
});

test("combined CV text missing only in raster clone cannot download", async ({ page }, info) => {
  await loadLetter(page, false);
  await page.goto("http://127.0.0.1:4173");
  await page.getByRole("button", { name: /Gesamtdossier herunterladen/ }).click();
  const root = page.locator("[data-dossier-pdf-canvas]");
  const inspect = () =>
    root.evaluate(async (node) => {
      const path = "/src/lib/pdf-preflight.ts";
      return (await import(path)).inspectPdfPreflight(node as HTMLElement, "dossier");
    });
  await expect.poll(async () => (await inspect()).status).toBe("pass");
  await page.addStyleTag({
    content:
      '@media (max-width:800px){[data-cv-page] [data-dossier-field-id="cv.entry.erfahrung:qa-work-0.title"]{display:none!important}}',
  });
  expect((await inspect()).status).toBe("pass");
  const before = await page.evaluate(() => ({ ...localStorage }));
  const downloads: string[] = [];
  page.on("download", (download) => downloads.push(download.suggestedFilename()));
  const failure = await root.evaluate(async (node) => {
    const path = "/src/lib/dossier-pdf.ts";
    try {
      await (
        await import(path)
      ).downloadCombinedDossierPdf(node as HTMLElement, "must-not-download.pdf", {
        title: "QA",
        author: "QA",
      });
      return "UNSAFE SUCCESS";
    } catch (error) {
      return String(error);
    }
  });
  expect(failure).toContain("Lebenslauf");
  expect(downloads).toEqual([]);
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(before);
  expect((await inspect()).status).toBe("pass");
  await attach(info, { failure, downloads, liveStatus: "pass", cloneText: "missing" });
});

async function openAssetDossier(page: Page) {
  const fixture = paginationFixture("brief", { paragraphs: 2 });
  const photo =
    "data:image/svg+xml," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="100"><rect width="80" height="100" fill="#84655a"/></svg>',
    );
  const letter = JSON.parse(fixture.storage["anschreiben:v1"]);
  letter.data.images = [
    {
      id: "qa-letter-image",
      src: photo.replace("84655a", "2878bd"),
      side: "right",
      topMm: 0,
      widthMm: 18,
      gapMm: 4,
    },
  ];
  fixture.storage["anschreiben:v1"] = JSON.stringify(letter);
  const cover = JSON.parse(fixture.storage["titelblatt:v3"]);
  cover.data.foto = photo;
  cover.customs = [
    { id: "custom-qa-cover-image", kind: "image", label: "Testbild", text: "", src: photo },
    {
      id: "qa-legacy-shape",
      shape: "path",
      path: "M0 0 L95 10 L65 95 Z",
      label: "Testform",
      text: "",
    },
  ];
  cover.layout = {
    brief: {
      "custom-qa-cover-image": { x: 162, y: 150, w: 21, ratio: 1 },
      "qa-legacy-shape": { x: 162, y: 185, w: 20, ratio: 1, fill: "#d55187", opacity: 1 },
    },
  };
  fixture.storage["titelblatt:v3"] = JSON.stringify(cover);
  const cv = JSON.parse(fixture.storage["lebenslauf:v1"]);
  cv.data.person.foto = photo;
  cv.design.useElements = true;
  cv.elements = [
    {
      id: "custom-qa-cv-shape",
      kind: "shape",
      shape: "rect",
      label: "Testform",
      text: "",
      page: 2,
    },
    { id: "custom-qa-cv-text", kind: "text", label: "Testtext", text: "Freier CV-Text", page: 2 },
    {
      id: "custom-qa-cv-image",
      kind: "image",
      label: "Testbild",
      text: "",
      page: 2,
      src: photo.replace("84655a", "27a08c"),
    },
    {
      id: "custom-qa-hidden",
      kind: "shape",
      shape: "rect",
      label: "Ausgeblendete Form",
      text: "",
      page: 2,
    },
  ];
  cv.elementStyles = {
    "custom-qa-cv-shape": { x: 35, y: 95, w: 20, ratio: 0.5, fill: "#8062a3", opacity: 1 },
    "custom-qa-cv-text": { x: 35, y: 145, w: 54 },
    "custom-qa-cv-image": { x: 35, y: 185, w: 24, ratio: 1 },
    "custom-qa-hidden": { hidden: true },
  };
  fixture.storage["lebenslauf:v1"] = JSON.stringify(cv);
  return openCombinedDossier(page, fixture);
}

async function openCombinedDossier(page: Page, fixture: PaginationFixture) {
  await loadFixture(page, fixture, "letter");
  await page.goto("http://127.0.0.1:4173");
  await page.getByRole("button", { name: /Gesamtdossier herunterladen/ }).click();
  const root = page.locator("[data-dossier-pdf-canvas]");
  const button = page
    .getByRole("dialog", { name: "Dossier herunterladen" })
    .getByRole("button", { name: /^(PDF herunterladen|Dossier herunterladen)$/ });
  const inspect = () =>
    root.evaluate(async (node) => {
      const path = "/src/lib/pdf-preflight.ts";
      return (await import(path)).inspectPdfPreflight(node as HTMLElement, "dossier");
    });
  const download = () =>
    root.evaluate(async (node) => {
      const path = "/src/lib/dossier-pdf.ts";
      try {
        await (
          await import(path)
        ).downloadCombinedDossierPdf(node as HTMLElement, "qa-dossier-assets.pdf", {
          title: "QA",
          author: "QA",
        });
        return "downloaded";
      } catch (error) {
        return String(error);
      }
    });
  const waitForPass = () =>
    expect
      .poll(
        async () => {
          const result = await inspect();
          return result.status === "pass" ? result.status : JSON.stringify(result.issues);
        },
        { timeout: 20_000 },
      )
      .toBe("pass");
  await waitForPass();
  await expect(button).toBeEnabled();
  return { root, button, inspect, download, waitForPass };
}

test("combined PDF requires authored photos, images and free CV blocks on their assigned pages", async ({
  page,
}, info) => {
  const { root, button, inspect, download } = await openAssetDossier(page);
  const downloads: string[] = [];
  page.on("download", (file) => downloads.push(file.suggestedFilename()));
  const storage = await page.evaluate(() => ({ ...localStorage }));
  const faults = [
    {
      selector: '[data-letter-page] [data-letter-flow-image="qa-letter-image"] img',
      kind: "letter",
      id: "qa-letter-image",
    },
    {
      selector: '[data-dossier-document="cover"] [data-block-id="foto"]',
      kind: "cover",
      id: "foto",
    },
    {
      selector: '[data-dossier-document="cover"] [data-block-id="custom-qa-cover-image"] img',
      kind: "cover",
      id: "custom-qa-cover-image",
    },
    {
      selector: '[data-dossier-document="cover"] [data-block-id="qa-legacy-shape"] path',
      kind: "cover",
      id: "qa-legacy-shape",
    },
    { selector: "[data-cv-page] [data-cv-photo]", kind: "cv", id: "portrait" },
    {
      selector: '[data-cv-page="1"] [data-block-id="custom-qa-cv-image"] img',
      kind: "cv",
      id: "custom-qa-cv-image",
    },
    {
      selector: '[data-cv-page="1"] [data-block-id="custom-qa-cv-shape"]',
      kind: "cv",
      id: "custom-qa-cv-shape",
    },
    {
      selector: '[data-cv-page="1"] [data-block-id="custom-qa-cv-text"] [data-block-text-line]',
      kind: "cv",
      id: "custom-qa-cv-text",
    },
  ];
  const evidence = [];
  for (const fault of faults) {
    const removed = await root.locator(fault.selector).evaluateHandle((node) => {
      const place = document.createComment("asset under test");
      node.replaceWith(place);
      return { node, place };
    });
    const result = await inspect();
    expect(result.status, fault.id).toBe("blocked");
    expect(
      result.issues.some(
        (issue: { code: string; documentKind: string; element?: string }) =>
          issue.code ===
            (fault.kind === "letter" ? "image-content-missing" : "visual-content-missing") &&
          issue.documentKind === fault.kind &&
          issue.element?.includes(fault.id),
      ),
    ).toBe(true);
    await expect(button).toBeDisabled();
    const failure = await download();
    expect(failure).toContain(
      fault.kind === "letter"
        ? "Motivationsschreiben"
        : fault.kind === "cv"
          ? "Lebenslauf"
          : "Titelblatt",
    );
    evidence.push({ fault, result, failure });
    await removed.evaluate(({ node, place }) => place.replaceWith(node));
    await removed.dispose();
    await expect.poll(async () => (await inspect()).status).toBe("pass");
    await expect(button).toBeEnabled();
  }
  const swapped = await root
    .locator('[data-block-id="custom-qa-cover-image"] img')
    .evaluateHandle(async (node) => {
      const image = node as HTMLImageElement;
      const source = image.getAttribute("src")!;
      image.src = source.replace("84655a", "33a0cc");
      await image.decode();
      return { image, source };
    });
  const wrongImage = await inspect();
  expect(
    wrongImage.issues.some(
      (issue: { code: string; element?: string }) =>
        issue.code === "visual-content-missing" && issue.element?.includes("custom-qa-cover-image"),
    ),
  ).toBe(true);
  await swapped.evaluate(async ({ image, source }) => {
    image.src = source;
    await image.decode();
  });
  await swapped.dispose();
  await expect.poll(async () => (await inspect()).status).toBe("pass");
  const moved = await root
    .locator('[data-cv-page="1"] [data-block-id="custom-qa-cv-shape"]')
    .evaluateHandle((node) => {
      const place = document.createComment("original element page");
      node.replaceWith(place);
      document.querySelector('[data-dossier-pdf-canvas] [data-cv-page="0"]')!.append(node);
      return { node, place };
    });
  const wrongPage = await inspect();
  expect(
    wrongPage.issues.some(
      (issue: { code: string; element?: string }) =>
        issue.code === "visual-content-missing" && issue.element?.includes("custom-qa-cv-shape"),
    ),
  ).toBe(true);
  await moved.evaluate(({ node, place }) => place.replaceWith(node));
  await moved.dispose();
  await expect.poll(async () => (await inspect()).status).toBe("pass");
  expect(downloads).toEqual([]);
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(storage);
  await attach(info, { evidence, wrongPage, wrongImage, downloads, recovered: true });
});

test("combined raster clone preserves images and free shapes before a valid download", async ({
  page,
}, info) => {
  const { button, inspect, download } = await openAssetDossier(page);
  const storage = await page.evaluate(() => ({ ...localStorage }));
  const downloads: string[] = [];
  page.on("download", (file) => downloads.push(file.suggestedFilename()));
  const faults = [
    {
      selector: '[data-letter-page] [data-letter-flow-image="qa-letter-image"] img',
      label: "Motivationsschreiben",
    },
    {
      selector: '[data-dossier-document="cover"] [data-block-id="custom-qa-cover-image"] img',
      label: "Titelblatt",
    },
    {
      selector: '[data-cv-page="1"] [data-block-id="custom-qa-cv-shape"] > :first-child',
      label: "Lebenslauf",
    },
  ];
  const evidence = [];
  for (const fault of faults) {
    const style = await page.addStyleTag({
      content: `@media(max-width:800px){${fault.selector}{display:none!important}}`,
    });
    expect((await inspect()).status).toBe("pass");
    await expect(button).toBeEnabled();
    const failure = await download();
    expect(failure).toContain("PDF-Raster");
    expect(failure).toContain(fault.label);
    expect(downloads).toEqual([]);
    evidence.push({ ...fault, failure });
    await style.evaluate((node) => node.parentNode?.removeChild(node));
  }
  const pending = page.waitForEvent("download", { timeout: 90_000 });
  await button.click();
  const file = await pending;
  await file.saveAs(info.outputPath("complete-dossier-assets.pdf"));
  expect(await file.failure()).toBeNull();
  expect(downloads).toHaveLength(1);
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(storage);
  await attach(info, { evidence, downloads, recovered: true });
});

async function openChromeDossier(page: Page) {
  const fixture = paginationFixture("brief", { paragraphs: 9 });
  const chrome = structuredClone(DEFAULT_DOSSIER_CHROME_STATE);
  chrome.sync = false;
  chrome.cv = {
    ...chrome.cv,
    headerMode: "contact",
    headerDifferentFirstPage: true,
    headerGapMm: 6,
    footerMode: "compact",
    footerHeightMm: 8,
  };
  chrome.letter = {
    ...chrome.letter,
    headerMode: "contact",
    headerDifferentFirstPage: true,
    headerContinuationMode: "none",
    headerGapMm: 6,
    footerMode: "details",
    footerHeightMm: 18,
  };
  fixture.storage[DOSSIER_CHROME_STORAGE_KEY] = JSON.stringify(chrome);
  const cv = JSON.parse(fixture.storage["lebenslauf:v1"]);
  cv.data.sectionLayouts = { erfahrung: { page: 2, width: "full", positioning: "flow" } };
  cv.design.chromeContent = {
    headerTitleEnabled: true,
    headerTitle: "QA CV-Kopf",
    footerTitleEnabled: true,
    footerTitle: "QA CV-Fuss",
    footerTextEnabled: true,
    footerText: "QA CV-Fussangabe",
  };
  fixture.storage["lebenslauf:v1"] = JSON.stringify(cv);
  const letter = JSON.parse(fixture.storage["anschreiben:v1"]);
  letter.design.chromeContent = { headerTextEnabled: true, headerText: "QA Brief-Kopfangabe" };
  fixture.storage["anschreiben:v1"] = JSON.stringify(letter);
  return openCombinedDossier(page, fixture);
}

test("combined PDF requires the configured chrome text on each physical page", async ({
  page,
}, info) => {
  const { root, button, inspect, download, waitForPass } = await openChromeDossier(page);
  const storage = await page.evaluate(() => ({ ...localStorage }));
  const downloads: string[] = [];
  page.on("download", (file) => downloads.push(file.suggestedFilename()));
  await expect(root.locator('[data-cv-page="1"] [data-dossier-continuation-contact]')).toHaveCount(
    1,
  );
  await expect(
    root.locator('[data-cv-page="1"] [data-dossier-contact-field="address"]'),
  ).toHaveCount(0);
  await expect(root.locator('[data-cv-page="1"] [data-dossier-header-title]')).toHaveCount(0);
  await expect(
    root.locator(
      '[data-letter-page][data-letter-final-page="true"] [data-dossier-integrated-contact]',
    ),
  ).toHaveCount(0);
  await expect(
    root.locator(
      '[data-letter-page][data-letter-final-page="false"] [data-letter-footer-attachments]',
    ),
  ).toHaveCount(0);
  const finalLetter = root.locator('[data-letter-page][data-letter-final-page="true"]');
  await expect(finalLetter.locator("[data-letter-footer-attachments]")).toHaveCount(1);
  const finalLetterIndex = Number(await finalLetter.getAttribute("data-letter-page-index"));
  expect(finalLetterIndex).toBeGreaterThan(0);
  const faults = [
    {
      selector:
        '[data-cv-page="1"] [data-dossier-continuation-contact] [data-dossier-contact-field="email"]',
      kind: "cv",
      pageIndex: 1,
      label: "Lebenslauf",
    },
    {
      selector: '[data-cv-page="0"] [data-dossier-field-id="cv.footer.text"]',
      kind: "cv",
      pageIndex: 0,
      label: "Lebenslauf",
    },
    {
      selector:
        '[data-letter-page][data-letter-final-page="true"] [data-letter-footer-attachments]',
      kind: "letter",
      pageIndex: finalLetterIndex,
      label: "Motivationsschreiben",
    },
    {
      selector: '[data-letter-page][data-letter-page-index="0"] [data-dossier-chrome="letter"]',
      kind: "letter",
      pageIndex: 0,
      label: "Motivationsschreiben",
    },
  ];
  const evidence = [];
  for (const fault of faults) {
    const removed = await root.locator(fault.selector).evaluateHandle((node) => {
      const place = document.createComment("chrome under test");
      node.replaceWith(place);
      return { node, place };
    });
    const result = await inspect();
    expect(result.status, fault.selector).toBe("blocked");
    expect(
      result.issues.some(
        (issue: { code: string; documentKind: string; pageIndex: number }) =>
          issue.code === "chrome-content-missing" &&
          issue.documentKind === fault.kind &&
          issue.pageIndex === fault.pageIndex,
      ),
    ).toBe(true);
    await expect(button).toBeDisabled();
    const failure = await download();
    expect(failure).toContain(fault.label);
    evidence.push({ fault, result, failure });
    await removed.evaluate(({ node, place }) => place.replaceWith(node));
    await removed.dispose();
    await waitForPass();
    await expect(button).toBeEnabled();
  }
  expect(downloads).toEqual([]);
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(storage);
  await attach(info, { evidence, downloads, recovered: true });
});

test("combined raster clone preserves page chrome before a valid download", async ({
  page,
}, info) => {
  const { button, inspect, download } = await openChromeDossier(page);
  const storage = await page.evaluate(() => ({ ...localStorage }));
  const downloads: string[] = [];
  page.on("download", (file) => downloads.push(file.suggestedFilename()));
  const faults = [
    {
      selector:
        '[data-letter-page][data-letter-final-page="true"] [data-letter-footer-attachments]',
      label: "Motivationsschreiben",
    },
    {
      selector:
        '[data-cv-page="1"] [data-dossier-continuation-contact] [data-dossier-contact-field="email"]',
      label: "Lebenslauf",
    },
  ];
  const evidence = [];
  for (const fault of faults) {
    const style = await page.addStyleTag({
      content: `@media(max-width:800px){${fault.selector}{opacity:0!important}}`,
    });
    expect((await inspect()).status).toBe("pass");
    await expect(button).toBeEnabled();
    const failure = await download();
    expect(failure).toContain("Im PDF-Raster fehlen Kopf- oder Fusszeilenangaben");
    expect(failure).toContain(fault.label);
    expect(downloads).toEqual([]);
    evidence.push({ ...fault, failure });
    await style.evaluate((node) => node.parentNode?.removeChild(node));
  }
  const pending = page.waitForEvent("download", { timeout: 90_000 });
  await button.click();
  const file = await pending;
  await file.saveAs(info.outputPath("complete-dossier-chrome.pdf"));
  expect(await file.failure()).toBeNull();
  expect(downloads).toHaveLength(1);
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(storage);
  await attach(info, { evidence, downloads, recovered: true });
});
