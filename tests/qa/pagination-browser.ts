import { expect, type Page } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { BASE_URL, waitEditorReady } from "../e2e/support/dossier-gallery-shared";
import type { PaginationFixture } from "./pagination-fixtures";
import { contentFindings, distributionFindings, normalizeContent } from "./pagination-assertions";

export type DocumentKind = "cv" | "letter";
export const evidenceDir = process.env.PAGINATION_QA_DIR ?? "artifacts/pagination-2page";
export function runtimeProvenance() {
  return {
    sourceSha: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    sourceDirty: !!execFileSync("git", ["status", "--porcelain", "--untracked-files=no"], {
      encoding: "utf8",
    }).trim(),
    runtimeDiff: execFileSync("git", ["diff", "--name-only", "HEAD"], { encoding: "utf8" })
      .trim()
      .split("\n")
      .filter(Boolean),
    runtimeBlobs: Object.fromEntries(
      [
        "src/lib/dossier-pdf.ts",
        "src/lib/pdf-preflight.ts",
        "src/components/letter/preflight.ts",
        "src/components/letter/LetterDocument.tsx",
        "src/components/letter/letter-pagination.ts",
        "src/components/letter/letter-pagination.css",
        "src/components/cv/CvCanvasBase.tsx",
        "src/components/cv/flow-pagination.ts",
      ].map((path) => [
        path,
        execFileSync("git", ["hash-object", "--", path], { encoding: "utf8" }).trim(),
      ]),
    ),
  };
}
export function documentRoots(kind: DocumentKind) {
  return kind === "cv"
    ? {
        web: '[data-dossier-document="cv"][data-export-mode="false"]',
        canonical: '[data-dossier-document="cv"][data-export-mode="true"]',
        pages: "[data-cv-page]",
      }
    : {
        web: "main [data-letter-document-root]",
        canonical: "[data-letter-standalone-export] [data-letter-document-root]",
        pages: "[data-letter-document-pages] [data-letter-page]",
      };
}
export async function loadFixture(page: Page, fixture: PaginationFixture, kind: DocumentKind) {
  // Establish the real app origin without hydrating the previous fixture's
  // complete dossier before replacing storage. The next navigation uses the
  // actual production route, renderers and exporter without interception.
  await page.goto(`${BASE_URL}/fonts/Cabin-OFL.txt`, { waitUntil: "domcontentloaded" });
  await page.evaluate((values) => {
    localStorage.clear();
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);
  }, fixture.storage);
  await page.goto(`${BASE_URL}/${kind === "cv" ? "lebenslauf" : "anschreiben"}`, {
    waitUntil: "domcontentloaded",
  });
  await waitEditorReady(page);
  const roots = documentRoots(kind);
  await expect(page.locator(roots.web).first()).toBeVisible();
  if (kind === "letter")
    for (const selector of [roots.web, roots.canonical])
      await expect(page.locator(selector).first()).toHaveAttribute(
        "data-letter-pagination-ready",
        "true",
        { timeout: 30_000 },
      );
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images)
        .filter((i) => i.complete)
        .map((i) => i.decode().catch(() => {})),
    );
  });
  // CV has no public ready flag. Poll the actual page text/count until stable;
  // do not assume the initial single-page render is the settled pagination.
  let previous = "",
    stable = 0;
  for (let i = 0; i < 30; i++) {
    const current = JSON.stringify(
      await page.locator(`${roots.web} ${roots.pages}`).allTextContents(),
    );
    stable = current === previous ? stable + 1 : 0;
    previous = current;
    if (stable >= 3) return;
    await page.waitForTimeout(150);
  }
  throw new Error("Pagination did not stabilize within the bounded readiness window");
}

