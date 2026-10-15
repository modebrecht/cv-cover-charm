/* Actual product CoverCanvas from the exact package-equivalent snapshot. */
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { chromium } = require(
  path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, "playwright"),
);
(async () => {
  const rootDir = process.argv[2];
  const server = spawn(
    process.execPath,
    ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4173", "--strictPort"],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  process.on("exit", () => server.kill("SIGTERM"));
  await new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => reject(Error("Vite startup timeout")), 45000);
    server.stdout.on("data", (d) => {
      output += d;
      if (output.includes("Local:")) {
        clearTimeout(timer);
        resolve();
      }
    });
    server.stderr.on("data", (d) => process.stderr.write(d));
    server.on("exit", (code) => reject(Error("Vite exited " + code)));
  });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.DOCX_NEXT_CHROMIUM_PATH
      ? { executablePath: process.env.DOCX_NEXT_CHROMIUM_PATH }
      : {}),
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1500 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.route(/^https?:\/\/(?!127\.0\.0\.1[:/])/, (route) => route.abort());
    await page.goto("http://127.0.0.1:4173/titelblatt", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.locator('main [data-dossier-document="cover"]').first().waitFor({ timeout: 45000 });
    const measure = async (locator) =>
      locator.evaluate((root) => {
        const r = root.getBoundingClientRect(),
          s = 210 / r.width;
        return [...root.querySelectorAll("[data-block-id]")].map((el) => {
          const b = el.getBoundingClientRect(),
            child = el.querySelector(":scope > div"),
            c = getComputedStyle(child || el);
          return {
            id: el.dataset.blockId,
            xMm: (b.left - r.left) * s,
            yMm: (b.top - r.top) * s,
            widthMm: b.width * s,
            heightMm: b.height * s,
            text: el.innerText,
            font: c.fontFamily,
            sizePt: (parseFloat(c.fontSize) * 72) / 96,
            weight: c.fontWeight,
            lineHeight: c.lineHeight,
            tracking: c.letterSpacing,
            transform: c.textTransform,
            opacity: c.opacity,
            color: c.color,
          };
        });
      });
    for (const name of [
      "normal",
      "moved",
      "long",
      "scaled",
      "photo-portrait",
      "photo-circle",
      "hidden",
    ]) {
      const dir = path.join(rootDir, name),
        input = JSON.parse(fs.readFileSync(path.join(dir, "snapshot.json")));
      // Mount the real product component with unchanged snapshot props, bypassing editor defaults.
      await page.evaluate(async (input) => {
        const [{ CoverCanvas }, reactModule, domModule] = await Promise.all([
          import("/src/components/cover/CoverCanvas.tsx"),
          import("/node_modules/.vite/deps/react.js"),
          import("/node_modules/.vite/deps/react-dom_client.js"),
        ]);
        const React = reactModule.default ?? reactModule;
        const createRoot = domModule.createRoot ?? domModule.default.createRoot;
        const mount = document.createElement("div");
        mount.id = "independent-cover37";
        document.body.replaceChildren(mount);
        createRoot(mount).render(
          React.createElement(CoverCanvas, {
            ...input.cover,
            selected: null,
            onSelect: () => {},
            onMove: () => {},
            editable: false,
          }),
        );
      }, input);
      await page.locator('#independent-cover37 [data-dossier-document="cover"]').waitFor();
      await page.evaluate(() =>
        Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 5000))]),
      );
      const exact = page.locator('#independent-cover37 [data-dossier-document="cover"]');
      await exact.screenshot({
        path: path.join(dir, "web.png"),
        animations: "disabled",
      });
      const exactFields = await measure(exact);
      const session = await page.context().newCDPSession(page);
      await session.send("DOM.enable");
      await session.send("CSS.enable");
      const { root } = await session.send("DOM.getDocument");
      const { nodeId } = await session.send("DOM.querySelector", {
        nodeId: root.nodeId,
        selector: '[data-block-id="beruf"] > div',
      });
      const platformFonts = await session.send("CSS.getPlatformFontsForNode", { nodeId });
      fs.writeFileSync(
        path.join(dir, "web-evidence.json"),
        JSON.stringify(
          {
            errors,
            exactFields,
            platformFonts,
            provenance:
              "Real CoverCanvas is mounted from the actual app module and receives unchanged snapshot props. Remote network fonts are blocked; local fonts/fallback apply. This is a controlled component reference, not a recovered original editor project or a successful live-editor restore test.",
          },
          null,
          2,
        ),
      );
      console.log(
        JSON.stringify({
          errors,
          name,
          exactFields: exactFields.length,
        }),
      );
    }
  } finally {
    await browser.close();
    server.kill("SIGTERM");
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
