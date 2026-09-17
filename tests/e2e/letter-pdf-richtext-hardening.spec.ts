import { expect, test } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:4173";

test("debug standalone motivation-letter PDF export error", async ({ page }) => {
  test.setTimeout(60_000);
  const browserMessages: string[] = [];
  page.on("console", (message) => browserMessages.push(`${message.type()}: ${message.text()}`));
  page.on("pageerror", (error) => browserMessages.push(`pageerror: ${error.message}`));

  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem(
      "anschreiben:v1",
      JSON.stringify({
        version: 1,
        data: {
          absenderName: "Sandro Müller",
          absenderAdresse: "Wylweg 15",
          absenderPlzOrt: "4533 Riedholz",
          absenderTelefon: "0798150037",
          absenderEmail: "saendu.mueller@gmail.com",
          empfaengerFirma: "Schmid Holzbau",
          empfaengerName: "Herr Peter Schmid",
          empfaengerAdresse: "Industriestrasse 3",
          empfaengerPlzOrt: "4524 Günsberg",
          ort: "Hubersdorf",
          datum: "15.09.2026",
          betreff: "Bewerbung um eine Lehrstelle als Zimmermann EFZ Sommer 2027",
          anrede: "Sehr geehrter Herr Schmid",
          text: "Ein kurzer Testtext für den PDF-Export.",
          richTextHtml: "<p>Ein kurzer <strong>Testtext</strong> für den PDF-Export.</p>",
          gruss: "Freundliche Grüsse",
          unterschrift: "Sandro Müller",
          images: [],
          showBeilagen: true,
          beilagen: ["Lebenslauf", "Zeugnis"],
        },
        design: { template: "brief", colors: {}, font: "freundlich" },
      }),
    );
  });
  await page.goto(`${BASE_URL}/anschreiben`, { waitUntil: "domcontentloaded" });

  const toggle = page.getByRole("button", { name: "Download", exact: true });
  await expect(toggle).toHaveAttribute("data-editor-ready", "true", { timeout: 15_000 });
  await toggle.click();
  const pdfButton = page.getByRole("button", { name: /Nur Motivationsschreiben als PDF/i });
  await expect(pdfButton).toBeVisible();
  await expect(pdfButton).toBeEnabled({ timeout: 15_000 });

  const download = page.waitForEvent("download", { timeout: 15_000 }).catch(() => null);
  await pdfButton.click();
  const file = await download;
  if (!file) {
    const status = page.getByRole("status");
    const statusText = (await status.count()) ? await status.first().textContent() : null;
    throw new Error(
      `No download. PDF status=${JSON.stringify(statusText)}; browser=${JSON.stringify(browserMessages)}`,
    );
  }
  expect(await file.path()).not.toBeNull();
});
