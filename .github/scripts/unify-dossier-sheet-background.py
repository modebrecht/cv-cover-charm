from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, got {count}")
    return text.replace(old, new, 1)


letter_path = Path("src/components/letter/LetterCanvas.tsx")
cv_path = Path("src/components/cv/CvCanvas.tsx")
shared_path = Path("src/components/dossier/DossierSheetBackground.tsx")
test_path = Path("tests/unit/dossier-sheet-background.test.tsx")
workflow_path = Path(".github/workflows/unify-dossier-sheet-background.yml")
script_path = Path(".github/scripts/unify-dossier-sheet-background.py")

letter = letter_path.read_text()
start = letter.index("type LetterLayout = {")
end = letter.index("function Lines({")
shared = letter[start:end]

shared = replace_once(shared, "type LetterLayout = {", "export type LetterLayout = {", "export LetterLayout")
shared = replace_once(
    shared,
    "function layoutFor(template: LetterTemplateId): LetterLayout {",
    "export function letterLayoutFor(template: LetterTemplateId): LetterLayout {",
    "export letterLayoutFor",
)
shared = shared.replace("layoutFor(", "letterLayoutFor(")
shared = replace_once(
    shared,
    "function FreshLetterSignature({",
    "function DossierSheetSignature({",
    "rename signature function",
)
shared = shared.replace("<FreshLetterSignature", "<DossierSheetSignature")
shared = replace_once(
    shared,
    "function LetterBackground({ design }: { design: LetterDesign }) {\n  const { template, colors } = design;",
    "export function DossierSheetBackground({\n  template,\n  colors,\n}: {\n  template: LetterTemplateId;\n  colors: Record<string, string>;\n}) {",
    "shared background signature",
)
shared = shared.replace(
    'data-letter-background="brief"',
    'data-letter-background="brief"\n        data-dossier-sheet-background="brief"',
)
# Every non-brief branch gets the same stable marker. The top-level divs are all
# positioned containers, so the attribute is safe and makes parity testable.
shared = shared.replace(
    'className="absolute inset-0 overflow-hidden"',
    'data-dossier-sheet-background={template}\n        className="absolute inset-0 overflow-hidden"',
)

shared_file = '''import { cvPalette, onColorRoles } from "@/components/cv/palette";\nimport type { LetterTemplateId } from "@/components/letter/types";\n\n/**\n * One visual sheet background for the complete dossier. CV and Anschreiben\n * render this exact component so template motifs cannot silently diverge.\n * Only the standalone `brief` variant is intentionally plain white.\n */\n''' + shared
shared_path.write_text(shared_file)

# LetterCanvas keeps text flow/layout responsibilities and consumes the shared
# visual background + layout metadata from the dossier layer.
letter = letter[:start] + letter[end:]
letter = replace_once(
    letter,
    'import { FONT_STACKS, type TemplateId } from "@/components/cover/types";',
    'import { FONT_STACKS } from "@/components/cover/types";',
    "letter cover import",
)
letter = replace_once(
    letter,
    'import { cvPalette, onColorRoles } from "@/components/cv/palette";',
    'import { cvPalette } from "@/components/cv/palette";',
    "letter palette import",
)
letter = replace_once(
    letter,
    'import { effectiveDossierFont } from "@/lib/dossier-theme";',
    'import { effectiveDossierFont } from "@/lib/dossier-theme";\nimport { DossierSheetBackground, letterLayoutFor } from "@/components/dossier/DossierSheetBackground";',
    "shared background import",
)
letter = letter.replace("layoutFor(", "letterLayoutFor(")
letter = replace_once(
    letter,
    "      <LetterBackground design={design} />",
    "      <DossierSheetBackground template={design.template} colors={design.colors} />",
    "letter shared background usage",
)
letter_path.write_text(letter)

# CV keeps its own writing surface/content geometry, but the actual template
# ground is now the same component used by the Anschreiben.
cv = cv_path.read_text()
cv = replace_once(
    cv,
    'import { CoverBackground } from "@/components/cover/CoverBackground";',
    'import { DossierSheetBackground } from "@/components/dossier/DossierSheetBackground";',
    "cv shared background import",
)
old_background = '<CoverBackground template={design.template} colors={design.colors} />'
count = cv.count(old_background)
if count != 2:
    raise SystemExit(f"cv background usage: expected 2 matches, got {count}")
cv = cv.replace(
    old_background,
    '<DossierSheetBackground template={design.template} colors={design.colors} />',
)
cv = replace_once(
    cv,
    '      data-dossier-document="cv"\n      data-cv-layout={layout}',
    '      data-dossier-document="cv"\n      data-cv-template={design.template}\n      data-cv-layout={layout}',
    "cv template marker",
)
cv_path.write_text(cv)

# A small source-level contract: every selectable dossier template gets a
# non-brief shared sheet background. Brief remains the explicit white escape.
test_path.write_text('''import { describe, expect, test } from "bun:test";\nimport { createElement } from "react";\nimport { renderToStaticMarkup } from "react-dom/server";\nimport { DossierSheetBackground } from "../../src/components/dossier/DossierSheetBackground";\nimport { TEMPLATES } from "../../src/components/cover/types";\nimport { defaultLetterColors } from "../../src/components/letter/types";\n\ndescribe("shared dossier sheet background", () => {\n  test("every dossier template renders the shared non-brief background", () => {\n    for (const { id } of TEMPLATES) {\n      const markup = renderToStaticMarkup(\n        createElement(DossierSheetBackground, { template: id, colors: defaultLetterColors(id) }),\n      );\n      expect(markup).toContain(`data-dossier-sheet-background="${id}"`);\n      expect(markup).not.toContain('data-dossier-sheet-background="brief"');\n    }\n  });\n\n  test("Brief remains the deliberate plain-white alternative", () => {\n    const markup = renderToStaticMarkup(\n      createElement(DossierSheetBackground, { template: "brief", colors: defaultLetterColors("brief") }),\n    );\n    expect(markup).toContain('data-dossier-sheet-background="brief"');\n    expect(markup).toContain("bg-white");\n  });\n});\n''')

# One-shot workflow removes its own scaffolding in the real refactor commit.
workflow_path.unlink()
script_path.unlink()
