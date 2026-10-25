"""Validate the unmodified app export and retain a compact reproducible packet."""
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

app, rendered, before_rendered, long_rendered, out = map(Path, sys.argv[1:])
out.mkdir(parents=True, exist_ok=True)
norm = lambda s: re.sub(r"\s+", "", unicodedata.normalize("NFKC", s)).casefold()
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


def walk(blocks):
    for block in blocks:
        yield block
        if block["kind"] == "section":
            if block.get("heading"):
                yield block["heading"]
            yield from walk(block["blocks"])
        elif "blocks" in block:
            yield from walk(block["blocks"])
        elif block["kind"] == "table":
            for row in block["rows"]:
                for cell in row["cells"]:
                    yield from walk(cell)


proof = json.loads((app / "app-proof.json").read_text())
pdf = fitz.open(rendered / "09-Modern-CV-Zeilen-und-Listen.pdf")
assert len(pdf) == 4
text = norm("\n".join(page.get_text() for page in pdf))
missing = []
for part in ["cover", "letter", "cv"]:
    for b in walk(proof["model"][part]["blocks"]):
        if b["kind"] != "paragraph":
            continue
        for run in b["runs"]:
            if run.get("fieldId") and norm(run["text"]) not in text:
                missing.append(run["fieldId"])
assert not missing, missing

pill_checks = []
for heading in walk(proof["model"]["cv"]["blocks"]):
    if heading["kind"] != "paragraph" or not heading.get("flowSurface"):
        continue
    shown = "".join(r["text"].upper() if r["style"].get("allCaps") else r["text"] for r in heading["runs"])
    matches = [(n, rect) for n, page in enumerate(pdf) for rect in page.search_for(shown)]
    assert len(matches) == 1, (shown, matches)
    index, ink = matches[0]
    surfaces = [fitz.Rect(i["bbox"]) for i in pdf[index].get_image_info() if i["bbox"][2] - i["bbox"][0] > 400 and abs(i["bbox"][1] - ink.y0) < 10 and i["bbox"][3] - i["bbox"][1] < 30]
    assert any(r.x0 - 1 <= ink.x0 and r.y0 - 1 <= ink.y0 and r.x1 + 1 >= ink.x1 and r.y1 + 1 >= ink.y1 for r in surfaces), (shown, list(ink), surfaces)
    pill_checks.append({"field": heading["id"], "page": index + 1, "inkInsideSurface": True})
assert len(pill_checks) == 7

with ZipFile(app / "08-reproduced.docx") as old, ZipFile(app / "09-Modern-CV-Zeilen-und-Listen.docx") as new:
    changed = [name for name in set(old.namelist()) | set(new.namelist()) if name not in old.namelist() or name not in new.namelist() or old.read(name) != new.read(name)]
    assert set(changed) == {"word/document.xml", "word/numbering.xml"}, changed
    old_xml, new_xml = [etree.fromstring(z.read("word/document.xml")) for z in [old, new]]
    tags = lambda root: set(root.xpath("//w:sdtPr/w:tag/@w:val", namespaces=ns))
    assert tags(old_xml) - tags(new_xml) == {"cv.section.person.heading"}
    assert not tags(new_xml) - tags(old_xml)
    assert len(new_xml.xpath("//w:numPr", namespaces=ns)) == 6

adjacent = []
for index in [1, 2]:
    a, b = [Image.open(root / f"page-{index}.png").convert("RGB") for root in [before_rendered, rendered]]
    assert a.size == b.size and ImageChops.difference(a, b).getbbox() is None
    adjacent.append({"page": index, "pixelIdentical": True})

long_pdf = fitz.open(long_rendered / "reading-rows-long.pdf")
long_text = norm("\n".join(p.get_text() for p in long_pdf))
assert all(norm(f"Abschnitt {n}:") in long_text for n in range(1, 161))
assert len(long_pdf) > 4
assert sum("Abschnitt" in p.get_text() for p in long_pdf) > 1

results = json.loads((app / "results.json").read_text())
assert len(results) == 5 and all(r["unchangedFields"] and r["unchangedSource"] and r["unchangedCoverLetter"] for r in results)
for template in [r["template"] for r in results]:
    folder = out / template
    folder.mkdir(exist_ok=True)
    for name in ["project.json", "snapshot.json", "model.json"]:
        shutil.copyfile(app / template / name, folder / name)
for name in ["09-Modern-CV-Zeilen-und-Listen.docx", "results.json", "app-proof.json"]:
    shutil.copyfile(app / name, out / name)
validation = {
    "status": "PARTIAL", "supplementaryRenderer": "LibreOffice not Microsoft Word",
    "pages": len(pdf), "webCvPages": 1, "nativeCvPages": 2,
    "knownPageDifference": "Only references remain on the second native CV page",
    "changedPackagePartsFrom08": changed, "adjacentPages": adjacent,
    "allMediaAndHeadersByteIdentical": True, "pillChecks": pill_checks,
    "nativeListItems": 6, "fieldsRemoved": ["cv.section.person.heading"],
    "longDiagnostic": {"pages": len(long_pdf), "all160MarkersPresent": True, "descriptionFlowsAcrossPages": True, "scope": "text-only pagination diagnostic; browser decorations omitted"},
    "sha256": sha(out / "09-Modern-CV-Zeilen-und-Listen.docx"),
    "wordRenderingAndSaveReopen": "UNVERIFIED",
}
(out / "validation.json").write_text(json.dumps(validation, ensure_ascii=False, indent=2) + "\n")
print(json.dumps(validation, ensure_ascii=False, indent=2))
