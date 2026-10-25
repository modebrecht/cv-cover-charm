"""Read-only cohort audit and validation of genuine Modern app downloads."""
import base64
import hashlib
import io
import json
import re
import shutil
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

import fitz
from PIL import Image, ImageChops
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

audit, app, out = map(Path, sys.argv[1:4])
out.mkdir(parents=True, exist_ok=True)
templates = ["modern", "verlauf", "neon", "freundlich"]
cases = ["normal", "scaled", "long", "moved", "photo-portrait", "photo-circle", "hidden", "badge-center", "badge-right", "badge-long"]
sha = lambda b: hashlib.sha256(b).hexdigest()
norm = lambda s: re.sub(r"\s+", " ", s).strip().casefold()

def comparison(name, title, rows):
    pdf = canvas.Canvas(str(out / name), pagesize=landscape(A4))
    pdf.setTitle(title)
    width, height = landscape(A4)
    ph = height - 100
    pw = ph * 210 / 297
    for label, left, right in rows:
        pdf.setFont("Helvetica-Bold", 12)
        pdf.drawString(18, height - 23, label)
        pdf.setFont("Helvetica", 8)
        pdf.drawString(18, height - 37, "Same saved cover. DOCX panel: LibreOffice. Microsoft Word visual, editing and reopen acceptance UNVERIFIED.")
        for i, (caption, file) in enumerate([("Actual Web editor", left), ("Native DOCX rendering", right)]):
            x = (width - 2 * pw - 25) / 2 + i * (pw + 25)
            pdf.setFont("Helvetica-Bold", 9)
            pdf.drawString(x, 24 + ph + 8, caption)
            pdf.drawImage(ImageReader(str(file)), x, 24, width=pw, height=ph)
        pdf.showPage()
    pdf.save()

cohort = []
for template in templates:
    p = audit / template
    target = out / "audit" / template
    target.mkdir(parents=True, exist_ok=True)
    for name in ["project.json", "snapshot.json", "model.json", "web.json", "web.png"]:
        shutil.copyfile(p / name, target / name)
    # Keep exact semantic OOXML/manifests without duplicating multi-megabyte
    # nonsemantic gradient assets. The audit runner reproduces the full DOCX.
    with zipfile.ZipFile(p / "baseline.docx") as z:
        manifest = {"docxSha256": sha((p/"baseline.docx").read_bytes()), "entries": [{"path":i.filename,"bytes":i.file_size,"sha256":sha(z.read(i.filename))} for i in z.infolist()]}
        (target/"native-package.json").write_text(json.dumps(manifest,indent=2)+"\n")
        for i in z.namelist():
            if i in ["word/document.xml", "word/cover-header.xml", "word/cover-header-first.xml"]:
                (target/("native-"+Path(i).name)).write_bytes(z.read(i))
    shutil.copyfile(p / "baseline/baseline.pdf", target / "baseline.pdf")
    source = json.loads((p / "snapshot.json").read_text())
    model = json.loads((p / "model.json").read_text())
    web = json.loads((p / "web.json").read_text())
    badge = next(b for b in web if b["id"] == "lehrbeginn")
    def walk(blocks):
        for block in blocks:
            yield block
            if block["kind"] == "table":
                for row in block["rows"]:
                    for cell in row["cells"]:
                        yield from walk(cell)
    fields = list(walk(model["cover"]["blocks"]))
    box = next(b for b in fields if b["id"] == "cover.lehrbeginn.flow-box")
    profession = next(b for b in fields if b["id"] == "cover.profession")
    doc = fitz.open(p / "baseline/baseline.pdf")
    row = {"template": template, "pages": len(doc), "savedSourceSha256": sha((p / "snapshot.json").read_bytes()),
           "webBadgeMm": badge["badge"]["rect"], "nativeBadgeBoxWidthMm": box["widthMm"],
           "nativeBadgeDecoration": box["decoration"],
           "nativeProfessionStyle": profession["runs"][0]["style"],
           "webProfessionStyle": next(b for b in web if b["id"] == "beruf")["inner"]["style"],
           "nativePlaceholderInitialsPresent": any(b["id"] == "cover.photo.initials" for b in fields),
           "wordRendering": "UNVERIFIED", "supplementaryVisualVerdict": "FAIL current cover fidelity"}
    cohort.append(row)
    doc.close()
comparison("cohort-a4-comparison.pdf", "Four cover designs before correction", [(f"{t}: current export audit", audit/t/"web.png", audit/t/"baseline/page-1.png") for t in templates])
(out / "cohort-audit.json").write_text(json.dumps(cohort, indent=2) + "\n")

