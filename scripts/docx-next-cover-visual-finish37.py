"""37B read-only outline/font QA and a bounded Word-test packet. No XML repairs."""
import hashlib
import io
import json
import math
import shutil
import sys
import zipfile
from pathlib import Path

import fitz
import numpy as np
from PIL import Image
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

work, word, out = map(Path, sys.argv[1:4])
out.mkdir(parents=True, exist_ok=True)
previous = Path("docs/qa/docx-next-cover-metrics-15okt")
cases = ["normal", "scaled", "long", "moved", "photo-portrait", "photo-circle", "hidden"]
sha = lambda data: hashlib.sha256(data).hexdigest()
checks = json.loads((work / "validation.json").read_text())
generation = json.loads((work / "generation.json").read_text())
rows = []
geometry = {}
for name in cases:
    folder = work / name
    data = (folder / "candidate.docx").read_bytes()
    assert data == (previous / name / "candidate.docx").read_bytes()
    assert json.loads((folder / "snapshot.json").read_text()) == json.loads((previous / name / "snapshot.json").read_text())
    assert (folder / "baseline.docx").read_bytes() == (Path("docs/qa/docx-next-cover-brief-fix-15okt") / name / "baseline.docx").read_bytes()
    row = next(c for c in checks["cases"] if c["case"] == name)
    generated = next(c for c in generation["cases"] if c["name"] == name)
    assert all(generated[key] for key in ["neighborModelsIdentical", "sourceImmutable", "jsonPackageIdentical", "productionRenderGuard"])
    web = json.loads((folder / "web-evidence.json").read_text())
    assert web["errors"] == []
    rows.append({"case": name, "candidateSha256": sha(data), "candidateByteIdenticalToAcceptedProducer": True, "sourceSnapshotIdentical": True, "baselineByteIdentical": True, "webSha256": sha((folder / "web.png").read_bytes()), "webErrors": web["errors"], "generation": generated, **{key: row[key] for key in ["candidatePages", "missingCoverText", "allCoverGlyphsWithinPage", "neighborPopplerPixelsIdentical", "measuredComposition"]}})
    (out / "web-evidence").mkdir(exist_ok=True)
    shutil.copyfile(folder / "web-evidence.json", out / "web-evidence" / f"{name}.json")
    # Glyph ink bounds and authored frame origins are different measurements.
    # Keep both in physical units instead of claiming browser/Word pixel parity.
    model = json.loads((folder / "model.json").read_text())
    before_pdf = fitz.open(folder / "baseline/baseline.pdf")
    after_pdf = fitz.open(folder / "candidate/candidate.pdf")
    fields = []
    for frame in model["cover"]["blocks"]:
        if frame["kind"] != "paragraph-frame":
            continue
        for paragraph in frame["paragraphs"]:
            query = "".join(run["text"] for run in paragraph["runs"]).strip()
            def bounds(page):
                rects = page.search_for(query) if query else []
                if not rects:
                    return None
                rect = fitz.Rect(rects[0])
                for extra in rects[1:]:
                    rect |= extra
                return [round(v * 25.4 / 72, 4) for v in rect]
            fields.append({"fieldId": paragraph["id"], "frameOriginMm": [frame["xMm"], frame["yMm"]], "frameWidthMm": frame["widthMm"], "baselineGlyphBoundsMm": bounds(before_pdf[0]), "candidateGlyphBoundsMm": bounds(after_pdf[0])})
    geometry[name] = {"measurements": "glyph ink bounds [x0,y0,x1,y1] in mm; not interchangeable with frame/CSS origins", "fields": fields, "webElements": web["exactFields"]}
    before_pdf.close()
    after_pdf.close()

(out / "physical-geometry.json").write_text(json.dumps(geometry, indent=2) + "\n")

scaled_bytes = (work / "scaled/candidate.docx").read_bytes()
assert scaled_bytes == (word / "candidate.docx").read_bytes()
with zipfile.ZipFile(io.BytesIO(scaled_bytes)) as archive:
    png = archive.read("word/media/decoration-1.png")
source = np.array(Image.open(io.BytesIO(png)).convert("RGBA"))
assert np.array_equal(source[:, :4], source[:, -4:][:, ::-1])
assert np.array_equal(source[:4], source[-4:][::-1])
assert np.all(source[:, :, 3] == 255)
word_pdf = fitz.open(word / "candidate-1.pdf")
native_pdf = fitz.open(work / "scaled/candidate/candidate.pdf")
word_image = Image.open(io.BytesIO(word_pdf.extract_image(word_pdf[0].get_images()[0][0])["image"])).convert("RGB")
word_pixels_identical = np.array_equal(np.array(word_image), source[:, :, :3])
assert word_pixels_identical

