import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { paginationFixture } from "./pagination-fixtures";
import { auditDocument, loadFixture } from "./pagination-browser";

for (const defect of ["nested-clip", "footer-overlap"] as const) {
  test(`preflight rejects ${defect}`, async ({ page }) => {
    const fixture = paginationFixture("brief", { paragraphs: 2 });
    await loadFixture(page, fixture, "letter");
    const evidence = await page
      .locator("[data-letter-standalone-export] [data-letter-page]")
      .first()
      .evaluate(async (sheet, defect) => {
        const modulePath = "/src/components/letter/preflight.ts";
        const { letterPageOverflows } = await import(modulePath);
        const body = sheet.querySelector<HTMLElement>('[data-letter-pdf-richtext="body"]')!;
        if (defect === "nested-clip") {
          const paragraph = body.firstElementChild as HTMLElement;
          paragraph.style.height = "4px";
          paragraph.style.overflow = "clip";
        } else {
          const footer = document.createElement("div");
          footer.setAttribute("data-letter-footer", "");
          footer.style.cssText = `position:absolute;left:80px;right:80px;top:${body.getBoundingClientRect().top - sheet.getBoundingClientRect().top}px;height:40px`;
          footer.textContent = "QA footer overlaps required body text";
          sheet.append(footer);
        }
        const box = (node: Element) => {
          const r = node.getBoundingClientRect(),
            p = sheet.getBoundingClientRect();
          return {
            xPx: r.left - p.left,
            yPx: r.top - p.top,
            widthPx: r.width,
            heightPx: r.height,
            xMm: ((r.left - p.left) * 210) / p.width,
            yMm: ((r.top - p.top) * 297) / p.height,
          };
        };
        return {
          defect,
          blocked: letterPageOverflows(sheet),
          html: sheet.outerHTML,
          page: box(sheet),
          body: box(body),
          affected: box(
            defect === "nested-clip"
              ? body.firstElementChild!
              : Array.from(sheet.querySelectorAll("[data-letter-footer]")).at(-1)!,
          ),
        };
      }, defect);
    await mkdir(process.env.PAGINATION_QA_DIR ?? "artifacts/pdf-preflight", { recursive: true });
    await writeFile(
      `${process.env.PAGINATION_QA_DIR ?? "artifacts/pdf-preflight"}/${defect}.json`,
      JSON.stringify({ fixture: fixture.storage, evidence }, null, 2),
    );
    expect(evidence.blocked).toBe(true);
  });
}

test("preflight accepts an empty trailing box beyond the text area when every glyph fits", async ({
  page,
}) => {
  const fixture = paginationFixture("brief", { paragraphs: 2 });
  await loadFixture(page, fixture, "letter");
  const evidence = await page
    .locator("[data-letter-standalone-export] [data-letter-page]")
    .first()
    .evaluate(async (sheet) => {
      const node = Array.from(sheet.querySelectorAll<HTMLElement>("[data-letter-pdf-text]")).at(
        -1,
      )!;
      node.style.height = "600px";
      node.style.overflow = "visible";
      const path = "/src/components/letter/preflight.ts";
      const { letterPageOverflows } = await import(path);
      const range = document.createRange();
      range.selectNodeContents(node);
      const layer = sheet
        .querySelector<HTMLElement>("[data-letter-text-layer]")!
        .getBoundingClientRect();
      const box = node.getBoundingClientRect(),
        glyph = range.getBoundingClientRect();
      return {
        blocked: letterPageOverflows(sheet),
        boxBottom: box.bottom - layer.top,
        glyphBottom: glyph.bottom - layer.top,
        layerHeight: layer.height,
        html: sheet.outerHTML,
      };
    });
  await mkdir(process.env.PAGINATION_QA_DIR ?? "artifacts/pdf-preflight", { recursive: true });
  await writeFile(
    `${process.env.PAGINATION_QA_DIR ?? "artifacts/pdf-preflight"}/empty-trailing-box.json`,
    JSON.stringify({ fixture: fixture.storage, evidence }, null, 2),
  );
  expect(evidence.boxBottom).toBeGreaterThan(evidence.layerHeight);
  expect(evidence.glyphBottom).toBeLessThan(evidence.layerHeight);
  expect(evidence.blocked).toBe(false);
  const result = await auditDocument(page, fixture, "letter", "preflight-empty-trailing-box");
  expect(result.findings).toEqual([]);
});
