"""Validate the real preset/UI downloads and retain a compact Word-review packet."""
import hashlib
import json
import re
import shutil
import sys
import unicodedata
from pathlib import Path
from zipfile import ZipFile

import fitz
from PIL import Image, ImageChops

app, one_render, two_render, baseline_render, previous, out = map(Path, sys.argv[1:])
out.mkdir(parents=True, exist_ok=True)
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
norm = lambda s: re.sub(r"\s+", "", unicodedata.normalize("NFKC", s)).casefold()


def walk(blocks):
    for b in blocks:
        yield b
        if b["kind"] == "section":
            if b.get("heading"):
                yield b["heading"]
            yield from walk(b["blocks"])
        elif "blocks" in b:
            yield from walk(b["blocks"])
        elif b["kind"] == "table":
            for row in b["rows"]:
                for cell in row["cells"]:
                    yield from walk(cell)


results = []
for mode, rendered, expected in [("one", one_render, 1), ("two", two_render, 2)]:
    proof = json.loads((app / mode / "proof.json").read_text())
    native = fitz.open(rendered / "candidate.pdf")
    primary = fitz.open(app / mode / "primary.pdf")
    assert len(native) == len(primary) == expected + 2
    assert proof["web"]["pages"] == expected
    assert proof["restored"] and proof["uiDownloadByteIdentical"] and proof["error"] is None
    assert proof["snapshot"]["cv"]["design"]["bodyScale"] is not None
    texts = [norm("\n".join(p.get_text() for p in pdf.pages(2, len(pdf)))) for pdf in [native, primary]]
    for b in walk(proof["model"]["cv"]["blocks"]):
        if b["kind"] != "paragraph":
            continue
        for run in b["runs"]:
            if run.get("fieldId"):
                assert all(norm(run["text"]) in text for text in texts), (mode, run["fieldId"])
    pills = []
    for heading in walk(proof["model"]["cv"]["blocks"]):
        if heading["kind"] != "paragraph" or not heading.get("flowSurface"):
            continue
        shown = "".join(r["text"].upper() if r["style"].get("allCaps") else r["text"] for r in heading["runs"])
        matches = [(n, r) for n, p in enumerate(native) for r in p.search_for(shown)]
        assert len(matches) == 1, (mode, shown, matches)
        n, ink = matches[0]
        boxes = [fitz.Rect(i["bbox"]) for i in native[n].get_image_info() if abs(i["bbox"][1] - ink.y0) < 10 and i["bbox"][3] - i["bbox"][1] < 30]
        assert any(r.x0-1 <= ink.x0 and r.y0-1 <= ink.y0 and r.x1+1 >= ink.x1 and r.y1+1 >= ink.y1 for r in boxes), (mode, shown)
        pills.append({"field": heading["id"], "page": n+1, "inkInsideSurface": True})
    assert len(pills) == 7
    for n in [1, 2]:
        before, after = [Image.open(p / f"page-{n}.png").convert("RGB") for p in [baseline_render, rendered]]
        assert before.size == after.size and ImageChops.difference(before, after).getbbox() is None
    (out / mode).mkdir(exist_ok=True)
    shutil.copyfile(app / mode / "proof.json", out / mode / "proof.json")
    results.append({"mode": mode, "webCvPages": expected, "primaryPdfCvPages": expected, "nativeCvPages": expected, "reload": True, "actualUiDocxByteIdentical": True, "allCvFieldsPresentInBothPdfs": True, "coverLetterPixelIdentical": True, "pillChecks": pills})

assert sha(app / "one/candidate.docx") == sha(app / "toggle/candidate.docx")
assert sha(app / "default/candidate.docx") == sha(previous)
for mode in ["toggle", "default"]:
    p = json.loads((app / mode / "proof.json").read_text())
    assert p["restored"] and p["uiDownloadByteIdentical"] and p["error"] is None
results += [{"mode":"two-to-one-and-repeat-one","sameDocxAsOne":True},{"mode":"unchanged-default","sameDocxAs09":True}]
shutil.copyfile(app / "one/ui-download.docx", out / "10-Modern-Alles-auf-1-Seite.docx")
(out / "validation.json").write_text(json.dumps({"status":"PARTIAL","renderer":"LibreOffice; Microsoft Word remains unverified","results":results,"sha256":sha(out / "10-Modern-Alles-auf-1-Seite.docx")},ensure_ascii=False,indent=2)+"\n")
print(json.dumps({"results":results,"candidateSha256":sha(out / "10-Modern-Alles-auf-1-Seite.docx")},ensure_ascii=False,indent=2))
