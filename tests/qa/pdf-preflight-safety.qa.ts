import { expect, test, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { paginationFixture } from "./pagination-fixtures";
import type { PdfPreflightIssue } from "../../src/lib/pdf-preflight";
import { parityStorage } from "../e2e/support/cv-parity-fixture";
import {
  auditDocument,
  documentRoots,
  evidenceDir,
  loadFixture,
  runtimeProvenance,
} from "./pagination-browser";
import {
  DEFAULT_DOSSIER_CHROME_STATE,
  DOSSIER_CHROME_STORAGE_KEY,
} from "../../src/lib/dossier-chrome";

const exportRoot = "[data-letter-standalone-export] [data-letter-document-root]";
const imageSrc = `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="#2563eb"/></svg>').toString("base64")}`;

async function verdict(page: Page, kind: "letter" | "dossier" = "letter") {
  return page.evaluate(
    async ({ selector, kind }) => {
      const path = "/src/lib/pdf-preflight.ts";
      const { inspectPdfPreflight } = await import(path);
      const { status, issues } = inspectPdfPreflight(document.querySelector(selector), kind);
      return { status, issues };
    },
    { selector: kind === "letter" ? exportRoot : "[data-dossier-pdf-canvas]", kind },
  );
}

async function directExportFailure(page: Page, kind: "letter" | "dossier" = "letter") {
  return page.evaluate(
    async ({ selector, kind }) => {
      const path = "/src/lib/dossier-pdf.ts";
      const api = await import(path);
      try {
        await (kind === "letter" ? api.downloadLetterPdf : api.downloadCombinedDossierPdf)(
          document.querySelector(selector),
          "must-not-download.pdf",
          { title: "Safety test", author: "QA" },
        );
        return "UNSAFE SUCCESS";
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
    },
    { selector: kind === "letter" ? exportRoot : "[data-dossier-pdf-canvas]", kind },
  );
}

async function forceAdvisory(page: Page) {
  await page.addInitScript(() => {
    const install = () => {
      if (!document.head || document.getElementById("preflight-probe-test")) return;
      const style = document.createElement("style");
      style.id = "preflight-probe-test";
      style.textContent =
        "[data-letter-pagination-measurements] [data-letter-text-layer]{height:0!important;min-height:0!important;max-height:0!important;bottom:auto!important}";
      document.head.append(style);
    };
    new MutationObserver(install).observe(document, {
      childList: true,
      subtree: true,
    });
    install();
  });
}

for (const [label, css] of [
  [
    "text-beyond-page",
    `${exportRoot} [data-letter-pdf-richtext="body"]{transform:translateY(1200px)!important}`,
  ],
  [
    "nested-clipping",
    `${exportRoot} [data-letter-pdf-richtext="body"]>div:first-child{height:4px!important;min-height:0!important;overflow:clip!important}`,
  ],
  [
    "header-overlap",
    `${exportRoot} [data-letter-pdf-richtext="body"]{transform:translateY(-460px)!important}`,
  ],
  ["hidden-required-text", `${exportRoot} [data-letter-pdf-richtext="body"]{opacity:0!important}`],
  [
    "text-overlap",
    `${exportRoot} [data-letter-pdf-richtext="body"]>div:last-child{transform:translateY(-100px)!important}`,
  ],
  ["invalid-a4", `${exportRoot} [data-letter-page]{height:1000px!important}`],
] as const) {
  test(`negative ${label}: UI and direct API block`, async ({ page }) => {
    await loadFixture(page, paginationFixture("brief", { paragraphs: 2 }), "letter");
    await page.addStyleTag({ content: css });
    expect((await verdict(page)).status).toBe("blocked");
    expect(await directExportFailure(page)).not.toBe("UNSAFE SUCCESS");
    await page.getByRole("button", { name: "Download", exact: true }).click();
    await expect(
      page.getByRole("button", { name: /Nur Motivationsschreiben als PDF/ }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "PDF trotzdem herunterladen", exact: true }),
    ).toHaveCount(0);
  });
}

for (const mode of ["pagination-pending", "missing-text", "invalid-page"] as const) {
  test(`negative ${mode}: cannot consent or call the API`, async ({ page }) => {
    await loadFixture(page, paginationFixture("brief", { paragraphs: 2 }), "letter");
    const result = await page.locator(exportRoot).evaluate(async (root, mode) => {
      const path = "/src/lib/pdf-preflight.ts",
        apiPath = "/src/lib/dossier-pdf.ts";
      const preflight = await import(path),
        api = await import(apiPath);
      if (mode === "pagination-pending")
        (root as HTMLElement).dataset.letterPaginationReady = "false";
      else if (mode === "missing-text")
        root.querySelector('[data-letter-pdf-richtext="body"]')!.firstElementChild!.remove();
      else
        (root.querySelector("[data-letter-page]") as HTMLElement).dataset.letterFinalPage = "false";
      const { status, issues } = preflight.inspectPdfPreflight(root, "letter");
      let consentError = "",
        exportError = "";
      try {
        preflight.createPdfAdvisoryConsent(root, "letter");
      } catch (e) {
        consentError = String(e);
      }
      try {
        await api.downloadLetterPdf(root, "must-not-download.pdf", { title: "QA", author: "QA" });
      } catch (e) {
        exportError = String(e);
      }
      return { status, issues, consentError, exportError };
    }, mode);
    expect(result.status).toBe(mode === "pagination-pending" ? "pending" : "blocked");
    expect(result.consentError).not.toBe("");
    expect(result.exportError).not.toBe("");
  });
}

for (const placement of ["left", "free"] as const) {
  test(`safe ${placement} image uses real production PDF`, async ({ page }) => {
    const fixture = paginationFixture("brief", { paragraphs: 2 });
    const letter = JSON.parse(fixture.storage["anschreiben:v1"]);
    letter.data.images = [
      {
        id: "qa-image",
        src: imageSrc,
        side: "left",
        topMm: 0,
        widthMm: 16,
        gapMm: 4,
        ...(placement === "free" ? { xMm: -20 } : {}),
      },
    ];
    fixture.storage["anschreiben:v1"] = JSON.stringify(letter);
    await loadFixture(page, fixture, "letter");
    expect((await verdict(page)).status).toBe("pass");
    const result = await auditDocument(page, fixture, "letter", `preflight-image-${placement}`);
    expect(result.findings).toEqual([]);
    await page.addStyleTag({
      content: `${exportRoot} [data-letter-flow-image] img{transform:translateX(1000px)!important}`,
    });
    expect((await verdict(page)).status).toBe("blocked");
    expect(await directExportFailure(page)).not.toBe("UNSAFE SUCCESS");
  });
}

test("negative indivisible table row taller than the printable page", async ({ page }) => {
  const fixture = paginationFixture("brief", { paragraphs: 2 }),
    letter = JSON.parse(fixture.storage["anschreiben:v1"]);
  letter.data.text = Array.from({ length: 100 }, (_, i) => `Required row content ${i}`).join("\n");
  letter.data.richTextHtml = `<table data-letter-table="true"><tbody><tr><td>${Array.from({ length: 100 }, (_, i) => `<div>Required row content ${i}</div>`).join("")}</td></tr></tbody></table>`;
  fixture.storage["anschreiben:v1"] = JSON.stringify(letter);
  await loadFixture(page, fixture, "letter");
  expect((await verdict(page)).status).toBe("blocked");
  expect(await directExportFailure(page)).not.toBe("UNSAFE SUCCESS");
});

test("pending and failed actual image loading remain unsafe", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/preflight-delayed.svg", async (route) => {
    await gate;
    await route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="blue"/></svg>',
    });
  });
  const fixture = paginationFixture("brief", { paragraphs: 2 }),
    letter = JSON.parse(fixture.storage["anschreiben:v1"]);
  letter.data.images = [
    { id: "qa-image", src: imageSrc, side: "right", topMm: 0, widthMm: 16, gapMm: 4 },
  ];
  fixture.storage["anschreiben:v1"] = JSON.stringify(letter);
  await loadFixture(page, fixture, "letter");
  await page
    .locator(`${exportRoot} [data-letter-flow-image] img`)
    .first()
    .evaluate((img) => {
      (img as HTMLImageElement).src = "/preflight-delayed.svg";
    });
  try {
    expect((await verdict(page)).status).toBe("pending");
    expect(await directExportFailure(page)).toContain("geladen");
  } finally {
    release();
  }
  await expect.poll(async () => (await verdict(page)).status).toBe("pass");
  // Use the persisted source for the failure: a React pagination update can
  // replace an image whose src was changed only on the current DOM node.
  letter.data.images[0].src = "data:image/png;base64,invalid";
  fixture.storage["anschreiben:v1"] = JSON.stringify(letter);
  await loadFixture(page, fixture, "letter");
  const failedImage = page.locator(`${exportRoot} [data-letter-flow-image] img`).first();
  await expect(failedImage).toHaveAttribute("src", "data:image/png;base64,invalid");
  await expect
    .poll(() =>
      failedImage.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth === 0),
    )
    .toBe(true);
  const failedVerdict = await verdict(page);
  expect(failedVerdict.status, JSON.stringify(failedVerdict.issues)).toBe("blocked");
  expect(await directExportFailure(page)).toContain("Bild");
});

