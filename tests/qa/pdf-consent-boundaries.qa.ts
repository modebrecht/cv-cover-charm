import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { paginationFixture } from "./pagination-fixtures";
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
