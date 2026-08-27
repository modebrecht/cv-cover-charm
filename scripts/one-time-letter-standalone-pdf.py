from pathlib import Path


def replace(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"anchor not found in {path}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))

# Reuse the exact text-layer PDF pipeline from the combined dossier for a one-page letter export.
pdf = Path("src/lib/dossier-pdf.ts")
text = pdf.read_text()
if "export async function downloadLetterPdf(" not in text:
    text += '''\n\n/** Exportiert nur das Motivationsschreiben als eine A4-Seite mit echter PDF-Textebene. */\nexport async function downloadLetterPdf(\n  page: HTMLElement,\n  fileName: string,\n  meta: DossierPdfMeta,\n): Promise<void> {\n  await document.fonts?.ready;\n  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));\n\n  if (!page.matches("[data-letter-page]")) {\n    throw new Error("Motivationsschreiben konnte nicht für den PDF-Export gefunden werden");\n  }\n\n  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([\n    import("html2canvas-pro"),\n    import("jspdf"),\n  ]);\n  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });\n  pdf.setProperties({\n    title: meta.title,\n    author: meta.author,\n    subject: meta.subject ?? "Motivationsschreiben",\n    keywords: meta.keywords ?? "Bewerbung, Motivationsschreiben, Lehrstelle",\n    creator: meta.author || "Motivationsschreiben",\n  });\n\n  await addRasterPage(pdf, html2canvas, page, true);\n  addLetterTextLayer(pdf, page);\n  downloadBlob(pdf.output("blob"), fileName);\n}\n'''
    pdf.write_text(text)

# Editor: download state, error handling, visible button, and off-screen 1:1 export canvas.
replace(
    "src/routes/anschreiben.tsx",
    'import { LetterTemplatePicker } from "@/components/letter/LetterTemplatePicker";\n',
    'import { LetterTemplatePicker } from "@/components/letter/LetterTemplatePicker";\nimport { downloadLetterPdf } from "@/lib/dossier-pdf";\n',
)
replace(
    "src/routes/anschreiben.tsx",
    '  const [letterOverflow, setLetterOverflow] = useState(false);\n',
    '  const [letterOverflow, setLetterOverflow] = useState(false);\n  const [pdfDownloading, setPdfDownloading] = useState(false);\n  const [pdfError, setPdfError] = useState<string | null>(null);\n',
)
replace(
    "src/routes/anschreiben.tsx",
    '''  const changeTemplate = (next: LetterTemplateId) => {\n    setDesign((current) => ({\n      ...current,\n      template: next,\n      colors: defaultLetterColors(next),\n    }));\n  };\n\n  const syncAllFromTitlePage = () => {\n''',
    '''  const changeTemplate = (next: LetterTemplateId) => {\n    setDesign((current) => ({\n      ...current,\n      template: next,\n      colors: defaultLetterColors(next),\n    }));\n  };\n\n  const downloadMotivationLetter = async () => {\n    if (pdfDownloading || letterOverflow || !letterHasStarted(data)) return;\n    setPdfError(null);\n    setPdfDownloading(true);\n    try {\n      const page = document.querySelector<HTMLElement>(\n        '[data-letter-standalone-export] [data-letter-page]',\n      );\n      if (!page) throw new Error("Exportansicht ist noch nicht bereit");\n      const namePart = data.absenderName\n        .trim()\n        .replace(/\\s+/g, "-")\n        .replace(/[^A-Za-z0-9ÄÖÜäöüß_-]/g, "");\n      await downloadLetterPdf(page, `Motivationsschreiben-${namePart || "Bewerbung"}.pdf`, {\n        title: data.betreff || "Motivationsschreiben",\n        author: data.absenderName.trim(),\n        subject: "Motivationsschreiben",\n        keywords: "Bewerbung, Motivationsschreiben, Lehrstelle",\n      });\n    } catch (error) {\n      setPdfError(error instanceof Error ? error.message : "PDF konnte nicht erstellt werden.");\n    } finally {\n      setPdfDownloading(false);\n    }\n  };\n\n  const syncAllFromTitlePage = () => {\n''',
)
replace(
    "src/routes/anschreiben.tsx",
    '''            {letterOverflow ? (\n              <div\n                role="alert"\n                className="rounded-lg border border-amber-300/80 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"\n              >\n                <div className="font-semibold">Zu viel Text für eine Seite</div>\n                <div>Dein Motivationsschreiben passt nicht auf eine Seite. Kürze den Text.</div>\n              </div>\n            ) : null}\n\n            <div className="rounded-lg border border-primary/25 bg-primary/5 p-3">\n''',
    '''            {letterOverflow ? (\n              <div\n                role="alert"\n                className="rounded-lg border border-amber-300/80 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"\n              >\n                <div className="font-semibold">Zu viel Text für eine Seite</div>\n                <div>Dein Motivationsschreiben passt nicht auf eine Seite. Kürze den Text.</div>\n              </div>\n            ) : null}\n\n            <div className="rounded-lg border bg-background p-3">\n              <button\n                type="button"\n                onClick={downloadMotivationLetter}\n                disabled={pdfDownloading || letterOverflow || !letterHasStarted(data)}\n                className="w-full rounded-md bg-foreground px-4 py-3 text-sm font-semibold text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"\n              >\n                {pdfDownloading\n                  ? "PDF wird erstellt…"\n                  : "Motivationsschreiben als PDF herunterladen"}\n              </button>\n              {pdfError ? (\n                <div role="status" className="mt-2 text-xs text-destructive">\n                  {pdfError}\n                </div>\n              ) : null}\n              {letterOverflow ? (\n                <p className="mt-2 text-[11px] text-muted-foreground">\n                  PDF-Download ist verfügbar, sobald alles auf eine A4-Seite passt.\n                </p>\n              ) : null}\n            </div>\n\n            <div className="rounded-lg border border-primary/25 bg-primary/5 p-3">\n''',
)
replace(
    "src/routes/anschreiben.tsx",
    '''        <main className="min-w-0 flex-1 overflow-auto bg-muted/40 p-3 sm:p-6">\n          <div className="mx-auto w-full max-w-[980px] py-2 sm:py-4">\n            <ScaledPreview max={1}>\n              <LetterCanvas data={data} design={design} onOverflowChange={setLetterOverflow} />\n            </ScaledPreview>\n          </div>\n        </main>\n      </div>\n    </div>\n''',
    '''        <main className="min-w-0 flex-1 overflow-auto bg-muted/40 p-3 sm:p-6">\n          <div className="mx-auto w-full max-w-[980px] py-2 sm:py-4">\n            <ScaledPreview max={1}>\n              <LetterCanvas data={data} design={design} onOverflowChange={setLetterOverflow} />\n            </ScaledPreview>\n          </div>\n        </main>\n\n        <div\n          data-letter-standalone-export\n          className="pointer-events-none fixed left-[-10000px] top-0"\n          aria-hidden="true"\n        >\n          <LetterCanvas data={data} design={design} exportMode />\n        </div>\n      </div>\n    </div>\n''',
)

# E2E: standalone PDF downloads, keeps selectable text, and is blocked on overflow.
test_path = Path("tests/e2e/dossier-regression.spec.ts")
test_text = test_path.read_text()
overflow_header = '  test("Motivationsschreiben warns when its A4 text layer overflows and clears after shortening", async ({\n'
if 'standalone Motivationsschreiben PDF downloads as a one-page text PDF' not in test_text:
    standalone = '''  test("standalone Motivationsschreiben PDF downloads as a one-page text PDF", async ({ page }) => {\n    await seedCoreDossier(page, true);\n    await page.goto(`${BASE_URL}/anschreiben`, { waitUntil: "domcontentloaded" });\n    await expect(page.getByRole("textbox", { name: "Titel / Betreff", exact: true })).toHaveValue(\n      "Bewerbung um eine Lehrstelle als Informatiker/in EFZ",\n    );\n\n    const button = page.getByRole("button", {\n      name: "Motivationsschreiben als PDF herunterladen",\n      exact: true,\n    });\n    await expect(button).toBeEnabled();\n    const downloadPromise = page.waitForEvent("download", { timeout: 90_000 });\n    await button.click();\n    const download = await downloadPromise;\n    expect(download.suggestedFilename()).toMatch(/^Motivationsschreiben-Lea-Müller\\.pdf$/);\n    const path = await download.path();\n    expect(path).not.toBeNull();\n    expect((await stat(path ?? "")).size).toBeGreaterThan(5_000);\n\n    const pdfSource = (await readFile(path ?? "")).toString("latin1");\n    expect(pdfSource).toContain("Bewerbung um eine Lehrstelle als Informatiker/in EFZ");\n    expect(pdfSource).toContain("Guten Tag Herr Weber");\n  });\n\n'''
    if overflow_header not in test_text:
        raise SystemExit("overflow test anchor missing")
    test_text = test_text.replace(overflow_header, standalone + overflow_header, 1)

old = '''    const body = page.getByRole("textbox", { name: "Brieftext" });\n    const alert = page.getByRole("alert");\n    await expect(alert).toHaveCount(0);\n'''
new = '''    const body = page.getByRole("textbox", { name: "Brieftext" });\n    const alert = page.getByRole("alert");\n    const pdfButton = page.getByRole("button", {\n      name: "Motivationsschreiben als PDF herunterladen",\n      exact: true,\n    });\n    await expect(alert).toHaveCount(0);\n    await expect(pdfButton).toBeEnabled();\n'''
if old not in test_text:
    raise SystemExit("overflow body anchor missing")
test_text = test_text.replace(old, new, 1)
old = '''    await expect(alert).toContainText("Dein Motivationsschreiben passt nicht auf eine Seite");\n    const overflowing = await page\n'''
new = '''    await expect(alert).toContainText("Dein Motivationsschreiben passt nicht auf eine Seite");\n    await expect(pdfButton).toBeDisabled();\n    const overflowing = await page\n'''
if old not in test_text:
    raise SystemExit("overflow alert anchor missing")
test_text = test_text.replace(old, new, 1)
old = '''    await body.fill(\n      "Ich interessiere mich sehr für die Lehrstelle und freue mich auf ein Gespräch.",\n    );\n    await expect(alert).toHaveCount(0);\n  });\n'''
new = '''    await body.fill(\n      "Ich interessiere mich sehr für die Lehrstelle und freue mich auf ein Gespräch.",\n    );\n    await expect(alert).toHaveCount(0);\n    await expect(pdfButton).toBeEnabled();\n  });\n'''
if old not in test_text:
    raise SystemExit("overflow shortening anchor missing")
test_text = test_text.replace(old, new, 1)
test_path.write_text(test_text)

print("standalone motivation-letter PDF migration applied")