def edge_metrics(document, dpi):
    page = document[0]
    rect = page.get_image_rects(page.get_images()[0][0])[0]
    scale = dpi / 72
    pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
    image = np.array(Image.frombytes("RGB", (pix.width, pix.height), pix.samples))
    x0, x1 = round(rect.x0 * scale), round(rect.x1 * scale)
    y0, y1 = round(rect.y0 * scale), round(rect.y1 * scale)
    margin = max(10, (y1 - y0) // 10)
    result = {}
    for side, x in [("left", x0), ("right", x1)]:
        strip = image[y0 + margin:y1 - margin, x - 4:x + 5, :3].mean(axis=2)
        result[side] = {"minimumMeanGray": round(float(strip.mean(axis=0).min()), 3), "inkIntegralPx": round(float((255 - strip).sum(axis=1).mean() / 255), 4)}
    return result

edges = {name: {str(dpi): edge_metrics(document, dpi) for dpi in [120, 240, 600]} for name, document in [("Word365", word_pdf), ("LibreOfficeDev", native_pdf)]}
assert edges["Word365"]["120"]["left"] == edges["Word365"]["120"]["right"]
clip = fitz.Rect(126 * 72 / 25.4, 38 * 72 / 25.4, 184 * 72 / 25.4, 96 * 72 / 25.4)
for label, document in [("word", word_pdf), ("supplementary", native_pdf)]:
    document[0].get_pixmap(matrix=fitz.Matrix(4, 4), clip=clip).save(out / f"outline-{label}.png")

model = json.loads((work / "scaled/model.json").read_text())
font_rows = []
for block in model["cover"]["blocks"]:
    if block["kind"] != "paragraph-frame":
        continue
    for paragraph in block["paragraphs"]:
        run = paragraph["runs"][0]["style"]
        font_rows.append({"fieldId": paragraph["id"], "requestedFont": run["font"], "modelSizePt": run["sizePt"], "serializedSizePt": math.floor(run["sizePt"] * 2 + .5) / 2, "bold": run["bold"], "alignment": paragraph["align"], "modelTrackingPt": run.get("trackingPt", 0), "serializedTrackingPt": math.floor(run.get("trackingPt", 0) * 20 + .5) / 20, "minimumLeadingPt": paragraph.get("minimumLineHeightPt")})
spans = [span for block in word_pdf[0].get_text("dict")["blocks"] for line in block.get("lines", []) for span in line["spans"]]
profile = json.loads((work / "scaled/web-evidence.json").read_text())["fontProfile"]
fonts = {"measuredBrowserProfile": profile, "nativeContract": font_rows, "observedWordCoverFonts": sorted({s["font"] for s in spans}), "observedWordCoverSizesPt": sorted({s["size"] for s in spans}), "targetFontFileIdentity": "UNVERIFIED; family names and metric similarity do not establish font-file identity", "postMeasurementFieldTypographyOverrides": "REJECTED in measured composition; use authored block edits and fresh capture"}
(out / "font-profile.json").write_text(json.dumps(fonts, indent=2) + "\n")

names = {"normal": "brief-normal-word.docx", "scaled": "brief-115pct-word.docx", "long": "brief-long-title-word.docx"}
for name, filename in names.items():
    shutil.copyfile(work / name / "candidate.docx", out / filename)
hashes = {filename: sha((out / filename).read_bytes()) for filename in names.values()}
(out / "candidate-sha256.json").write_text(json.dumps(hashes, indent=2) + "\n")

pdf = canvas.Canvas(str(out / "brief-before-after-a4.pdf"), pagesize=landscape(A4))
pdf.setTitle("Package 37B Brief comparison and Word outline evidence")
w, h = landscape(A4)
for name in names:
    pdf.setFont("Helvetica-Bold", 13)
    pdf.drawString(18, h - 22, f"Brief / {name}: existing flow versus guarded measured candidate")
    pdf.setFont("Helvetica", 8)
    pdf.drawString(18, h - 36, "Same frozen source. 37B changes rejection of unsupported overrides; these valid candidate bytes remain unchanged from 4c0687e.")
    ph = h - 95
    pw = ph * 210 / 297
    for i, (label, path) in enumerate([("Unchanged production flow", work / name / "baseline/page-1.png"), ("Native Word-test candidate", work / name / "candidate/page-1.png")]):
        x = (w - 2 * pw - 24) / 2 + i * (pw + 24)
        pdf.setFont("Helvetica-Bold", 9)
        pdf.drawString(x, 32 + ph + 7, label)
        pdf.drawImage(ImageReader(str(path)), x, 32, width=pw, height=ph)
    pdf.showPage()
for name in names:
    pdf.setFont("Helvetica-Bold", 13)
    pdf.drawString(18, h - 22, f"Brief / {name}: real Web component versus native candidate")
    pdf.setFont("Helvetica", 8)
    pdf.drawString(18, h - 36, "Identical frozen snapshot; declared Liberation Sans profile. Supplementary native rendering, not desktop Word acceptance.")
    ph = h - 95
    pw = ph * 210 / 297
    for i, (label, path) in enumerate([("Actual CoverCanvas reference", work / name / "web.png"), ("Native Word-test candidate", work / name / "candidate/page-1.png")]):
        x = (w - 2 * pw - 24) / 2 + i * (pw + 24)
        pdf.setFont("Helvetica-Bold", 9)
        pdf.drawString(x, 32 + ph + 7, label)
        pdf.drawImage(ImageReader(str(path)), x, 32, width=pw, height=ph)
    pdf.showPage()
pdf.setFont("Helvetica-Bold", 13)
pdf.drawString(18, h - 25, "No-photo outline: genuine Word PDF versus supplementary PDF")
pdf.setFont("Helvetica", 9)
pdf.drawString(18, h - 44, "Source PNG is symmetric and opaque. Word PDF retains identical source pixels and dark, symmetric left/right edges.")
for i, name in enumerate(["word", "supplementary"]):
    pdf.drawString(90 + i * 350, h - 85, name)
    pdf.drawImage(ImageReader(str(out / f"outline-{name}.png")), 90 + i * 350, 120, width=250, height=250)
pdf.drawString(18, 60, "At 120 dpi: Word both edges gray 17; supplementary right edge about 192. At 240 dpi it is dark again.")
pdf.drawString(18, 44, "The demonstrated discrepancy is in the supplementary rendering/sampling path. No application drawing change is justified.")
pdf.showPage()
pdf.save()

# Optional rejected pre-fix export: preserve a bounded synthetic crop and exact
# overlap measurements, never distribute this unsupported document as a candidate.
if len(sys.argv) > 4:
    rejected = Path(sys.argv[4])
    rejected_pdf = fitz.open(rejected / "37b-unsupported-font-before.pdf")
    spans = [span for block in rejected_pdf[0].get_text("dict")["blocks"] for line in block.get("lines", []) for span in line["spans"]]
    title = next(s for s in spans if s["text"].strip() == "EFZ")
    name = next(s for s in spans if s["text"].strip() == "Lea Müller")
    intersection = fitz.Rect(title["bbox"]) & fitz.Rect(name["bbox"])
    assert not intersection.is_empty
    rejected_pdf[0].get_pixmap(matrix=fitz.Matrix(2, 2), clip=fitz.Rect(45, 355, 550, 480)).save(out / "rejected-font-override.png")
    negative = {"baseProducer": "b2609c694cb436b16920c99c05328f0de9e139da", "fixture": "scaled", "override": {"cover.profession": {"font": "Courier New"}}, "capturedPacket": "unchanged scaled Sans capture", "before": {"acceptedByBuilder": True, "nativeFont": title["font"], "titleSecondLineBboxPt": title["bbox"], "nameBboxPt": name["bbox"], "overlapWidthMm": intersection.width * 25.4 / 72, "overlapHeightMm": intersection.height * 25.4 / 72}, "after": "explicit model-construction rejection, covered by unit regression", "renderer": checks["engine"], "wordReproduction": "UNVERIFIED; no desktop Word available"}
    (out / "rejected-font-override.json").write_text(json.dumps(negative, indent=2) + "\n")

evidence = {"fetchedHead": "b2609c694cb436b16920c99c05328f0de9e139da", "sevenCases": rows, "outline": {"sourcePngSha256": sha(png), "sourceEdgesSymmetric": True, "sourceFullyOpaque": True, "wordPdfDecodedImagePixelsIdentical": word_pixels_identical, "edgeMethod": "9-pixel strips around each image edge, vertical corners excluded; relative ink integral, not a physical stroke-width estimator", "edgeMeasurements": edges, "verdict": "No confirmed Word/application-side light-edge defect for the supplied square placeholder; supplementary renderer/sampling discrepancy. Exact engine mechanism not investigated."}, "wordStatus": {"priorScaledSaveStability": "PASS from supplied evidence", "newNormalAndLongWordTest": "UNVERIFIED", "practicalEditingAndObservedCloseReopen": "UNVERIFIED"}, "candidateHashes": hashes, "productionActivation": False}
(out / "evidence.json").write_text(json.dumps(evidence, indent=2) + "\n")
print(json.dumps({"cases": len(rows), "candidates": hashes, "wordOutline": "PASS supplied case", "product": "PARTIAL"}))
