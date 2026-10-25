/** Render only the four declared CV reference cases; no Word or production build verdict. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import tailwindcss from "@tailwindcss/vite";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + "/playwright");
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.resolve(process.argv[2]);
// Keep an earlier success or failure available; each run owns a fresh folder.
await mkdir(output);
const server = await createServer({
  root: project,
  configFile: false,
  resolve: { alias: { "@": path.join(project, "src") } },
  plugins: [
    tailwindcss(),
    {
      name: "reference-qa-entry",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith("/__reference-qa")) return next();
          const html = await server.transformIndexHtml(
            req.url,
            '<!doctype html><html lang="de"><head><meta charset="utf-8"><title>CV Referenz QA</title></head><body style="margin:0;background:#ddd"><main id="root"></main><script type="module" src="/scripts/qa-sidebar-reference-browser-entry-24okt.tsx"></script></body></html>',
          );
          res.setHeader("Content-Type", "text/html");
          res.end(html);
        });
      },
    },
  ],
  server: { host: "127.0.0.1", port: 4183, strictPort: true },
});
await server.listen();
const browser = await chromium.launch({
  executablePath: process.env.DOCX_NEXT_CHROMIUM_PATH,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu"],
});
const rows = [];
try {
  for (const side of ["left", "right"])
    for (const half of [false, true]) {
      const id = side + (half ? "-half-main" : "-sidebar");
      const folder = path.join(output, id);
      await mkdir(folder, { recursive: true });
      const context = await browser.newContext({
        viewport: { width: 1100, height: 1300 },
        deviceScaleFactor: 1,
      });
      try {
        const page = await context.newPage(),
          errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.route("**/*", (route) =>
          route.request().url().startsWith("http://127.0.0.1:4183/")
            ? route.continue()
            : route.abort(),
        );
        await page.goto(`http://127.0.0.1:4183/__reference-qa?side=${side}&half=${half}`, {
          waitUntil: "networkidle",
        });
        await page.waitForFunction(
          () =>
            document
              .querySelector("[data-dossier-pdf-canvas]")
              ?.getAttribute("data-dossier-cv-ready") === "true" &&
            document
              .querySelector("[data-letter-document-root]")
              ?.getAttribute("data-letter-pagination-ready") === "true",
        );
        await page.evaluate(() => document.fonts.ready);
        const proof = await page.evaluate(
          ({ side, half }) => {
            const root = document.querySelector("[data-dossier-pdf-canvas]");
            const cvPages = [...root.querySelectorAll("[data-cv-page]")];
            const fields = [
              ["email-only.email", "alpha@example.invalid"],
              ["extra-only.extra", "Nur nach Vereinbarung"],
              ["separate.name", "Referenzperson"],
              ["separate.email", "beta@example.invalid"],
              ["separate.extra", "Bitte zuerst anfragen"],
              ["legacy.contact", "000 000 00 00"],
              ["legacy.email", "gamma@example.invalid"],
              ["legacy.extra", "Alte Zusatzzeile"],
            ].map(([key, expected]) => {
              const selector = `[data-cv-page] ${half ? "[data-cv-main]" : "[data-cv-sidebar]"} [data-dossier-field-id="cv.entry.referenzen:${key}"]`;
              const nodes = [...root.querySelectorAll(selector)];
              const node = nodes[0];
              if (!node) return { key, expected, count: nodes.length };
              const rect = node.getBoundingClientRect(),
                sheet = node.closest("[data-cv-page]").getBoundingClientRect();
              const owner = node
                .closest(half ? "[data-cv-main]" : "[data-cv-sidebar]")
                .getBoundingClientRect();
              const css = getComputedStyle(node),
                mm = 210 / sheet.width;
              return {
                key,
                expected,
                count: nodes.length,
                text: node.textContent.trim(),
                visible:
                  css.display !== "none" &&
                  css.visibility !== "hidden" &&
                  rect.width > 0 &&
                  rect.height > 0,
                insideOwner:
                  rect.left >= owner.left - 1 &&
                  rect.right <= owner.right + 1 &&
                  rect.top >= owner.top - 1 &&
                  rect.bottom <= owner.bottom + 1,
                xMm: (rect.left - sheet.left) * mm,
                yMm: (rect.top - sheet.top) * mm,
                widthMm: rect.width * mm,
                heightMm: rect.height * mm,
              };
            });
            const first = root.querySelector(
              `[data-cv-page] ${half ? "[data-cv-main]" : "[data-cv-sidebar]"} [data-dossier-field-id="cv.entry.referenzen:email-only.email"]`,
            );
            const heading = root.querySelector(
              `[data-cv-page] ${half ? "[data-cv-main]" : "[data-cv-sidebar]"} [data-dossier-field-id="cv.section.referenzen.heading"]`,
            );
            const sheet = first.closest("[data-cv-page]").getBoundingClientRect();
            const owner = first.closest(half ? "[data-cv-main]" : "[data-cv-sidebar]");
            const ownerRect = owner.getBoundingClientRect(),
              css = getComputedStyle(owner),
              mm = 210 / sheet.width;
            const expectedLeft = ownerRect.left + (parseFloat(css.paddingLeft) || 0);
            const alignment = {
              referenceToHeadingMm:
                (first.getBoundingClientRect().left - heading.getBoundingClientRect().left) * mm,
              referenceToOwnerContentMm: (first.getBoundingClientRect().left - expectedLeft) * mm,
            };
            return {
              side,
              half,
              cvPages: cvPages.length,
              alignment,
              letterPages: root.querySelectorAll("[data-letter-page]").length,
              fields,
              inputUnchanged: window.referenceQa.inputUnchanged(),
              preflight: window.referenceQa.preflight(),
              storageBefore: JSON.stringify({ ...localStorage }),
            };
          },
          { side, half },
        );
        await writeFile(path.join(folder, "browser-proof.json"), JSON.stringify(proof, null, 2));
        assert.equal(proof.preflight.status, "pass", JSON.stringify(proof.preflight.issues));
        assert(
          proof.fields.every(
            (f) => f.count === 1 && f.text === f.expected && f.visible && f.insideOwner,
          ),
          JSON.stringify(proof.fields),
        );
        assert(
          Math.abs(proof.alignment.referenceToHeadingMm) < 0.05,
          JSON.stringify(proof.alignment),
        );
        assert(
          Math.abs(proof.alignment.referenceToOwnerContentMm) < 0.05,
          JSON.stringify(proof.alignment),
        );
        assert(proof.inputUnchanged);
        for (let i = 0; i < proof.cvPages; i++)
          await page
            .locator("[data-cv-page]")
            .nth(i)
            .screenshot({ path: path.join(folder, `cv-page-${i + 1}.png`) });
        const downloaded = page.waitForEvent("download");
        await page.evaluate(() => window.referenceQa.download());
        const download = await downloaded;
        const pdf = path.join(folder, "App.pdf");
        await download.saveAs(pdf);
        assert.equal(
          await page.evaluate(() => JSON.stringify({ ...localStorage })),
          proof.storageBefore,
        );
        assert.deepEqual(errors, []);
        const bytes = await readFile(pdf);
        const row = {
          id,
          ...proof,
          pdfSha256: createHash("sha256").update(bytes).digest("hex"),
          pdfBytes: bytes.length,
          javascriptErrors: errors,
        };
        delete row.storageBefore;
        rows.push(row);
        await writeFile(
          path.join(output, "browser-evidence.json"),
          JSON.stringify(
            { browser: await browser.version(), rows, wordAcceptance: "UNVERIFIED" },
            null,
            2,
          ),
        );
        console.log(
          JSON.stringify({
            id,
            cvPages: proof.cvPages,
            fields: proof.fields.length,
            pdfBytes: bytes.length,
          }),
        );
      } finally {
        await context.close();
      }
    }
} finally {
  await browser.close();
  await server.close();
}
