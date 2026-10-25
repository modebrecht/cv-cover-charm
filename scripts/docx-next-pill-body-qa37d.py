"""Validate actual app downloads; move badge story without changing printed layout."""
import hashlib
import json
import shutil
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

import fitz
from PIL import Image, ImageChops
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen.canvas import Canvas

chrome, previous_app, app, out = map(Path, sys.argv[1:5])
out.mkdir(parents=True, exist_ok=True)
cases = ["normal", "scaled", "long", "moved", "photo-portrait", "photo-circle", "hidden", "badge-center", "badge-right", "badge-long"]
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
badge_id = "cover.lehrbeginn.badge-paint"

def cover_controls(path):
    with zipfile.ZipFile(path) as z:
        xml = ET.fromstring(z.read("word/document.xml"))
        result = []
        for sdt in xml.findall(".//w:sdt", ns):
            tag = sdt.find("w:sdtPr/w:tag", ns)
            if tag is not None and tag.get(f'{{{ns["w"]}}}val', '').startswith("cover."):
                result.append((tag.get(f'{{{ns["w"]}}}val'), ''.join(sdt.itertext())))
        return result

results = []
for case in cases:
    after = app / case
    before = chrome / case if (chrome / case).exists() else previous_app / case
    render = before / "rendered" if (before / "rendered").exists() else before / "candidate"
    old = json.loads((before / "model.json").read_text())
    model = json.loads((after / "model.json").read_text())
    ev = json.loads((after / "app-evidence.json").read_text())
    for key in ["restoredThroughAppFileInput", "clickedAppExport", "savedDocumentsUnchangedByExport", "webSourceEqualsExportSource", "uiDownloadEqualsAppEntry", "neighborBodiesIdentical"]:
        assert ev[key], (case, key)
    assert sha(after / "baseline.docx") == sha(before / "baseline.docx")
    assert sha(after / "web.png") == sha(before / "web.png")
    assert model["cover"]["page"] == old["cover"]["page"]
    body_paint = [b for b in model["cover"]["blocks"] if b["kind"] == "decorative-shape"]
    old_paint = [b for b in old["cover"].get("headerShapes", []) if b["id"] == badge_id]
    assert body_paint == [{k:v for k,v in b.items() if k != "repeat"} for b in old_paint]
    assert [b for b in model["cover"]["blocks"] if b["kind"] != "decorative-shape"] == old["cover"]["blocks"]
    assert model["cover"]["headerShapes"] == [b for b in old["cover"]["headerShapes"] if b["id"] != badge_id]
    assert cover_controls(after / "candidate.docx") == cover_controls(before / "candidate.docx")
    with zipfile.ZipFile(after / "candidate.docx") as z:
        body = z.read("word/document.xml").decode()
        assert body.count(f'name="{badge_id}"') == (2 if body_paint else 0)
        assert all(badge_id not in z.read(n).decode() for n in z.namelist() if n.startswith("word/header") and n.endswith(".xml"))
        assert len(ET.fromstring(body).findall(".//w:sectPr", ns)) == 3
    for scope in ["letter", "cv"]:
        assert model[scope]["blocks"] == old[scope]["blocks"]
        assert model[scope]["page"] == old[scope]["page"]
    d = fitz.open(after / "rendered/candidate.pdf")
    prior = fitz.open(render / "candidate.pdf")
    assert len(d) == len(prior) == 4
    pixels, body_pixels, glyphs = [], [], []
    for i in range(4):
        a = Image.open(render / f"page-{i+1}.png").convert("RGB")
        b = Image.open(after / f"rendered/page-{i+1}.png").convert("RGB")
        assert a.size == b.size
        pixels.append(ImageChops.difference(a, b).getbbox() is None)
        box = (int(a.width*10/210), int(a.height*5/297), int(a.width*200/210), int(a.height*275/297))
        body_pixels.append(ImageChops.difference(a.crop(box), b.crop(box)).getbbox() is None)
        rect = fitz.Rect(10*72/25.4, 5*72/25.4, 200*72/25.4, 275*72/25.4)
        words = lambda p: [(round(w[0],3),round(w[1],3),round(w[2],3),round(w[3],3),w[4]) for w in p.get_text("words", clip=rect)]
        glyphs.append(words(d[i]) == words(prior[i]))
        assert all(d[i].rect.contains(fitz.Rect(w[:4])) for w in d[i].get_text("words"))
        assert abs(d[i].rect.width-595.2756)<.1 and abs(d[i].rect.height-841.8898)<.1
    assert pixels[0] and all(body_pixels) and all(glyphs), case
    if case in ["normal", "scaled", "long"]:
        assert all(pixels), case
        shutil.copyfile(after / "candidate.docx", out / f"modern-pill-body-{case}.docx")
    chrome_reference = json.loads((chrome / "normal/model.json").read_text())
    assert all(model[scope] == chrome_reference[scope] for scope in ["letter", "cv"])
    neighbor_full = []
    for i in range(2, 5):
        a = Image.open(chrome / "normal/rendered" / f"page-{i}.png").convert("RGB")
        b = Image.open(after / "rendered" / f"page-{i}.png").convert("RGB")
        neighbor_full.append(a.size == b.size and ImageChops.difference(a, b).getbbox() is None)
    assert all(neighbor_full), case
    if body_paint:
        p = body_paint[0]
        outer = fitz.Rect(p["xMm"]*72/25.4, p["yMm"]*72/25.4, (p["xMm"]+p["widthMm"])*72/25.4, (p["yMm"]+p["heightMm"])*72/25.4)
        source = json.loads((after / "snapshot.json").read_text())
        text = ''.join(next(b for b in source["cover"]["blocks"] if b["id"] == "lehrbeginn")["lines"])
        matches = d[0].search_for(text)
        assert matches and all(outer.contains(r) for r in matches), case
    results.append({"case":case, "pages":4, "coverPixelsUnchanged":pixels[0], "wholePagePixelsIdenticalToPriorCase":pixels, "neighborWholePagePixelsIdenticalToChromeCandidate":neighbor_full, "neighborBodyPixelsIdentical":body_pixels[1:], "neighborBodyGlyphPositionsIdentical":glyphs[1:], "nativeCoverControlsIdentical":True, "badgePaintInBody":bool(body_paint), "badgeAbsentFromHeaders":True, "webPixelsUnchanged":True, "defaultNextBytesUnchanged":True, "actualAppExport":True, "sha256":sha(after / "candidate.docx"), "wordAcceptance":"UNVERIFIED"})
    shutil.copyfile(after / "app-evidence.json", out / f"{case}-app-evidence.json")
    d.close()
    prior.close()
