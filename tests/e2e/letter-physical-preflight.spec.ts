import { expect, test, type Page } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:4173";
const LETTER_KEY = "anschreiben:v1";
const MARGINS_KEY = "bewerbungsdossier:page-margins:v1";

const FITTING_BODY = Array.from(
  { length: 8 },
  (_, index) =>
    `Absatz ${index + 1}: Ich interessiere mich für diese Lehrstelle und möchte meine Motivation, Zuverlässigkeit und Lernbereitschaft mit einem konkreten Beispiel aus Schule und Alltag zeigen.`,
).join("\n\n");

function letterPayload(text: string) {
  return {
    version: 1,
    data: {
      absenderName: "Tim Gauss",
      absenderAdresse: "Birkenweg 11",
      absenderPlzOrt: "4533 Flumenthal",
      absenderTelefon: "076 243 23 33",
      absenderEmail: "tim.gauss@example.ch",
      empfaengerFirma: "Gartenbau Stoss",
      empfaengerName: "Christ",
      empfaengerAdresse: "Wallerhofstrasse 2B",
      empfaengerPlzOrt: "4533 Riedholz",
      ort: "Hubersdorf",
      datum: "21.09.2026",
      betreff: "Bewerbung um eine Lehrstelle als Gärtner/EFZ",
      anrede: "Guten Tag",
      text,
      richTextHtml: "",
      gruss: "Freundliche Grüsse",
      unterschrift: "Tim Gauss",
      images: [],
      showBeilagen: true,
      beilagen: ["Lebenslauf", "Zeugnis"],
    },
    design: {
      template: "brief",
      colors: { bg: "#ffffff", primary: "#111111", accent: "#b48a55" },
      font: "freundlich",
      headerMode: "none",
      footerMode: "none",
    },
  };
}

async function installAdversarialMeasurementGeometry(page: Page) {
  await page.addInitScript(() => {
    const install = () => {
      if (!document.head || document.getElementById("test-letter-preflight-geometry")) return false;
      const style = document.createElement("style");
      style.id = "test-letter-preflight-geometry";
      style.textContent = `
        /* Keep the hidden paginator stressed without changing visible A4 geometry. */
        [data-letter-pagination-measurements] [data-letter-text-layer] {
          height: 20px !important;
          min-height: 20px !important;
          bottom: auto !important;
        }
      `;
      document.head.appendChild(style);
      return true;
    };
    if (install()) return;
    const observer = new MutationObserver(() => {
      if (install()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  });
}

async function seed(page: Page) {
  await installAdversarialMeasurementGeometry(page);
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ letter, letterKey, marginsKey }) => {
      localStorage.clear();
      localStorage.setItem(letterKey, JSON.stringify(letter));
      localStorage.setItem(
        marginsKey,
        JSON.stringify({ letter: { top: 5, right: 20, bottom: 1, left: 20 } }),
      );
    },
    { letter: letterPayload(FITTING_BODY), letterKey: LETTER_KEY, marginsKey: MARGINS_KEY },
  );
  await page.goto(`${BASE_URL}/anschreiben`, { waitUntil: "domcontentloaded" });
  const root = page.locator("main [data-letter-document-root]");
  await expect(root).toHaveAttribute("data-letter-pagination-ready", "true", { timeout: 20_000 });
  return root;
}

test.describe("letter physical PDF preflight", () => {
  test.setTimeout(120_000);

  test("inflated legacy scrollHeight does not block a visibly fitting A4 page or its PDF", async ({
    page,
  }) => {
    const root = await seed(page);

    await expect(root).not.toHaveAttribute("data-letter-pagination-error", /.+/);
    await expect(root).not.toHaveAttribute("data-letter-physical-overflow", "true");

    const layer = root.locator("[data-letter-page]").first().locator("[data-letter-text-layer]");
    const legacyScrollMetricWouldBlock = await layer.evaluate((element) => {
      const node = element as HTMLElement;
      const inflated = node.clientHeight + 500;
      Object.defineProperty(node, "scrollHeight", { configurable: true, get: () => inflated });
      return node.scrollHeight > node.clientHeight + 1;
    });
    expect(legacyScrollMetricWouldBlock).toBe(true);

    await page.getByRole("button", { name: "Download", exact: true }).click();
    const pdfButton = page.getByRole("button", { name: /Nur Motivationsschreiben als PDF/i });
    await expect(pdfButton).toBeEnabled();
    const downloadPromise = page.waitForEvent("download", { timeout: 90_000 });
    await pdfButton.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
  });

  test("actual visible content outside the A4 content box still blocks PDF export", async ({ page }) => {
    const root = await seed(page);
    const recipient = root.locator('[data-letter-section="recipient"]').first();
    await expect(recipient).toBeVisible();

    await recipient.evaluate((element) => {
      (element as HTMLElement).style.transform = "translateY(900px)";
    });

    await expect(root).toHaveAttribute("data-letter-pagination-error", "physical-overflow", {
      timeout: 10_000,
    });
    await expect(root).toHaveAttribute("data-letter-physical-overflow", "true");

    await page.getByRole("button", { name: "Download", exact: true }).click();
    await expect(page.getByRole("button", { name: /Nur Motivationsschreiben als PDF/i })).toBeDisabled();
  });
});