test("pending required font blocks while unrelated font loading does not", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/preflight-font.woff2", async (route) => {
    await gate;
    await route.fulfill({ status: 404, body: "missing test font" });
  });
  await loadFixture(page, paginationFixture("brief", { paragraphs: 2 }), "letter");
  await page.evaluate(() => {
    const font = new FontFace("PreflightDelayed", 'url("/preflight-font.woff2")');
    document.fonts.add(font);
    void font.load().catch(() => {});
  });
  try {
    expect((await verdict(page)).status).toBe("pass");
    await page.addStyleTag({
      content: `${exportRoot} [data-letter-pdf-richtext="body"]{font-family:PreflightDelayed,sans-serif!important}`,
    });
    expect((await verdict(page)).status).toBe("pending");
    expect(await directExportFailure(page)).toContain("Schriften");
  } finally {
    release();
  }
});

for (const gap of [0, 40]) {
  test(`safe header gap ${gap} mm and 12pt/24mm margins`, async ({ page }) => {
    const fixture = paginationFixture("studio3", { paragraphs: 6, custom: true });
    const letter = JSON.parse(fixture.storage["anschreiben:v1"]);
    letter.data.absenderName = "QASENDER001 Lea Müller";
    fixture.storage["anschreiben:v1"] = JSON.stringify(letter);
    const chrome = structuredClone(DEFAULT_DOSSIER_CHROME_STATE);
    chrome.sync = false;
    chrome.letter = {
      ...chrome.letter,
      headerMode: "contact",
      headerGapMm: gap,
      footerMode: "details",
      footerHeightMm: 20,
    };
    fixture.storage[DOSSIER_CHROME_STORAGE_KEY] = JSON.stringify(chrome);
    await loadFixture(page, fixture, "letter");
    const count = await page.locator(`${exportRoot} ${documentRoots("letter").pages}`).count();
    expect((await verdict(page)).status).toBe("pass");
    const result = await auditDocument(page, fixture, "letter", `preflight-header-gap-${gap}`);
    expect(result.findings).toEqual([]);
    for (const pages of [result.web, result.canonical, result.pdf!.pages]) {
      expect(pages.length).toBe(count);
      for (const sheet of pages)
        expect(sheet.markers.filter((marker) => marker === "QASENDER001")).toHaveLength(1);
    }
  });
}

