from pathlib import Path
import re


def replace_once(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing target in {path}: {old[:80]!r}")
    p.write_text(text.replace(old, new, 1))

# 1) Register Brief in the shared runtime template catalogue without widening the
# legacy persisted TemplateId union (same compatibility strategy as fresh templates).
replace_once(
    "src/components/cover/types.ts",
    'export const TEMPLATES: TemplateDefinition[] = [\n  {\n    id: "klassisch",',
    '''export const TEMPLATES: TemplateDefinition[] = [\n  {\n    id: "brief" as TemplateId,\n    name: "Brief",\n    description: "Reinweisses Papier, schwarze Typografie, ohne Gestaltungselemente",\n    slots: [\n      { key: "bg", label: "Papier", default: "#ffffff" },\n      { key: "ink", label: "Text", default: "#111111" },\n      { key: "primary", label: "Hauptfarbe", default: "#111111" },\n      { key: "accent", label: "Akzent", default: "#111111" },\n    ],\n  },\n  {\n    id: "klassisch",''',
)

# 2) The letter picker no longer needs a one-off Brief button: it now consumes
# exactly the same shared catalogue as cover and CV.
p = Path("src/components/letter/LetterTemplatePicker.tsx")
text = p.read_text()
pattern = re.compile(r'''\n      <button\n        type="button"\n        onClick=\{\(\) => onChange\("brief"\)\}\n        aria-pressed=\{value === "brief"\}\n        title="Klassischer Brief auf reinweissem Papier ohne Gestaltungselemente"\n        className=\{`\$\{baseClass\} \$\{\n          value === "brief"\n            \? "border-foreground bg-accent"\n            : "border-input hover:border-foreground/40 hover:bg-accent/40"\n        \}`\}\n      >\n        Brief\n      </button>''')
text2, count = pattern.subn("", text, count=1)
if count != 1:
    raise SystemExit(f"expected one special Brief button, found {count}")
p.write_text(text2)

# 3) Give the title page a clean typography-only Brief layout. Reuse the proven
# Modern geometry, but strip badge/rule/decorative color treatment.
replace_once(
    "src/components/cover/layouts-base.ts",
    '  const { kicker, fullName, kontakt, empfaenger, ortDatum } = common(data);\n  const font: BlockStyle["font"] = template === "klassisch" ? "serif" : "sans";\n',
    '''  const { kicker, fullName, kontakt, empfaenger, ortDatum } = common(data);\n\n  if ((template as string) === "brief") {\n    return defsFor("modern", data)\n      .filter((definition) => definition.id !== "trenner")\n      .map((definition) => ({\n        ...definition,\n        style: {\n          ...definition.style,\n          color: "ink",\n          bg: null,\n          ...(definition.kind === "photo" ? { radius: 0, fill: "bg" } : {}),\n        },\n      }));\n  }\n\n  const font: BlockStyle["font"] = template === "klassisch" ? "serif" : "sans";\n''',
)

# 4) Title-page surface for Brief is deliberately pure white.
replace_once(
    "src/components/cover/CoverBackground.tsx",
    '  // Classic: the inset document frame is structural.\n',
    '''  if ((template as string) === "brief") {\n    return (\n      <div\n        data-cover-template="brief"\n        className="absolute inset-0 bg-white"\n        style={{ backgroundColor: "#ffffff" }}\n        aria-hidden="true"\n      />\n    );\n  }\n\n  // Classic: the inset document frame is structural.\n''',
)

# 5) CV Brief uses normal document margins and no inherited Classic frame inset.
replace_once(
    "src/components/cv/archetype.ts",
    'export function cvFrameFor(template: TemplateId): CvFrame {\n  return FRAMES[template] ?? FRAMES.klassisch;\n}',
    '''export function cvFrameFor(template: TemplateId): CvFrame {\n  if ((template as string) === "brief") return quiet(0);\n  return FRAMES[template] ?? FRAMES.klassisch;\n}''',
)

# 6) Shared-background unit contract: shared catalogue now intentionally contains Brief.
replace_once(
    "tests/unit/dossier-sheet-background.test.tsx",
    '    for (const { id } of TEMPLATES) {\n      const markup = markupFor(id);',
    '    for (const { id } of TEMPLATES.filter(({ id }) => (id as string) !== "brief")) {\n      const markup = markupFor(id);',
)

# 7) Gallery: Brief is no longer a letter-only exception. It is one of the 38
# dossier templates and therefore uses Brief for cover + letter + CV.
p = Path("tests/e2e/dossier-gallery.spec.ts")
text = p.read_text()
old = '''  }> = [\n    {\n      label: "Brief",\n      letterTemplate: "brief",\n      coverTemplate: "klassisch",\n      cvTemplate: "klassisch",\n    },\n    ...ALL_GALLERY_TEMPLATES.map((template) => ({\n      label: template.name,\n      letterTemplate: template.id,\n      coverTemplate: template.id,\n      cvTemplate: template.id,\n    })),\n  ];\n\n  expect(ALL_GALLERY_TEMPLATES).toHaveLength(37);\n  expect(cases).toHaveLength(38);\n\n  const totalPdfCount = cases.length + 1; // UI example + 38 selectable letter/template cases.\n'''
new = '''  }> = ALL_GALLERY_TEMPLATES.map((template) => ({\n    label: template.name,\n    letterTemplate: template.id as "brief" | TemplateId,\n    coverTemplate: template.id,\n    cvTemplate: template.id,\n  }));\n\n  expect(ALL_GALLERY_TEMPLATES).toHaveLength(38);\n  expect(cases).toHaveLength(38);\n\n  const totalPdfCount = cases.length + 1; // UI example + 38 dossier template cases.\n'''
if old not in text:
    raise SystemExit("gallery cases block not found")
p.write_text(text.replace(old, new, 1))

# 8) Ensure the temporary machinery removes itself in the real change commit.
Path(".github/scripts/add-brief-dossier-template.py").unlink(missing_ok=True)
Path(".github/workflows/add-brief-dossier-template.yml").unlink(missing_ok=True)
