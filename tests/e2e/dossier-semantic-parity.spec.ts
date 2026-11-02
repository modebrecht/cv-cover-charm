import { expect, test } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { importNativeDossier, waitForNativeEditorSaved } from "./support/native-docx-fixture";
import { PRODUCT_TEMPLATES } from "./support/dossier-gallery-shared";

const OUT = process.env.SEMANTIC_PARITY_DIR ?? "artifacts/semantic-parity/source";
const sha = () => execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
// Fixed QA scope: cover/letter plus two new crop cases on every dev push.
// Full matrix is opt-in and contains exactly the ten proven CV families.
const crops = [false, true].map((mirrored) => ({
  id: `cv-crop-${mirrored ? "right" : "left"}`,
  part: "cv" as const,
  mirrored,
  long: true,
  zoom: mirrored ? 2.0 : 1.6,
  x: mirrored ? 65 : 30,
  y: mirrored ? 35 : 70,
  entryCount: 18,
  variedText: false,
}));
const ordinary = [17, 18, 19].flatMap((entryCount) =>
  [false, true].map((mirrored) => ({
    id: `cv-${entryCount}-${mirrored ? "right" : "left"}`,
    part: "cv" as const,
    mirrored,
    long: true,
    zoom: 1,
    x: 50,
    y: 50,
    entryCount,
    variedText: false,
  })),
);
const varied = [false, true].map((mirrored) => ({
  id: `cv-18-varied-${mirrored ? "right" : "left"}`,
  part: "cv" as const,
  mirrored,
  long: true,
  zoom: 1,
  x: 50,
  y: 50,
  entryCount: 18,
  variedText: true,
}));
const cases = [
  ...["cover", "letter"].map((part) => ({
    id: part,
    part: part as "cover" | "letter",
    mirrored: false,
    long: false,
    zoom: 1,
    x: 50,
    y: 50,
    entryCount: 18,
    variedText: false,
  })),
  ...(process.env.DOSSIER_QA_SUITE === "full" ? [...ordinary, ...varied] : []),
  ...crops,
];

