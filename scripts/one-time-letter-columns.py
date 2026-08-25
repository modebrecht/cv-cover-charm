from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"Expected text not found in {path}: {old[:100]!r}")
    file.write_text(text.replace(old, new, 1))


replace_once(
    "src/components/letter/types.ts",
    'export type LetterAlignment = "left" | "right";\n',
    'export type LetterAlignment = "left" | "right";\nexport type LetterBodyColumns = 1 | 2 | 3;\n',
)
replace_once(
    "src/components/letter/types.ts",
    '  font: FontKey;\n  /** Briefspezifische Optionen sind optional, damit alte gespeicherte Designs kompatibel bleiben. */',
    '  font: FontKey;\n  bodyColumns?: LetterBodyColumns;\n  /** Briefspezifische Optionen sind optional, damit alte gespeicherte Designs kompatibel bleiben. */',
)
replace_once(
    "src/components/letter/types.ts",
    '    font: "sans",\n    senderAlign: "left",',
    '    font: "sans",\n    bodyColumns: 1,\n    senderAlign: "left",',
)
replace_once(
    "src/components/letter/types.ts",
    '    font,\n    senderAlign: incoming.senderAlign === "right" ? "right" : "left",',
    '    font,\n    bodyColumns: incoming.bodyColumns === 2 || incoming.bodyColumns === 3 ? incoming.bodyColumns : 1,\n    senderAlign: incoming.senderAlign === "right" ? "right" : "left",',
)

replace_once(
    "src/components/letter/LetterRichTextEditor.tsx",
    '} from "@/components/letter/rich-text";\n',
    '} from "@/components/letter/rich-text";\nimport type { LetterBodyColumns } from "@/components/letter/types";\n',
)
replace_once(
    "src/components/letter/LetterRichTextEditor.tsx",
    '  richTextHtml,\n  onChange,\n}: {\n  text: string;\n  richTextHtml?: string;\n  onChange: (value: { text: string; richTextHtml: string }) => void;\n}) {',
    '  richTextHtml,\n  columns,\n  onColumnsChange,\n  onChange,\n}: {\n  text: string;\n  richTextHtml?: string;\n  columns: LetterBodyColumns;\n  onColumnsChange: (columns: LetterBodyColumns) => void;\n  onChange: (value: { text: string; richTextHtml: string }) => void;\n}) {',
)
replace_once(
    "src/components/letter/LetterRichTextEditor.tsx",
    '''        <button\n          type="button"\n          className={`${toolClass} underline`}\n          aria-label="Unterstrichen"\n          onMouseDown={(event) => event.preventDefault()}\n          onClick={() => command("underline")}\n        >\n          U\n        </button>\n        <button\n          type="button"\n          className={toolClass}\n          aria-label="Trennlinie einfügen"''',
    '''        <button\n          type="button"\n          className={`${toolClass} underline`}\n          aria-label="Unterstrichen"\n          onMouseDown={(event) => event.preventDefault()}\n          onClick={() => command("underline")}\n        >\n          U\n        </button>\n        {([1, 2, 3] as const).map((count) => (\n          <button\n            key={count}\n            type="button"\n            className={`${toolClass} min-w-8 ${\n              columns === count ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""\n            }`}\n            aria-label={`${count} ${count === 1 ? "Spalte" : "Spalten"}`}\n            aria-pressed={columns === count}\n            onMouseDown={(event) => event.preventDefault()}\n            onClick={() => onColumnsChange(count)}\n          >\n            {count}\n          </button>\n        ))}\n        <button\n          type="button"\n          className={toolClass}\n          aria-label="Trennlinie einfügen"''',
)
replace_once(
    "src/components/letter/LetterRichTextEditor.tsx",
    '          onInput={emit}\n          onBlur={() => {',
    '          onInput={emit}\n          style={{ columnCount: columns, columnGap: columns > 1 ? "1.25rem" : undefined }}\n          onBlur={() => {',
)
replace_once(
    "src/components/letter/LetterRichTextEditor.tsx",
    '        Markiere Text und wähle Fett, Kursiv oder Unterstrichen. Mit ─ fügst du an der\n        Cursorposition eine Trennlinie ein.',
    '        Markiere Text und wähle Fett, Kursiv oder Unterstrichen. Mit 1, 2 oder 3 stellst du die\n        Spaltenzahl des Brieftexts ein. Mit ─ fügst du an der Cursorposition eine Trennlinie ein.',
)

