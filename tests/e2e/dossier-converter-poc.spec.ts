import { expect, test } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { importNativeDossier, waitForNativeEditorSaved } from "./support/native-docx-fixture";

const OUT = process.env.CONVERTER_POC_DIR ?? "artifacts/converter-poc/source";

test("three synthetic documents use the real DOCX Next and app PDF downloads", async ({ page }) => {
  test.setTimeout(300_000);
  // A generated, asymmetric calibration card replaces every fixture photo.
  const photo = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 120;
    c.height = 180;
    const g = c.getContext("2d")!;
    g.fillStyle = "#19a867";
    g.fillRect(0, 0, 120, 180);
    g.fillStyle = "#df2638";
    g.fillRect(0, 0, 40, 60);
    g.fillStyle = "#204fc8";
    g.fillRect(80, 120, 40, 60);
    g.fillStyle = "#fff024";
    g.fillRect(40, 60, 40, 60);
    return c.toDataURL("image/png");
  });
  await importNativeDossier(page, (p) => {
    p.cv.data.person.foto = photo;
    p.cover.data.foto = null;
    p.letter.data.images = [];
  });
  await mkdir(OUT, { recursive: true });
  const files: Record<string, unknown>[] = [];
  for (const [part, route] of [
    ["cover", "titelblatt"],
    ["letter", "anschreiben"],
    ["cv", "lebenslauf"],
  ] as const) {
    await page.goto(`http://127.0.0.1:4173/${route}`, { waitUntil: "networkidle" });
    await waitForNativeEditorSaved(page);
    // Confirm the guarded production Next path used by the download dialog.
    const source = await page.evaluate(async (part) => {
      const m = await import(/* @vite-ignore */ "/src/lib/docx-next/app-source.ts");
      const s = m.captureSavedAppDocxNextSource(part);
      m.assertAppDocxNextSource(s, part);
      return {
        template: s[part].template ?? s[part].design?.template,
        layout: s.settings.cvLayout,
      };
    }, part);
    expect(source.template).toBe("modern");
    if (part === "cv") expect(source.layout).toBe("sidebar");
    for (const format of ["DOCX", "PDF"] as const) {
      await page.getByRole("button", { name: "Download", exact: true }).click();
      const menu = page.locator("[data-editor-download-menu]");
      const item = menu.getByRole("menuitem", { name: format, exact: true });
      await expect(item).toBeEnabled();
      const [download] = await Promise.all([
        page.waitForEvent("download", { timeout: 90_000 }),
        item.click(),
      ]);
      const filename = `${part}.${format.toLowerCase()}`;
      const target = join(OUT, filename);
      await download.saveAs(target);
      const bytes = await readFile(target);
      expect(bytes.length).toBeGreaterThan(2000);
      files.push({
        part,
        format,
        filename,
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        ...source,
      });
    }
  }
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  await writeFile(
    join(OUT, "SOURCE.json"),
    JSON.stringify(
      {
        sha,
        exporter: "production DOCX Next",
        synthetic: true,
        photo: "generated asymmetric RGB calibration card",
        files,
      },
      null,
      2,
    ) + "\n",
  );
});
