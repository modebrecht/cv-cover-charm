"""Read-only QA of genuine app downloads and a bounded, reproducible packet."""
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

root, out = map(Path, sys.argv[1:3])
out.mkdir(parents=True, exist_ok=True)
cases = ["normal", "scaled", "long", "moved", "photo-portrait", "photo-circle", "hidden"]
sha = lambda b: hashlib.sha256(b).hexdigest()
norm = lambda s: re.sub(r"\s+", " ", s).strip().casefold()
results, app_rows, hashes = [], [], {}
pdf = canvas.Canvas(str(out / "brief-app-a4-comparison.pdf"), pagesize=landscape(A4))
pdf.setTitle("Brief application export validation")
for name in cases:
    p = root / name
    app = json.loads((p / "app-evidence.json").read_text())
    default = json.loads((p / "dev-default-evidence.json").read_text())
    assert all(app[k] for k in ["restoredThroughAppFileInput", "clickedAppExport", "uiDownloadEqualsAppEntry", "savedDocumentsUnchangedByExport", "webSourceEqualsExportSource", "neighborModelsIdentical"])
    assert app["pageErrors"] == [] and default["defaultNextPackageByteIdenticalToDev"]
    candidate_bytes = (p / "candidate.docx").read_bytes()
    assert sha(candidate_bytes) == app["candidateSha256"]
    before = fitz.open(p / "baseline/baseline.pdf")
    after = fitz.open(p / "candidate/candidate.pdf")
    assert len(before) == len(after) == 4
    assert all(abs(page.rect.width - 595.2756) < .1 and abs(page.rect.height - 841.8898) < .1 for page in after)
    model = json.loads((p / "model.json").read_text())
    metrics = json.loads((p / "metrics.json").read_text())
    snapshot = json.loads((p / "snapshot.json").read_text())
    frames = [b for b in model["cover"]["blocks"] if b["kind"] == "paragraph-frame"]
    expected = ["".join(r["text"] for r in para["runs"]) for b in frames for para in b["paragraphs"]]
    missing = [s for s in expected if norm(s) not in norm(after[0].get_text())]
    spans = [s for b in after[0].get_text("dict")["blocks"] for line in b.get("lines", []) for s in line["spans"]]
    in_bounds = all(s["bbox"][0] >= 0 and s["bbox"][1] >= 0 and s["bbox"][2] <= after[0].rect.width and s["bbox"][3] <= after[0].rect.height for s in spans)
    assert not missing and in_bounds
    assert len([s for s in spans if s["size"] > 30]) == metrics["blocks"]["beruf"]["lines"]
    neighbors = [ImageChops.difference(Image.open(p / f"baseline/page-{i}.png").convert("RGB"), Image.open(p / f"candidate/page-{i}.png").convert("RGB")).getbbox() is None for i in [2, 3, 4]]
    assert all(neighbors)
    web, old = Image.open(p / "web.png").convert("RGB"), Image.open(p / "web-dev.png").convert("RGB")
    assert web.size == old.size and ImageChops.difference(web, old).getbbox() is None
    with zipfile.ZipFile(io.BytesIO(candidate_bytes)) as archive:
        xml = ET.fromstring(archive.read("word/document.xml"))
        w = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
        ids = [n.attrib[f'{{{w["w"]}}}val'] for n in xml.findall(".//w:sdtPr/w:tag", w)]
        assert all(para["id"] in ids for b in frames for para in b["paragraphs"])
        assert len(xml.findall(".//w:sectPr", w)) == 3
        image_pixels = None
        if name.startswith("photo"):
            source = Image.open(io.BytesIO(base64.b64decode(snapshot["cover"]["data"]["foto"].split(",", 1)[1]))).convert("RGB")
            normalized = Image.open(io.BytesIO(archive.read("word/media/image-1.png"))).convert("RGB")
            image_pixels = source.size == normalized.size and ImageChops.difference(source, normalized).getbbox() is None
            assert image_pixels
    image = next((b for b in model["cover"]["blocks"] if b["kind"] == "image"), None)
    row = {"case": name, "pages": len(after), "coverFrameCount": len(frames), "semanticControls": len(ids), "missingCoverText": missing,
           "coverGlyphsWithinA4": in_bounds, "professionLines": metrics["blocks"]["beruf"]["lines"], "neighborPagesPixelIdentical": neighbors,
           "webEditorPixelsIdenticalToDev": True, "defaultNextPackageByteIdenticalToDev": True,
           "candidateSha256": sha(candidate_bytes), "sourceSnapshotSha256": sha((p / "snapshot.json").read_bytes()),
           "measuredProfile": metrics["profile"], "framesMm": [{k: b[k] for k in ["id", "xMm", "yMm", "widthMm"]} for b in frames],
           "photoOriginalPixelsPreserved": image_pixels, "photoGeometry": {k: image[k] for k in ["xMm", "yMm", "widthMm", "frame"]} if image else None,
           "wordAcceptance": "UNVERIFIED for these app-generated packages"}
    results.append(row)
    app_rows.append(app)
    filename = f"brief-app-{name}.docx"
    shutil.copyfile(p / "candidate.docx", out / filename)
    hashes[filename] = sha(candidate_bytes)
    # The full inputs are reproducible from the saved-project fixture; retain
    # the representative actual project/snapshot/packet explicitly as evidence.
    if name == "normal":
        for f in ["project.json", "snapshot.json", "metrics.json"]:
            shutil.copyfile(p / f, out / f"normal-{f}")
    pw, ph = (landscape(A4)[1] - 90) * 210 / 297, landscape(A4)[1] - 90
    width, height = landscape(A4)
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(18, height - 22, f"Brief / {name}: real saved-project restore and app button export")
    pdf.setFont("Helvetica", 8)
    pdf.drawString(18, height - 36, "Same normalized cover source. Declared system Liberation Sans profile; native supplementary rendering. Word UNVERIFIED.")
    for i, (label, file) in enumerate([("Actual Web editor", p / "web.png"), ("Actual app DOCX download", p / "candidate/page-1.png")]):
        x = (width - pw * 2 - 24) / 2 + i * (pw + 24)
        pdf.setFont("Helvetica-Bold", 9)
        pdf.drawString(x, 25 + ph + 7, label)
        pdf.drawImage(ImageReader(str(file)), x, 25, width=pw, height=ph)
    pdf.showPage()
    before.close()
    after.close()
pdf.save()
rejections = json.loads((root / "rejections.json").read_text())
assert len(rejections) == 8 and all("PASS" in r["result"] for r in rejections)
for filename, value in [("validation.json", {"scope": "Brief only", "cases": results, "adjacentPagesPixelIdentical": 21, "webEditorCasesPixelIdenticalToDev": 7, "defaultNextPackagesByteIdenticalToDev": 7, "fullItem37": "PARTIAL"}), ("app-export-evidence.json", app_rows), ("candidate-sha256.json", hashes), ("rejections.json", rejections)]:
    (out / filename).write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")
print(json.dumps({"cases": 7, "neighborPages": 21, "webRegression": "7/7 identical", "defaultNextRegression": "7/7 byte-identical", "rejections": 8}))
