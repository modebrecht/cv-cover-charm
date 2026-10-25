"""Inspect actual app packages and copy immutable handoffs; never repair DOCX.

Usage: python script.py APP_ROOT PREVIOUS_PACKET UPLOAD_ROOT OUTPUT_DIR
Native PDF is LibreOffice supplement; Microsoft Word acceptance stays pending.
"""
import hashlib
import json
import re
import shutil
import sys
import unicodedata
from pathlib import Path
from zipfile import ZipFile

import fitz
from lxml import etree
from PIL import Image, ImageChops

app, previous, uploads, out = map(Path, sys.argv[1:5])
out.mkdir(parents=True, exist_ok=True)
cases = ["header-inline", "header-stacked", "header-inline-pipe", "cv-pills", "cv-pills-offset", "header-inline-custom-colors", "header-inline-unsynced"]
names = {"header-inline": "01-Modern-Kontakt-waagrecht-Farben-fix.docx", "header-stacked": "02-Modern-Kontakt-untereinander-Farben-fix.docx", "cv-pills": "03-Modern-Lebenslauf-Rubrikpills-Kontrolle.docx"}
ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
norm = lambda s: re.sub(r"\s+", "", unicodedata.normalize("NFKC", s)).casefold()


def walk(blocks):
    for b in blocks:
        yield b
        if b["kind"] == "section":
            if b.get("heading"):
                yield b["heading"]
            yield from walk(b["blocks"])
        elif b["kind"] in ["entry", "group"]:
            yield from walk(b["blocks"])
        elif b["kind"] == "table":
            for row in b["rows"]:
                for cell in row["cells"]:
                    yield from walk(cell)
        elif b["kind"] == "paragraph-frame":
            yield from b["paragraphs"]


