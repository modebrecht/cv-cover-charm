"""Validate rendered raster ink independently of invisible searchable PDF text.

Uses canonical browser marker boxes in millimetres, never PDF text positions.
Presence of high-contrast ink in each marker box is a visibility smoke test;
geometry/content/order checks remain separate and stricter in browser suites.
"""
import json
import sys
from pathlib import Path

import fitz


def inspect(pdf_path, pages):
    result = []
    with fitz.open(pdf_path) as pdf:
        assert len(pdf) == len(pages), (str(pdf_path), len(pdf), len(pages))
        for index, expected in enumerate(pages):
            page = pdf[index]
            assert page.get_images(), (str(pdf_path), index, "missing raster page")
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
            samples = pix.samples
            boxes = []
            for marker in expected.get("markerBoxes", []):
                x, y, w, h = marker["box"]
                left, top = int(x * pix.width / 210), int(y * pix.height / 297)
                right, bottom = int((x + w) * pix.width / 210), int((y + h) * pix.height / 297)
                assert left >= 0 and top >= 0 and right <= pix.width and bottom <= pix.height
                # Each real marker spans multiple letters. Ten contrasted pixels
                # is a presence floor, not a pixel-parity or full OCR assertion.
                colors = [tuple(samples[(row * pix.width + col) * 3:(row * pix.width + col) * 3 + 3])
                          for row in range(top, bottom) for col in range(left, right)]
                contrast = max((sum(c) for c in colors), default=0) - min((sum(c) for c in colors), default=0)
                assert contrast >= 90, (str(pdf_path), index, marker["marker"], "no contrasted visible ink")
                lightest = max(map(sum, colors), default=0)
                contrasted_pixels = sum(lightest - sum(c) >= 90 for c in colors)
                assert contrasted_pixels >= 10, (str(pdf_path), index, marker["marker"], "insufficient visible ink")
                boxes.append({"marker": marker["marker"], "contrast": contrast, "contrastedPixels": contrasted_pixels})
            assert boxes or expected.get("kind") == "cover", (str(pdf_path), index, "no measured raster marker")
            result.append({"page": index + 1, "markers": boxes})
    return result


reports = []
for directory in map(Path, sys.argv[1:]):
    for path in sorted(directory.glob("*.json")):
        data = json.loads(path.read_text())
        pdf_path = path.with_suffix(".pdf")
        if not pdf_path.exists() or data.get("status") != "PASS":
            continue
        if "canonical" in data and data.get("pdf"):
            pages = data["canonical"]
        elif "letter" in data and "cv" in data and "pdfPages" in data:
            pages = [{"kind": "cover"}, *data["letter"], *data["cv"]]
        else:
            continue
        reports.append({"pdf": str(pdf_path), "pages": inspect(pdf_path, pages)})
assert reports, "No production PDFs were inspected"
output = Path("artifacts/pdf-preflight/raster-results.json")
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(reports, indent=2))
print(json.dumps({"pdfs": len(reports), "pages": sum(len(r["pages"]) for r in reports),
                  "markers": sum(len(p["markers"]) for r in reports for p in r["pages"]), "failures": 0}))
