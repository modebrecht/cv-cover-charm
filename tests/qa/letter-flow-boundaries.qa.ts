import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { paginationFixture } from "./pagination-fixtures";
import { auditDocument, documentRoots, evidenceDir, loadFixture } from "./pagination-browser";

// Long-token glyph measurements and PDF exports are intentionally sequential
// within this file; the ordinary template matrix still uses both workers.
test.describe.configure({ mode: "default" });

test("flow custom typography: measured body and rendered continuation fit the same area", async ({
  page,
}) => {
  const fixture = paginationFixture("brief", { paragraphs: 14, custom: true });
  await loadFixture(page, fixture, "letter");
  const geometry = await page
    .locator("[data-letter-standalone-export] [data-letter-document-root]")
    .evaluate((root) => {
      const sheets = root.querySelectorAll(
        "[data-letter-document-pages] [data-letter-page], [data-letter-pagination-probe]",
      );
      return Array.from(sheets).map((sheet) => {
        const layer = sheet.querySelector<HTMLElement>("[data-letter-text-layer]")!;
        const body = sheet.querySelector<HTMLElement>('[data-letter-pdf-richtext="body"]')!;
        const top = layer.getBoundingClientRect().top;
        const describe = (node: Element) => {
          const r = node.getBoundingClientRect(),
            style = getComputedStyle(node);
          return {
            text: node.textContent,
            html: node.outerHTML,
            top: r.top - top,
            bottom: r.bottom - top,
            height: r.height,
            width: r.width,
            fontSize: style.fontSize,
            lineHeight: style.lineHeight,
            minHeight: style.minHeight,
            marginTop: style.marginTop,
            marginBottom: style.marginBottom,
            display: style.display,
          };
        };
        return {
          name:
            sheet.getAttribute("data-letter-pagination-probe") ??
            sheet
              .closest("[data-letter-document-page-index]")
              ?.getAttribute("data-letter-document-page-index"),
          layer: describe(layer),
          body: describe(body),
          children: Array.from(body.children).map(describe),
        };
      });
    });
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(
    join(evidenceDir, "flow-custom-geometry.json"),
    JSON.stringify(geometry, null, 2),
  );
  for (const item of geometry.filter((item) => /^\d+$/.test(item.name ?? ""))) {
    const final =
      item.name === String(geometry.filter((item) => /^\d+$/.test(item.name ?? "")).length - 1);
    const probe = geometry.find(
      (candidate) =>
        candidate.name ===
        `${item.name === "0" ? "first" : "continuation"}-${final ? "final" : "flow"}`,
    )!;
    expect(item.layer.height).toBeCloseTo(probe.layer.height, 2);
    expect(item.body.width).toBeCloseTo(probe.body.width, 2);
    expect(item.body.top).toBeCloseTo(probe.body.top, 2);
  }
  const result = await auditDocument(page, fixture, "letter", "flow-custom-typography");
  expect(result.findings).toEqual([]);
});

for (const [template, rich] of [
  ["brief", false],
  ["studio3", true],
] as const) {
  test(`flow ${template}: one unbroken Unicode token continues across physical pages${rich ? " with inline formatting" : ""}`, async ({
    page,
  }) => {
    const fixture = paginationFixture(template, { paragraphs: 1 });
    const letter = JSON.parse(fixture.storage["anschreiben:v1"]);
    const markers = Array.from(
      { length: 30 },
      (_, i) => `QATOKEN${String(i + 1).padStart(3, "0")}`,
    );
    const token = markers
      .map((marker) => `${marker}${"FähigkeitsnachweisA\u0308".repeat(9)}`)
      .join("");
    letter.data.text = token;
    letter.data.richTextHtml = rich ? `<div data-align="left"><strong>${token}</strong></div>` : "";
    fixture.storage["anschreiben:v1"] = JSON.stringify(letter);
    fixture.markers.letter = [
      ...markers,
      ...fixture.markers.letter.filter((marker) => !marker.startsWith("QAPARA")),
    ];
    fixture.sequences.letter = [markers];
    fixture.segments.letter = [token];
    await loadFixture(page, fixture, "letter");
    const result = await auditDocument(page, fixture, "letter", `flow-${template}-unbroken-token`);
    expect(result.web.length).toBeGreaterThanOrEqual(2);
    expect(result.findings).toEqual([]);
    expect(
      await page
        .locator(`${documentRoots("letter").canonical} [data-letter-pdf-richtext="body"]`)
        .first()
        .evaluate((element) => getComputedStyle(element).hyphens),
    ).toBe("none");
    if (rich) {
      const roots = documentRoots("letter");
      for (const body of await page
        .locator(`${roots.canonical} ${roots.pages} [data-letter-pdf-richtext="body"]`)
        .all()) {
        await expect(body.locator("strong")).not.toHaveCount(0);
      }
    }
  });
}

test("flow live margins: short long restore updates physical pages and probes without reload", async ({
  page,
}) => {
  const fixture = paginationFixture("brief", { paragraphs: 10, custom: true });
  await loadFixture(page, fixture, "letter");
  const layout = page.locator('[data-editor-section-title="Layout"]');
  const toggle = layout.locator("[data-editor-section-toggle]");
  if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
  const margins = layout.locator('[data-dossier-page-margins-control="letter"]');
  if ((await margins.getAttribute("open")) === null) await margins.locator("summary").click();
  const failures = [];
  for (const [index, value] of [24, 45, 24].entries()) {
    for (const side of ["Oben", "Rechts", "Links"]) {
      const input = margins.getByLabel(`Seitenrand ${side} in Millimetern`);
      await input.fill(String(value));
      await input.press("Tab");
      await expect(input).toHaveValue(String(value));
    }
    await expect(page.locator(documentRoots("letter").canonical)).toHaveAttribute(
      "data-letter-pagination-ready",
      "true",
    );
    await page.waitForTimeout(700);
    fixture.storage["bewerbungsdossier:page-margins:v1"] = await page.evaluate(
      () => localStorage.getItem("bewerbungsdossier:page-margins:v1")!,
    );
    const result = await auditDocument(page, fixture, "letter", `flow-live-margins-${index}`);
    if (result.findings.length) failures.push({ index, findings: result.findings });
  }
  expect(failures).toEqual([]);
});