test("advisory requires explicit one-use consent and no saved override", async ({ page }) => {
  await forceAdvisory(page);
  const fixture = paginationFixture("brief", { paragraphs: 2 });
  await loadFixture(page, fixture, "letter");
  expect((await verdict(page)).status).toBe("advisory");
  expect(await directExportFailure(page)).toContain("Umbruchmessung");
  await page.getByRole("button", { name: "Download", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Nur Motivationsschreiben als PDF/ }),
  ).toBeDisabled();
  const before = await page.evaluate(() => localStorage.getItem("anschreiben:v1"));
  const download = page.waitForEvent("download", { timeout: 90000 });
  await page.getByRole("button", { name: "PDF trotzdem herunterladen", exact: true }).click();
  await (await download).saveAs("artifacts/pdf-preflight/advisory-letter.pdf");
  expect(await page.evaluate(() => localStorage.getItem("anschreiben:v1"))).toBe(before);
  const replay = await page.locator(exportRoot).evaluate(async (root) => {
    const path = "/src/lib/pdf-preflight.ts";
    const p = await import(path);
    const consent = p.createPdfAdvisoryConsent(root, "letter");
    p.beginPdfSafetyValidation(root, "letter", consent)();
    try {
      p.beginPdfSafetyValidation(root, "letter", consent)();
      return "UNSAFE REPLAY";
    } catch (e) {
      return String(e);
    }
  });
  expect(replay).toContain("abgelaufen");
});

