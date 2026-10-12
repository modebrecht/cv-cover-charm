import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  DEFAULT_DOSSIER_CHROME_STATE,
  DOSSIER_CHROME_STORAGE_KEY,
} from "../../src/lib/dossier-chrome";
import { paginationFixture, type PaginationFixture } from "./pagination-fixtures";
import { auditDocument, evidenceDir, loadFixture } from "./pagination-browser";
import { normalizeContent } from "./pagination-assertions";

const sender = {
  absenderName: "QASENDERNAME001 Lea Müller",
  absenderAdresse: "QASENDERADDRESS001 Lindenstrasse 27",
  absenderPlzOrt: "QASENDERPLACE001 4500 Solothurn",
  absenderTelefon: "QASENDERPHONE001 079 987 65 43",
  absenderEmail: "QASENDEREMAIL001 lea.qa@example.ch",
};
function senderFixture(template: string, paragraphs: number): PaginationFixture {
  const fixture = paginationFixture(template, { works: 1, schools: 1, paragraphs });
  const letter = JSON.parse(fixture.storage["anschreiben:v1"]);
  Object.assign(letter.data, sender);
  fixture.storage["anschreiben:v1"] = JSON.stringify(letter);
  const markers = Object.values(sender).map((s) => s.split(" ")[0]);
  fixture.markers.letter.push(...markers);
  fixture.sequences.letter.push(markers);
  fixture.segments.letter.push(...Object.values(sender));
  return fixture;
}

test("textlayer freundlich: all visible mixed-size sender fields remain searchable", async ({
  page,
}) => {
  const fixture = senderFixture("freundlich", 2);
  await loadFixture(page, fixture, "letter");
  await mkdir(evidenceDir, { recursive: true });
  const fields = await page
    .locator("[data-letter-standalone-export] [data-letter-page]")
    .first()
    .evaluate((root) => ({
      text: (root as HTMLElement).innerText,
      fontSize: getComputedStyle(root).fontSize,
      lineHeight: getComputedStyle(root).lineHeight,
      rect: root.getBoundingClientRect().toJSON(),
      children: Array.from(
        root.querySelectorAll("[data-letter-pdf-text], [data-dossier-header-contact-row]"),
      ).map((node) => ({
        text: (node as HTMLElement).innerText,
        fontSize: getComputedStyle(node).fontSize,
        lineHeight: getComputedStyle(node).lineHeight,
        rect: node.getBoundingClientRect().toJSON(),
      })),
      senderHtml: Array.from(root.querySelectorAll("div,span"))
        .filter(
          (node) =>
            node.textContent?.includes("QASENDERADDRESS001") &&
            !Array.from(node.children).some((child) =>
              child.textContent?.includes("QASENDERADDRESS001"),
            ),
        )
        .map((node) => node.outerHTML),
    }));
  await writeFile(
    join(evidenceDir, "textlayer-freundlich-sender-dom.json"),
    JSON.stringify(fields, null, 2),
  );
  const result = await auditDocument(page, fixture, "letter", "textlayer-freundlich-sender");
  expect(result.findings).toEqual([]);
});

test("textlayer brief: rich text and list markers precede closing in logical order", async ({
  page,
}) => {
  const fixture = senderFixture("brief", 8);
  const letter = JSON.parse(fixture.storage["anschreiben:v1"]);
  letter.data.richTextHtml = letter.data.text
    .split("\n\n")
    .map(
      (p: string, i: number) =>
        `<div${i === 1 ? ' data-list="bullet"' : ""}>${p.replace("Informatikprojekt", "<strong>Informatikprojekt</strong>").replace("Rückmeldungen", "<em>Rückmeldungen</em>")}</div>`,
    )
    .join("");
  fixture.storage["anschreiben:v1"] = JSON.stringify(letter);
  await loadFixture(page, fixture, "letter");
  const result = await auditDocument(page, fixture, "letter", "textlayer-brief-rich-list");
  expect(result.findings).toEqual([]);
  const text = normalizeContent(result.pdf!.pages.map((p) => p.text).join(" "));
  expect(text.indexOf("•")).toBeGreaterThan(text.indexOf("QAPARAEND001"));
  expect(text.indexOf("•")).toBeLessThan(text.indexOf("QAPARA002"));
  expect(text.indexOf("QACLOSING001")).toBeGreaterThan(text.indexOf("QAPARAEND008"));
});

