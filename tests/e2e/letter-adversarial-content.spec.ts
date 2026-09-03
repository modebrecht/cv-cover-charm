import { expect, test, type Locator, type Page } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:4173";
const STORAGE_KEY = "anschreiben:v1";
const IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='180'%3E%3Crect width='240' height='180' fill='%2394a3b8'/%3E%3C/svg%3E";

const NORMAL_BODY = [
  "Die Informatik begeistert mich, weil ich gerne logisch denke, Probleme löse und Neues ausprobiere.",
  "In der Schule arbeite ich zuverlässig, lerne schnell und unterstütze mein Team, wenn Hilfe gebraucht wird.",
  "Gerne möchte ich Ihr Unternehmen bei einer Schnupperlehre näher kennenlernen und freue mich über Ihre Rückmeldung.",
].join("\n\n");

const LONG_FITTING_BODY = [
  "Seit mehreren Jahren interessiere ich mich für Computer, digitale Werkzeuge und die Frage, wie technische Probleme Schritt für Schritt gelöst werden können. Besonders gefällt mir, dass in der Informatik sorgfältiges Denken und kreatives Ausprobieren zusammengehören.",
  "In der Schule übernehme ich Aufgaben zuverlässig und bleibe auch dann dran, wenn eine Lösung nicht sofort funktioniert. Bei Gruppenarbeiten kann ich meine Ideen erklären, höre anderen zu und unterstütze das Team dort, wo Hilfe gebraucht wird.",
  "Während einer Schnupperlehre möchte ich den Berufsalltag genauer kennenlernen und zeigen, dass ich motiviert bin, Neues zu lernen. Ich freue mich darauf, Fragen zu stellen, praktische Aufgaben zu übernehmen und einen realistischen Einblick in Ihr Unternehmen zu erhalten.",
  "Die ausgeschriebene Lehrstelle spricht mich deshalb besonders an. Über die Gelegenheit, mich persönlich vorzustellen und mehr über die Ausbildung in Ihrem Betrieb zu erfahren, würde ich mich sehr freuen.",
].join("\n\n");

const HUGE_BODY = Array.from(
  { length: 55 },
  (_, index) =>
    `Absatz ${index + 1}: Ich interessiere mich sehr für diesen Beruf und möchte meine Motivation, Zuverlässigkeit und Lernbereitschaft mit einem ausführlichen Beispiel aus Schule und Alltag zeigen.`,
).join("\n\n");

function payload({
  body = NORMAL_BODY,
  richTextHtml = "",
  data = {},
  design = {},
}: {
  body?: string;
  richTextHtml?: string;
  data?: Record<string, unknown>;
  design?: Record<string, unknown>;
} = {}) {
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
      datum: "02.09.2026",
      betreff: "Bewerbung um eine Lehrstelle als Informatiker/in EFZ",
      anrede: "Guten Tag Herr Weber",
      text: body,
      richTextHtml,
      gruss: "Freundliche Grüsse",
      unterschrift: "Lea Müller",
      images: [],
      showBeilagen: true,
      beilagen: ["Lebenslauf", "Zeugnis"],
      ...data,
    },
    design: {
      template: "modern",
      colors: {
        bg: "#ffffff",
        ink: "#172033",
        primary: "#24364b",
        secondary: "#dbeafe",
        accent: "#2563eb",
        cvInk: "#172033",
        cvMuted: "#526072",
        cvHeading: "#172033",
      },
      font: "freundlich",
      fontOverride: null,
      senderAlign: "left",
      recipientAlign: "left",
      dateAlign: "left",
      ruleAfterSender: false,
      ruleAfterRecipient: false,
      ruleAfterSubject: false,
      headerMode: "compact",
      headerShowName: true,
      headerShowAddress: true,
      headerShowPhone: true,
      headerShowEmail: true,
      footerMode: "compact",
      ...design,
    },
  };
}

async function seedLetter(page: Page, letter: ReturnType<typeof payload>) {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ key, saved }) => {
      localStorage.clear();
      localStorage.setItem(key, JSON.stringify(saved));
    },
    { key: STORAGE_KEY, saved: letter },
  );
  await page.goto(`${BASE_URL}/anschreiben`, { waitUntil: "domcontentloaded" });

  const download = page.getByRole("button", { name: "Download", exact: true });
  await expect(download).toHaveAttribute("data-editor-ready", "true", { timeout: 15_000 });
  const preview = page.getByLabel("Vorschau Motivationsschreiben");
  const exported = page.locator("[data-letter-standalone-export] [data-letter-page]");
  await expect(preview).toBeVisible();
  await expect(exported).toHaveCount(1);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  return { preview, exported, download };
}