for (const change of ["typography", "clipping", "pending", "missing"] as const) {
  test(`advisory cannot bypass subsequent ${change}`, async ({ page }) => {
    await forceAdvisory(page);
    await loadFixture(page, paginationFixture("brief", { paragraphs: 2 }), "letter");
    const result = await page.locator(exportRoot).evaluate(async (root, change) => {
      const path = "/src/lib/pdf-preflight.ts",
        apiPath = "/src/lib/dossier-pdf.ts";
      const p = await import(path),
        api = await import(apiPath);
      const consent = p.createPdfAdvisoryConsent(root, "letter");
      if (change === "pending") (root as HTMLElement).dataset.letterPaginationReady = "false";
      else if (change === "missing")
        root.querySelector('[data-letter-pdf-richtext="body"]')!.firstElementChild!.remove();
      else {
        const style = document.createElement("style");
        style.textContent =
          change === "clipping"
            ? '[data-letter-standalone-export] [data-letter-pdf-richtext="body"]{transform:translateY(1200px)!important}'
            : '[data-letter-standalone-export] [data-letter-pdf-richtext="body"]{font-size:11pt!important}';
        document.head.append(style);
      }
      const { status } = p.inspectPdfPreflight(root, "letter");
      try {
        await api.downloadLetterPdf(
          root,
          "must-not-download.pdf",
          { title: "QA", author: "QA" },
          consent,
        );
        return { status, error: "UNSAFE SUCCESS" };
      } catch (e) {
        return { status, error: String(e) };
      }
    }, change);
    expect(result.error).not.toBe("UNSAFE SUCCESS");
    expect(result.error).toMatch(
      change === "typography"
        ? /abgelaufen/
        : change === "pending"
          ? /vermessen/
          : change === "missing"
            ? /vollständig/
            : /abgeschnitten/,
    );
  });
}

test("combined advisory and hard CV clipping share the final policy", async ({ page }) => {
  await forceAdvisory(page);
  await loadFixture(
    page,
    paginationFixture("brief", { paragraphs: 2, works: 1, schools: 1 }),
    "letter",
  );
  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Gesamtdossier herunterladen/ }).click();
  const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
  await dialog.locator("summary").click();
  await expect(
    dialog.locator("[data-pdf-advisory]").filter({ hasText: /Umbruchmessung/ }),
  ).toBeVisible({ timeout: 30000 });
  await expect(
    dialog.getByRole("button", { name: "PDF trotzdem herunterladen", exact: true }),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole("button", { name: "PDF herunterladen", exact: true }),
  ).toBeDisabled();
  const consentFailure = await page.locator("[data-dossier-pdf-canvas]").evaluate(async (root) => {
    const path = "/src/lib/pdf-preflight.ts";
    const policy = await import(path);
    const result = policy.inspectPdfPreflight(root, "dossier");
    try {
      policy.createPdfAdvisoryConsent(root, "dossier");
      return { status: result.status, issues: result.issues, error: "UNSAFE CONSENT" };
    } catch (e) {
      return { status: result.status, issues: result.issues, error: String(e) };
    }
  });
  expect(consentFailure.status).toBe("advisory");
  expect(consentFailure.issues.every((issue: PdfPreflightIssue) => !issue.overridePermitted)).toBe(
    true,
  );
  expect(consentFailure.error).not.toBe("UNSAFE CONSENT");
  expect(await directExportFailure(page, "dossier")).not.toBe("UNSAFE SUCCESS");
  await page.addStyleTag({
    content: "[data-dossier-pdf-canvas] [data-cv-main]{transform:translateY(1200px)!important}",
  });
  expect((await verdict(page, "dossier")).status).toBe("blocked");
  expect(await directExportFailure(page, "dossier")).toContain("Lebenslauf");
  await expect(
    dialog.getByRole("button", { name: "PDF trotzdem herunterladen", exact: true }),
  ).toHaveCount(0);
});

