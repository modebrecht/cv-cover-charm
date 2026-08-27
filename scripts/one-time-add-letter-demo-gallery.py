from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"missing patch anchor: {label}")
    if text.count(old) != 1:
        raise SystemExit(f"ambiguous patch anchor: {label} ({text.count(old)})")
    return text.replace(old, new, 1)


# ---------------------------------------------------------------------------
# Motivationsschreiben: matching local example data
# ---------------------------------------------------------------------------
path = Path("src/components/letter/types.ts")
text = path.read_text()
anchor = 'export const DEFAULT_LETTER_BEILAGEN = ["Lebenslauf", "Zeugnis"] as const;\n\n'
demo = '''export const DEFAULT_LETTER_BEILAGEN = ["Lebenslauf", "Zeugnis"] as const;\n\nexport const DEMO_LETTER: LetterData = {\n  absenderName: "Lea Müller",\n  absenderAdresse: "Dorfstrasse 12",\n  absenderPlzOrt: "4535 Hubersdorf",\n  absenderTelefon: "+41 79 123 45 67",\n  absenderEmail: "lea.mueller@example.ch",\n  empfaengerFirma: "Beispiel AG",\n  empfaengerName: "Herr Thomas Weber",\n  empfaengerAdresse: "Industriestrasse 8",\n  empfaengerPlzOrt: "4500 Solothurn",\n  ort: "Hubersdorf",\n  datum: "15.11.2026",\n  betreff: "Bewerbung um eine Lehrstelle als Informatiker/in EFZ",\n  anrede: "Guten Tag Herr Weber",\n  text:\n    "Die Informatik begeistert mich, weil ich gerne logisch denke, Probleme löse und Neues ausprobiere. Deshalb bewerbe ich mich mit grossem Interesse um die Lehrstelle als Informatikerin EFZ bei der Beispiel AG.\\n\\nIn der Schule arbeite ich besonders gerne an Aufgaben, bei denen ich selbstständig Lösungen entwickeln kann. Ich bin zuverlässig, lerne schnell und arbeite gerne im Team.\\n\\nGerne möchte ich Ihr Unternehmen und den Beruf bei einem persönlichen Gespräch oder einer Schnupperlehre näher kennenlernen. Ich freue mich über Ihre Rückmeldung.",\n  richTextHtml: "",\n  gruss: "Freundliche Grüsse",\n  unterschrift: "Lea Müller",\n  showBeilagen: true,\n  beilagen: [...DEFAULT_LETTER_BEILAGEN],\n};\n\n'''
text = replace_once(text, anchor, demo, "letter demo data")
path.write_text(text)


