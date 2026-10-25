"""Verify actual app evidence and package the bounded shared-settings handoff.

Args: COHORT BASELINE MODERN_APP RENDER BRIEF_APP NO_HEADER_APP NEGATIVES
      HYDRATION_BEFORE HYDRATION_AFTER OBSERVED_FAILURE PRIMARY_PDF OUTPUT
Use the primary Python runtime (PyMuPDF, Pillow, lxml, reportlab).
"""
import hashlib
import json
from pathlib import Path
import shutil
import sys
from zipfile import ZipFile

import fitz
from lxml import etree
from PIL import Image, ImageChops
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen.canvas import Canvas

assert len(sys.argv) == 13, __doc__
cohort, baseline, app, render, brief, no_header, negatives, before, after, failure, primary, out = map(Path, sys.argv[1:])
out.mkdir(parents=True, exist_ok=True)
read = lambda p: json.loads(p.read_text())
write = lambda p, value: p.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")

def copy(source, destination):
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, destination)

rows = read(cohort / "results.json")
assert len(rows) == 10 and all(row["result"] == "PASS" for row in rows)
for row in rows:
    name = f'{row["template"]}-{row["kind"]}'
    source = cohort / name
    capture, project = read(source / "capture.json"), read(source / "project.json")
    assert capture["snapshot"]["cv"]["data"]["erfahrung"] == project["cv"]["data"]["erfahrung"]
    assert capture["snapshot"]["letter"]["data"]["text"] == project["letter"]["data"]["text"]
    for filename in ["capture.json", "project.json", "web-cv-geometry.json", "web-letter-geometry.json"]:
        copy(source / filename, out / "cohort" / name / filename)
    if row["kind"] == "default":
        for scope in ["cv", "letter"]:
            for page in ["first", "continuation"]:
                filename = f"web-{scope}-{page}.png"
                copy(source / filename, out / "cohort" / name / filename)
write(out / "cohort-results.json", rows)

web_comparison = []
for template in ["brief", "modern", "freundlich", "verlauf", "neon"]:
    for scope in ["cv", "letter"]:
        filename = f"web-{scope}-first.png"
        old, new = baseline / template / filename, cohort / f"{template}-default" / filename
        a, b = Image.open(old).convert("RGB"), Image.open(new).convert("RGB")
        assert a.size == b.size and ImageChops.difference(a, b).getbbox() is None
        web_comparison.append({"template": template, "scope": scope, "pixelIdentical": True})
        copy(old, out / "baseline" / template / filename)
    copy(baseline / template / "project.json", out / "baseline" / template / "project.json")

old_package = Path("docs/qa/docx-next-modern-defaults-footer-18okt/06-Modern-CV-Pills-Footer-Randtest.docx")
new_package = app / "candidate.docx"
ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
def tags(package):
    return [tag for p in package.namelist() if p.endswith(".xml") for tag in etree.fromstring(package.read(p)).xpath("//w:sdtPr/w:tag/@w:val", namespaces=ns)]

with ZipFile(old_package) as old, ZipFile(new_package) as new:
    old_tags, new_tags = tags(old), tags(new)
    assert [tag for tag in new_tags if tag != "letter.measured.firstPageLead"] == old_tags
    media = [p for p in old.namelist() if p.startswith("word/media/")]
    assert all(old.read(p) == new.read(p) for p in media)
    changed = [p for p in new.namelist() if p not in old.namelist() or old.read(p) != new.read(p)]
    assert changed == ["word/document.xml"]
    def cover_nodes(package):
        body = etree.fromstring(package.read("word/document.xml")).find("w:body", ns)
        result = []
        for child in body:
            result.append(etree.tostring(child, method="c14n"))
            if child.xpath(".//w:sectPr", namespaces=ns):
                break
        return result
    assert cover_nodes(old) == cover_nodes(new)

model = read(app / "model.json")
pdf = fitz.open(render / "candidate.pdf")
assert len(pdf) == 4
for page in pdf:
    assert abs(page.rect.width - 210 * 72 / 25.4) < .1
    assert abs(page.rect.height - 297 * 72 / 25.4) < .1
    assert all(page.rect.contains(fitz.Rect(word[:4])) for word in page.get_text("words"))

def walk(blocks):
    for block in blocks:
        yield block
        if block.get("heading"):
            yield block["heading"]
        yield from walk(block.get("blocks", []))

pills = []
for block in walk(model["cv"]["blocks"]):
    surface = block.get("flowSurface")
    if not surface:
        continue
    label = "".join(run["text"].upper() if run["style"].get("allCaps") else run["text"] for run in block["runs"])
    found = False
    for i in [2, 3]:
        hits = pdf[i].search_for(label)
        if not hits:
            continue
        text = hits[0]
        images = [image for image in pdf[i].get_image_info() if abs(image["bbox"][3] - image["bbox"][1] - surface["heightMm"] * 72 / 25.4) < .3 and abs(image["bbox"][2] - image["bbox"][0] - surface["rowWidthMm"] * 72 / 25.4) < 2]
        paint = fitz.Rect(min(images, key=lambda image: abs(image["bbox"][1] - text.y0))["bbox"])
        assert paint.y0 - .1 <= text.y0 and text.y1 <= paint.y1 + .1
        pills.append({"label": label, "page": i + 1, "contained": True})
        found = True
    assert found, label
