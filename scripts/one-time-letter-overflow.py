from pathlib import Path


def replace(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"anchor not found in {path}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))


# LetterCanvas: measure the real fixed-height A4 text layer.
replace(
    "src/components/letter/LetterCanvas.tsx",
    'import { FONT_STACKS, type TemplateId } from "@/components/cover/types";\n',
    'import { useEffect, useRef } from "react";\nimport { FONT_STACKS, type TemplateId } from "@/components/cover/types";\n',
)

replace(
    "src/components/letter/LetterCanvas.tsx",
    '''export function LetterCanvas({\n  data,\n  design,\n  exportMode = false,\n}: {\n  data: LetterData;\n  design: LetterDesign;\n  exportMode?: boolean;\n}) {\n''',
    '''export function LetterCanvas({\n  data,\n  design,\n  exportMode = false,\n  onOverflowChange,\n}: {\n  data: LetterData;\n  design: LetterDesign;\n  exportMode?: boolean;\n  onOverflowChange?: (overflow: boolean) => void;\n}) {\n''',
)

replace(
    "src/components/letter/LetterCanvas.tsx",
    '''  const bodyHtml = data.richTextHtml?.trim()\n    ? letterRichHtml(data.richTextHtml, data.text)\n    : data.text\n      ? plainTextToRichHtml(data.text)\n      : exportMode\n        ? ""\n        : plainTextToRichHtml(placeholder);\n\n  return (\n''',
    '''  const bodyHtml = data.richTextHtml?.trim()\n    ? letterRichHtml(data.richTextHtml, data.text)\n    : data.text\n      ? plainTextToRichHtml(data.text)\n      : exportMode\n        ? ""\n        : plainTextToRichHtml(placeholder);\n  const textLayerRef = useRef<HTMLDivElement>(null);\n\n  useEffect(() => {\n    if (!onOverflowChange) return;\n    const textLayer = textLayerRef.current;\n    if (!textLayer) return;\n\n    const measure = () =>\n      onOverflowChange(textLayer.scrollHeight > textLayer.clientHeight + 1);\n    const frame = requestAnimationFrame(() => requestAnimationFrame(measure));\n    const observer = new ResizeObserver(measure);\n    observer.observe(textLayer);\n    void document.fonts?.ready.then(measure);\n\n    return () => {\n      cancelAnimationFrame(frame);\n      observer.disconnect();\n    };\n  }, [bodyHtml, data, design, onOverflowChange]);\n\n  return (\n''',
)

replace(
    "src/components/letter/LetterCanvas.tsx",
    '''      <div\n        data-letter-text-layer\n        className="absolute flex flex-col"\n''',
    '''      <div\n        ref={textLayerRef}\n        data-letter-text-layer\n        className="absolute flex flex-col"\n''',
)

# Route: surface one clear, non-blocking warning and wire the preview measurement.
replace(
    "src/routes/anschreiben.tsx",
    '  const [panelOpen, setPanelOpen] = useState(true);\n',
    '  const [panelOpen, setPanelOpen] = useState(true);\n  const [letterOverflow, setLetterOverflow] = useState(false);\n',
)

replace(
    "src/routes/anschreiben.tsx",
    '''            <div className="rounded-lg border bg-background p-3 text-xs leading-relaxed text-muted-foreground">\n              Schreibe dein Motivationsschreiben hier. Das Layout bleibt bewusst ruhiger als beim\n              Lebenslauf, damit längerer Text gut lesbar bleibt.\n            </div>\n\n            <div className="rounded-lg border border-primary/25 bg-primary/5 p-3">\n''',
    '''            <div className="rounded-lg border bg-background p-3 text-xs leading-relaxed text-muted-foreground">\n              Schreibe dein Motivationsschreiben hier. Das Layout bleibt bewusst ruhiger als beim\n              Lebenslauf, damit längerer Text gut lesbar bleibt.\n            </div>\n\n            {letterOverflow ? (\n              <div\n                role="alert"\n                className="rounded-lg border border-amber-300/80 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"\n              >\n                <div className="font-semibold">Zu viel Text für eine Seite</div>\n                <div>Dein Motivationsschreiben passt nicht auf eine Seite. Kürze den Text.</div>\n              </div>\n            ) : null}\n\n            <div className="rounded-lg border border-primary/25 bg-primary/5 p-3">\n''',
)

replace(
    "src/routes/anschreiben.tsx",
    '              <LetterCanvas data={data} design={design} />\n',
    '              <LetterCanvas data={data} design={design} onOverflowChange={setLetterOverflow} />\n',
)

# E2E: real geometry must trigger and clear the warning.
replace(
    "tests/e2e/dossier-regression.spec.ts",
    '  test("letter layout controls and Word-like formatting persist", async ({ page }) => {\n',
    '''  test("Motivationsschreiben warns when its A4 text layer overflows and clears after shortening", async ({\n    page,\n  }) => {\n    await seedCoreDossier(page);\n    await page.goto(`${BASE_URL}/anschreiben`, { waitUntil: "domcontentloaded" });\n    await expect(page.getByLabel("Vorname und Nachname")).toHaveValue("Lea Müller");\n\n    const body = page.getByRole("textbox", { name: "Brieftext" });\n    const alert = page.getByRole("alert");\n    await expect(alert).toHaveCount(0);\n\n    await body.fill(\n      Array.from(\n        { length: 55 },\n        (_, index) =>\n          `Absatz ${index + 1}: Ich interessiere mich sehr für diesen Beruf und möchte meine Motivation, Zuverlässigkeit und Lernbereitschaft zeigen.`,\n      ).join("\\n"),\n    );\n\n    await expect(alert).toContainText("Dein Motivationsschreiben passt nicht auf eine Seite");\n    const overflowing = await page\n      .getByLabel("Vorschau Motivationsschreiben")\n      .locator("[data-letter-text-layer]")\n      .evaluate((element) => element.scrollHeight > element.clientHeight + 1);\n    expect(overflowing).toBe(true);\n\n    await body.fill("Ich interessiere mich sehr für die Lehrstelle und freue mich auf ein Gespräch.");\n    await expect(alert).toHaveCount(0);\n  });\n\n  test("letter layout controls and Word-like formatting persist", async ({ page }) => {\n''',
)

print("letter overflow warning migration applied")
