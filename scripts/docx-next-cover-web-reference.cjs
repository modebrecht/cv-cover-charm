const fs = require("node:fs");
const { chromium } = require(process.env.DOCX_QA_PLAYWRIGHT || "playwright");
(async () => {
  const cases = JSON.parse(fs.readFileSync(process.argv[2]));
  const output = process.argv[3];
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1400 } });
  await page.goto("http://127.0.0.1:4173/titelblatt", { waitUntil: "networkidle" });
  const rows = [];
  for (const { id, input } of cases) {
    await page.evaluate(
      ({ id, input }) => {
        localStorage.clear();
        localStorage.setItem(
          "titelblatt:v3",
          JSON.stringify({
            version: 6,
            template: id,
            data: input.cover.data,
            colors: { [id]: input.cover.colors },
            layout: { [id]: {} },
            customs: [],
            fontScale: 1,
          }),
        );
      },
      { id, input },
    );
    await page.reload({ waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const sheet = page.locator('main [data-dossier-document="cover"]').first();
    await sheet.screenshot({
      path: output + "/" + id + "-web.jpg",
      type: "jpeg",
      quality: 55,
      animations: "disabled",
    });
    rows.push({
      id,
      fields: await sheet.evaluate((root) => {
        const r = root.getBoundingClientRect(),
          s = 210 / r.width;
        return Array.from(root.querySelectorAll("[data-block-id]")).map((el) => {
          const b = el.getBoundingClientRect();
          const style = getComputedStyle(el.querySelector("div") || el);
          return {
            id: el.dataset.blockId,
            xMm: (b.left - r.left) * s,
            yMm: (b.top - r.top) * s,
            widthMm: b.width * s,
            heightMm: b.height * s,
            text: el.innerText,
            font: style.fontFamily,
            size: style.fontSize,
            color: style.color,
          };
        });
      }),
    });
  }
  fs.writeFileSync(output + "/web-reference.json", JSON.stringify(rows, null, 2));
  console.log(JSON.stringify({ templates: rows.length, reference: "actual Web editor" }));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
