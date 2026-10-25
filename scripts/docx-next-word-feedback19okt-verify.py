"""Check the reported layout relationships in same-source app/preview PDFs.

Usage: python3 scripts/docx-next-word-feedback19okt-verify.py APP RENDERS OUTPUT
LibreOffice ink bounds are measurements, not Microsoft Word acceptance.
"""
import json
import sys
from pathlib import Path

import fitz

app, renders, output = map(Path, sys.argv[1:])
checks = []
for item in json.loads((app / "results.json").read_text()):
    number = item["id"][:2]
    folder = app / item["id"]
    proof = json.loads((folder / "proof.json").read_text())
    native = fitz.open(renders / number / (item["id"] + ".pdf"))
    web = fitz.open(folder / "Web-PDF.pdf")
    personal = proof.get("cvPersonalHeaderMetrics")
    if personal and proof["snapshot"]["cv"]["data"]["person"]["geburtsdatum"]:
        label = native[2].search_for("Geburtsdatum:")
        assert len(label) == 1, (number, "personal label wrapped", label)
        checks.append({"case": number, "personalLabelSingleLine": True,
                       "physicalValueColumnMm": personal["valueOffsetMm"]})
    if number in ("08", "09", "10"):
        columns = {}
        for label, doc in (("Web-PDF", web), ("native-preview", native)):
            columns[label] = {
                text: round(doc[2].search_for(text)[0].x0 * 25.4 / 72, 4)
                for text in ("4535 Hubersdorf", "lea.mueller@example.ch", "14.03.2010")
            }
            assert max(columns[label].values()) - min(columns[label].values()) < 0.01
        checks.append({"case": number, "contactValueXmm": columns})
    if number in ("03", "04"):
        tops = proof["snapshot"]["settings"]["flowPageTops"]
        expected = {"firstMm": 47, "continuationMm": 30} if number == "03" else {"firstMm": 53, "continuationMm": 40}
        assert tops["cv"] == expected
        if number == "04":
            assert proof["restoredProject"]["cv"]["portableState"]["continuationTopMarginMm"] == 40
            assert len(web) == len(native) == 4
            for doc in (web, native):
                title = doc[3].search_for("REFERENZEN")[0]
                assert 38 <= title.y0 * 25.4 / 72 <= 42
        samples = {}
        for label, doc in (("Web-PDF", web), ("native-preview", native)):
            colors = []
            for page in (doc[1], doc[2]):
                pixel = page.get_pixmap(clip=fitz.Rect(10, 10, 11, 11))
                colors.append(list(pixel.samples[:3]))
            assert colors[0] == colors[1]
            samples[label] = {
                "firstCvTitleInkTopMm": round(doc[2].search_for("Lebenslauf")[0].y0 * 25.4 / 72, 4),
                "letterCvHeaderPixelRGB": colors,
            }
        checks.append({"case": number, "resolvedBodyTopsMm": tops, "samples": samples,
                       "note": "First/continuation settings preserved. Ink bounds differ with native font/line metrics; no pixel identity claimed."})
    if number == "06":
        blocks = proof["model"]["cover"]["blocks"] + proof["model"]["cover"]["headerShapes"]
        photo = next(b for b in blocks if b["id"] == "cover.photo")
        circle = next(b for b in blocks if b["id"] == "cover.modernAccentCircle")
        photo_center = [photo["xMm"] + photo["widthMm"] / 2, photo["yMm"] + photo["maxHeightMm"] / 2]
        circle_center = [circle["xMm"] + circle["widthMm"] / 2, circle["yMm"] + circle["heightMm"] / 2]
        assert photo_center == circle_center == [155, 73]
        badge = next(b for b in blocks if b["id"] == "cover.lehrbeginn.badge-paint")
        assert badge["xMm"] == 20
        checks.append({"case": number, "photoCenterMm": photo_center, "decorationCenterMm": circle_center, "badgeLeftMm": badge["xMm"]})
output.write_text(json.dumps({"status": "PASS; revised Microsoft Word rendering still pending", "checks": checks}, indent=2) + "\n")
print(f"{len(checks)} layout relationship checks passed")
