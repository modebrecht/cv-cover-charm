import { expect, test, type Page } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:4173";
const STORAGE_KEY = "anschreiben:v1";

function letterPayload() {
  return {
    version: 1,
    data: {
      absenderName: "Lea Müller",
      absenderAdresse: "Dorfstrasse 12",
      absenderPlzOrt: "4535 Hubersdorf",
      absenderTelefon: "+41 79 123 45 67",
      absenderEmail: "lea.mueller@example.ch",
      empfaengerFirma: "Beispiel AG",
      empfaengerName: "Herr Thomas Weber",
      empfaengerAdresse: "Industriestrasse 8",
      empfaengerPlzOrt: "4500 Solothurn",
      ort: "Hubersdorf",
      datum: "15.11.2026",
      betreff: "Bewerbung um eine Lehrstelle als Informatiker/in EFZ",
      anrede: "Guten Tag Herr Weber",
      text: "Ich bewerbe mich mit grossem Interesse um die Lehrstelle.",
      richTextHtml: "",
      gruss: "Freundliche Grüsse",
      unterschrift: "Lea Müller",
      images: [],
      showBeilagen: true,
      beilagen: ["Lebenslauf", "Zeugnis"],
    },
    design: {
      template: "modern",
      colors: { bg: "#fafafa", primary: "#111827", accent: "#f43f5e" },
      font: "freundlich",
      fontOverride: null,
      headerMode: "compact",
      headerShowName: true,
      headerShowAddress: true,
      headerShowPhone: true,
      headerShowEmail: true,
    },
  };
}

async function openSection(page: Page, name: RegExp) {
  const header = page.getByRole("button", { name });
  if ((await header.getAttribute("aria-expanded")) !== "true") await header.click();
  const panelId = await header.getAttribute("aria-controls");
  if (!panelId) throw new Error(`Section ${name} has no aria-controls`);
  return page.locator(`[id="${panelId}"]`);
}

async function seedLetter(page: Page) {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ key, payload }) => {
      localStorage.clear();
      localStorage.setItem(key, JSON.stringify(payload));
    },
    { key: STORAGE_KEY, payload: letterPayload() },
  );
  await page.goto(`${BASE_URL}/anschreiben`, { waitUntil: "domcontentloaded" });
}

test.describe("M1/M2 compact letter header", () => {
  test("header modes change real geometry, persist, and preview/export stay aligned", async ({ page }) => {
    await seedLetter(page);

    const layout = await openSection(page, /^Layout$/);
    const select = layout.locator("[data-letter-header-mode-control]");
    const preview = page.locator("main [data-letter-page]");
    const exportPage = page.locator("[data-letter-standalone-export] [data-letter-page]");

    await expect(select).toHaveValue("compact");
    await expect(preview).toHaveAttribute("data-letter-header-mode", "compact");
    await expect(preview).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(preview.locator('[data-letter-section="sender"]')).toHaveCount(1);
    expect(await preview.locator("[data-letter-text-layer]").evaluate((node) => node.style.top)).toBe(
      "21mm",
    );

    await select.selectOption("contact");
    await expect(preview).toHaveAttribute("data-letter-header-mode", "contact");
    await expect(exportPage).toHaveAttribute("data-letter-header-mode", "contact");
    await expect(preview.locator("[data-letter-integrated-contact]")).toContainText("Lea Müller");
    await expect(preview.locator("[data-letter-integrated-contact]")).toContainText(
      "+41 79 123 45 67",
    );
    await expect(preview.locator('[data-letter-section="sender"]')).toHaveCount(0);
    expect(await preview.locator("[data-letter-text-layer]").evaluate((node) => node.style.top)).toBe(
      "27mm",
    );

    const headerBox = await preview.locator("[data-letter-integrated-contact]").boundingBox();
    const recipientBox = await preview.locator('[data-letter-section="recipient"]').boundingBox();
    expect(headerBox).not.toBeNull();
    expect(recipientBox).not.toBeNull();
    expect(headerBox!.y + headerBox!.height).toBeLessThanOrEqual(recipientBox!.y);

    await layout.getByLabel("Name integrieren").uncheck();
    await layout.getByLabel("Telefon integrieren").uncheck();
    await expect(preview.locator("[data-letter-integrated-contact]")).not.toContainText("Lea Müller");
    await expect(preview.locator("[data-letter-integrated-contact]")).not.toContainText(
      "+41 79 123 45 67",
    );

    await expect.poll(async () => {
      return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}").design?.headerMode, STORAGE_KEY);
    }).toBe("contact");
    await expect.poll(async () => {
      return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}").design?.headerShowName, STORAGE_KEY);
    }).toBe(false);

    await select.selectOption("none");
    await expect(preview).toHaveAttribute("data-letter-header-mode", "none");
    await expect(preview.locator("[data-letter-integrated-contact]")).toHaveCount(0);
    await expect(preview.locator('[data-letter-section="sender"]')).toHaveCount(1);
    expect(await preview.locator("[data-letter-text-layer]").evaluate((node) => node.style.top)).toBe(
      "18mm",
    );

    await expect.poll(async () => {
      return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}").design?.headerMode, STORAGE_KEY);
    }).toBe("none");

    await page.reload({ waitUntil: "domcontentloaded" });
    const reloadedLayout = await openSection(page, /^Layout$/);
    await expect(reloadedLayout.locator("[data-letter-header-mode-control]")).toHaveValue("none");
    await expect(page.locator("main [data-letter-page]")).toHaveAttribute(
      "data-letter-header-mode",
      "none",
    );
  });
});