export async function collectDocument(page: Page, selector: string, kind: DocumentKind) {
  return page.locator(`${selector} ${documentRoots(kind).pages}`).evaluateAll(
    (sheets, kind) =>
      sheets.map((sheet, index) => {
        const p = sheet.getBoundingClientRect();
        const sx = 210 / p.width,
          sy = 297 / p.height;
        const box = (r: DOMRect) => [
          +((r.left - p.left) * sx).toFixed(3),
          +((r.top - p.top) * sy).toFixed(3),
          +(r.width * sx).toFixed(3),
          +(r.height * sy).toFixed(3),
        ];
        const issues: string[] = [];
        const metricsContext = document.createElement("canvas").getContext("2d")!;
        const visibleText: string[] = [];
        const markerBoxes: { marker: string; box: number[] }[] = [];
        const footerText: string[] = [];
        const walker = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT);
        let node: Node | null;
        while ((node = walker.nextNode())) {
          if (!(node.textContent ?? "").trim()) continue;
          let ancestor = node.parentElement;
          let hidden = false;
          while (ancestor) {
            const style = getComputedStyle(ancestor);
            if (style.display === "none" || style.visibility === "hidden") {
              hidden = true;
              break;
            }
            if (ancestor === sheet) break;
            ancestor = ancestor.parentElement;
          }
          if (hidden) continue;
          for (const match of (node.textContent ?? "").matchAll(/QA[A-Z]+\d{3}/g)) {
            const markerRange = document.createRange();
            markerRange.setStart(node, match.index!);
            markerRange.setEnd(node, match.index! + match[0].length);
            for (const markerRect of Array.from(markerRange.getClientRects()))
              if (markerRect.width > 0 && markerRect.height > 0)
                markerBoxes.push({ marker: match[0], box: box(markerRect) });
          }
          // Absolute chrome footers precede the body in the component DOM.
          // Compare logical header/body/footer order, retaining every visible node.
          (kind === "letter" && node.parentElement?.closest("[data-dossier-footer]")
            ? footerText
            : visibleText
          ).push(node.textContent ?? "");
          const range = document.createRange();
          range.selectNodeContents(node);
          const font = getComputedStyle(node.parentElement!);
          metricsContext.font =
            font.font || `${font.fontStyle} ${font.fontWeight} ${font.fontSize} ${font.fontFamily}`;
          const metrics = metricsContext.measureText(node.textContent ?? "");
          for (const rect of Array.from(range.getClientRects())) {
            if (rect.width <= 0 || rect.height <= 0) continue;
            // Range rectangles include unused font ascent/descent. Compare
            // painted glyph bounds vertically, preserving the 0.3 mm limit.
            const fontHeight = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
            const fontScale = fontHeight > 0 ? rect.height / fontHeight : 0;
            const inkTop =
              rect.top +
              (metrics.fontBoundingBoxAscent - metrics.actualBoundingBoxAscent) * fontScale;
            const inkBottom =
              rect.bottom -
              (metrics.fontBoundingBoxDescent - metrics.actualBoundingBoxDescent) * fontScale;
            if (
              (p.left - rect.left) * sx > 0.3 ||
              (rect.right - p.right) * sx > 0.3 ||
              (p.top - inkTop) * sy > 0.3 ||
              (inkBottom - p.bottom) * sy > 0.3
            )
              issues.push(`outside A4: ${node.textContent!.slice(0, 65)}`);
            ancestor = node.parentElement;
            while (ancestor && ancestor !== sheet) {
              const style = getComputedStyle(ancestor),
                clip = ancestor.getBoundingClientRect();
              if (
                ((/hidden|clip|auto|scroll/.test(style.overflowY) ||
                  ancestor.hasAttribute("data-letter-text-layer")) &&
                  ((clip.top - inkTop) * sy > 0.3 || (inkBottom - clip.bottom) * sy > 0.3)) ||
                (/hidden|clip|auto|scroll/.test(style.overflowX) &&
                  ((clip.left - rect.left) * sx > 0.3 || (rect.right - clip.right) * sx > 0.3))
              ) {
                issues.push(
                  `${ancestor.hasAttribute("data-letter-text-layer") ? "outside printable text box" : "clipped"} by ${ancestor.tagName} ${Array.from(
                    ancestor.attributes,
                  )
                    .filter((a) => a.name.startsWith("data-"))
                    .map((a) => a.name)
                    .join(" ")}: ${node.textContent!.slice(0, 65)}`,
                );
                break;
              }
              ancestor = ancestor.parentElement;
            }
          }
        }
        const main = sheet.querySelector<HTMLElement>(
          kind === "cv" ? "[data-cv-main]" : "[data-letter-text-layer]",
        );
        const sidebar = sheet.querySelector<HTMLElement>("[data-cv-sidebar]");
        const children = main
          ? Array.from(main.children).filter(
              (n): n is HTMLElement =>
                n instanceof HTMLElement &&
                !!n.textContent?.trim() &&
                getComputedStyle(n).display !== "none",
            )
          : [];
        for (let i = 1; i < children.length; i++) {
          const before = children[i - 1].getBoundingClientRect(),
            after = children[i].getBoundingClientRect();
          if (
            (before.bottom - after.top) * sy > 0.3 &&
            after.left < before.right &&
            after.right > before.left
          )
            issues.push(
              `overlapping flow blocks: ${children[i - 1].textContent?.slice(0, 35)} / ${children[i].textContent?.slice(0, 35)}`,
            );
        }
        if (kind === "cv" && children.length) {
          const last = children.at(-1)!;
          if (
            last.querySelector("[data-cv-section-title]") &&
            !last.querySelector("[data-cv-entry]")
          )
            issues.push(`orphaned heading: ${last.textContent}`);
        }
        const text = [...visibleText, ...footerText].join(" ");
        return {
          index: Number(
            sheet.getAttribute(kind === "cv" ? "data-cv-page" : "data-letter-page-index"),
          ),
          text,
          markers: text.match(/QA[A-Z]+\d{3}/g) ?? [],
          markerBoxes,
          issues: [...new Set(issues)],
          main: main ? box(main.getBoundingClientRect()) : null,
          sidebar: sidebar ? box(sidebar.getBoundingClientRect()) : null,
          sidebarSide: sidebar?.getAttribute("data-cv-sidebar-side"),
          final: sheet.getAttribute("data-letter-final-page"),
          headerMode: sheet.getAttribute("data-letter-header-mode"),
          footerMode: sheet.getAttribute("data-letter-footer-mode"),
          archetype: sheet.getAttribute("data-letter-layout-archetype"),
          bottomFreeMm:
            main && children.length
              ? +(
                  (main.getBoundingClientRect().bottom -
                    children.at(-1)!.getBoundingClientRect().bottom) *
                  sy
                ).toFixed(3)
              : null,
        };
      }),
    kind,
  );
}