test("negative mirrored free CV photo covers visible identity", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173", { waitUntil: "domcontentloaded" });
  await page.evaluate(
    (storage) => {
      localStorage.clear();
      for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, value);
    },
    parityStorage("gallery", true, true),
  );
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Gesamtdossier herunterladen/ }).click();
  const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
  await expect(page.locator("[data-dossier-pdf-canvas]")).toHaveAttribute(
    "data-dossier-cv-ready",
    "true",
  );
  const result = await verdict(page, "dossier");
  expect(result.status, JSON.stringify(result.issues)).toBe("blocked");
  expect(await directExportFailure(page, "dossier")).toContain("Lebenslauf");
  await expect(
    dialog.getByRole("button", { name: "PDF herunterladen", exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "PDF trotzdem herunterladen", exact: true }),
  ).toHaveCount(0);
});

for (const condition of ["text-outside", "image-outside", "image-overlap"] as const) {
  test(`combined advisory cannot bypass cover ${condition}`, async ({ page }) => {
    await forceAdvisory(page);
    const fixture = paginationFixture("brief", { paragraphs: 2, works: 1, schools: 1 });
    const cover = JSON.parse(fixture.storage["titelblatt:v3"]);
    cover.data.foto = imageSrc;
    fixture.storage["titelblatt:v3"] = JSON.stringify(cover);
    await loadFixture(page, fixture, "letter");
    await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Gesamtdossier herunterladen/ }).click();
    const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
    await dialog.locator("summary").click();
    await expect(
      dialog.locator("[data-pdf-advisory]").filter({ hasText: /Umbruchmessung/ }),
    ).toBeVisible({ timeout: 30000 });
    await expect(page.locator('[data-dossier-pdf-canvas] [data-block-id="foto"] img')).toHaveCount(
      1,
    );
    const transform =
      condition === "image-overlap"
        ? await page
            .locator('[data-dossier-pdf-canvas] [data-dossier-document="cover"]')
            .evaluate((sheet) => {
              const name = sheet.querySelector('[data-block-id="name"]')!.getBoundingClientRect();
              const photo = sheet.querySelector('[data-block-id="foto"]')!.getBoundingClientRect();
              return `translate(${name.left - photo.left}px,${name.top - photo.top}px)`;
            })
        : "translateY(1200px)";
    await page.addStyleTag({
      content: `[data-dossier-pdf-canvas] [data-dossier-document="cover"] [data-block-id="${condition === "text-outside" ? "name" : "foto"}"]{transform:${transform}!important}`,
    });
    const result = await verdict(page, "dossier");
    const geometry = await page
      .locator('[data-dossier-pdf-canvas] [data-dossier-document="cover"]')
      .evaluate((sheet, condition) => {
        const p = sheet.getBoundingClientRect();
        const element = sheet.querySelector(
          `[data-block-id="${condition === "text-outside" ? "name" : "foto"}"]`,
        )!;
        const r = element.getBoundingClientRect();
        return {
          pagePx: { width: p.width, height: p.height },
          elementPx: {
            left: r.left - p.left,
            top: r.top - p.top,
            width: r.width,
            height: r.height,
          },
          elementMm: {
            left: ((r.left - p.left) * 210) / p.width,
            top: ((r.top - p.top) * 297) / p.height,
            width: (r.width * 210) / p.width,
            height: (r.height * 297) / p.height,
          },
          imageReady: Array.from(element.querySelectorAll("img")).map((i) => ({
            complete: i.complete,
            naturalWidth: i.naturalWidth,
          })),
        };
      }, condition);
    await mkdir(evidenceDir, { recursive: true });
    await writeFile(
      join(evidenceDir, `cover-policy-${condition}.json`),
      JSON.stringify({ ...runtimeProvenance(), fixture, geometry, result }, null, 2),
    );
    expect(result.status, JSON.stringify(result.issues)).toBe("blocked");
    expect(await directExportFailure(page, "dossier")).toContain("Titelblatt");
    await expect(
      dialog.getByRole("button", { name: "PDF trotzdem herunterladen", exact: true }),
    ).toHaveCount(0);
  });
}

