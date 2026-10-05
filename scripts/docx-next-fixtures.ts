/** Bun runner, outputs are temporary QA evidence, never production templates. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { buildDossierDocModel } from "../src/lib/docx-next/build-model";
import { renderDossierDocx } from "../src/lib/docx-next/renderer";
import { walkBlocks, type TextRun, type DecorativeShape } from "../src/lib/docx-next/model";
import { planPartSections } from "../src/lib/docx-next/section-plan";
import { DEFAULT_DOSSIER_CHROME_STATE } from "../src/lib/dossier-chrome";
import {
  BRIEF_FIXTURES,
  briefFixture,
  briefChromeFixture,
  briefPaintFixture,
  briefCoverTypographyFixture,
  briefElementsFixture,
  briefFontsFixture,
  BRIEF_LAYOUT_FIXTURES,
  briefLayoutFixture,
  BRIEF_VARIANT_FIXTURES,
  briefVariantFixture,
  BRIEF_PAGINATION_FIXTURES,
  briefPaginationFixture,
} from "../tests/fixtures/docx-next/brief";

import { WARM_FIXTURES, warmFixture, type WarmFixture } from "../tests/fixtures/docx-next/warm";
import { PRISM_FIXTURES, prismFixture, type PrismFixture } from "../tests/fixtures/docx-next/prism";
import { HUMAN_FIXTURES, humanFixture, type HumanFixture } from "../tests/fixtures/docx-next/human";
import { ORBIT_FIXTURES, orbitFixture, type OrbitFixture } from "../tests/fixtures/docx-next/orbit";
import { artworkApplies } from "../src/lib/docx-next/page-artwork";
const isWarm = process.argv.includes("--warm");
const isPrism = process.argv.includes("--prism");
const isHuman = process.argv.includes("--human");
const isOrbit = process.argv.includes("--orbit");
if ([isWarm, isPrism, isHuman, isOrbit].filter(Boolean).length > 1)
  throw new Error("Select one candidate fixture set.");
const out = path.resolve(process.argv[2] ?? "/tmp/cv-docx-next-qa");
await mkdir(out, { recursive: true });
const images: Record<string, string> = JSON.parse(
  await readFile(path.join(out, "images.json"), "utf8"),
);
const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
    ? path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, "playwright")
    : "playwright",
);
const build = await Bun.build({
  entrypoints: ["src/lib/docx-next/images.ts", "src/lib/docx-next/decoration.ts"],
  target: "browser",
  format: "esm",
});
if (!build.success) throw new Error("Image normalizer browser bundle failed");
const moduleCode = await build.outputs.find((file) => file.path.endsWith("/images.js"))!.text();
const decorationCode = await build.outputs
  .find((file) => file.path.endsWith("/decoration.js"))!
  .text();
const browser = await chromium.launch({
  headless: true,
  ...(process.env.DOCX_NEXT_CHROMIUM_PATH
    ? { executablePath: process.env.DOCX_NEXT_CHROMIUM_PATH }
    : {}),
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.goto("about:blank");
const normalized = new Map();
try {
  for (const [key, source] of Object.entries(images)) {
    const asset = await page.evaluate(
      async ({ source, moduleCode }: { source: string; moduleCode: string }) => {
        const mod = await import(`data:text/javascript;base64,${btoa(moduleCode)}`);
        const image = await mod.normalizeBrowserImage(source);
        return { ...image, bytes: Array.from(image.bytes) };
      },
      { source, moduleCode },
    );
    if (key === "exif-jpeg" && asset.widthPx <= asset.heightPx)
      throw new Error("EXIF orientation was not normalized");
    if (key === "large-jpeg" && Math.max(asset.widthPx, asset.heightPx) > 1600)
      throw new Error("Image size budget failed");
    normalized.set(source, { ...asset, bytes: Uint8Array.from(asset.bytes) });
    await writeFile(path.join(out, `normalized-${key}.png`), Uint8Array.from(asset.bytes));
  }
  // Exercise failures through the real browser decoder.
  const invalid = await page.evaluate(async (code: string) => {
    const mod = await import(`data:text/javascript;base64,${btoa(code)}`);
    try {
      await mod.normalizeBrowserImage("data:image/jpeg;base64,aW52YWxpZA==");
      return false;
    } catch {
      return true;
    }
  }, moduleCode);
  if (!invalid) throw new Error("Corrupt image did not fail visibly");
  const fixtureNames = isOrbit
    ? ORBIT_FIXTURES.map((kind) => `orbit-${kind}`)
    : isHuman
      ? HUMAN_FIXTURES.map((kind) => `human-${kind}`)
      : isPrism
        ? PRISM_FIXTURES.map((kind) => `prism-${kind}`)
        : isWarm
          ? WARM_FIXTURES.map((kind) => `warm-${kind}`)
          : [
              ...BRIEF_FIXTURES,
              ...BRIEF_VARIANT_FIXTURES.map((kind) => `variant-${kind}`),
              ...BRIEF_PAGINATION_FIXTURES.map((kind) => `pagination-${kind}`),
              ...BRIEF_LAYOUT_FIXTURES.map((kind) => `layout-${kind}`),
              ...Object.keys(images),
              "chrome",
              "half-sections",
              "rich-letter",
              "positioned-images",
              "photo-left",
              "photo-right",
              "photo-free",
              "photo-circle",
              "photo-zoom",
              "photo-long-name",
              "photo-long-cv",
              "rich-table-lists",
              "columns-two",
              "columns-three",
              "columns-long",
              "columns-chrome",
              "columns-long-chrome",
              "chrome-custom",
              "chrome-custom-stacked",
              "paper-colors",
              "paint-gradient",
              "paint-long-letter",
              "paint-long-cv",
              "offsets-negative",
              "offsets-zero",
              "offsets-positive",
              "cover-typography",
              "cover-lists",
              "cover-long-list",
              "cover-tracking-zero",
              "cover-tracking-wide",
              "cover-line-single",
              "cover-line-double",
              "elements-short",
              "elements-long",
              "elements-page-two",
              "elements-images",
              "elements-shapes",
              "elements-shapes-paper",
              "elements-artwork-failure",
              "elements-empty-disabled",
              "fonts-mixed",
              "fonts-unavailable",
              "fonts-long-letter",
              "fonts-long-cv",
              "fonts-offline",
              "opacity-native",
            ];
  const manifest = [];
  const expectedText = (run: TextRun) =>
    run.style.allCaps ? { text: run.text, allCaps: true } : run.text;
  for (const fixture of fixtureNames) {
    const input = isOrbit
      ? orbitFixture(fixture.slice(6) as OrbitFixture, images.png)
      : isHuman
        ? humanFixture(fixture.slice(6) as HumanFixture, images.png)
        : isPrism
          ? prismFixture(fixture.slice(6) as PrismFixture, images.png)
          : isWarm
            ? warmFixture(fixture.slice(5) as WarmFixture, images.png)
            : fixture.startsWith("variant-")
              ? briefVariantFixture(fixture.slice(8) as Parameters<typeof briefVariantFixture>[0])
              : fixture.startsWith("pagination-")
                ? briefPaginationFixture(
                    fixture.slice(11) as Parameters<typeof briefPaginationFixture>[0],
                  )
                : fixture.startsWith("layout-")
                  ? briefLayoutFixture(fixture.slice(7) as Parameters<typeof briefLayoutFixture>[0])
                  : fixture.startsWith("fonts-")
                    ? briefFontsFixture(fixture.slice(6) as Parameters<typeof briefFontsFixture>[0])
                    : fixture.startsWith("elements-")
                      ? briefElementsFixture(
                          (fixture === "elements-artwork-failure"
                            ? "shapes"
                            : fixture.slice(9)) as Parameters<typeof briefElementsFixture>[0],
                        )
                      : fixture.startsWith("cover-")
                        ? briefCoverTypographyFixture(
                            fixture.slice(6) as Parameters<typeof briefCoverTypographyFixture>[0],
                          )
                        : fixture.startsWith("paint-")
                          ? briefPaintFixture(
                              fixture === "paint-long-letter"
                                ? "long-letter"
                                : fixture === "paint-long-cv"
                                  ? "long-cv"
                                  : "normal",
                            )
                          : fixture.startsWith("chrome-custom") || fixture.startsWith("offsets-")
                            ? briefChromeFixture(fixture.endsWith("stacked"))
                            : briefFixture(
                                fixture === "photo-long-name"
                                  ? "long-values"
                                  : fixture === "photo-long-cv"
                                    ? "long-cv"
                                    : (BRIEF_FIXTURES as readonly string[]).includes(fixture)
                                      ? (fixture as (typeof BRIEF_FIXTURES)[number])
                                      : "normal",
                              );
    if (fixture === "opacity-native") {
      input.cover.colors.bg = "#F0F0F0";
      const name = input.cover.blocks.find((block) => block.id === "name")!;
      name.style.color = "#000000";
      name.style.opacity = 0.5;
    }
    if (fixture.startsWith("variant-") && fixture.endsWith("-image")) {
      input.cover.data.foto = images.png;
      input.cv.data.person.foto = images.png;
    }
    if (fixture === "elements-images") {
      const field = {
        id: "custom-picture",
        kind: "image" as const,
        label: "Eigenes Bild",
        text: "",
        src: images.png,
      };
      input.cv.elements.push(field, { ...field, id: "custom-picture-two" });
      input.cv.elements.push({
        ...field,
        id: "custom-caption",
        kind: "text",
        text: "Bild mit nativer Beschriftung",
      });
      input.cv.elementStyles["custom-caption"] = { w: 35, ratio: 1, borderWidth: 0.3 };
      input.cv.elementStyles[field.id] = { w: 25, ratio: 1.25 };
      input.cv.elementStyles["custom-picture-two"] = { w: 20, ratio: 1, radius: 999 };
      input.cover.blocks.push({
        ...structuredClone(input.cover.blocks[0]),
        ...field,
        lines: [],
        style: { ...input.cover.blocks[0].style, w: 25, ratio: 1.25, hidden: false },
      });
      input.cover.customFieldIds!.push(field.id);
    }
    if (fixture === "paper-colors") {
      input.cover.colors.bg = "#f4e9da";
      input.letter.design.paperColor = "#e8f0f4";
      input.cv.design.paperColor = "#eaf2e5";
      input.cover.data.foto = images.png;
      input.cv.data.person.foto = images.png;
    }
    if (fixture.startsWith("offsets-")) {
      const sign = fixture.endsWith("negative") ? -1 : fixture.endsWith("positive") ? 1 : 0;
      Object.assign(input.settings.chrome!.shared, {
        headerContentOffsetYMm: sign * 12,
        footerContentOffsetYMm: sign * 8,
        letterRecipientOffsetYMm: sign * 12,
      });
    }
    if (images[fixture]) {
      input.cover.data.foto = images[fixture];
      input.cv.data.person.foto = images[fixture];
      const photo = input.cover.blocks.find((block) => block.kind === "photo");
      if (!photo)
        input.cover.blocks.unshift({
          id: "foto",
          label: "Portrait",
          kind: "photo",
          lines: [],
          style: { ...input.cover.blocks[0].style, w: 40 },
        });
    }
    if (fixture === "chrome") {
      input.settings.chrome = structuredClone(DEFAULT_DOSSIER_CHROME_STATE);
      input.settings.chrome.shared.headerMode = "contact";
      input.settings.chrome.shared.headerFontSizePt = 9;
      input.settings.chrome.shared.headerDifferentFirstPage = true;
      input.settings.chrome.shared.headerContinuationMode = "compact";
      input.settings.chrome.shared.headerBackgroundColor = "#e9eff4";
      input.settings.chrome.shared.footerMode = "details";
    }
    if (fixture.startsWith("columns-")) {
      const sentence =
        "Native Spalten bleiben editierbar. Ä ö ü é è à – — ·. Ich plane Aufgaben sorgfältig, arbeite zuverlässig und lerne gerne Neues. ";
      input.letter.data.richTextHtml = `<div data-align="left">Vor dem Spaltenabschnitt fliesst dieser Absatz über die volle Textbreite der Seite.</div><div data-columns="${fixture === "columns-three" ? 3 : 2}">${sentence.repeat(fixture.startsWith("columns-long") ? 90 : 6)}</div><div>Nach dem Spaltenabschnitt fliesst dieser Absatz wieder über die volle Textbreite der Seite.</div>`;
      if (fixture.endsWith("chrome")) {
        input.settings.chrome = structuredClone(DEFAULT_DOSSIER_CHROME_STATE);
        input.settings.chrome.shared.headerMode = "contact";
        input.settings.chrome.shared.headerDifferentFirstPage = true;
        input.settings.chrome.shared.headerContinuationMode = "compact";
        input.settings.chrome.shared.headerTextLayout = "inline";
        input.letter.design.chromeContent = {
          headerTitleEnabled: true,
          headerTitle: "Letter header",
        };
        input.cv.design.chromeContent = { headerTitleEnabled: true, headerTitle: "CV header" };
      }
    }
    if (fixture.startsWith("photo-")) {
      input.cover.data.foto = images.jpeg;
      input.cv.data.person.foto = images.jpeg;
      const photo = input.cover.blocks.find((block) => block.kind === "photo");
      if (!photo) throw new Error("Brief photo definition missing");
      photo.style = {
        ...photo.style,
        hidden: false,
        w: 35,
        ratio: 1.25,
        radius: 1.5,
        borderWidth: 0.6,
        borderColor: "#244a61",
      };
      input.settings.cvPhotoPlacement = {
        mode:
          fixture === "photo-left" || fixture === "photo-long-name"
            ? "left"
            : fixture === "photo-free"
              ? "frei"
              : "right",
        widthMm: 35,
        xMm: 155,
        yMm: 25,
        frameColor: "#244a61",
      };
      input.settings.cvPhotoStyle = {
        shape: fixture === "photo-circle" ? "circle" : "portrait",
        zoom: fixture === "photo-zoom" ? 2 : 1,
        x: 25,
        y: 70,
        borderWidth: 0.6,
      };
      if (fixture === "photo-circle") {
        photo.style.ratio = 1;
        photo.style.radius = 999;
      }
      if (fixture === "photo-zoom") {
        photo.style.imgZoom = 2;
        photo.style.imgX = 25;
        photo.style.imgY = 70;
      }
    }
    if (fixture === "half-sections")
      input.cv.data.sectionLayouts = { sprachen: { width: "half" }, hobbys: { width: "half" } };
    if (fixture === "rich-letter")
      input.letter.data.richTextHtml =
        '<div data-align="right"><strong>Fett ä ö ü</strong> und <u>unterstrichen é è à</u></div><div data-align="justify">Ein normaler Absatz mit <em>Kursiv</em> und <span data-letter-text-color="#123456">Farbe</span>.</div><div data-list="bullet">Native Aufzählung</div><table><tbody><tr><td>Linke Zelle</td><td>Rechte Zelle</td></tr></tbody></table>';
    if (fixture === "rich-table-lists")
      input.letter.data.richTextHtml =
        ["bullet", "dash", "plus", "dot"]
          .map((kind) => `<div data-list="${kind}">Liste ${kind}</div>`)
          .join("") +
        "<table><tbody><tr><td><div>Erster Zellabsatz</div><div><strong>Zweiter Zellabsatz</strong></div><table><tbody><tr><td>Verschachtelte Zelle</td></tr></tbody></table></td><td>Rechte Zelle</td></tr><tr><td>Kurze Tabellenzeile</td></tr></tbody></table>";
    if (fixture === "positioned-images")
      input.letter.data.images = [
        { id: "left", src: images.png, side: "left", topMm: 0, widthMm: 20, gapMm: 3 },
        { id: "right", src: images.jpeg, side: "right", topMm: 0, widthMm: 20, gapMm: 3 },
        {
          id: "free",
          src: images["icc-jpeg"],
          side: "right",
          xMm: 65,
          topMm: 40,
          widthMm: 18,
          gapMm: 2,
        },
      ];
    const model = buildDossierDocModel(input);
    const started = performance.now();
    const omittedDecorations: string[] = [];
    const blob = await renderDossierDocx(model, {
      rasterizeDecoration: async (shape) => {
        if (fixture === "elements-artwork-failure")
          throw new Error("Intentional QA decoration failure");
        const result = await page.evaluate(
          async ({ shape, decorationCode }: { shape: DecorativeShape; decorationCode: string }) => {
            const mod = await import(`data:text/javascript;base64,${btoa(decorationCode)}`);
            const asset = await mod.rasterizeDecoration(shape);
            return { ...asset, bytes: Array.from(asset.bytes) };
          },
          { shape, decorationCode },
        );
        return { ...result, bytes: Uint8Array.from(result.bytes) };
      },
      onDecorationFailure: (id, error) => {
        if (fixture === "elements-artwork-failure") {
          omittedDecorations.push(id);
          return;
        }
        throw new Error(`QA decoration failed ${id}`, { cause: error });
      },
      normalizeImage: async (source) => {
        const asset = normalized.get(source);
        if (!asset) throw new Error("Unknown QA image source");
        return asset;
      },
    });
    await writeFile(path.join(out, `${fixture}.docx`), new Uint8Array(await blob.arrayBuffer()));
    const semanticText = [model.cover, model.letter, model.cv]
      .flatMap((part) =>
        walkBlocks([...part.blocks, ...part.header, ...(part.firstHeader ?? []), ...part.footer]),
      )
      .filter((block) => block.kind === "paragraph")
      .flatMap((block) => (block.kind === "paragraph" ? block.runs.map(expectedText) : []));
    const cvPages = isOrbit
      ? ({ "orbit-long-cv": 13, "orbit-timeline": 17, "orbit-magazin": 1, "orbit-long-values": 2 }[
          fixture
        ] ?? 2)
      : isHuman
        ? ({
            "human-long-cv": 15,
            "human-timeline": 20,
            "human-magazin": 1,
            "human-long-values": 3,
          }[fixture] ?? 2)
        : isPrism
          ? ({ "prism-long-cv": 13, "prism-timeline": 15, "prism-magazin": 1 }[fixture] ?? 2)
          : isWarm
            ? ({ "warm-long-cv": 15, "warm-timeline": 18, "warm-magazin": 1 }[fixture] ?? 2)
            : fixture.startsWith("variant-")
              ? fixture.endsWith("-long")
                ? fixture === "variant-minimal-long"
                  ? 13
                  : 12
                : fixture.endsWith("-short")
                  ? 1
                  : 2
              : fixture.startsWith("pagination-")
                ? ["pagination-zero", "pagination-ten"].includes(fixture)
                  ? 9
                  : 10
                : fixture.startsWith("layout-")
                  ? fixture === "layout-settings-long"
                    ? 16
                    : fixture === "layout-entry-overflow"
                      ? 4
                      : fixture === "layout-references-stacked"
                        ? 2
                        : 1
                  : ["fonts-mixed", "fonts-unavailable", "fonts-offline"].includes(fixture)
                    ? 1
                    : fixture === "fonts-long-cv"
                      ? 8
                      : fixture === "elements-long"
                        ? 4
                        : fixture === "elements-shapes" || fixture === "elements-shapes-paper"
                          ? 3
                          : fixture === "elements-page-two"
                            ? 2
                            : fixture === "minimal" || fixture === "empty-optional"
                              ? 1
                              : fixture === "paint-long-cv"
                                ? 11
                                : fixture === "long-cv" || fixture === "photo-long-cv"
                                  ? 10
                                  : fixture === "custom-sections"
                                    ? 3
                                    : 2;
    const letterPages = isOrbit
      ? ({ "orbit-long-letter": 11, "orbit-continuation": 8 }[fixture] ?? 1)
      : isHuman
        ? ({ "human-long-letter": 13, "human-continuation": 9 }[fixture] ?? 1)
        : isPrism
          ? ({ "prism-long-letter": 10, "prism-continuation": 6, "prism-columns": 3 }[fixture] ?? 1)
          : isWarm
            ? ({
                "warm-long-letter": 12,
                "warm-compact-long": 10,
                "warm-continuation": 8,
                "warm-long-sender": 2,
              }[fixture] ?? 1)
            : fixture === "fonts-long-letter"
              ? 7
              : fixture === "paint-long-letter"
                ? 11
                : fixture === "long-letter"
                  ? 9
                  : fixture === "columns-long-chrome"
                    ? 5
                    : fixture === "columns-long"
                      ? 4
                      : 1;
    const coverPages =
      fixture === "orbit-custom"
        ? 2
        : fixture === "elements-long"
          ? 3
          : fixture === "cover-long-list" || fixture === "warm-custom"
            ? 2
            : 1;
    const parts = [model.cover, model.letter, model.cv].map((part, index) => ({
      id: part.id,
      expectedPages: [coverPages, letterPages, cvPages][index],
      contentBoxMm: part.page.margins,
      headerDistanceMm: part.page.headerDistanceMm,
      footerDistanceMm: part.page.footerDistanceMm,
      recipientGapMm:
        part.blocks.find((block) => block.kind === "spacer" && block.id === "letter.recipient.gap")
          ?.heightMm ?? 0,
      recipientText:
        part.blocks
          .find((block) => block.kind === "paragraph" && block.id.startsWith("letter.recipient."))
          ?.runs.map((run) => run.text)
          .join("") ?? "",
      semanticText: walkBlocks(part.blocks).flatMap((block) =>
        block.kind === "paragraph" ? block.runs.map(expectedText) : [],
      ),
      entryProbes: walkBlocks(part.blocks).flatMap((block) => {
        if (block.kind !== "entry") return [];
        const children = walkBlocks(block.blocks);
        const title = children.find(
          (child) => child.kind === "paragraph" && child.id.endsWith(".title"),
        );
        const description = children.find(
          (child) => child.kind === "paragraph" && child.id.endsWith(".description"),
        );
        if (title?.kind !== "paragraph" || description?.kind !== "paragraph") return [];
        const text = title.runs.map((run) => run.text).join("");
        return text.length <= 80
          ? [
              {
                title: text,
                descriptionStart: description.runs
                  .map((run) => run.text)
                  .join("")
                  .slice(0, 40),
              },
            ]
          : [];
      }),
      dateRailProbes: walkBlocks(part.blocks).flatMap((block) => {
        if (block.kind !== "table" || !block.id.endsWith(".dateRail")) return [];
        const cells = block.rows[0].cells;
        const date = cells[0][0],
          title = cells[1][0];
        return date?.kind === "paragraph" && title?.kind === "paragraph"
          ? [
              {
                date: date.runs.map((run) => run.text).join(""),
                title: title.runs.map((run) => run.text).join(""),
                distanceMm: block.columnWidthsMm![0],
              },
            ]
          : [];
      }),
      pagination: part.layout.pagination,
      firstBodyText: part.blocks
        .find((block) => block.kind === "paragraph")
        ?.runs.map((run) => run.text)
        .join(""),
      artwork: part.artwork,
      headerPaintColors:
        (isWarm || isPrism) && part.id !== "cover"
          ? {
              first: [
                ...new Set(
                  (part.firstHeader ?? part.header).flatMap((p) =>
                    p.runs.map((r) => r.style.color),
                  ),
                ),
              ],
              continuation: [
                ...new Set(part.header.flatMap((p) => p.runs.map((r) => r.style.color))),
              ],
            }
          : undefined,
      pageScopedShapes: part.headerShapes ?? [],
      tailProbe:
        (isPrism || isHuman) && part.id === "letter"
          ? {
              closing:
                part.blocks
                  .find((b) => b.kind === "paragraph" && b.id === "letter.closing")
                  ?.runs.map((r) => r.text)
                  .join("") ?? "",
              lastAttachment:
                [...part.blocks]
                  .reverse()
                  .find((b) => b.kind === "paragraph" && b.id.startsWith("letter.attachment:"))
                  ?.runs.map((r) => r.text)
                  .join("") ?? "",
            }
          : undefined,
      paintProbes: isPrism
        ? part.id === "cover"
          ? [
              { xMm: 2, yMm: 40, color: input.cover.colors.primary, repeat: "first" },
              {
                xMm: 200,
                yMm: 20,
                color: input.cover.colors.secondary,
                opacity: 0.94,
                backdrop: input.cover.colors.primary,
                repeat: "first",
              },
              { xMm: 2, yMm: 120, color: input.cover.colors.bg },
            ]
          : part.artwork
              .filter((p) => p.id.includes(".band."))
              .flatMap((paint) => [
                { xMm: 2, yMm: 2, color: paint.fill.color, repeat: paint.repeat },
                {
                  xMm: 205,
                  yMm: 2,
                  color: input[part.id].design.colors.secondary,
                  repeat: paint.repeat,
                },
              ])
        : undefined,
      fontProbes:
        fixture === "fonts-unavailable"
          ? walkBlocks(part.blocks).flatMap((block) =>
              block.kind === "paragraph" && block.id.startsWith("cv.element:font-")
                ? block.runs.map((run) => ({ text: run.text, font: run.style.font }))
                : [],
            )
          : [],
      flowBoxes: walkBlocks(part.blocks).flatMap((block) =>
        block.kind === "table" && block.sourceLayout && block.decoration?.borderWidthMm
          ? [
              {
                id: block.id,
                widthMm: block.widthMm,
                borderWidthMm: block.decoration.borderWidthMm,
              },
            ]
          : [],
      ),
      shapes: (fixture === "elements-artwork-failure" ? [] : walkBlocks(part.blocks))
        .filter((block) => block.kind === "decorative-shape")
        .map((shape) => ({
          ...shape,
          expectedRelativePage: part.blocks.some(
            (block) =>
              block.kind === "group" &&
              block.startPage === 2 &&
              walkBlocks(block.blocks).some((child) => child.id === shape.id),
          )
            ? [coverPages, letterPages, cvPages][index] - 1
            : 0,
        })),
    }));
    manifest.push({
      fixture,
      expectedSections: [model.cover, model.letter, model.cv].reduce(
        (sum, part) => sum + planPartSections(part).length,
        0,
      ),
      expectedImages:
        [model.cover, model.letter, model.cv]
          .flatMap((part) => walkBlocks(part.blocks))
          .filter((block) => block.kind === "image").length +
        (fixture === "elements-artwork-failure" ? [] : [model.cover, model.letter, model.cv])
          .flatMap((part) => walkBlocks(part.blocks))
          .filter((block) => block.kind === "decorative-shape").length +
        parts.reduce(
          (sum, part) =>
            sum +
            Array.from(
              { length: part.expectedPages },
              (_, page) =>
                [...part.artwork, ...part.pageScopedShapes].filter((value) =>
                  artworkApplies(value, page === 0),
                ).length,
            ).reduce((count, value) => count + value, 0),
          0,
        ),
      expectedPages: coverPages + letterPages + cvPages,
      parts,
      bytes: blob.size,
      durationMs: Math.round(performance.now() - started),
      semanticText,
      modelIssues: model.issues,
      fontPolicy: model.fonts,
      omittedDecorations,
    });
  }
  await writeFile(path.join(out, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(
    `Generated ${manifest.length} independent ${isOrbit ? "Orbit" : isHuman ? "Human" : isPrism ? "Prism" : isWarm ? "Warm" : "Brief"} dossiers; canonical browser image normalization passed ${normalized.size} inputs.`,
  );
} finally {
  await browser.close();
}