async function geometryProblems(root: Locator): Promise<string[]> {
  return root.evaluate((pageElement) => {
    const problems: string[] = [];
    const tolerance = 1.5;
    const pageRect = pageElement.getBoundingClientRect();
    const textLayer = pageElement.querySelector<HTMLElement>("[data-letter-text-layer]");
    if (!textLayer) return ["missing text layer"];
    const textRect = textLayer.getBoundingClientRect();

    // Editor-only image handles may deliberately protrude into the page margin.
    // Horizontal overflow is therefore checked on printable text/image nodes below,
    // while the text layer itself remains authoritative for vertical one-page fit.
    if (textLayer.scrollHeight > textLayer.clientHeight + 1)
      problems.push("vertical text overflow");

    const outside = (
      element: HTMLElement,
      bounds: Pick<DOMRect, "left" | "right" | "top" | "bottom">,
      label: string,
    ) => {
      const rect = element.getBoundingClientRect();
      if (rect.left < bounds.left - tolerance || rect.right > bounds.right + tolerance) {
        problems.push(`${label} outside horizontally`);
      }
      if (rect.top < bounds.top - tolerance || rect.bottom > bounds.bottom + tolerance) {
        problems.push(`${label} outside vertically`);
      }
    };

    for (const element of pageElement.querySelectorAll<HTMLElement>(
      "[data-letter-pdf-text], [data-letter-pdf-richtext]",
    )) {
      const label = element.dataset.letterPdfText ?? element.dataset.letterPdfRichtext ?? "text";
      outside(element, pageRect, label);
      if (element.scrollWidth > element.clientWidth + 1) {
        problems.push(`${label} horizontal overflow`);
      }
    }

    const contact = pageElement.querySelector<HTMLElement>("[data-letter-integrated-contact]");
    const recipient = pageElement.querySelector<HTMLElement>('[data-letter-section="recipient"]');
    if (contact) {
      outside(contact, pageRect, "contact header");
      if (
        contact.scrollWidth > contact.clientWidth + 1 ||
        contact.scrollHeight > contact.clientHeight + 1
      ) {
        problems.push("contact header clipped");
      }
      if (
        recipient &&
        contact.getBoundingClientRect().bottom > recipient.getBoundingClientRect().top + tolerance
      ) {
        problems.push("contact header overlaps recipient");
      }
    }

    const footer = pageElement.querySelector<HTMLElement>("[data-letter-footer]");
    if (footer) {
      outside(footer, pageRect, "footer");
      if (
        footer.scrollWidth > footer.clientWidth + 1 ||
        footer.scrollHeight > footer.clientHeight + 1
      ) {
        problems.push("footer clipped");
      }
    }

    for (const image of pageElement.querySelectorAll<HTMLElement>("[data-letter-flow-image]")) {
      outside(image, pageRect, `image ${image.dataset.letterFlowImage ?? "unknown"}`);
      outside(image, textRect, `image ${image.dataset.letterFlowImage ?? "unknown"} text area`);
    }

    return [...new Set(problems)];
  });
}

async function expectHealthy(preview: Locator, exported: Locator, label: string) {
  await expect
    .poll(() => geometryProblems(preview), { message: `${label} preview must not clip or overlap` })
    .toEqual([]);
  await expect
    .poll(() => geometryProblems(exported), { message: `${label} export must not clip or overlap` })
    .toEqual([]);
}