test("textlayer studio3: disabled contact fields do not enter the PDF", async ({ page }) => {
  const fixture = senderFixture("studio3", 2);
  const chrome = structuredClone(DEFAULT_DOSSIER_CHROME_STATE);
  chrome.shared = {
    ...chrome.shared,
    headerMode: "contact",
    headerShowPhone: false,
    headerShowEmail: false,
    footerMode: "none",
  };
  fixture.storage[DOSSIER_CHROME_STORAGE_KEY] = JSON.stringify(chrome);
  const hidden = [sender.absenderTelefon, sender.absenderEmail];
  fixture.markers.letter = fixture.markers.letter.filter(
    (m) => !hidden.some((s) => s.startsWith(m)),
  );
  fixture.sequences.letter = fixture.sequences.letter.map((list) =>
    list.filter((m) => !hidden.some((s) => s.startsWith(m))),
  );
  fixture.segments.letter = fixture.segments.letter.filter((s) => !hidden.includes(s));
  await loadFixture(page, fixture, "letter");
  const result = await auditDocument(page, fixture, "letter", "textlayer-studio3-hidden-contact");
  expect(result.findings).toEqual([]);
  const text = normalizeContent(result.pdf!.pages.map((p) => p.text).join(" "));
  for (const value of hidden) expect(text).not.toContain(normalizeContent(value));
});

test("textlayer brief: custom role typography keeps every sender and recipient field", async ({
  page,
}) => {
  const fixture = senderFixture("brief", 2);
  const letter = JSON.parse(fixture.storage["anschreiben:v1"]);
  letter.design.senderTypography = { fontSizePt: 10, bold: true };
  letter.design.recipientTypography = { fontSizePt: 10.5, italic: true };
  fixture.storage["anschreiben:v1"] = JSON.stringify(letter);
  await loadFixture(page, fixture, "letter");
  const result = await auditDocument(page, fixture, "letter", "textlayer-brief-role-typography");
  expect(result.findings).toEqual([]);
  const text = normalizeContent(result.pdf!.pages.map((p) => p.text).join(" "));
  for (const value of Object.values(sender)) expect(text).toContain(normalizeContent(value));
  for (const key of ["empfaengerFirma", "empfaengerName", "empfaengerAdresse", "empfaengerPlzOrt"])
    expect(text).toContain(normalizeContent(letter.data[key]));
});

test("textlayer brief: chrome attachments footer follows body, closing and signature", async ({
  page,
}) => {
  const fixture = paginationFixture("brief", { works: 1, schools: 1, paragraphs: 8 });
  const chrome = structuredClone(DEFAULT_DOSSIER_CHROME_STATE);
  chrome.shared = {
    ...chrome.shared,
    headerMode: "compact",
    footerMode: "details",
    footerHeightMm: 20,
  };
  fixture.storage[DOSSIER_CHROME_STORAGE_KEY] = JSON.stringify(chrome);
  await loadFixture(page, fixture, "letter");
  const result = await auditDocument(page, fixture, "letter", "textlayer-brief-footer-order");
  expect(result.findings).toEqual([]);
  const text = normalizeContent(result.pdf!.pages.map((p) => p.text).join(" "));
  expect(text.indexOf("QACLOSING001")).toBeGreaterThan(text.indexOf("QAPARAEND008"));
  expect(text.indexOf("QASIGNATURE001")).toBeGreaterThan(text.indexOf("QACLOSING001"));
  expect(text.indexOf("QAATTACHMENT001")).toBeGreaterThan(text.indexOf("QASIGNATURE001"));
});
