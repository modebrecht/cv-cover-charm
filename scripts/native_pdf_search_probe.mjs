// Bounded diagnostic only. Never imported by the application.
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const output = resolve(process.argv[2] || "artifacts/native-pdf-search-13okt/probe");
await mkdir(output, { recursive: true });
// Compensate the existing .11em tracking in font advance metrics, without
// changing outlines. This is an experiment, not a font shipped to users.
execFileSync("python", [
  "-c",
  `
from fontTools.ttLib import TTFont
font=TTFont('public/fonts/Cabin-Bold.ttf')
delta=round(font['head'].unitsPerEm*.11)
for glyph,(advance,bearing) in list(font['hmtx'].metrics.items()):
    font['hmtx'].metrics[glyph]=(advance+delta,bearing)
font.save(${JSON.stringify(output + "/tracked.ttf")})
`,
]);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1800, height: 1500 } });
const fixture = await readFile("tests/fixtures/native-heading-search.html");
const originalFont = await readFile("public/fonts/Cabin-Bold.ttf");
await page.route("**/native-heading-search.html", (route) =>
  route.fulfill({ body: fixture, contentType: "text/html" }),
);
await page.route("**/fonts/Cabin-Bold.ttf", (route) =>
  route.fulfill({ body: originalFont, contentType: "font/ttf" }),
);
const rows = [];
for (const variant of ["baseline", "no-synthesis", "no-kerning", "metric-tracking"]) {
  await page.goto("http://127.0.0.1:4173/tests/fixtures/native-heading-search.html");
  await page.evaluate(() => {
    document.querySelectorAll(".heading").forEach((node, i) => {
      if (i) node.remove();
    });
  });
  if (variant === "no-synthesis")
    await page.addStyleTag({ content: ".heading { font-synthesis: none; }" });
  if (variant === "no-kerning")
    await page.addStyleTag({
      content:
        ".heading { font-kerning: none; font-variant-ligatures: none; text-rendering: optimizeSpeed; }",
    });
  if (variant === "metric-tracking") {
    const font = await readFile(output + "/tracked.ttf");
    await page.route("**/tracked-probe.ttf", (route) =>
      route.fulfill({ body: font, contentType: "font/ttf" }),
    );
    await page.addStyleTag({
      content:
        "@font-face {font-family: TrackedProbe;src:url('/tracked-probe.ttf');font-weight:600 900}.heading {font-family:TrackedProbe;letter-spacing:0}",
    });
  }
  await page.evaluate(() => document.fonts.ready);
  const geometry = await page.locator(".heading").evaluate((node) => {
    const text = node.firstChild;
    const glyphs = Array.from(text.textContent, (_, i) => {
      const range = document.createRange();
      range.setStart(text, i);
      range.setEnd(text, i + 1);
      const r = range.getBoundingClientRect();
      return [r.x, r.y, r.width, r.height];
    });
    const s = getComputedStyle(node);
    return {
      text: node.textContent,
      glyphs,
      font: [
        s.fontFamily,
        s.fontWeight,
        s.fontSize,
        s.letterSpacing,
        s.textRendering,
        s.fontSynthesis,
      ],
    };
  });
  await page.screenshot({ path: output + "/" + variant + ".png" });
  const bytes = await page.pdf({
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    scale: 1,
  });
  await writeFile(output + "/" + variant + ".pdf", bytes);
  const task = getDocument({ data: new Uint8Array(bytes), disableFontFace: true });
  const doc = await task.promise;
  const content = await (await doc.getPage(1)).getTextContent();
  const text = content.items
    .map((item) => ("str" in item ? item.str + (item.hasEOL ? "\n" : "") : ""))
    .join("");
  await task.destroy();
  rows.push({
    variant,
    geometry,
    text,
    literal: /\bfamilie\b/iu.test(text),
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
await writeFile(
  output + "/probe.json",
  JSON.stringify(
    {
      browser: browser.version(),
      source: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
      rows,
    },
    null,
    2,
  ),
);
await browser.close();
console.log(JSON.stringify(rows.map(({ variant, text, literal }) => ({ variant, text, literal }))));
