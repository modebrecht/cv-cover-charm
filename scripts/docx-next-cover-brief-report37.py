"""Read-only native QA and A4 comparison. No DOCX/XML mutations."""
import json
import re
import sys
from pathlib import Path

import fitz
from PIL import Image, ImageChops
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader

measured = "--measured" in sys.argv
args = [value for value in sys.argv[1:] if value != "--measured"]
root = Path(args[0])
before_web = Path(args[1]) if len(args) > 1 else None
cases = ["normal", "moved", "long", "scaled", "photo-portrait", "photo-circle", "hidden"]
normalize = lambda text: re.sub(r"\s+", " ", text).strip().casefold()
results = []
pdf = canvas.Canvas(str(root / "brief-a4-comparison.pdf"), pagesize=landscape(A4))
pdf.setTitle("Item 37 Brief candidate — supplementary comparison, Word UNVERIFIED")
for name in cases:
    folder = root / name
    baseline = fitz.open(folder / "baseline/baseline.pdf")
    candidate = fitz.open(folder / "candidate/candidate.pdf")
    model = json.loads((folder / "model.json").read_text())
    web = json.loads((folder / "web-evidence.json").read_text())
    paragraphs = [p for b in model["cover"]["blocks"] if b["kind"] == "paragraph-frame" for p in b["paragraphs"]]
    expected = ["".join(r["text"] for r in p["runs"]) for p in paragraphs]
    text = candidate[0].get_text()
    missing = [v for v in expected if normalize(v) not in normalize(text)]
    neighbors = [ImageChops.difference(Image.open(folder / "baseline" / f"page-{i}.png").convert("RGB"), Image.open(folder / "candidate" / f"page-{i}.png").convert("RGB")).getbbox() is None for i in range(2, len(baseline) + 1)]
    unchanged_web = None if before_web is None else ImageChops.difference(Image.open(folder / "web.png").convert("RGB"), Image.open(before_web / name / "web.png").convert("RGB")).getbbox() is None
    spans = [s for b in candidate[0].get_text("dict")["blocks"] if "lines" in b for line in b["lines"] for s in line["spans"]]
    bounds = all(s["bbox"][0] >= 0 and s["bbox"][1] >= 0 and s["bbox"][2] <= candidate[0].rect.width and s["bbox"][3] <= candidate[0].rect.height for s in spans)
    profession = next(b for b in web["exactFields"] if b["id"] == "beruf")
    word_lines = [s["text"] for s in spans if s["size"] > 30]
    metric_checks = None
    if measured:
        expected_lines = web["textMetrics"]["blocks"]["beruf"]["lines"]
        assert len(word_lines) == expected_lines
        aliases = {"fullName": "name", "profession": "beruf"}
        deltas = {}
        for block in model["cover"]["blocks"]:
            if block["kind"] != "paragraph-frame" or ".initials." in block["id"]:
                continue
            source_id = block["id"][6:-6]
            source_id = aliases.get(source_id, source_id)
            deltas[source_id] = block["yMm"] - web["resolverPositions"][source_id]["y"]
        assert all(abs(delta) < 0.001 for delta in deltas.values())
        title_spans = [s for s in spans if s["size"] > 30]
        leading_delta_mm = None
        if len(title_spans) > 1:
            actual = (title_spans[1]["origin"][1] - title_spans[0]["origin"][1]) * 25.4 / 72
            expected_advance = float(profession["lineHeight"].removesuffix("px")) * 25.4 / 96
            leading_delta_mm = actual - expected_advance
            assert abs(leading_delta_mm) < 0.1
        metric_checks = {"expectedProfessionLines": expected_lines, "actualProfessionLines": len(word_lines), "frameVsResolverYDeltaMm": deltas, "twoLineProfessionLeadingDeltaMm": leading_delta_mm}
    visual_gate = "PARTIAL: measured composition checks pass; Word and thin outline remain" if measured else ("FAIL wrapping/font parity" if name == "scaled" else "PARTIAL typography/font and Word gate")
    entry = {"case": name, "baselinePages": len(baseline), "candidatePages": len(candidate), "missingCoverText": missing, "allCoverGlyphsWithinPage": bounds, "neighborPopplerPixelsIdentical": neighbors, "webPixelsIdenticalToBase": unchanged_web, "browserActualFonts": web["platformFonts"], "nativePdfFonts": sorted({s["font"] for s in spans}), "webProfessionElementHeightMm": profession["heightMm"], "nativeProfessionLines": word_lines, "measuredComposition":metric_checks, "visualGate": visual_gate, "wordAcceptance": "UNVERIFIED"}
    assert len(candidate) == len(baseline) == 4
    assert not missing and bounds and all(neighbors)
    if before_web is not None: assert unchanged_web
    results.append(entry)
    w, h = landscape(A4)
    pdf.setFillColorRGB(0,0,0)
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(18,h-20,f"Brief / {name} / Word UNVERIFIED")
    pdf.setFont("Helvetica",8)
    pdf.drawString(18,h-34,"Same snapshot; supplementary LibreOfficeDev 26.8 alpha. " + ("Declared Liberation Sans profile." if measured else "Local font fallbacks differ.") + " Covers shown at equal scale.")
    panel_h = h-90
    panel_w = panel_h*210/297
    margin=(w-2*panel_w-24)/2
    for i,(title,file) in enumerate([("Actual Web component",folder/"web.png"),("Native candidate",folder/"candidate/page-1.png")]):
        x=margin+i*(panel_w+24); y=30
        pdf.setFont("Helvetica-Bold",9);pdf.drawString(x,y+panel_h+8,title)
        pdf.drawImage(ImageReader(str(file)),x,y,width=panel_w,height=panel_h)
        pdf.setLineWidth(.25);pdf.rect(x,y,panel_w,panel_h)
    pdf.setFont("Helvetica",8)
    pdf.drawString(18,14,"Measured composition checks pass; desktop Word/Save-Reopen and outline acceptance remain open." if measured else "115% scale: differing title wrap is a failed fidelity gate. No all-39 expansion or production promotion.")
    pdf.showPage()
pdf.save()
(root/"validation.json").write_text(json.dumps({"scope":"Brief only, seven controlled fixtures", "engine":"LibreOfficeDev 26.8.0.0.alpha0 2c87e51eeaa2b413ff4ae097b2705eea1995d8e5", "browser":"Chromium 143.0.7499.0", "wordAcceptance":"UNVERIFIED", "fullItem37":"PARTIAL", "cases":results},ensure_ascii=False,indent=2))
print(json.dumps({"cases":len(results),"nativeStructuralPass":len(results),"neighborPagesPixelIdentical":sum(len(r["neighborPopplerPixelsIdentical"]) for r in results),"visualAcceptance":"PARTIAL measured composition; Word UNVERIFIED" if measured else "FAILED scale case; Word UNVERIFIED"}))
