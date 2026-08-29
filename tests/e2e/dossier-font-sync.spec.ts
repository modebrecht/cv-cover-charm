import { expect, test } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:4173";

test.describe("shared CV and motivation-letter font", () => {
  test("inherits an existing CV font and propagates later letter font changes back to CV", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/anschreiben`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem(
        "lebenslauf:v1",
        JSON.stringify({
          version: 6,
          data: {
            person: {
              vorname: "Lea",
              nachname: "Müller",
            },
          },
          design: {
            template: "modern",
            font: "times",
            colors: { primary: "#111827", accent: "#f43f5e", bg: "#fafafa" },
          },
        }),
      );
      localStorage.setItem(
        "anschreiben:v1",
        JSON.stringify({
          version: 1,
          data: {
            absenderName: "Lea Müller",
            betreff: "Bewerbung Informatik",
            text: "Ich interessiere mich für die Lehrstelle.",
          },
          design: {
            template: "brief",
            colors: { bg: "#ffffff", primary: "#111111", accent: "#111111" },
          },
        }),
      );
    });
    await page.reload({ waitUntil: "domcontentloaded" });

    await expect
      .poll(() =>
        page.evaluate(() => {
          const raw = localStorage.getItem("anschreiben:v1");
          return raw ? JSON.parse(raw).design?.font : null;
        }),
      )
      .toBe("times");

    const typographySection = page.getByRole("button", { name: "Schrift", exact: true });
    await typographySection.click();
    const fontSelect = page.locator("label").filter({ hasText: "Schriftart" }).locator("select");
    await expect(fontSelect).toHaveValue("times");

    await fontSelect.selectOption("maschine");

    await expect
      .poll(() =>
        page.evaluate(() => {
          const raw = localStorage.getItem("lebenslauf:v1");
          return raw ? JSON.parse(raw).design?.font : null;
        }),
      )
      .toBe("maschine");

    await expect
      .poll(() =>
        page.evaluate(() => {
          const raw = localStorage.getItem("anschreiben:v1");
          return raw ? JSON.parse(raw).design?.font : null;
        }),
      )
      .toBe("maschine");
  });
});