async function pdfEvidence(page: Page, kind: DocumentKind, name: string) {
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const button = page.getByRole("button", {
    name: kind === "cv" ? /Nur Lebenslauf als PDF/i : /Nur Motivationsschreiben als PDF/i,
  });
  await expect(button).toBeVisible();
  if (!(await button.isEnabled()))
    return {
      blocked: true,
      pages: [],
      bytes: 0,
      sha256: "",
      reason: await page.getByRole("alert").allTextContents(),
    };
  const promise = page.waitForEvent("download", { timeout: 90_000 });
  await button.click();
  const download = await promise;
  const path = join(evidenceDir, `${name}.pdf`);
  await download.saveAs(path);
  const bytes = await readFile(path);
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loading = getDocument({ data: new Uint8Array(bytes), disableFontFace: true });
  const document = await loading.promise;
  const pages = [];
  try {
    for (let i = 1; i <= document.numPages; i++) {
      const content = await (await document.getPage(i)).getTextContent();
      const text = content.items.map((x) => ("str" in x ? x.str : "")).join(" ");
      pages.push({ text, markers: normalizeContent(text).match(/QA[A-Z]+\d{3}/g) ?? [] });
    }
  } finally {
    await loading.destroy();
  }
  return {
    blocked: false,
    pages,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    reason: [],
  };
}

export async function auditDocument(
  page: Page,
  fixture: PaginationFixture,
  kind: DocumentKind,
  name: string,
  withPdf = true,
) {
  await mkdir(evidenceDir, { recursive: true });
  const roots = documentRoots(kind);
  const web = await collectDocument(page, roots.web, kind);
  const canonical = await collectDocument(page, roots.canonical, kind);
  const findings = [
    ...contentFindings(
      web,
      fixture.markers[kind],
      fixture.sequences[kind],
      fixture.segments[kind],
    ).map((s) => `Web ${s}`),
    ...contentFindings(
      canonical,
      fixture.markers[kind],
      fixture.sequences[kind],
      fixture.segments[kind],
    ).map((s) => `canonical ${s}`),
    ...distributionFindings(web, canonical, "canonical"),
  ];
  for (const [label, pages] of [
    ["Web", web],
    ["canonical", canonical],
  ] as const) {
    for (const [i, p] of pages.entries()) {
      if (p.index !== i) findings.push(`${label} physical page order: index ${p.index} at ${i}`);
      findings.push(...p.issues.map((s) => `${label} page ${i + 1}: ${s}`));
      if (kind === "letter" && p.final !== String(i === pages.length - 1))
        findings.push(`${label} wrong final page ${i + 1}`);
    }
  }
  for (const [i, p] of web.entries())
    for (const key of [
      "main",
      "sidebar",
      "sidebarSide",
      "headerMode",
      "footerMode",
      "archetype",
    ] as const)
      if (JSON.stringify(p[key]) !== JSON.stringify(canonical[i]?.[key]))
        findings.push(`canonical geometry/style page ${i + 1}: ${key} differs`);
  const pdf = withPdf ? await pdfEvidence(page, kind, name) : null;
  if (pdf) {
    if (pdf.blocked) findings.push("production PDF blocked by preflight");
    else
      findings.push(
        ...contentFindings(
          pdf.pages,
          fixture.markers[kind],
          fixture.sequences[kind],
          fixture.segments[kind],
        ).map((s) => `PDF ${s}`),
        ...distributionFindings(web, pdf.pages, "PDF"),
      );
  }
  const result = {
    name,
    kind,
    status: findings.length ? "FAIL" : "PASS",
    ...runtimeProvenance(),
    fixtureSha256: createHash("sha256").update(JSON.stringify(fixture.storage)).digest("hex"),
    storage: fixture.storage,
    web,
    canonical,
    pdf,
    findings,
  };
  await writeFile(join(evidenceDir, `${name}.json`), JSON.stringify(result, null, 2));
  if (findings.length && /(?:brief|studio3|ledger)/.test(name)) {
    for (let i = 0; i < web.length; i++)
      await page
        .locator(`${roots.web} ${roots.pages}`)
        .nth(i)
        .screenshot({
          path: join(evidenceDir, `${name}-web-${i + 1}.png`),
          animations: "disabled",
        });
  }
  return result;
}