test.describe("M8 adversarial motivation-letter content", () => {
  test.setTimeout(240_000);

  test("long international identity and contact values remain visible and inside A4", async ({
    page,
  }) => {
    const longName = "Zoë-Anouk D’Ávila-Müller-Winterberger";
    const longEmail = "zoe-anouk.davila-mueller-winterberger+bewerbung.2027@example-schule.ch";
    const company = "Internationales Technologie- und Ausbildungszentrum Solothurn AG";
    const contact = "Frau Élodie O'Connor-García";

    const { preview, exported } = await seedLetter(
      page,
      payload({
        data: {
          absenderName: longName,
          absenderAdresse: "Alte Bernstrasse 123B, Haus Süd, 3. Obergeschoss",
          absenderPlzOrt: "4500 Solothurn",
          absenderTelefon: "+41 (0)79 123 45 67",
          absenderEmail: longEmail,
          empfaengerFirma: company,
          empfaengerName: contact,
          empfaengerAdresse: "Industriestrasse 123, Gebäude Technologiepark West",
          empfaengerPlzOrt: "4600 Olten",
          unterschrift: longName,
        },
        design: { headerMode: "contact", footerMode: "compact" },
      }),
    );

    for (const text of [longName, longEmail, company, contact]) {
      await expect(preview).toContainText(text);
      await expect(exported).toContainText(text);
    }
    await expectHealthy(preview, exported, "long international contact values");
  });

  test("short, normal and long valid bodies remain safe", async ({ page }) => {
    const bodies = [
      ["short", "Ich freue mich darauf, Sie persönlich kennenzulernen."],
      ["normal", NORMAL_BODY],
      ["long-valid", LONG_FITTING_BODY],
    ] as const;

    for (const [label, body] of bodies) {
      const { preview, exported } = await seedLetter(page, payload({ body }));
      await expect(page.getByRole("alert")).toHaveCount(0);
      await expectHealthy(preview, exported, label);
    }
  });

  test("attachment counts, footer modes and individual contact toggles never lose content silently", async ({
    page,
  }) => {
    const attachmentCases = [
      {
        label: "none",
        data: { showBeilagen: false, beilagen: [] },
        design: { headerMode: "none", footerMode: "attachments" },
        expectedAttachments: 0,
      },
      {
        label: "one",
        data: { showBeilagen: true, beilagen: ["Lebenslauf"] },
        design: {
          headerMode: "contact",
          footerMode: "attachments",
          headerShowPhone: false,
        },
        expectedAttachments: 1,
      },
      {
        label: "many",
        data: {
          showBeilagen: true,
          beilagen: [
            "Lebenslauf",
            "Zeugnis 1. Semester",
            "Zeugnis 2. Semester",
            "Schnupperlehrbericht",
            "Stellwerkprofil",
            "Kursbestätigung Robotik",
            "Arbeitsprobe Informatik",
            "Referenzschreiben Schule",
          ],
        },
        design: {
          headerMode: "contact",
          footerMode: "attachments",
          headerShowName: false,
          headerShowAddress: true,
          headerShowPhone: true,
          headerShowEmail: false,
        },
        expectedAttachments: 8,
      },
    ] as const;

    for (const scenario of attachmentCases) {
      const { preview, exported, download } = await seedLetter(
        page,
        payload({ data: scenario.data, design: scenario.design }),
      );
      await expect(preview).toHaveAttribute(
        "data-letter-requested-footer-mode",
        scenario.design.footerMode,
      );
      const footerItems = preview.locator(
        "[data-letter-footer-attachments] [data-letter-pdf-text='attachments-body'] > div > div",
      );
      await expect(footerItems).toHaveCount(scenario.expectedAttachments);

      const problems = await geometryProblems(exported);
      if (problems.length === 0) {
        await expectHealthy(preview, exported, `attachments-${scenario.label}`);
        continue;
      }

      expect(scenario.label).toBe("many");
      expect(problems.some((problem) => problem.includes("footer"))).toBe(true);
      await download.click();
      const pdfButton = page.getByRole("button", { name: /Nur Motivationsschreiben als PDF/ });
      if (await pdfButton.isDisabled()) {
        await expect(page.getByRole("alert")).toContainText("Zu viel Text für eine Seite");
      } else {
        await pdfButton.click();
        await expect(
          page
            .getByRole("status")
            .filter({ hasText: "Motivationsschreiben passt nicht auf eine Seite" }),
        ).toBeVisible({ timeout: 15_000 });
      }
    }
  });

  test("rich text and boundary-near square-wrap images remain visible without silent clipping", async ({
    page,
  }) => {
    const richTextHtml = [
      "<div>Ich arbeite <strong>zuverlässig</strong> und lerne <em>sehr gerne</em> Neues.</div>",
      '<div data-list="bullet">Erster konkreter Punkt</div>',
      '<div data-list="bullet">Zweiter konkreter Punkt</div>',
      "<div>Darum freue ich mich auf ein persönliches Gespräch.</div>",
    ].join("");

    const { preview, exported } = await seedLetter(
      page,
      payload({
        body: "Ich arbeite zuverlässig und lerne sehr gerne Neues.",
        richTextHtml,
        data: {
          images: [
            { id: "edge-left", src: IMAGE, side: "left", topMm: 0, widthMm: 38, gapMm: 4 },
            { id: "edge-right", src: IMAGE, side: "right", topMm: 86, widthMm: 30, gapMm: 4 },
          ],
        },
      }),
    );

    const body = preview.locator("[data-letter-pdf-richtext='body']");
    await expect(body.locator("strong")).toContainText("zuverlässig");
    await expect(body.locator("em")).toContainText("sehr gerne");
    await expect(body.locator('[data-list="bullet"]')).toHaveCount(2);
    await expect(preview.locator("[data-letter-flow-image]")).toHaveCount(2);
    await expect(exported.locator("[data-letter-flow-image]")).toHaveCount(2);
    await expectHealthy(preview, exported, "rich-text-images");
  });

  test("deliberately too-long content is clearly blocked instead of silently exported", async ({
    page,
  }) => {
    const { download } = await seedLetter(
      page,
      payload({
        body: HUGE_BODY,
        data: {
          beilagen: [
            "Lebenslauf",
            "Zeugnis 1. Semester",
            "Zeugnis 2. Semester",
            "Schnupperlehrbericht",
          ],
        },
        design: { headerMode: "contact", footerMode: "attachments" },
      }),
    );

    const warning = page.getByRole("alert");
    await expect(warning).toContainText("Zu viel Text für eine Seite", { timeout: 15_000 });
    await expect(warning).toContainText("passt nicht auf eine Seite");

    await download.click();
    await expect(
      page.getByRole("button", { name: /Nur Motivationsschreiben als PDF/ }),
    ).toBeDisabled();
  });
});
