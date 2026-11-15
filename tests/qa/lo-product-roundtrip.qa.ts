import { expect, test } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { importNativeDossier, waitForNativeEditorSaved } from "../e2e/support/native-docx-fixture";
import { runtimeProvenance } from "./pagination-browser";

const out = "artifacts/lo-product-roundtrip";
const cases = ["cv-left", "cv-right", "letter-two-pages", "dossier"] as const;

for (const name of cases) {
  test(`LibreOffice input through actual DOCX download: ${name}`, async ({ page }) => {
    await mkdir(out, { recursive: true });
    const photo = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 160;
      canvas.height = 200;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#c94838";
      ctx.fillRect(0, 0, 160, 200);
      ctx.fillStyle = "#246baf";
      ctx.fillRect(80, 0, 80, 200);
      ctx.fillStyle = "#e5c551";
      ctx.fillRect(0, 140, 160, 60);
      ctx.fillStyle = "#172c39";
      ctx.beginPath();
      ctx.arc(47, 62, 26, 0, 2 * Math.PI);
      ctx.fill();
      return canvas.toDataURL("image/png");
    });
    const input = await importNativeDossier(page, (project) => {
      project.cv.data.person.foto = photo;
      Object.assign(project.cover.data, { foto: photo });
      project.cv.portableState.photoStyle = {
        shape: name === "cv-right" ? "portrait" : "circle",
        zoom: name === "cv-right" ? 1.65 : 1.35,
        x: name === "cv-right" ? 85 : 30,
        y: name === "cv-right" ? 20 : 70,
        borderWidth: name === "cv-right" ? 1.2 : 0.3,
      };
      project.cv.portableState.mirrored = name === "cv-right";
      project.cv.portableState.infoPosition = name === "cv-right" ? "mirrored" : "standard";
      if (name === "letter-two-pages") {
        project.letter.data.text = Array.from(
          { length: 8 },
          (_, i) =>
            `Abschnitt ${i + 1}: ` +
            "Bei diesem synthetischen Prüftext geht es um Planung, Dokumentation und Zusammenarbeit. ".repeat(
              5,
            ),
        ).join("\n\n");
      }
    });
    const route = name.startsWith("cv")
      ? "lebenslauf"
      : name === "letter-two-pages"
        ? "anschreiben"
        : "";
    await page.goto(`http://127.0.0.1:4173/${route}`, { waitUntil: "networkidle" });
    if (route) await waitForNativeEditorSaved(page);
    if (name === "letter-two-pages") {
      await expect(
        page.locator("main [data-letter-document-pages] [data-letter-page]"),
      ).toHaveCount(2);
    }
    const before = await page.evaluate(() =>
      JSON.stringify(
        Object.fromEntries(
          ["titelblatt:v3", "lebenslauf:v1", "anschreiben:v1"].map((key) => [
            key,
            localStorage.getItem(key),
          ]),
        ),
      ),
    );
    const pending = page.waitForEvent("download", { timeout: 60_000 });
    if (name === "dossier") {
      await page.getByRole("button", { name: /Gesamtdossier herunterladen/ }).click();
      const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
      await dialog
        .getByRole("radio", { name: "Bearbeitbares Dossier (DOCX)", exact: true })
        .click();
      const button = dialog.getByRole("button", { name: "DOCX herunterladen", exact: true });
      await expect(button).toBeEnabled();
      await button.click();
    } else {
      await page.getByRole("button", { name: "Download", exact: true }).click();
      const button = page
        .locator("[data-editor-download-menu]")
        .getByRole("menuitem", { name: "DOCX", exact: true });
      await expect(button).toBeEnabled();
      await button.click();
    }
    await (await pending).saveAs(join(out, `${name}.docx`));
    expect(
      await page.evaluate(() =>
        JSON.stringify(
          Object.fromEntries(
            ["titelblatt:v3", "lebenslauf:v1", "anschreiben:v1"].map((key) => [
              key,
              localStorage.getItem(key),
            ]),
          ),
        ),
      ),
    ).toEqual(before);
    const bytes = await readFile(join(out, `${name}.docx`));
    await writeFile(
      join(out, `${name}.json`),
      JSON.stringify(
        {
          name,
          input,
          sha256: createHash("sha256").update(bytes).digest("hex"),
          ...runtimeProvenance(),
        },
        null,
        2,
      ),
    );
  });
}