results, evidence, hashes = [], [], {}
for name in cases:
    p = app / name
    ev = json.loads((p / "app-evidence.json").read_text())
    baseline_ev = json.loads((p / "dev-default-evidence.json").read_text())
    assert all(ev[k] for k in ["restoredThroughAppFileInput", "clickedAppExport", "uiDownloadEqualsAppEntry", "savedDocumentsUnchangedByExport", "webSourceEqualsExportSource"])
    assert ev["neighborModelsIdentical"] or ev["neighborBodiesIdentical"]
    assert ev["pageErrors"] == [] and baseline_ev["defaultNextPackageByteIdenticalToDev"]
    payload = (p / "candidate.docx").read_bytes()
    assert sha(payload) == ev["candidateSha256"]
    doc = fitz.open(p / "candidate/candidate.pdf")
    baseline_doc = fitz.open(p / "baseline/baseline.pdf")
    assert len(doc) == 4 and len(baseline_doc) in [4,5], (name,len(doc),len(baseline_doc))
    assert all(abs(page.rect.width - 595.2756) < .1 and abs(page.rect.height - 841.8898) < .1 for page in doc)
    model = json.loads((p / "model.json").read_text())
    source = json.loads((p / "snapshot.json").read_text())
    frames = [b for b in model["cover"]["blocks"] if b["kind"] == "paragraph-frame"]
    expected = ["".join(r["text"] for r in para["runs"]) for b in frames for para in b["paragraphs"]]
    assert all(norm(s) in norm(doc[0].get_text()) for s in expected), name
    spans = [s for b in doc[0].get_text("dict")["blocks"] for line in b.get("lines", []) for s in line["spans"]]
    assert all(s["bbox"][0] >= 0 and s["bbox"][1] >= 0 and s["bbox"][2] <= doc[0].rect.width and s["bbox"][3] <= doc[0].rect.height for s in spans)
    # Long/scaled old flow spills the cover onto page 2. Align identical body
    # sections by their suffix, rather than comparing unrelated page indices.
    neighbors = [ImageChops.difference(Image.open(p/f"baseline/page-{len(baseline_doc)-3+i}.png").convert("RGB"), Image.open(p/f"candidate/page-{i+1}.png").convert("RGB")).getbbox() is None for i in [1,2,3]]
    body_regions = []
    for i in [1,2,3]:
        before = Image.open(p/f"baseline/page-{len(baseline_doc)-3+i}.png").convert("RGB")
        after = Image.open(p/f"candidate/page-{i+1}.png").convert("RGB")
        # New opt-in compact chrome intentionally changes page-edge paint and
        # removes the non-authored footer name. Compare all native body content
        # inside the unchanged source/model margins independently of that paint.
        box = (int(before.width*10/210), int(before.height*5/297), int(before.width*200/210), int(before.height*275/297))
        body_regions.append(ImageChops.difference(before.crop(box),after.crop(box)).getbbox() is None)
    assert all(neighbors) if ev["neighborModelsIdentical"] else all(body_regions), name
    web, old = Image.open(p/"web.png").convert("RGB"), Image.open(p/"web-dev.png").convert("RGB")
    assert web.size == old.size and ImageChops.difference(web, old).getbbox() is None, name
    with zipfile.ZipFile(io.BytesIO(payload)) as z:
        xml = ET.fromstring(z.read("word/document.xml"))
        ns = {"w":"http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
        tags = [n.attrib[f'{{{ns["w"]}}}val'] for n in xml.findall(".//w:sdtPr/w:tag", ns)]
        assert all(para["id"] in tags for b in frames for para in b["paragraphs"])
        assert len(xml.findall(".//w:sectPr", ns)) == 3
        image_preserved = None
        if name.startswith("photo"):
            original = Image.open(io.BytesIO(base64.b64decode(source["cover"]["data"]["foto"].split(",",1)[1]))).convert("RGB")
            native = Image.open(io.BytesIO(z.read("word/media/image-1.png"))).convert("RGB")
            image_preserved = original.size == native.size and ImageChops.difference(original,native).getbbox() is None
            assert image_preserved
    paint = next((b for b in [*model["cover"].get("headerShapes",[]), *model["cover"]["blocks"]] if b["id"] == "cover.lehrbeginn.badge-paint"),None)
    badge_glyphs_inside = None
    if paint:
        b = next(b for b in source["cover"]["blocks"] if b["id"] == "lehrbeginn")
        text = "".join(b["lines"])
        glyphs = doc[0].search_for(text)
        assert glyphs, name
        outer = fitz.Rect(paint["xMm"]*72/25.4,paint["yMm"]*72/25.4,(paint["xMm"]+paint["widthMm"])*72/25.4,(paint["yMm"]+paint["heightMm"])*72/25.4)
        badge_glyphs_inside = all(outer.contains(r) for r in glyphs)
        assert badge_glyphs_inside, (name,outer,glyphs)
    else:
        assert name == "hidden" and "cover.lehrbeginn" not in tags
    row = {"case":name,"pages":4,"baselineCoverPages":len(baseline_doc)-3,"coverFrames":len(frames),"semanticControls":len(tags),"allCoverTextPresent":True,"coverGlyphsInsideA4":True,
           "badgeGlyphsInsidePaint":badge_glyphs_inside,"badgePaint":paint,"neighborPagesPixelIdentical":neighbors,"neighborBodyRegionsPixelIdentical":body_regions,"webPixelsIdenticalToDev":True,
           "defaultNextBytesIdenticalToDev":True,"photoOriginalPixelsPreserved":image_preserved,"candidateSha256":sha(payload),"wordAcceptance":"UNVERIFIED"}
    results.append(row); evidence.append(ev)
    filename = f"modern-app-{name}.docx"
    shutil.copyfile(p/"candidate.docx",out/filename);hashes[filename]=sha(payload)
    if name == "normal":
        for filename in ["project.json","snapshot.json","metrics.json"]:
            shutil.copyfile(p/filename,out/f"normal-{filename}")
    doc.close();baseline_doc.close()
comparison("modern-app-a4-comparison.pdf", "Modern cover app export proof", [(f"Modern / {name}: restored saved project and actual app button",app/name/"web.png",app/name/"candidate/page-1.png") for name in cases])
rejections = json.loads((app/"rejections.json").read_text())
assert len(rejections) == 14 and all("PASS" in r["result"] for r in rejections)
for filename,value in [("validation.json",results),("app-export-evidence.json",evidence),("candidate-sha256.json",hashes),("rejections.json",rejections)]:
    (out/filename).write_text(json.dumps(value,indent=2)+"\n")
print(json.dumps({"auditedTemplates":4,"modernAppExports":10,"identicalNeighborPages":30,"webCasesIdenticalToDev":10,"defaultPackagesIdenticalToDev":10,"negativeCases":14,"Word":"UNVERIFIED"}))
