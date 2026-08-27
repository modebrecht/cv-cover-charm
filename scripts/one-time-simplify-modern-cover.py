from pathlib import Path

path = Path("src/components/cover/template-decorations.ts")
text = path.read_text()
old = '''  modern: [\n    // Keep the ids introduced by the first Kreis edit so existing saved\n    // overrides continue to apply after this catalogue-wide refactor.\n    line("modernAccentLine", "Akzentstrich", 20, 21, 10, 2, "accent"),\n    circle("modernAccentCircle", "Kreisfläche", 112, 24, 86, 86, "accent", 0.1),\n    rect("modernBottomBand", "Unteres Farbband", 0, 293, 210, 4, "primary"),\n  ],\n'''
new = '''  modern: [\n    // Modern bleibt bewusst ruhig: nur die weiche Kreisfläche, keine\n    // dekorativen Striche oder Farbbänder im Bewerbungsdossier.\n    circle("modernAccentCircle", "Kreisfläche", 112, 24, 86, 86, "accent", 0.1),\n  ],\n'''
if text.count(old) != 1:
    raise SystemExit(f"Expected exactly one Modern cover decoration block, found {text.count(old)}")
path.write_text(text.replace(old, new, 1))
