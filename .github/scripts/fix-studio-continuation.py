from pathlib import Path

sheet = Path("src/components/dossier/DossierSheetBackground.tsx")
test = Path("tests/unit/dossier-sheet-background.test.tsx")
workflow = Path(".github/workflows/fix-studio-continuation.yml")
script = Path(".github/scripts/fix-studio-continuation.py")

text = sheet.read_text()
old = '''      {template === "studio" && (\n        <div\n          className="absolute top-[24mm]"\n          style={{\n            left: `${layout.columnMm ?? 20}mm`,\n            right: 0,\n            height: `${layout.bandMm ?? 10}mm`,\n            backgroundColor: accent,\n            color: primaryRoles.ink,\n          }}\n        />\n      )}'''
new = '''      {template === "studio" && (\n        <div\n          className="absolute"\n          style={{\n            left: `${layout.columnMm ?? 20}mm`,\n            right: 0,\n            top: `${pageIndex === 0 ? 24 : 0}mm`,\n            height: `${layout.bandMm ?? 10}mm`,\n            backgroundColor: accent,\n            color: primaryRoles.ink,\n          }}\n        />\n      )}'''
if text.count(old) != 1:
    raise SystemExit("studio continuation patch did not match exactly once")
sheet.write_text(text.replace(old, new, 1))

t = test.read_text()
t = t.replace(
    '''const markupFor = (template: Parameters<typeof DossierSheetBackground>[0]["template"]) =>\n  renderToStaticMarkup(\n    createElement(DossierSheetBackground, { template, colors: defaultLetterColors(template) }),\n  );''',
    '''const markupFor = (\n  template: Parameters<typeof DossierSheetBackground>[0]["template"],\n  pageIndex = 0,\n) =>\n  renderToStaticMarkup(\n    createElement(DossierSheetBackground, {\n      template,\n      colors: defaultLetterColors(template),\n      pageIndex,\n    }),\n  );''',
    1,
)
needle = '''  test("Brief remains the deliberate plain-white alternative", () => {'''
insert = '''  test("continuation pages collapse large CV headers without overlapping content", () => {\n    expect(markupFor("freundlich", 1)).toContain("height:14mm");\n    expect(markupFor("colorful", 1)).toContain("height:14mm");\n    expect(markupFor("studio", 1)).toContain("height:13mm");\n    expect(markupFor("studio", 1)).toContain("top:0mm");\n    expect(markupFor("studio", 1)).toContain("width:72mm");\n  });\n\n'''
if needle not in t:
    raise SystemExit("test insertion point missing")
test.write_text(t.replace(needle, insert + needle, 1))

workflow.unlink()
script.unlink()
