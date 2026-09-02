import { expect, test } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:4173";

const SIDE_KEYS = [
  "lebenslauf:layout:v1",
  "lebenslauf:layout-mirror:v1",
  "lebenslauf:placement:v1",
  "lebenslauf:photo:v2",
  "lebenslauf:photo-place:v1",
] as const;

test.describe("M7 dossier state roundtrip", () => {
  test.setTimeout(120_000);

  test("save -> clear browser state -> load restores all three documents and CV sidecars", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/titelblatt`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "domcontentloaded" });

    const download = page.getByRole("button", { name: "Download", exact: true });
    await expect(download).toHaveAttribute("data-editor-ready", "true");
    await download.click();
    const menu = page.locator("[data-editor-action-menu]");
    await menu.getByRole("button").filter({ hasText: "Beispieldaten übernehmen" }).click();
    await menu.getByRole("button", { name: "Ja", exact: true }).click();

    await page.goto(`${BASE_URL}/anschreiben`, { waitUntil: "domcontentloaded" });
    const letterDownload = page.getByRole("button", { name: "Download", exact: true });
    await expect(letterDownload).toHaveAttribute("data-editor-ready", "true");
    await letterDownload.click();
    const letterMenu = page.locator("[data-editor-action-menu]");
    await letterMenu.getByRole("button").filter({ hasText: "Beispieldaten übernehmen" }).click();
    await letterMenu.getByRole("button", { name: "Ja", exact: true }).click();

    await page.goto(`${BASE_URL}/lebenslauf`, { waitUntil: "domcontentloaded" });
    const cvDownload = page.getByRole("button", { name: "Download", exact: true });
    await expect(cvDownload).toHaveAttribute("data-editor-ready", "true");
    await cvDownload.click();
    const cvMenu = page.locator("[data-editor-action-menu]");
    await cvMenu.getByRole("button").filter({ hasText: "Beispieldaten übernehmen" }).click();
    await cvMenu.getByRole("button", { name: "Ja", exact: true }).click();

    await page.evaluate(() => {
      localStorage.setItem("lebenslauf:layout:v1", "timeline");
      localStorage.setItem("lebenslauf:layout-mirror:v1", "true");
      localStorage.setItem(
        "lebenslauf:placement:v1",
        JSON.stringify({
          kontakt: "main",
          schule: "side",
          erfahrung: "main",
          sprachen: "main",
          hobbys: "side",
          staerken: "side",
          referenzen: "main",
        }),
      );
      localStorage.setItem(
        "lebenslauf:photo:v2",
        JSON.stringify({ shape: "circle", zoom: 1.6, x: 20, y: 70, borderWidth: 0.7 }),
      );
      localStorage.setItem(
        "lebenslauf:photo-place:v1",
        JSON.stringify({
          mode: "frei",
          xMm: 132,
          yMm: 26,
          widthMm: 42,
          frameColor: "#123456",
        }),
      );
    });

    await page.goto(`${BASE_URL}/titelblatt`, { waitUntil: "domcontentloaded" });
    const titleDownload = page.getByRole("button", { name: "Download", exact: true });
    await expect(titleDownload).toHaveAttribute("data-editor-ready", "true");
    await titleDownload.click();
    const titleMenu = page.locator("[data-editor-action-menu]");

    const [projectDownload] = await Promise.all([
      page.waitForEvent("download"),
      titleMenu.getByRole("button", { name: /Dossier speichern/ }).click(),
    ]);
    const projectPath = await projectDownload.path();
    expect(projectPath).not.toBeNull();

    const before = await page.evaluate(() => ({
      cover: JSON.parse(localStorage.getItem("titelblatt:v3") ?? "null"),
      letter: JSON.parse(localStorage.getItem("anschreiben:v1") ?? "null"),
      cv: JSON.parse(localStorage.getItem("lebenslauf:v1") ?? "null"),
    }));
    expect(before.cover?.data?.vorname).toBe("Lea");
    expect(before.letter?.data?.absenderName).toBe("Lea Müller");
    expect(before.cv?.data?.person?.vorname).toBe("Lea");

    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Download", exact: true })).toHaveAttribute(
      "data-editor-ready",
      "true",
    );
    await page.getByRole("button", { name: "Download", exact: true }).click();

    const fileInput = page.locator('[data-editor-action-menu] input[type="file"][accept="application/json"]');
    await fileInput.setInputFiles(projectPath ?? "");

    await expect
      .poll(() =>
        page.evaluate(() => ({
          cover: JSON.parse(localStorage.getItem("titelblatt:v3") ?? "null")?.data?.vorname,
          letter: JSON.parse(localStorage.getItem("anschreiben:v1") ?? "null")?.data?.absenderName,
          cv: JSON.parse(localStorage.getItem("lebenslauf:v1") ?? "null")?.data?.person?.vorname,
          layout: localStorage.getItem("lebenslauf:layout:v1"),
          mirrored: localStorage.getItem("lebenslauf:layout-mirror:v1"),
        })),
      )
      .toEqual({
        cover: "Lea",
        letter: "Lea Müller",
        cv: "Lea",
        layout: "timeline",
        mirrored: "true",
      });

    const restored = await page.evaluate((keys) => {
      const result: Record<string, string | null> = {};
      for (const key of keys) result[key] = localStorage.getItem(key);
      return result;
    }, SIDE_KEYS);

    expect(JSON.parse(restored["lebenslauf:placement:v1"] ?? "null")?.schule).toBe("side");
    expect(JSON.parse(restored["lebenslauf:photo:v2"] ?? "null")?.zoom).toBe(1.6);
    expect(JSON.parse(restored["lebenslauf:photo-place:v1"] ?? "null")?.frameColor).toBe(
      "#123456",
    );
  });
});
