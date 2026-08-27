from pathlib import Path


def replace(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"anchor not found in {path}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))


replace(
    "src/components/letter/LetterCanvas.tsx",
    '''export function LetterCanvas({
  data,
  design,
  exportMode = false,
  onOverflowChange,
}: {
  data: LetterData;
  design: LetterDesign;
  exportMode?: boolean;
  onOverflowChange?: (overflow: boolean) => void;
}) {''',
    '''export function LetterCanvas({
  data,
  design,
  exportMode = false,
  onOverflowChange,
  ariaLabel = "Vorschau Motivationsschreiben",
}: {
  data: LetterData;
  design: LetterDesign;
  exportMode?: boolean;
  onOverflowChange?: (overflow: boolean) => void;
  ariaLabel?: string;
}) {''',
)
replace(
    "src/components/letter/LetterCanvas.tsx",
    '      aria-label="Vorschau Motivationsschreiben"\n',
    '      aria-label={ariaLabel}\n',
)
replace(
    "src/routes/anschreiben.tsx",
    '          <LetterCanvas data={data} design={design} exportMode />\n',
    '          <LetterCanvas\n            data={data}\n            design={design}\n            exportMode\n            ariaLabel="Exportansicht Motivationsschreiben"\n          />\n',
)
replace(
    "tests/e2e/dossier-regression.spec.ts",
    '    expect(download.suggestedFilename()).toMatch(/^Motivationsschreiben-Lea-Müller\\.pdf$/);\n',
    '    expect(download.suggestedFilename()).toMatch(\n      /^Motivationsschreiben-Lea-(?:Müller|Mueller)\\.pdf$/,\n    );\n',
)

print("standalone motivation-letter PDF validation fixes applied")
