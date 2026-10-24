import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CvCanvas } from "../../src/components/cv/CvCanvasBase";
import type { CvPresentation } from "../../src/components/cv/presentation";
import {
  DEFAULT_CV_PLACEMENTS,
  emptyCv,
  type CvData,
  type CvReferenz,
} from "../../src/components/cv/types";
import { DEFAULT_DOSSIER_CHROME_OPTIONS } from "../../src/lib/dossier-chrome";
import { DEFAULT_DOSSIER_PHOTO_STYLE } from "../../src/lib/dossier-photo";

const reference: CvReferenz = {
  id: "reference-test",
  name: "",
  funktion: "",
  kontakt: "",
  email: "",
  zusatz: "",
};
const variants = [
  { label: "email only", patch: { email: "referenz@example.invalid" } },
  { label: "extra only", patch: { zusatz: "Rueckfrage nach Vereinbarung" } },
  {
    label: "named reference with separate email and extra",
    patch: {
      name: "Referenzperson",
      email: "referenz@example.invalid",
      zusatz: "Nach Vereinbarung",
    },
  },
  {
    label: "legacy composite without duplicated explicit suffixes",
    patch: {
      kontakt: "000 000 00 00\nreferenz@example.invalid\nNach Vereinbarung",
      email: "referenz@example.invalid",
      zusatz: "Nach Vereinbarung",
    },
  },
];

function render(
  value: CvReferenz,
  side: "left" | "right",
  target: "side" | "main" = "side",
  hidden = false,
) {
  const data: CvData = structuredClone(emptyCv);
  data.referenzen = [structuredClone(value)];
  data.hidden.referenzen = hidden;
  const presentation: CvPresentation = {
    layoutChoice: "modern",
    infoPosition: side === "left" ? "standard" : "mirrored",
    placements: { ...DEFAULT_CV_PLACEMENTS, referenzen: target },
    photoStyle: { ...DEFAULT_DOSSIER_PHOTO_STYLE },
    photoPlacement: { mode: "auto" },
    sectionGapMm: null,
    documentTitleMarginTopPx: 0,
    continuationTopMarginMm: null,
    pageMargins: null,
    bodyAlignment: "left",
  };
  const before = structuredClone({ data, presentation });
  const html = renderToStaticMarkup(
    createElement(CvCanvas, {
      data,
      design: { template: "modern", colors: {}, bgOpacity: 0.06, useElements: false },
      presentation,
      elements: [],
      chromeOptions: { ...DEFAULT_DOSSIER_CHROME_OPTIONS },
      chromeContact: { name: "Pruefperson", address: "", place: "", phone: "", email: "" },
      exportMode: true,
    }),
  );
  expect({ data, presentation }).toEqual(before);
  return html;
}

async function fields(html: string, target: "side" | "main") {
  const owner = target === "side" ? "[data-cv-sidebar]" : "[data-cv-main]";
  const result: Record<string, { count: number; text: string }> = {};
  let rewriter = new HTMLRewriter();
  for (const suffix of ["name", "role", "contact", "email", "extra"]) {
    result[suffix] = { count: 0, text: "" };
    rewriter = rewriter.on(
      `[data-cv-page] ${owner} [data-dossier-field-id="cv.entry.referenzen:reference-test.${suffix}"]`,
      {
        element() {
          result[suffix].count++;
        },
        text(chunk) {
          result[suffix].text += chunk.text;
        },
      },
    );
  }
  await rewriter.transform(new Response(html)).text();
  return result;
}

describe("CV Sidebar reference fields", () => {
  for (const side of ["left", "right"] as const) {
    for (const variant of variants) {
      test(`${side}: ${variant.label} survives the visible Sidebar renderer`, async () => {
        const value = { ...reference, ...variant.patch };
        const actual = await fields(render(value, side), "side");
        const expected = {
          name: value.name,
          role: value.funktion,
          contact: variant.label.startsWith("legacy") ? "000 000 00 00" : "",
          email: value.email,
          extra: value.zusatz,
        };
        for (const [suffix, text] of Object.entries(expected)) {
          expect(actual[suffix]).toEqual({ count: text ? 1 : 0, text: text || "" });
        }
      });
    }

    test(`${side}: hidden and whitespace-only references remain absent`, async () => {
      const blank = { ...reference, name: " ", kontakt: "\n", email: " ", zusatz: " " };
      for (const html of [
        render(blank, side),
        render({ ...reference, email: "referenz@example.invalid" }, side, "side", true),
      ]) {
        const actual = await fields(html, "side");
        expect(Object.values(actual).every((field) => field.count === 0)).toBe(true);
      }
    });

    test(`${side}: separate email remains in the main track when explicitly placed there`, async () => {
      const html = render({ ...reference, email: "referenz@example.invalid" }, side, "main");
      expect((await fields(html, "main")).email).toEqual({
        count: 1,
        text: "referenz@example.invalid",
      });
      expect((await fields(html, "side")).email.count).toBe(0);
    });
  }
});
