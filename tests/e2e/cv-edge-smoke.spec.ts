import { expect, test, type Page } from "@playwright/test";
import { inflateSync } from "node:zlib";

const BASE_URL = "http://127.0.0.1:4173";

const TEMPLATE_IDS = [
  "klassisch",
  "modern",
  "freundlich",
  "edel",
  "colorful",
  "blockig",
  "edelBlockig",
  "serioes",
  "human",
  "sonnig",
  "welle",
  "terracotta",
  "pastell",
  "sonne",
  "studio",
  "neon",
  "aurora",
  "verlauf",
  "citrus",
] as const;

const DARK_TEST_COLORS = {
  bg: "#111318",
  primary: "#6633cc",
  secondary: "#087f8c",
  tertiary: "#b7791f",
  accent: "#d9468f",
  ink: "#f5f5f5",
};

function cvPayload(template: string) {
  return {
    version: 2,
    data: {
      titel: "Lebenslauf",
      person: {
        vorname: "Lea",
        nachname: "Müller",
        adresse: "Bahnhofstrasse 42",
        plzOrt: "8000 Zürich",
        telefon: "+41 79 123 45 67",
        email: "lea@example.ch",
        geburtsdatum: "14.03.2010",
        nationalitaet: "Schweiz",
        untertitel: "Schülerin, 3. Sekundarklasse",
        foto: null,
      },
      schule: [
        {
          id: "school-1",
          zeit: "2023 – heute",
          titel: "Sekundarschule",
          ort: "Zürich",
          beschreibung: "",
        },
      ],
      erfahrung: [
        {
          id: "work-1",
          zeit: "Sept. 2026",
          titel: "Schnuppertag",
          ort: "Beispielbetrieb",
          beschreibung: "Einblick in den Berufsalltag.",
        },
      ],
      sprachen: [{ id: "de", name: "Deutsch", niveau: "Muttersprache" }],
      hobbys: ["Volleyball", "Programmieren"],
      staerken: ["Zuverlässig", "Teamfähig"],
      referenzen: [],
      labels: {},
      hidden: {},
    },
    design: {
      template,
      colors: DARK_TEST_COLORS,
      bgOpacity: 0.06,
      useElements: false,
    },
    elements: [],
  };
}

async function seedTemplate(page: Page, template: string) {
  await page.goto(`${BASE_URL}/lebenslauf`, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ payload }) => {
      localStorage.clear();
      localStorage.setItem("lebenslauf:v1", JSON.stringify(payload));
      localStorage.setItem("lebenslauf:layout:v1", "classic");
      localStorage.setItem("lebenslauf:layout-mirror:v1", "false");
    },
    { payload: cvPayload(template) },
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  const sheet = page
    .locator('[data-dossier-document="cv"][data-export-mode="false"] [data-cv-page]')
    .first();
  await sheet.waitFor({ state: "visible" });
  await page.waitForFunction(() => document.documentElement.dataset.cvVariant !== undefined);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
  return sheet;
}

type DecodedPng = { width: number; height: number; channels: number; pixels: Uint8Array };

function paeth(a: number, b: number, c: number) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function decodePng(buffer: Buffer): DecodedPng {
  const signature = buffer.subarray(0, 8).toString("hex");
  expect(signature).toBe("89504e470d0a1a0a");

  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat: Buffer[] = [];

  for (let offset = 8; offset < buffer.length; ) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }

  expect(bitDepth).toBe(8);
  expect([2, 6]).toContain(colorType);
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(idat));
  const pixels = new Uint8Array(width * height * channels);

  let src = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[src++];
    const rowStart = y * stride;
    const prevStart = (y - 1) * stride;
    for (let x = 0; x < stride; x += 1) {
      const encoded = raw[src++];
      const left = x >= channels ? pixels[rowStart + x - channels] : 0;
      const up = y > 0 ? pixels[prevStart + x] : 0;
      const upLeft = y > 0 && x >= channels ? pixels[prevStart + x - channels] : 0;
      let value = encoded;
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += Math.floor((left + up) / 2);
      else if (filter === 4) value += paeth(left, up, upLeft);
      else if (filter !== 0) throw new Error(`Unsupported PNG filter ${filter}`);
      pixels[rowStart + x] = value & 0xff;
    }
  }

  return { width, height, channels, pixels };
}

