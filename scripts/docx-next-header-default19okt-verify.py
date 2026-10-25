"""Check common starts in actual App PDFs and supplemental native renders.

Uses glyph positions as a second gate, so a correct section margin followed by
an unintended 12 mm native spacer cannot produce a false pass. No Word claim.
"""
import hashlib
import json
import sys
from collections import Counter
from pathlib import Path
from zipfile import ZipFile
import base64
import re
import unicodedata
import fitz

app, renders, output = map(Path, sys.argv[1:])
normalize = lambda s: re.sub(r"\s+", "", unicodedata.normalize("NFKC", s)).casefold()


def walk(blocks):
    for b in blocks:
        yield b
        if b.get("heading"):
            yield b["heading"]
        for key in ["blocks", "paragraphs"]:
            yield from walk(b.get(key, []))
        if b["kind"] == "table":
            for row in b["rows"]:
                for cell in row["cells"]:
                    yield from walk(cell)


def first_body_ink(page, header_height):
    lines = [line for b in page.get_text("dict")["blocks"] if b["type"] == 0
             for line in b["lines"] if header_height + 1 < line["bbox"][1] * 25.4 / 72 < 280]
    return min(line["bbox"][1] * 25.4 / 72 for line in lines)


results = []
for item in json.loads((app / "results.json").read_text()):
    folder = app / item["id"]
    proof = json.loads((folder / "proof.json").read_text())
    model = proof["model"]
    native = fitz.open(renders / item["id"][:2] / (item["id"] + ".pdf"))
    primary = fitz.open(folder / "Web-PDF.pdf")
    assert hashlib.sha256((app / item["file"]).read_bytes()).hexdigest() == item["sha256"]
    assert not model["issues"]
    assert all(item[k] for k in ["restoredThroughApp", "reloadPreservedState",
                               "uiDownloadByteIdentical", "exportPreservedState", "primaryPdfDownload"])
    geometry = item["webPageGeometry"]
    assert len(primary) == 1 + len(geometry)
    assert all(abs(g["gapMm"] - (40 if item["id"].startswith("05") else 20)) < .02 for g in geometry)
    tops = proof["snapshot"]["settings"]["flowPageTops"]
    for scope in ["letter", "cv"]:
        assert model[scope]["page"]["margins"]["top"] == tops[scope]["continuationMm"]
        assert model[scope]["layout"]["pagination"]["firstPageLeadMm"] == 0
        assert tops[scope]["firstMm"] == tops[scope]["continuationMm"]
    if item["id"].startswith("04"):
        assert model["letter"]["blocks"][0]["id"] == "letter.recipient.company"
        assert len([g for g in geometry if g["scope"] == "Letter"]) == 2
        assert len([g for g in geometry if g["scope"] == "CV"]) == 2
    # All native interior pages share the known top in this cohort. A 2 mm
    # allowance covers different font ascenders/paragraph line metrics, not a
    # second margin. This fails the reproduced pre-fix 64 mm recipient start.
    target = tops["letter"]["firstMm"]
    height = geometry[0]["heightMm"]
    native_ink = [first_body_ink(p, height) for p in native.pages(1, len(native))]
    assert all(abs(y - target) < 2 for y in native_ink), (item["id"], target, native_ink)
    web_ink = [first_body_ink(p, height) for p in primary.pages(1, len(primary))]
    assert all(abs(y - target) < 2 for y in web_ink), (item["id"], target, web_ink)
    text_native = normalize("\n".join(p.get_text() for p in native))
    fields = 0
    texts = Counter()
    for scope in ["cover", "letter", "cv"]:
        for block in walk(model[scope]["blocks"]):
            shown = normalize("".join(r["text"].upper() if r["style"].get("allCaps") else r["text"]
                                      for r in block.get("runs", [])))
            if shown:
                assert shown in text_native, (item["id"], block["id"], shown)
                if scope != "cover":
                    texts[shown] += 1
            fields += sum(bool(r.get("fieldId") and normalize(r["text"])) for r in block.get("runs", []))
    assert all(text_native.count(t) >= n for t, n in texts.items())
    with ZipFile(app / item["file"]) as archive:
        media = [archive.read(n) for n in archive.namelist() if n.startswith("word/media/")]
        photos = [b["source"] for scope in ["cover", "cv"] for b in walk(model[scope]["blocks"])
                  if b["kind"] == "image" and b["source"].startswith("data:image/png;base64,")]
        assert all(base64.b64decode(src.split(",", 1)[1]) in media for src in photos)
    results.append({"id": item["id"], "topMm": target, "webGeometry": geometry,
                    "appPdfPages": len(primary), "supplementalDocxPages": len(native),
                    "appPdfFirstInkMm": web_ink, "nativeFirstInkMm": native_ink,
                    "semanticFields": fields, "allParagraphTextsPreserved": True,
                    "originalImagesPreserved": True, "wordAcceptance": "UNVERIFIED"})
    print(json.dumps(results[-1], ensure_ascii=False))
output.write_text(json.dumps({"status": "PASS automated; Microsoft Word unverified",
                              "renderer": "LibreOffice supplemental, not Microsoft Word",
                              "results": results}, ensure_ascii=False, indent=2) + "\n")