for name in ["project", "snapshot", "metrics", "model"]:
    shutil.copyfile(app / "normal" / f"{name}.json", out / f"normal-{name}.json")
(out / "validation.json").write_text(json.dumps(results, indent=2)+"\n")
pdf = Canvas(str(out / "pill-body-a4-comparison.pdf"), pagesize=landscape(A4))
w,h = landscape(A4)
pw = min((w-68)/3, (h-80)*210/297)
ph = pw*297/210
y = h-70-ph
for case in ["normal", "scaled", "long"]:
    pdf.setFont("Helvetica-Bold",12)
    pdf.drawString(18,h-23,f"Modern / {case}: body badge, unchanged print appearance")
    pdf.setFont("Helvetica",8)
    pdf.drawString(18,h-38,"Native panels: LibreOffice. Word editing and Save/Reopen UNVERIFIED; header dimming is not shown here.")
    for i,(label,file) in enumerate([("Actual saved Web",app/case/"web.png"),("Prior DOCX",chrome/case/"rendered/page-1.png"),("Body badge DOCX",app/case/"rendered/page-1.png")]):
        x=(w-3*pw-32)/2+i*(pw+16)
        pdf.setFont("Helvetica-Bold",9)
        pdf.drawString(x,y+ph+8,label)
        pdf.drawImage(ImageReader(str(file)),x,y,width=pw,height=ph)
    pdf.showPage()
pdf.save()
print(json.dumps({"cases":len(results),"pages":4*len(results),"coverPixelsUnchanged":all(r["coverPixelsUnchanged"] for r in results),"wordAcceptance":"UNVERIFIED"}))
