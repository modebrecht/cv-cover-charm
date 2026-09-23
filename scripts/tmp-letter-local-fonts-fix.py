from pathlib import Path

p = Path("tests/unit/letter-body-font-size.test.ts")
text = p.read_text().replace('expect(control).toContain("Vorlagengrösse");', 'expect(control).toContain("Wie Vorlage");')
p.write_text(text)

p = Path("tests/unit/letter-context-font-sizes.test.ts")
text = p.read_text()
text = text.replace('dateFont: "modern",', 'dateFont: "sans",')
text = text.replace('bodyFont: "serioes",', 'bodyFont: "serif",')
text = text.replace('expect(normalized.dateFont).toBe("modern");', 'expect(normalized.dateFont).toBe("sans");')
text = text.replace('expect(normalized.bodyFont).toBe("serioes");', 'expect(normalized.bodyFont).toBe("serif");')
text = text.replace('expect(layout).toContain("Schriftgrössen stellst du");', 'expect(layout).toContain("Schriftart und Schriftgrösse stellst du");')
p.write_text(text)

print("fixed local font regression assertions")
