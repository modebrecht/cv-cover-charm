import { expect, test, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import {
  BASE_URL,
  GALLERY_CASES,
  assertGalleryCatalog,
  applyGalleryCase,
  seedCanonicalDossier,
  waitEditorReady,
} from "./support/dossier-gallery-shared";

const COVER = '[data-dossier-document="cover"]';
const LETTER = "[data-letter-document-pages] [data-letter-page]";
const SIGNALS = [
  "color",
  "backgroundColor",
  "backgroundImage",
  "borderRadius",
  "borderColor",
  "boxShadow",
  "filter",
  "opacity",
  "transform",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "padding",
  "zoom",
];

async function snapshot(page: Page, selector: string, kind: string) {
  return page
    .locator(selector)
    .first()
    .evaluate(
      (sheet, { kind, signals }) => {
        const p = sheet.getBoundingClientRect();
        const s = getComputedStyle(sheet);
        const nodes =
          kind === "cover"
            ? Array.from(
                sheet.querySelectorAll<HTMLElement>(
                  "[data-block-id], [data-fresh-cover-field], [data-fresh-cover-background], :scope > div:first-child div",
                ),
              )
            : Array.from(
                sheet.querySelectorAll<HTMLElement>(
                  "[data-letter-content-box], [data-letter-section], [data-letter-pdf-text], [data-letter-motif], [data-dossier-sheet-background], [data-dossier-sheet-background] div, [data-dossier-chrome]",
                ),
              );
        return {
          identity: sheet.getAttribute("data-dossier-template"),
          backgroundPaint:
            kind === "cover"
              ? sheet.firstElementChild?.getAttribute("data-dossier-paint-alpha-gradient")
              : null,
          variables: Object.fromEntries(
            Array.from(
              new Set([
                ...Array.from(s),
                ...Array.from(sheet.style),
                "--dossier-font",
                "--dossier-resolved-font",
                "--dossier-motif-opacity",
                "--cover-paper",
                "--cover-primary",
                "--cover-secondary",
                "--cover-accent",
                "--cover-ink",
              ]),
            )
              .filter(
                (k) =>
                  k.startsWith("--cover-") ||
                  k.startsWith("--dossier-") ||
                  k.startsWith("--letter-"),
              )
              .map((k) => [k, s.getPropertyValue(k).trim()]),
          ),
          nodes: [sheet, ...nodes].map((node) => {
            const r = node.getBoundingClientRect(),
              cs = getComputedStyle(node);
            return {
              role:
                node.getAttribute("data-block-id") ??
                node.getAttribute("data-letter-section") ??
                node.getAttribute("data-letter-motif") ??
                node.tagName,
              box:
                node.getClientRects().length === 0
                  ? null
                  : [
                      ((r.x - p.x) / p.width) * 210,
                      ((r.y - p.y) / p.height) * 297,
                      (r.width / p.width) * 210,
                      (r.height / p.height) * 297,
                    ],
              paint: signals.map((key) => cs[key as keyof CSSStyleDeclaration]),
            };
          }),
        };
      },
      { kind, signals: SIGNALS },
    );
}

function sameState(
  a: Awaited<ReturnType<typeof snapshot>>,
  b: Awaited<ReturnType<typeof snapshot>>,
  label: string,
) {
  expect(b.identity, label).toBe(a.identity);
  expect(b.variables, label).toEqual(a.variables);
  expect(b.nodes.length, label).toBe(a.nodes.length);
  let max = 0;
  for (const [i, node] of b.nodes.entries()) {
    expect(node.role, label).toBe(a.nodes[i].role);
    expect(node.paint, label).toEqual(a.nodes[i].paint);
    if (node.box === null || a.nodes[i].box === null)
      expect(node.box, label).toEqual(a.nodes[i].box);
    else
      node.box.forEach((v, j) => {
        max = Math.max(max, Math.abs(v - a.nodes[i].box![j]));
      });
  }
  expect(max, `${label}: physical geometry mm`).toBeLessThanOrEqual(0.02);
  return max;
}

async function poisonShell(page: Page, value: string | null) {
  await page.evaluate((value) => {
    if (value === null) document.documentElement.removeAttribute("data-dossier-template");
    else document.documentElement.dataset.dossierTemplate = value;
    // Identity and inherited shell theme are independent failure modes.
    const root = document.documentElement;
    for (const key of [
      "--dossier-font",
      "--dossier-name-weight",
      "--dossier-heading-tracking",
      "--cover-primary",
      "--cover-secondary",
      "--cover-accent",
      "--cover-ink",
    ])
      root.style.setProperty(
        key,
        key.includes("font")
          ? "monospace"
          : key.includes("weight")
            ? "100"
            : key.includes("tracking")
              ? "2em"
              : "#ff00ff",
      );
  }, value);
}

test("all 39 Cover and Letter renderers retain local state under global template poisoning", async ({
  page,
}) => {
  test.setTimeout(20 * 60000);
  assertGalleryCatalog();
  const stored = await seedCanonicalDossier(page);
  const rows = [];
  for (const item of GALLERY_CASES) {
    await applyGalleryCase(page, stored, item);
    const live: Record<string, Awaited<ReturnType<typeof snapshot>>> = {};
    for (const [kind, route, sel] of [
      ["cover", "/titelblatt", `main ${COVER}`],
      ["letter", "/anschreiben", `main ${LETTER}`],
    ]) {
      await page.goto(BASE_URL + route, { waitUntil: "networkidle" });
      await waitEditorReady(page);
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise<void>((r) =>
          requestAnimationFrame(() => requestAnimationFrame(() => r())),
        );
      });
      live[kind] = await snapshot(page, sel, kind);
      expect(live[kind].identity, item.label).toBe(item.id);
      for (const value of ["wrong-template", "", null]) {
        await poisonShell(page, value);
        sameState(
          live[kind],
          await snapshot(page, sel, kind),
          `${item.label} visible ${kind} poisoned ${value}`,
        );
      }
    }
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Gesamtdossier herunterladen/ }).click();
    await expect(page.getByRole("button", { name: "PDF herunterladen", exact: true })).toBeEnabled({
      timeout: 30000,
    });
    await page.evaluate(async () => {
      const { prepareDossierNativePrint } = await import(
        String("/src/lib/dossier-native-print.ts")
      );
      (
        await prepareDossierNativePrint(document.querySelector("[data-dossier-pdf-canvas]")!)
      ).release();
    });
    const before = {
      cover: await snapshot(page, `[data-dossier-pdf-canvas] ${COVER}`, "cover"),
      letter: await snapshot(page, `[data-dossier-pdf-canvas] ${LETTER}`, "letter"),
    };
    const deltas = {
      cover: sameState(live.cover, before.cover, item.label + " live/canonical Cover"),
      letter: sameState(live.letter, before.letter, item.label + " live/canonical Letter"),
    };
    for (const value of ["wrong-template", "", null]) {
      await poisonShell(page, value);
      for (const [kind, sel] of [
        ["cover", COVER],
        ["letter", LETTER],
      ])
        sameState(
          before[kind as "cover" | "letter"],
          await snapshot(page, `[data-dossier-pdf-canvas] ${sel}`, kind),
          `${item.label} ${kind} poisoned ${value}`,
        );
    }
    rows.push({ id: item.id, ...deltas });
    console.log(`LOCAL SCOPE ${item.label} passed`);
  }
  if (process.env.NATIVE_PRINT_BENCHMARK_DIR) {
    await mkdir(process.env.NATIVE_PRINT_BENCHMARK_DIR, { recursive: true });
    await writeFile(
      process.env.NATIVE_PRINT_BENCHMARK_DIR + "/local-scope.json",
      JSON.stringify(rows, null, 2),
    );
  }
});