# ---------------------------------------------------------------------------
# Motivationsschreiben UI: same sample-data action as cover and CV.
# ---------------------------------------------------------------------------
path = Path("src/routes/anschreiben.tsx")
text = path.read_text()
text = replace_once(
    text,
    'import { FileDown, History } from "lucide-react";',
    'import { FileDown, History, Sparkles } from "lucide-react";',
    "letter demo icon import",
)
text = replace_once(
    text,
    '  DEFAULT_LETTER_BEILAGEN,\n  EMPTY_LETTER,',
    '  DEFAULT_LETTER_BEILAGEN,\n  DEMO_LETTER,\n  EMPTY_LETTER,',
    "letter demo data import",
)
text = replace_once(
    text,
    '  const [historyOpen, setHistoryOpen] = useState(false);\n  const [history, setHistory] = useState<Snapshot[]>([]);',
    '  const [historyOpen, setHistoryOpen] = useState(false);\n  const [confirmDemo, setConfirmDemo] = useState(false);\n  const [history, setHistory] = useState<Snapshot[]>([]);',
    "letter demo confirmation state",
)
text = replace_once(
    text,
    '''      if (!menuRef.current?.contains(event.target as Node)) {\n        setMenuOpen(false);\n        setHistoryOpen(false);\n      }''',
    '''      if (!menuRef.current?.contains(event.target as Node)) {\n        setMenuOpen(false);\n        setHistoryOpen(false);\n        setConfirmDemo(false);\n      }''',
    "letter outside click closes demo confirmation",
)
text = replace_once(
    text,
    '''  useEffect(() => {\n    if (!menuOpen) setHistoryOpen(false);\n  }, [menuOpen]);''',
    '''  useEffect(() => {\n    if (!menuOpen) {\n      setHistoryOpen(false);\n      setConfirmDemo(false);\n    }\n  }, [menuOpen]);''',
    "letter closed menu resets submenus",
)
restore_anchor = '''  const restoreSnapshot = (snap: Snapshot) => {'''
load_demo = '''  const loadDemo = () => {\n    keepSnapshot("Vor den Beispieldaten", true);\n    setData({\n      ...DEMO_LETTER,\n      beilagen: [...(DEMO_LETTER.beilagen ?? DEFAULT_LETTER_BEILAGEN)],\n    });\n    setMenuOpen(false);\n    setConfirmDemo(false);\n    setTransferNote({ kind: "ok", text: "Beispieldaten eingefügt" });\n  };\n\n'''
text = replace_once(text, restore_anchor, load_demo + restore_anchor, "letter load demo handler")
history_button = '''              <button\n                type="button"\n                onClick={() => setHistoryOpen((value) => !value)}\n                disabled={history.length === 0}\n                className="flex w-full items-center justify-between border-t px-3 py-2 text-left text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-45"\n              >\n                <EditorMenuLabel icon={History}>Früheren Stand laden</EditorMenuLabel>\n                <span className="text-xs text-muted-foreground">{history.length}</span>\n              </button>'''
demo_menu = '''              {confirmDemo ? (\n                <div className="flex items-center gap-1 border-t bg-accent/40 px-3 py-2">\n                  <span className="mr-auto text-xs font-medium">Beispieldaten übernehmen?</span>\n                  <button\n                    type="button"\n                    onClick={loadDemo}\n                    className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"\n                  >\n                    Ja\n                  </button>\n                  <button\n                    type="button"\n                    onClick={() => setConfirmDemo(false)}\n                    className="rounded-md border border-input px-2 py-1 text-xs font-medium hover:bg-accent"\n                  >\n                    Nein\n                  </button>\n                </div>\n              ) : (\n                <button\n                  type="button"\n                  onClick={() => setConfirmDemo(true)}\n                  className="flex w-full items-center border-t px-3 py-2 text-left text-sm hover:bg-accent"\n                >\n                  <EditorMenuLabel icon={Sparkles}>Beispieldaten übernehmen</EditorMenuLabel>\n                </button>\n              )}\n''' + history_button
text = replace_once(text, history_button, demo_menu, "letter sample-data menu item")
path.write_text(text)


# ---------------------------------------------------------------------------
# Existing menu regression now expects the local sample-data action in letter.
# ---------------------------------------------------------------------------
path = Path("tests/e2e/dossier-regression.spec.ts")
text = path.read_text()
text = replace_once(
    text,
    '''        await expect(menu.locator("[data-editor-menu-label]")).toHaveText([\n          item.ownPdf,\n          "Früheren Stand laden",\n        ]);''',
    '''        await expect(menu.locator("[data-editor-menu-label]")).toHaveText([\n          item.ownPdf,\n          "Beispieldaten übernehmen",\n          "Früheren Stand laden",\n        ]);''',
    "letter menu regression sample item",
)
path.write_text(text)