test("final guard catches edits during actual raster generation", async ({ page }) => {
  await loadFixture(page, paginationFixture("brief", { paragraphs: 2 }), "letter");
  await page.evaluate(() => {
    let applied = false;
    new MutationObserver(() => {
      if (applied || !document.querySelector("iframe.html2canvas-container")) return;
      applied = true;
      const style = document.createElement("style");
      style.textContent =
        '[data-letter-standalone-export] [data-letter-pdf-richtext="body"]{transform:translateY(1200px)!important}';
      document.head.append(style);
    }).observe(document.body, { childList: true, subtree: true });
  });
  expect(await directExportFailure(page)).toMatch(/abgeschnitten|verändert/);
});

test("missing semantic Letter content blocks before consent and disables UI", async ({ page }) => {
  await forceAdvisory(page);
  const fixture = paginationFixture("brief", { paragraphs: 2 });
  await loadFixture(page, fixture, "letter");
  const result = await page.locator(exportRoot).evaluate(async (root) => {
    const policyPath = "/src/lib/pdf-preflight.ts",
      apiPath = "/src/lib/dossier-pdf.ts";
    const policy = await import(policyPath),
      api = await import(apiPath);
    const results = [];
    for (const role of [
      "sender",
      "recipient",
      "date",
      "subject",
      "salutation",
      "closing",
      "signature",
      "attachments-heading",
      "attachments-body",
    ]) {
      const node = root.querySelector(
        `[data-letter-document-pages] [data-letter-pdf-text="${role}"]`,
      )!;
      const parent = node.parentElement!,
        next = node.nextSibling;
      const original = node.textContent;
      const r = node.getBoundingClientRect();
      node.remove();
      const { status, issues } = policy.inspectPdfPreflight(root, "letter");
      let consentError = "",
        exportError = "";
      try {
        policy.createPdfAdvisoryConsent(root, "letter");
      } catch (e) {
        consentError = String(e);
      }
      try {
        await api.downloadLetterPdf(root, "must-not-download.pdf", { title: "QA", author: "QA" });
      } catch (e) {
        exportError = String(e);
      }
      results.push({
        role,
        original,
        geometryPx: { width: r.width, height: r.height },
        status,
        issues,
        consentError,
        exportError,
      });
      parent.insertBefore(node, next);
    }
    root.querySelector('[data-letter-document-pages] [data-letter-pdf-text="signature"]')!.remove();
    return results;
  });
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(
    join(evidenceDir, "missing-letter-semantics.json"),
    JSON.stringify({ ...runtimeProvenance(), fixture, result }, null, 2),
  );
  for (const item of result) {
    expect(item.original, item.role).toBeTruthy();
    expect(item.status, item.role).toBe("blocked");
    expect(
      item.issues.some((issue: PdfPreflightIssue) => issue.code === "semantic-content-missing"),
      item.role,
    ).toBe(true);
    expect(item.consentError, item.role).not.toBe("");
    expect(item.exportError, item.role).not.toBe("");
  }
  await page.getByRole("button", { name: "Download", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Nur Motivationsschreiben als PDF/ }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "PDF trotzdem herunterladen", exact: true }),
  ).toHaveCount(0);
});