for (const item of cases)
  test(`${item.id}: production Next/App PDF retain content and photo intent`, async ({ page }) => {
    test.setTimeout(120_000);
    await mkdir(OUT, { recursive: true });
    const photo = await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = 120;
      c.height = 180;
      const g = c.getContext("2d")!;
      g.fillStyle = "#19a867";
      g.fillRect(0, 0, 120, 180);
      g.fillStyle = "#df2638";
      g.fillRect(0, 0, 40, 60);
      g.fillStyle = "#204fc8";
      g.fillRect(80, 120, 40, 60);
      g.fillStyle = "#fff024";
      g.fillRect(40, 60, 40, 60);
      return c.toDataURL("image/png");
    });
    const markers: string[] =
      item.part === "cover"
        ? ["Informatiker/in EFZ", "Lea Müller"]
        : item.part === "letter"
          ? ["Guten Tag Herr Weber", "Freundliche Grüsse", "Lea Müller"]
          : ["Lea Müller", "Sekundarschule", "Herr Thomas Weber"];
    await importNativeDossier(page, (p) => {
      p.cv.data.person.foto = photo;
      p.cover.data.foto = null;
      p.letter.data.images = [];
      p.cv.portableState.mirrored = item.mirrored;
      p.cv.portableState.infoPosition = item.mirrored ? "mirrored" : "standard";
      p.cv.portableState.photoStyle = {
        shape: "portrait",
        zoom: item.zoom,
        x: item.x,
        y: item.y,
        borderWidth: 0,
      };
      if (item.long) {
        p.cv.data.erfahrung = Array.from({ length: item.entryCount }, (_, i) => {
          const marker = `P202Praxis${String(i + 1).padStart(2, "0")}`;
          markers.push(marker);
          return {
            id: `p202-${i}`,
            zeit: "2026",
            titel: marker,
            ort: "Beispiel AG, Hubersdorf",
            beschreibung:
              "variedText" in item && item.variedText
                ? "Support und kleine Automatisierungen. " +
                  "Planung, Abstimmung und Prüfung mit dem Team. Ergebnisse verständlich erklären und Verbesserungen umsetzen. ".repeat(
                    1 + (i % 3),
                  ) +
                  `P217Zusatz${String(i + 1).padStart(2, "0")}. Sorgfältige Dokumentation der Arbeitsschritte.`
                : "Support und kleine Automatisierungen. Zusammenarbeit im Team und sorgfältige Dokumentation der Arbeitsschritte.",
          };
        });
        p.cv.data.referenzen[0].name = "P202Endreferenz";
        markers[markers.indexOf("Herr Thomas Weber")] = "P202Endreferenz";
      }
    });
    const route = { cover: "titelblatt", letter: "anschreiben", cv: "lebenslauf" }[item.part];
    await page.goto(`http://127.0.0.1:4173/${route}`, { waitUntil: "networkidle" });
    await waitForNativeEditorSaved(page);
    const intent = await page.evaluate(async (part) => {
      const m = await import(String("/src/lib/docx-next/app-source.ts"));
      const source = m.captureSavedAppDocxNextSource(part);
      return {
        template: source[part].template ?? source[part].design?.template,
        cvLayout: source.settings.cvLayout,
        sidebarSide: source.settings.sidebarSide,
      };
    }, item.part);
    expect(intent.template).toBe("modern");
    if (item.part === "cv") expect(intent.sidebarSide).toBe(item.mirrored ? "right" : "left");
    const files: { format: string; filename: string; sha256: string }[] = [];
    const row: Record<string, unknown> = {
      ...item,
      sha: sha(),
      exporter: "production DOCX Next",
      markers,
      intent,
      photo: item.part === "cv",
      files,
      status: "OPEN",
    };
    try {
      // Save the PDF even if a separate Next model guard rejects the DOCX.
      for (const format of ["PDF", "DOCX"] as const) {
        await page.getByRole("button", { name: "Download", exact: true }).click();
        const button = page
          .locator("[data-editor-download-menu]")
          .getByRole("menuitem", { name: format, exact: true });
        await expect(button).toBeEnabled();
        const [download] = await Promise.all([
          page.waitForEvent("download", { timeout: 35_000 }),
          button.click(),
        ]);
        const filename = `${item.id}.${format.toLowerCase()}`;
        await download.saveAs(`${OUT}/${filename}`);
        const bytes = await readFile(`${OUT}/${filename}`);
        files.push({ format, filename, sha256: createHash("sha256").update(bytes).digest("hex") });
      }
      row.status = "EXPORTED";
    } catch (error) {
      row.status = "BLOCKED";
      row.reason = String(error);
      row.visibleError = await page.locator('[role="alert"]').allTextContents();
    }
    await writeFile(`${OUT}/${item.id}.json`, JSON.stringify(row, null, 2) + "\n");
    expect(
      row.status,
      JSON.stringify({ id: item.id, reason: row.reason, visibleError: row.visibleError }),
    ).toBe("EXPORTED");
  });

test("39-template Next availability is explicit and separate from export acceptance", async ({
  page,
}) => {
  await importNativeDossier(page);
  const rows = await page.evaluate(
    async (templates) => {
      const m = await import(String("/src/lib/docx-next/app-source.ts"));
      const base = m.captureSavedAppDocxNextSource();
      return templates.map(({ id, name }) => {
        const s = structuredClone(base);
        s.cover.template = id;
        s.letter.design.template = id;
        s.cv.design.template = id;
        try {
          m.assertAppDocxNextSource(s);
          return { id, name, status: "ELIGIBLE", exporter: "production DOCX Next" };
        } catch (error) {
          return {
            id,
            name,
            status: "BLOCKED",
            reason: String(error),
            exporter: "production DOCX Next",
          };
        }
      });
    },
    PRODUCT_TEMPLATES.map(({ id, name }) => ({ id, name })),
  );
  await mkdir(OUT, { recursive: true });
  await writeFile(
    `${OUT}/CATALOG.json`,
    JSON.stringify(
      { sha: sha(), scope: "availability guard only; no 39-template export/fidelity claim", rows },
      null,
      2,
    ) + "\n",
  );
  expect(rows).toHaveLength(39);
  expect(rows.filter((r) => r.status === "ELIGIBLE").map((r) => r.id)).toEqual(["modern"]);
  expect(rows.filter((r) => r.status === "BLOCKED")).toHaveLength(38);
});