replace_once(
    "src/components/letter/LetterCanvas.tsx",
    '  const dateAlign = design.dateAlign ?? "left";\n  const placeholder =',
    '  const dateAlign = design.dateAlign ?? "left";\n  const bodyColumns = design.bodyColumns ?? 1;\n  const placeholder =',
)
replace_once(
    "src/components/letter/LetterCanvas.tsx",
    '''          <div\n            data-letter-pdf-richtext="body"\n            className="text-[10.5pt] leading-[1.55] [&_div]:min-h-[1.55em] [&_p]:min-h-[1.55em] [&_hr]:my-[5mm] [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-current [&_hr]:opacity-50"\n            dangerouslySetInnerHTML={{ __html: bodyHtml }}\n          />''',
    '''          <div\n            data-letter-pdf-richtext="body"\n            data-letter-columns={bodyColumns}\n            className="text-[10.5pt] leading-[1.55] [&_div]:min-h-[1.55em] [&_p]:min-h-[1.55em] [&_hr]:my-[5mm] [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-current [&_hr]:opacity-50"\n            style={{ columnCount: bodyColumns, columnGap: bodyColumns > 1 ? "6mm" : undefined }}\n            dangerouslySetInnerHTML={{ __html: bodyHtml }}\n          />''',
)

replace_once(
    "src/routes/anschreiben.tsx",
    '''                <LetterRichTextEditor\n                  text={data.text}\n                  richTextHtml={data.richTextHtml}\n                  onChange={({ text, richTextHtml }) => patch({ text, richTextHtml })}\n                />''',
    '''                <LetterRichTextEditor\n                  text={data.text}\n                  richTextHtml={data.richTextHtml}\n                  columns={design.bodyColumns ?? 1}\n                  onColumnsChange={(bodyColumns) =>\n                    setDesign((current) => ({ ...current, bodyColumns }))\n                  }\n                  onChange={({ text, richTextHtml }) => patch({ text, richTextHtml })}\n                />''',
)

replace_once(
    "tests/e2e/dossier-regression.spec.ts",
    '''    await page.getByRole("button", { name: "Unterstrichen" }).click();\n    await body.click();''',
    '''    await page.getByRole("button", { name: "Unterstrichen" }).click();\n    await page.getByRole("button", { name: "3 Spalten" }).click();\n    await expect(page.getByRole("button", { name: "3 Spalten" })).toHaveAttribute(\n      "aria-pressed",\n      "true",\n    );\n    await body.click();''',
)
replace_once(
    "tests/e2e/dossier-regression.spec.ts",
    '''    await expect(preview.locator('[data-letter-pdf-richtext="body"] hr')).toHaveCount(1);\n    await expect(page.getByRole("button", { name: "Formatierung entfernen" })).toBeVisible();''',
    '''    await expect(preview.locator('[data-letter-pdf-richtext="body"] hr')).toHaveCount(1);\n    await expect(preview.locator('[data-letter-pdf-richtext="body"]')).toHaveCSS(\n      "column-count",\n      "3",\n    );\n    await expect(page.getByRole("button", { name: "Formatierung entfernen" })).toBeVisible();''',
)
replace_once(
    "tests/e2e/dossier-regression.spec.ts",
    '''          ruleAfterRecipient: true,\n        },''',
    '''          ruleAfterRecipient: true,\n          bodyColumns: 3,\n        },''',
)