# ---------------------------------------------------------------------------
# Persistent heavy QA: real UI demo path + downloadable PDF gallery.
# ---------------------------------------------------------------------------
gallery_test = r'''import { expect, test, type Page } from "@playwright/test";
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { TEMPLATES, type TemplateId } from "../../src/components/cover/types";

const BASE_URL = "http://127.0.0.1:4173";
const GALLERY_DIR = process.env.GALLERY_DIR ?? "artifacts/dossier-gallery";

async function waitEditorReady(page: Page) {
  const toggle = page.getByRole("button", { name: "Download", exact: true });
  await expect(toggle).toHaveAttribute("data-editor-ready", "true", { timeout: 15_000 });
  return toggle;
}

async function loadDemoThroughUi(page: Page, route: string) {
  await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });
  const toggle = await waitEditorReady(page);
  await toggle.click();
  const demo = page.getByRole("button", { name: "Beispieldaten übernehmen", exact: true });
  await expect(demo).toBeVisible();
  await demo.click();
  await page.getByRole("button", { name: "Ja", exact: true }).click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await page.waitForTimeout(550);
}

async function downloadWholeDossier(page: Page, fileName: string) {
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  const card = page.getByRole("button", { name: /Gesamtdossier herunterladen/ });
  await expect(card).toContainText("Dossier prüfen & herunterladen", { timeout: 15_000 });
  await card.click();

  const dialog = page.getByRole("dialog", { name: "Dossier herunterladen" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Titelblatt, Motivationsschreiben");
  const button = dialog.getByRole("button", { name: "Dossier herunterladen" });
  await expect(button).toBeEnabled({ timeout: 30_000 });

  const downloadPromise = page.waitForEvent("download", { timeout: 120_000 });
  await button.click();
  const download = await downloadPromise;
  const tempPath = await download.path();
  expect(tempPath).not.toBeNull();

  await mkdir(GALLERY_DIR, { recursive: true });
  const target = join(GALLERY_DIR, fileName);
  await copyFile(tempPath ?? "", target);
  expect((await stat(target)).size).toBeGreaterThan(10_000);

  const source = (await readFile(target)).toString("latin1");
  expect(source).toContain("Bewerbung um eine Lehrstelle als Informatiker/in EFZ");
  expect(source).toContain("Guten Tag Herr Weber");
  return target;
}

function safeName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

test("UI sample dossier downloads and all motivation-letter templates produce review PDFs", async ({
  page,
}) => {
  test.setTimeout(25 * 60_000);
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());

  // Real student path: every workspace fills itself through its visible UI.
  await loadDemoThroughUi(page, "/titelblatt");
  await loadDemoThroughUi(page, "/anschreiben");
  await loadDemoThroughUi(page, "/lebenslauf");

  const stored = await page.evaluate(() => ({
    cover: JSON.parse(localStorage.getItem("titelblatt:v3") ?? "null"),
    letter: JSON.parse(localStorage.getItem("anschreiben:v1") ?? "null"),
    cv: JSON.parse(localStorage.getItem("lebenslauf:v1") ?? "null"),
  }));
  expect(stored.cover?.data?.vorname).toBe("Lea");
  expect(stored.letter?.data?.unterschrift).toBe("Lea Müller");
  expect(stored.cv?.data?.person?.vorname).toBe("Lea");

  const manifest: string[] = [
    "Gesamtdossier PDF Galerie",
    "",
    "00-Beispieldossier-E2E.pdf | echter UI-E2E: Titelblatt + Motivationsschreiben + Lebenslauf per Beispieldaten übernehmen",
  ];
  await downloadWholeDossier(page, "00-Beispieldossier-E2E.pdf");

  const cases: Array<{
    label: string;
    letterTemplate: "brief" | TemplateId;
    coverTemplate: TemplateId;
    cvTemplate: TemplateId;
  }> = [
    {
      label: "Brief",
      letterTemplate: "brief",
      coverTemplate: "klassisch",
      cvTemplate: "klassisch",
    },
    ...TEMPLATES.map((template) => ({
      label: template.name,
      letterTemplate: template.id,
      coverTemplate: template.id,
      cvTemplate: template.id === "colorful" ? ("blockig" as const) : template.id,
    })),
  ];

  expect(cases).toHaveLength(20);

  for (const [index, item] of cases.entries()) {
    await page.evaluate(
      ({ base, letterTemplate, coverTemplate, cvTemplate }) => {
        const cover = structuredClone(base.cover);
        const letter = structuredClone(base.letter);
        const cv = structuredClone(base.cv);

        cover.template = coverTemplate;
        letter.design.template = letterTemplate;
        letter.design.colors =
          letterTemplate === "brief"
            ? {
                bg: "#ffffff",
                ink: "#111111",
                primary: "#111111",
                secondary: "#111111",
                accent: "#111111",
                cvInk: "#111111",
                cvMuted: "#4b5563",
                cvHeading: "#111111",
              }
            : { ...(cover.colors?.[letterTemplate] ?? letter.design.colors) };
        cv.design.template = cvTemplate;
        cv.design.colors = { ...(cover.colors?.[cvTemplate] ?? cv.design.colors) };

        localStorage.setItem("titelblatt:v3", JSON.stringify(cover));
        localStorage.setItem("anschreiben:v1", JSON.stringify(letter));
        localStorage.setItem("lebenslauf:v1", JSON.stringify(cv));
      },
      {
        base: stored,
        letterTemplate: item.letterTemplate,
        coverTemplate: item.coverTemplate,
        cvTemplate: item.cvTemplate,
      },
    );

    const number = String(index + 1).padStart(2, "0");
    const fileName = `${number}-${safeName(item.label)}.pdf`;
    await downloadWholeDossier(page, fileName);
    manifest.push(
      `${fileName} | Titelblatt=${item.coverTemplate} | Motivationsschreiben=${item.letterTemplate} | CV=${item.cvTemplate}`,
    );
  }

  manifest.push(
    "",
    "Hinweis: Colorful ist beim CV historisch stillgelegt; deshalb nutzt die Colorful-Gesamtdossier-PDF für den CV die Vorlage Blockig.",
  );
  await writeFile(join(GALLERY_DIR, "MANIFEST.txt"), `${manifest.join("\n")}\n`, "utf8");

  const files = await import("node:fs/promises").then(({ readdir }) => readdir(GALLERY_DIR));
  expect(files.filter((file) => file.toLowerCase().endsWith(".pdf"))).toHaveLength(21);
  expect(files).toContain("MANIFEST.txt");
});
'''
Path("tests/e2e/dossier-gallery.spec.ts").write_text(gallery_test)


