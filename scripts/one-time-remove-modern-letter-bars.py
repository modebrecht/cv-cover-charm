from pathlib import Path

path = Path("src/components/letter/LetterCanvas.tsx")
text = path.read_text()
old = '''      {template === "modern" && (\n        <>\n          <div\n            className="absolute left-[24mm] top-[18mm] h-[2mm] w-[10mm]"\n            style={{ backgroundColor: accent }}\n          />\n          <div\n            className="absolute right-[-20mm] top-[14mm] h-[62mm] w-[62mm] rounded-full"\n            style={{ backgroundColor: accent, opacity: 0.07 }}\n          />\n          <div\n            className="absolute inset-x-0 bottom-0 h-[4mm]"\n            style={{ backgroundColor: primary }}\n          />\n        </>\n      )}\n'''
new = '''      {template === "modern" && (\n        <div\n          className="absolute right-[-20mm] top-[14mm] h-[62mm] w-[62mm] rounded-full"\n          style={{ backgroundColor: accent, opacity: 0.07 }}\n        />\n      )}\n'''
if text.count(old) != 1:
    raise SystemExit(f"Expected exactly one Modern letter decoration block, found {text.count(old)}")
text = text.replace(old, new, 1)
path.write_text(text)
