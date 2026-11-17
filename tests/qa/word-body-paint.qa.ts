import { expect, test } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { importNativeDossier } from "../e2e/support/native-docx-fixture";
import { DEFAULT_DOSSIER_CHROME_STATE } from "../../src/lib/dossier-chrome";
import { readZipEntries } from "../../src/lib/docx-next/zip";

const out = "artifacts/word-body-paint";

test("compact first-page bands move into the body with identical text flow and semantic images", async ({
  page,
}) => {
  await mkdir(out, { recursive: true });
  await importNativeDossier(page, (project) => {
    project.chrome = structuredClone(DEFAULT_DOSSIER_CHROME_STATE) as typeof project.chrome;
  });
  const before = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  const models = [];
  for (const [preview, name] of [
    [false, "00_Kontrolle_Kopfzeile.docx"],
    [true, "01_Word_Farben_beim_Schreiben.docx"],
  ] as const) {
    const pending = page.waitForEvent("download", { timeout: 90_000 });
    const model = await page.evaluate(async (preview) => {
      const path = "/src/lib/dossier-docx-next-export.ts";
      const lib = await import(path);
      const { blob, model } = await lib.createSavedDossierDocxNext(
        undefined,
        preview ? { compactChromeBodyPaintPreview: true } : undefined,
      );
      const href = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = href;
      a.download = preview ? "body-paint.docx" : "header-paint.docx";
      a.click();
      URL.revokeObjectURL(href);
      return model;
    }, preview);
    await (await pending).saveAs(`${out}/${name}`);
    models.push(model);
    expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).toBe(before);
  }
  const baseline = models[0],
    candidate = models[1];
  for (const part of ["letter", "cv"] as const) {
    expect(candidate[part].firstPageChromePaintOwner).toBe("body");
    delete candidate[part].firstPageChromePaintOwner;
  }
  expect(candidate).toEqual(baseline);
  const pkg = async (name: string) =>
    Object.fromEntries(
      readZipEntries(await readFile(`${out}/${name}`)).map((p) => [p.name, p.bytes]),
    );
  const [a, b] = await Promise.all([
    pkg("00_Kontrolle_Kopfzeile.docx"),
    pkg("01_Word_Farben_beim_Schreiben.docx"),
  ]);
  for (const path of Object.keys(a).filter((p) => p.startsWith("word/media/image-")))
    expect(b[path], path).toEqual(a[path]);
  const decode = (p: Uint8Array) => new TextDecoder().decode(p);
  const textFlow = (xml: string) =>
    xml.replace(/<w:r><w:drawing>[\s\S]*?<\/w:drawing><\/w:r>/g, "");
  expect(textFlow(decode(b["word/document.xml"]))).toBe(textFlow(decode(a["word/document.xml"])));
  for (const part of ["letter", "cv"]) {
    expect(decode(b["word/document.xml"])).toContain(`name="${part}.chrome-paint.first"`);
    expect(decode(b[`word/${part}-header-first.xml`])).not.toContain(
      `name="${part}.chrome-paint.first"`,
    );
    expect(decode(b[`word/${part}-header.xml`])).toContain(
      `name="${part}.page-paint.continuation"`,
    );
  }
  await writeFile(
    `${out}/evidence.json`,
    JSON.stringify(
      {
        scope:
          "Modern Sidebar, default compact chrome, first-page bands in the body with transparent middle; other backgrounds and continuation header ownership unchanged",
        semanticXmlEqual: true,
        semanticImagesByteIdentical: true,
        storedSourceUnchanged: true,
        browser: page.context().browser()!.version(),
      },
      null,
      2,
    ),
  );
  await writeFile(`${out}/baseline-model.json`, JSON.stringify(baseline, null, 2));
});

for (const variant of ["no-photo-cv", "long-letter"] as const)
  test(`${variant} retains its source flow and continuation paint in the body-paint trial`, async ({
    page,
  }) => {
    await importNativeDossier(page, (project) => {
      project.chrome = structuredClone(DEFAULT_DOSSIER_CHROME_STATE) as typeof project.chrome;
      if (variant === "no-photo-cv") Object.assign(project.cv.data.person, { foto: null });
      else
        project.letter.data.text = Array.from(
          { length: 28 },
          (_, i) =>
            `Absatz ${i + 1}: Ich interessiere mich für Informatik und lerne gerne Neues. Bei Aufgaben arbeite ich zuverlässig und sorgfältig. Ich freue mich auf ein persönliches Gespräch.`,
        ).join("\n\n");
    });
    const before = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    const part = variant === "no-photo-cv" ? "cv" : "letter";
    const paths = [];
    for (const preview of [false, true]) {
      const pending = page.waitForEvent("download", { timeout: 90_000 });
      await page.evaluate(
        async ({ part, preview }) => {
          const path = "/src/lib/dossier-docx-next-export.ts";
          await (
            await import(path)
          ).downloadSavedDossierDocxNext(
            part,
            preview ? { compactChromeBodyPaintPreview: true } : undefined,
          );
        },
        { part, preview },
      );
      const name = `${out}/${variant}-${preview ? "body" : "header"}.docx`;
      await (await pending).saveAs(name);
      paths.push(name);
    }
    const xml = await Promise.all(
      paths.map(async (path) =>
        new TextDecoder().decode(
          readZipEntries(await readFile(path)).find((p) => p.name === "word/document.xml")!.bytes,
        ),
      ),
    );
    const textFlow = (xml: string) =>
      xml.replace(/<w:r><w:drawing>[\s\S]*?<\/w:drawing><\/w:r>/g, "");
    expect(textFlow(xml[1])).toBe(textFlow(xml[0]));
    if (variant === "no-photo-cv") expect(xml[1]).not.toContain('name="cv.person.photo"');
    expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).toBe(before);
  });