gallery_workflow = r'''name: Dossier PDF Gallery

on:
  workflow_dispatch:
  push:
    branches:
      - feature/anschreiben-dossier
    paths:
      - .github/workflows/dossier-pdf-gallery.yml
      - tests/e2e/dossier-gallery.spec.ts

permissions:
  contents: read

jobs:
  gallery:
    runs-on: ubuntu-latest
    timeout-minutes: 35
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Install Playwright runner
        run: npm install --no-save --no-package-lock @playwright/test@1.55.0

      - name: Unit tests
        run: bun test tests/unit

      - name: Production build
        run: bun run build

      - name: Install Chromium
        run: npx playwright install --with-deps chromium

      - name: Start application
        shell: bash
        run: |
          bun run dev -- --host 127.0.0.1 --port 4173 > /tmp/cv-cover-charm.log 2>&1 &
          echo $! > /tmp/cv-cover-charm.pid
          for attempt in {1..60}; do
            curl --fail --silent http://127.0.0.1:4173/ > /dev/null && exit 0
            sleep 1
          done
          cat /tmp/cv-cover-charm.log
          exit 1

      - name: Generate complete dossier PDF gallery
        env:
          GALLERY_DIR: artifacts/dossier-gallery
        run: npx playwright test tests/e2e/dossier-gallery.spec.ts --reporter=line --workers=1

      - name: Show generated files
        if: success()
        run: find artifacts/dossier-gallery -maxdepth 1 -type f -printf '%f\n' | sort

      - name: Upload PDF gallery ZIP
        if: success()
        uses: actions/upload-artifact@v4
        with:
          name: gesamtdossier-pdf-galerie
          path: artifacts/dossier-gallery
          if-no-files-found: error
          retention-days: 14

      - name: Show application log on failure
        if: failure()
        run: cat /tmp/cv-cover-charm.log || true

      - name: Stop application
        if: always()
        shell: bash
        run: |
          if [ -f /tmp/cv-cover-charm.pid ]; then kill "$(cat /tmp/cv-cover-charm.pid)" || true; fi
'''
Path(".github/workflows/dossier-pdf-gallery.yml").write_text(gallery_workflow)