function rgbAt(image: DecodedPng, x: number, y: number) {
  const i = (y * image.width + x) * image.channels;
  return [image.pixels[i], image.pixels[i + 1], image.pixels[i + 2]] as const;
}

function isWhite([r, g, b]: readonly number[]) {
  return r >= 247 && g >= 247 && b >= 247;
}

function distance(a: readonly number[], b: readonly number[]) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
}

function edgeLeak(image: DecodedPng) {
  let topSuspicious = 0;
  let bottomSuspicious = 0;
  let leftSuspicious = 0;
  let rightSuspicious = 0;
  const inset = 2;

  for (let x = inset; x < image.width - inset; x += 1) {
    const topEdge = rgbAt(image, x, 0);
    const topInner = rgbAt(image, x, Math.min(image.height - 1, 2));
    if (isWhite(topEdge) && !isWhite(topInner) && distance(topEdge, topInner) > 45) {
      topSuspicious += 1;
    }

    const bottomEdge = rgbAt(image, x, image.height - 1);
    const bottomInner = rgbAt(image, x, Math.max(0, image.height - 3));
    if (isWhite(bottomEdge) && !isWhite(bottomInner) && distance(bottomEdge, bottomInner) > 45) {
      bottomSuspicious += 1;
    }
  }

  for (let y = inset; y < image.height - inset; y += 1) {
    const leftEdge = rgbAt(image, 0, y);
    const leftInner = rgbAt(image, Math.min(image.width - 1, 2), y);
    if (isWhite(leftEdge) && !isWhite(leftInner) && distance(leftEdge, leftInner) > 45) {
      leftSuspicious += 1;
    }

    const rightEdge = rgbAt(image, image.width - 1, y);
    const rightInner = rgbAt(image, Math.max(0, image.width - 3), y);
    if (isWhite(rightEdge) && !isWhite(rightInner) && distance(rightEdge, rightInner) > 45) {
      rightSuspicious += 1;
    }
  }

  return {
    topRatio: topSuspicious / Math.max(1, image.width - inset * 2),
    bottomRatio: bottomSuspicious / Math.max(1, image.width - inset * 2),
    leftRatio: leftSuspicious / Math.max(1, image.height - inset * 2),
    rightRatio: rightSuspicious / Math.max(1, image.height - inset * 2),
  };
}

test.describe("CV page-edge smoke test", () => {
  test.setTimeout(120_000);

  test("all 19 templates render without a white 1px page-edge seam", async ({ page }) => {
    // Deliberately use a viewport that produces a fractional preview scale.
    await page.setViewportSize({ width: 1137, height: 913 });

    const failures: string[] = [];
    for (const template of TEMPLATE_IDS) {
      const sheet = await seedTemplate(page, template);
      const screenshot = await sheet.screenshot({ animations: "disabled" });
      const leak = edgeLeak(decodePng(screenshot));

      if (
        leak.topRatio > 0.18 ||
        leak.bottomRatio > 0.18 ||
        leak.leftRatio > 0.18 ||
        leak.rightRatio > 0.18
      ) {
        failures.push(
          `${template}: top ${(leak.topRatio * 100).toFixed(1)}%, bottom ${(leak.bottomRatio * 100).toFixed(1)}%, left ${(leak.leftRatio * 100).toFixed(1)}%, right ${(leak.rightRatio * 100).toFixed(1)}% suspicious white edge`,
        );
      }
    }

    expect(failures).toEqual([]);
  });
});