results = []
for case in cases:
    root = app / case
    model = json.loads((root / "model.json").read_text())
    source = json.loads((root / "snapshot.json").read_text())
    metrics = json.loads((root / "interior-metrics.json").read_text())
    assert json.loads(metrics["sourceKey"]) == source
    base_case = "header-inline" if case in ["header-inline-custom-colors", "header-inline-unsynced"] else case
    old = json.loads((previous / (base_case + "-model.json")).read_text())
    assert model["cover"] == old["cover"], case
    for scope in ["letter", "cv"]:
        assert model[scope]["blocks"] == old[scope]["blocks"], (case, scope, "body")
        assert model[scope]["page"] == old[scope]["page"], (case, scope, "page geometry")
    pdf = fitz.open(root / "rendered/candidate.pdf")
    assert len(pdf) == 4
    assert all(abs(p.rect.width - 595.3) < .2 and abs(p.rect.height - 841.89) < .2 for p in pdf)
    all_text = norm(" ".join(p.get_text() for p in pdf))
    native_fields = 0
    for part in [model["cover"], model["letter"], model["cv"]]:
        for b in walk(part["blocks"] + part.get("headerFrames", [])):
            if b["kind"] == "paragraph":
                for run in b["runs"]:
                    if run.get("fieldId") and run["text"].strip():
                        assert norm(run["text"]) in all_text, (case, run)
                        native_fields += 1
    for page in pdf:
        for b in page.get_text("dict")["blocks"]:
            for line in b.get("lines", []):
                for span in line["spans"]:
                    x0, y0, x1, y1 = span["bbox"]
                    assert min(x0, y0) >= -.1 and x1 <= page.rect.width + .1 and y1 <= page.rect.height + .1, (case, span)
    with ZipFile(root / "candidate.docx") as z:
        xml = etree.fromstring(z.read("word/document.xml"))
        assert len(xml.xpath("//w:sectPr", namespaces=ns)) == 3
        assert "Lehrbeginn August 2028" in "".join(xml.xpath("//w:t/text()", namespaces=ns))
        assert not xml.xpath('//*[local-name()="wsp"]')
        if case.startswith("header"):
            for scope, prefix in [("letter", "letter.sender."), ("cv", "cv.person.")]:
                header = etree.fromstring(z.read(f"word/{scope}-header.xml"))
                tags = header.xpath("//w:sdtPr/w:tag/@w:val", namespaces=ns)
                for field in ["name", "address", "place", "phone", "email"]:
                    assert tags.count(prefix + field) == 1, (case, scope, field)
    chrome = []
    for scope, vals in metrics["headers"].items():
        actual = json.loads((root / f"web-{scope}-contact-colors-1.json").read_text())
        assert actual == {"header": vals["first"]["background"], "footer": vals["first"]["footer"]["background"], "opacity": 1, "icons": 0}
        for m in vals.values():
            assert not m["icons"] and m["footer"]["opacity"] == 1
        for index in ([1] if scope == "letter" else [2, 3]):
            m = vals["first" if index < 3 else "continuation"]
            pix = pdf[index].get_pixmap(alpha=False)
            for where, y, hex_color in [("header", 10, m["background"]), ("footer", pix.height - 3, m["footer"]["background"])]:
                expected = tuple(int(hex_color[i:i+2], 16) for i in [0, 2, 4])
                assert all(max(abs(a-b) for a, b in zip(pix.pixel(x, y), expected)) <= 2 for x in [2, 10, pix.width//2, pix.width-3]), (case, scope, where)
            upper = norm(pdf[index].get_text(clip=fitz.Rect(0, 0, pdf[index].rect.width, m["heightMm"]*72/25.4)))
            for value in ["Lea Müller", "Dorfstrasse 12", "4535 Hubersdorf", "079 123 45 67", "lea.mueller@example.ch"]:
                assert norm(value) in upper, (case, index, value)
        chrome.append({"scope": scope, "liveEditor": actual, "nativeFirstAndContinuation": "PASS"})
    if metrics["headers"] and source["settings"]["chrome"]["sync"]:
        assert metrics["headers"]["letter"]["first"]["background"] == metrics["headers"]["cv"]["first"]["background"]
        assert metrics["headers"]["letter"]["first"]["footer"] == metrics["headers"]["cv"]["first"]["footer"]
    for kind in ["project", "snapshot", "interior-metrics"]:
        shutil.copyfile(root / (kind+".json"), out / (case+"-"+kind+".json"))
    if case in names:
        shutil.copyfile(root / "candidate.docx", out / names[case])
        assert sha(out / names[case]) == sha(root / "candidate.docx")
    results.append({"case": case, "nativePages": 4, "semanticFieldRunsFound": native_fields, "coverModelUnchanged": True, "bodyModelsAndPageGeometryUnchanged": True, "chrome": chrome, "appEvidence": json.loads((root/"app-evidence.json").read_text()), "sha256": sha(root/"candidate.docx")})

regression = []
for case, height in [("header-inline", 26), ("header-stacked", 32)]:
    for page in range(1, 5):
        a = Image.open(app/case/"rendered"/f"page-{page}.png").convert("RGB")
        b = Image.open(app/"parent"/case/f"page-{page}.png").convert("RGB")
        # PDF image-codec ringing reaches into empty space above the footer.
        # The documented body comparator excludes that 1.5-mm fringe too.
        box = (0, 0, a.width, a.height) if page == 1 else (0, round((height+.3)*a.height/297), a.width, round(291.5*a.height/297))
        assert ImageChops.difference(a.crop(box), b.crop(box)).getbbox() is None, (case, page)
        regression.append({"case": case, "page": page, "regionMm": "complete cover" if page == 1 else [0, height+.3, 210, 291.5], "pixelIdentical": True})
assert (app/"cv-pills/candidate.docx").read_bytes() == (previous/"03-Modern-Lebenslauf-Rubrikpills.docx").read_bytes()
for page in range(1, 5):
    assert (app/"cv-pills/rendered"/f"page-{page}.png").read_bytes() == (app/"parent/cv-pills"/f"page-{page}.png").read_bytes()
shutil.copyfile(uploads/"01-Modern-Kontakt-waagrecht.pdf", out/"user-word-before.pdf")
shutil.copyfile(uploads/"image(20261018-090334).png", out/"user-word-before.png")
(out/"validation.json").write_text(json.dumps({"classification": "PARTIAL; bounded engineering checks PASS; revised Word acceptance UNVERIFIED", "cases": results, "renderRegression": regression, "rubricDocxByteAndFourPagesPixelIdentical": True}, ensure_ascii=False, indent=2)+"\n")
(out/"sha256.json").write_text(json.dumps({p.name: sha(p) for p in sorted(out.iterdir()) if p.suffix in [".docx", ".pdf", ".png"]}, indent=2)+"\n")
print(json.dumps({"appCases":len(results), "nativeA4Pages":28, "deliveredHeaderDocx":2, "unchangedRubricControl":1, "bodyModelRegressions":0, "WordAcceptance":"UNVERIFIED"}))
