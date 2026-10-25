"""Validate real app outputs, retain three unmodified packages, create A4 review.

No document/XML repairs. LibreOffice evidence never establishes Word acceptance.
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
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader

app, reviewed, out, control = map(Path, sys.argv[1:5])
out.mkdir(parents=True, exist_ok=True)
cases = ["header-inline", "header-stacked", "cv-pills", "cv-pills-offset", "header-inline-pipe"]
names = {"header-inline": "01-Modern-Kontakt-waagrecht.docx", "header-stacked": "02-Modern-Kontakt-untereinander.docx", "cv-pills": "03-Modern-Lebenslauf-Rubrikpills.docx"}
ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"}
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
    folder = app / case
    model = json.loads((folder / "model.json").read_text())
    source = json.loads((folder / "snapshot.json").read_text())
    metrics = json.loads((folder / "interior-metrics.json").read_text())
    assert json.loads(metrics["sourceKey"]) == source
    pdf = fitz.open(folder / "rendered/candidate.pdf")
    assert len(pdf) == 4, (case, len(pdf))
    assert all(abs(p.rect.width - 595.3) < .2 and abs(p.rect.height - 841.89) < .2 for p in pdf)
    all_text = norm("\n".join(p.get_text() for p in pdf))
    missing = []
    fields = 0
    for part in [model["cover"], model["letter"], model["cv"]]:
        for b in walk(part["blocks"] + part["header"] + part.get("firstHeader", []) + part["footer"] + part.get("headerFrames", [])):
            if b["kind"] == "paragraph":
                for run in b["runs"]:
                    if run.get("fieldId") and run["text"].strip():
                        fields += 1
                        if norm(run["text"]) not in all_text:
                            missing.append({"field": run["fieldId"], "text": run["text"]})
    assert not missing, (case, missing)
    for page in pdf:
        for b in page.get_text("dict")["blocks"]:
            for line in b.get("lines", []):
                for span in line["spans"]:
                    x0, y0, x1, y1 = span["bbox"]
                    assert min(x0, y0) >= -.1 and x1 <= page.rect.width + .1 and y1 <= page.rect.height + .1, (case, span)
    with ZipFile(folder / "candidate.docx") as z:
        root = etree.fromstring(z.read("word/document.xml"))
        assert len(root.xpath("//w:sectPr", namespaces=ns)) == 3
        assert len(root.xpath('//w:sdtPr/w:tag[@w:val="cover.lehrbeginn"]', namespaces=ns)) == 1
        assert "Lehrbeginn August 2028" in "".join(root.xpath("//w:t/text()", namespaces=ns))
        assert not root.xpath('//*[local-name()="wsp"]')
        controls = sum(len(etree.fromstring(z.read(p)).xpath("//w:sdtPr/w:tag", namespaces=ns)) for p in z.namelist() if re.match(r"word/(?:document|.*-header(?:-first)?|.*-footer)\.xml$", p))
    header_rows = []
    if case.startswith("header"):
        expected = 3 if case == "header-stacked" else 1
        for scope, page_indices in [("letter", [1]), ("cv", [2, 3])]:
            for index in page_indices:
                words = [s for b in pdf[index].get_text("dict")["blocks"] for line in b.get("lines", []) for s in line["spans"] if s["bbox"][1] < (32 if expected == 3 else 26) * 72 / 25.4]
                text = norm(" ".join(s["text"] for s in words))
                assert all(norm(v) in text for v in ["Lea Müller", "Dorfstrasse 12", "4535 Hubersdorf", "079 123 45 67", "lea.mueller@example.ch"]), (case, index, words)
                ys = {round(s["bbox"][1], 1) for s in words}
                assert len(ys) == expected, (case, index, ys)
                header_rows.append({"scope": scope, "page": index + 1, "nativeRows": len(ys)})
    pills = []
    if case.startswith("cv-pills"):
        for b in walk(model["cv"]["blocks"]):
            if b["kind"] != "paragraph" or not b.get("flowSurface"):
                continue
            s = b["flowSurface"]
            shown = "".join(r["text"].upper() if r["style"].get("allCaps") else r["text"] for r in b["runs"])
            found = False
            for index in [2, 3]:
                for rect in pdf[index].search_for(shown):
                    for image in pdf[index].get_image_info():
                        box = fitz.Rect(image["bbox"])
                        if abs(box.width - s["rowWidthMm"] * 72 / 25.4) > 1 or abs(box.height - s["heightMm"] * 72 / 25.4) > 1:
                            continue
                        pill_right = box.x0 + s["widthMm"] * 72 / 25.4
                        if box.y0 - .1 <= rect.y0 and rect.y1 <= box.y1 + .1 and box.x0 <= rect.x0 and rect.x1 <= pill_right + .1:
                            pills.append({"id": b["id"], "page": index + 1, "textBox": list(rect), "paintBox": list(box), "nativeEditableHeading": True})
                            found = True
            assert found, (case, shown, "text is outside capsule or missing")
        assert len(pills) == 7
    # The saved CV font changes intentionally in these new fixtures. The
    # previously reviewed cover remains exactly the same supplementary raster.
    assert (folder / "rendered/page-1.png").read_bytes() == (reviewed / "normal/rendered/page-1.png").read_bytes(), case
    if case == "cv-pills":
        # Match authored font state. These fixtures explicitly select CV Sans;
        # the historic reviewed normal fixture retained the Cabin default.
        assert model["letter"] == json.loads((control/"model.json").read_text())["letter"]
        assert (folder / "rendered/page-2.png").read_bytes() == (control / "rendered/page-2.png").read_bytes()
    for kind in ["project", "snapshot", "metrics", "interior-metrics", "model", "app-evidence"]:
        shutil.copyfile(folder / (kind + ".json"), out / (case + "-" + kind + ".json"))
    record = {"case": case, "pages": len(pdf), "logicalDocuments": 3, "semanticFieldRunsFound": fields, "missing": missing, "nativeControls": controls, "headerRows": header_rows, "pills": pills, "coverPixelIdenticalToReviewed": True, "candidateSha256": sha(folder / "candidate.docx"), "wordVisualAcceptance": "UNVERIFIED"}
    if case in names:
        target = out / names[case]
        shutil.copyfile(folder / "candidate.docx", target)
        assert sha(target) == record["candidateSha256"]
        record["delivered"] = target.name
    results.append(record)

(out / "validation.json").write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n")

# A4 comparisons deliberately show the complete source/native first pages,
# plus a readable detail. Native CV has two pages; Web has one in this fixture.
pdf_path = out / "Modern-Header-Rubrikpills-A4-Vergleich.pdf"
c = canvas.Canvas(str(pdf_path), pagesize=A4)
W, H = A4


def draw_image(file, x, y, width, height):
    c.drawImage(ImageReader(str(file)), x, y, width, height, preserveAspectRatio=True, anchor="c", mask="auto")


def compare(title, web, native, detail=None):
    c.setFillColorRGB(0, 0, 0)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(28, H - 34, title)
    c.setFont("Helvetica", 8)
    c.drawString(28, H - 51, "Same restored project | source pages are A4 | native text remains editable")
    c.drawString(28, H - 65, "LibreOffice supplement only. Microsoft Word editing and Save/Reopen UNVERIFIED.")
    c.setFont("Helvetica-Bold", 10)
    c.drawString(28, H - 88, "WEB")
    c.drawString(307, H - 88, "DOCX - LibreOffice")
    pw = 260
    ph = pw * 297 / 210
    draw_image(web, 28, H - 104 - ph, pw, ph)
    draw_image(native, 307, H - 104 - ph, pw, ph)
    if detail:
        c.setFont("Helvetica-Bold", 10)
        for index, file in enumerate([web, native]):
            c.setFont("Helvetica-Bold", 9)
            c.drawString(28, 322 if index == 0 else 192, "Detail - Web" if index == 0 else "Detail - DOCX / LibreOffice")
            im = Image.open(file)
            interval = detail[index] if isinstance(detail[0], tuple) else detail
            crop = im.crop((0, int(im.height * interval[0]), im.width, int(im.height * interval[1])))
            c.drawImage(ImageReader(crop), 28, 215 if index == 0 else 85, 539, 96, preserveAspectRatio=True, anchor="n", mask="auto")
    c.setFont("Helvetica", 8)
    c.drawString(28, 35, "Scope: Modern candidate only. Existing Letter/CV flow differs from full Web pagination.")
    c.showPage()


compare("Cover - reviewed separate date pill", app / "header-inline/web.png", app / "header-inline/rendered/page-1.png", (.52, .64))
for case, title in [("header-inline", "Horizontal contact header"), ("header-stacked", "Stacked contact header")]:
    compare(title + " - Letter", app / case / "web-letter.png", app / case / "rendered/page-2.png", (0, .13))
    compare(title + " - CV", app / case / "web-cv.png", app / case / "rendered/page-3.png", (0, .13))
geometry=json.loads((app/"cv-pills/web-cv-interior-geometry.json").read_text())
web_y=next(row["yMm"] for page in geometry for row in page if dict(row["attributes"]).get("data-dossier-field-id")=="cv.section.custom:familie.heading")
native_y=next(r for r in results if r["case"]=="cv-pills")["pills"][0]["paintBox"][1]*25.4/72
compare("CV rubric capsules", app / "cv-pills/web-cv.png", app / "cv-pills/rendered/page-3.png", (((web_y-2)/297,(web_y+7)/297),((native_y-2)/297,(native_y+7)/297)))
c.setFont("Helvetica-Bold", 14)
c.drawString(28, H - 34, "Native CV continuation - complete content")
c.setFont("Helvetica", 9)
c.drawString(28, H - 53, "The same Web fixture has one CV page; native Word flow uses two. No extra cover page.")
draw_image(app / "cv-pills/rendered/page-4.png", 150, 55, 295, 715)
c.showPage()
c.save()
(out / "sha256.json").write_text(json.dumps({p.name: sha(p) for p in out.iterdir() if p.suffix in [".docx", ".pdf"]}, indent=2) + "\n")
print(json.dumps({"validatedAppCases": len(results), "nativeA4Pages": sum(r["pages"] for r in results), "deliveredDocx": len(names), "comparisonPages": len(fitz.open(pdf_path)), "wordAcceptance": "UNVERIFIED"}))
