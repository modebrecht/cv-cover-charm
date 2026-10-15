"""Measure original/controlled native covers and create a labelled A4 comparison.
Run after the documented DOCX renders and Web component capture.
"""
import hashlib
import json
import sys
from pathlib import Path

import fitz
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

run = Path(sys.argv[1])
originals = Path(sys.argv[2])
output = Path(sys.argv[3])
output.mkdir(parents=True, exist_ok=True)
web = json.loads((run / "web-evidence.json").read_text())
model = json.loads((run / "model-evidence.json").read_text())
baseline = fitz.open(run / "baseline-render/brief-baseline.pdf")
probe = fitz.open(run / "frame-render/brief-frame-probe.pdf")
moved = fitz.open(run / "moved-render/brief-moved-date-probe.pdf")
word1, word2 = [fitz.open(originals / n) for n in ["saved1.pdf", "saved2.pdf"]]
assert len(baseline) == len(probe) == len(moved) == 3
assert model["originalCoverPrefixIdentical"]
assert not web["errors"], web["errors"]
assert len(web["exactFields"]) == 10
assert all(baseline[i].get_pixmap().samples == probe[i].get_pixmap().samples for i in [1, 2])

def rect_for(page, text):
    rects = page.search_for(text)
    assert rects, text
    r = rects[0]
    return {"xMm": r.x0 * 25.4 / 72, "yMm": r.y0 * 25.4 / 72,
            "widthMm": r.width * 25.4 / 72, "heightMm": r.height * 25.4 / 72}

fields = {f["id"]: f for f in web["exactFields"]}
rows = []
for ident, text in [("beruf", "Informatiker/in EFZ"), ("name", "Lea Müller"),
                    ("lehrbeginn", "Lehrbeginn August 2027"), ("kontakt", "Dorfstrasse 12"),
                    ("beilagen", "Motivationsschreiben"), ("ortDatum", "Hubersdorf, 15.11.2026")]:
    rows.append({"field": ident, "webElement": fields[ident],
                 "actualWordGlyph": rect_for(word1[0], text),
                 "probeLibreOfficeGlyph": rect_for(probe[0], text)})

evidence = {
    "status": "PARTIAL", "wordPrototypeAcceptance": "UNVERIFIED",
    "fullVisualGate": "NOT ACCEPTED: effective style and absent-photo mismatch",
    "engine": probe.metadata["producer"],
    "originalBaselineSha256": hashlib.sha256((run / "brief-baseline.docx").read_bytes()).hexdigest(),
    "originalSourceProject": "UNAVAILABLE; recovered generator fixture is package-equivalent",
    "webReference": web["provenance"],
    "wordSavePdfSameGeometry": [word1[i].get_text("dict") == word2[i].get_text("dict") for i in range(3)],
    "wordSavePdfSamePixels": [word1[i].get_pixmap().samples == word2[i].get_pixmap().samples for i in range(3)],
    "pageCounts": {"baseline": len(baseline), "probe": len(probe), "moved": len(moved)},
    "neighborPixelsIdentical": [True, True],
    "movedDateGlyphMm": rect_for(moved[0], "Hubersdorf, 15.11.2026"),
    "measurements": rows,
    "measurementCaveat": "Web element boxes and PDF glyph bounds differ; do not interpret submillimetre differences as exact parity.",
    "all39PrototypeRun": False,
}
(output / "measurements.json").write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n")

word_png = run / "actual-word-cover.png"
probe_png = run / "native-probe-cover.png"
word1[0].get_pixmap(matrix=fitz.Matrix(2, 2)).save(word_png)
probe[0].get_pixmap(matrix=fitz.Matrix(2, 2)).save(probe_png)
images = [run / "brief-same-snapshot-web.png", word_png, probe_png]
titles = ["WEB / controlled same snapshot", "WORD / supplied saved1.pdf", "PROBE / LibreOfficeDev 26.8 alpha"]
pdf = output / "brief-a4-comparison.pdf"
c = canvas.Canvas(str(pdf), pagesize=landscape(A4))
w, h = landscape(A4)
c.setTitle("Brief cover fidelity independent Item 37 comparison")
c.setFont("Helvetica-Bold", 17)
c.drawString(24, h - 30, "Brief cover fidelity")
c.setFont("Helvetica", 10)
c.drawString(24, h - 48, "PARTIAL: placement feasibility only. Word prototype acceptance is UNVERIFIED.")
gutter = 15
panel_w = (w - 48 - 2 * gutter) / 3
panel_h = panel_w * 297 / 210
base_y = h - 82 - panel_h
for i, (img, title) in enumerate(zip(images, titles)):
    x = 24 + i * (panel_w + gutter)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(x, h - 70, title)
    c.drawImage(ImageReader(str(img)), x, base_y, panel_w, panel_h)
    c.setStrokeColorRGB(.76, .78, .81)
    c.rect(x, base_y, panel_w, panel_h)
c.setFont("Helvetica", 9)
for index, line in enumerate([
    "The original DOCX is reproduced byte for byte. Web and probe use the unchanged recovered snapshot.",
    "The original saved editor project is unavailable. Images share the same A4 scale; glyph and element bounds differ.",
    "The probe restores major placement but still differs in typography, footer labels and the initials placeholder.",
    "Next pages show each cover at full A4. The probe is diagnostic and must not be promoted as an accepted export.",
]):
    c.drawString(24, base_y - 23 - index * 14, line)
c.showPage()
for i, (img, title) in enumerate(zip(images, titles)):
    c.setPageSize(A4)
    c.bookmarkPage(f"cover-{i}")
    c.addOutlineEntry(title, f"cover-{i}", 0)
    c.drawImage(ImageReader(str(img)), 0, 0, *A4)
    c.showPage()
c.save()
comparison = fitz.open(pdf)
comparison[0].get_pixmap(matrix=fitz.Matrix(2, 2)).save(output / "brief-a4-comparison.png")
assert len(comparison) == 4
print(json.dumps({"comparisonPages": len(comparison), "measurements": [{"field": r["field"], "webY": round(r["webElement"]["yMm"], 2), "wordY": round(r["actualWordGlyph"]["yMm"], 2), "probeY": round(r["probeLibreOfficeGlyph"]["yMm"], 2)} for r in rows]}, ensure_ascii=False))