assert len(pills) == 7

for source, name in [(before, "hydration-before.json"), (after, "hydration-after.json")]:
    copy(source / "results.json", out / name)
assert all(row["lostAuthoredState"] for row in read(before / "results.json"))
assert all(not row["lostAuthoredState"] for row in read(after / "results.json"))
copy(failure / "failure.json", out / "observed-pre-fix-neon-state.json")
copy(failure / "project.json", out / "observed-pre-fix-neon-input.json")
copy(negatives / "rejections.json", out / "rejections.json")
assert len(read(negatives / "rejections.json")) == 8
assert all(row.get("downloads", 0) == 0 for row in read(negatives / "rejections.json"))

primary_pdf = fitz.open(primary / "primary.pdf")
assert len(primary_pdf) == 3 and primary_pdf.metadata["producer"].startswith("jsPDF")
primary_colours = []
for page, expected in zip([primary_pdf[1], primary_pdf[2]], [(17, 24, 39), (17, 17, 17)]):
    pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    colour = pixmap.pixel(pixmap.width // 2, 5)
    assert all(abs(actual - target) <= 2 for actual, target in zip(colour, expected))
    primary_colours.append({"headerRgb": list(colour), "footerRgb": list(pixmap.pixel(pixmap.width // 2, pixmap.height - 5))})
copy(primary / "primary.pdf", out / "same-source-primary.pdf")
copy(primary / "verification.json", out / "primary-app-verification.json")

for filename in ["snapshot.json", "metrics.json", "interior-metrics.json", "model.json", "project.json", "app-evidence.json", "editor-controls.json", "web-cv-interior-geometry.json", "web-letter-interior-geometry.json"]:
    copy(app / filename, out / "modern-app" / filename)
for filename in ["snapshot.json", "model.json", "project.json", "app-evidence.json", "candidate.docx"]:
    copy(brief / filename, out / "brief-proof" / filename)
    copy(no_header / filename, out / "no-header-proof" / filename)
copy(new_package, out / "07-Modern-Gemeinsame-Abstaende.docx")

comparison = Canvas(str(out / "a4-comparison.pdf"), pagesize=landscape(A4))
width, height = landscape(A4)
panel_height = 178 * 72 / 25.4
panel_width = panel_height * 210 / 297
for title, web, native in [("Cover", app / "web.png", render / "page-1.png"), ("Letter", app / "web-letter.png", render / "page-2.png"), ("CV first page", app / "web-cv.png", render / "page-3.png"), ("CV continuation", None, render / "page-4.png")]:
    comparison.setFont("Helvetica-Bold", 13)
    comparison.drawString(24, height - 25, title)
    comparison.setFont("Helvetica", 9)
    comparison.drawString(24, height - 41, "Saved Web state")
    comparison.drawString(width / 2 + 12, height - 41, "Native supplementary rendering (LibreOffice; Word UNVERIFIED)")
    if web:
        comparison.drawImage(str(web), 24, 18, width=panel_width, height=panel_height)
    else:
        comparison.drawString(24, height - 75, "This Web fixture has one CV page; the native CV has two.")
        comparison.drawString(24, height - 91, "Full pagination fidelity is still open.")
    comparison.drawImage(str(native), width / 2 + 12, 18, width=panel_width, height=panel_height)
    comparison.showPage()
comparison.save()

validation = {
    "classification": "PARTIAL: shared reading/settings engineering PASS; full design and Word acceptance pending",
    "browserCases": 10, "authoredEntryAndLetterTextRetained": True, "firstPageWebComparison": web_comparison,
    "sourcePolicy": {"topMm": 20, "cvRubricPx": 14, "letterBodyPt": 10.5, "visibleContinuationHeaderClearanceMm": 4, "frozenSidebarExcluded": True},
    "nativeA4Pages": 4, "logicalPages": {"cover": 1, "letter": 1, "cv": 2}, "rubricContainment": pills,
    "originalPackageControlsPreserved": len(old_tags), "newEmptyLeadControl": "letter.measured.firstPageLead",
    "originalMediaByteIdentical": len(media), "changedPartsFrom06": changed, "completeCoverXmlUnchanged": True,
    "snapshotToModelTops": {scope: model[scope]["layout"]["pagination"] for scope in ["letter", "cv"]},
    "knownCompactSyncSourceColours": {scope: [shape["fill"]["color"] for shape in model[scope]["headerShapes"] if shape["id"].endswith("compact.header")][0] for scope in ["letter", "cv"]},
    "sameSourcePrimaryPdf": {"pages": 3, "producer": primary_pdf.metadata["producer"], "sourceEqualsNativeCandidate": True, "coloursLetterThenCv": primary_colours},
    "wordVisualEditingSaveReopen": "UNVERIFIED", "full39Acceptance": False, "productionEngineDefaultSwitched": False,
    "candidateSha256": hashlib.sha256(new_package.read_bytes()).hexdigest(),
}
write(out / "validation.json", validation)
write(out / "sha256.json", {str(p.relative_to(out)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(out.rglob("*")) if p.is_file() and p.name != "sha256.json"})
print(json.dumps({"browserCases": 10, "nativePages": 4, "pills": 7, "mediaPreserved": len(media), "candidateSha256": validation["candidateSha256"]}))
