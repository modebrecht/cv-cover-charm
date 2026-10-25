"""Verify actual downloads and supplemental renders; never grants Word acceptance."""
import base64
import hashlib
import json
import re
import sys
import unicodedata
from pathlib import Path
from zipfile import ZipFile
import fitz

app, renders, output = map(Path, sys.argv[1:])
norm = lambda s: re.sub(r"\s+", "", unicodedata.normalize("NFKC", s)).casefold()

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

results = []
for item in json.loads((app / "results.json").read_text()):
    folder = app / item["id"]
    proof = json.loads((folder / "proof.json").read_text())
    number = item["id"][:2]
    native = fitz.open(renders / number / (item["id"] + ".pdf"))
    primary = fitz.open(folder / "Web-PDF.pdf")
    assert hashlib.sha256((app / item["file"]).read_bytes()).hexdigest() == item["sha256"]
    assert all(item[k] for k in ["restoredThroughApp", "reloadPreservedState", "uiDownloadByteIdentical", "exportPreservedState", "primaryPdfDownload"])
    assert not proof["model"]["issues"]
    native_cv = len(native) - 2
    if "mode" in item:
        assert native_cv == item["webCvPages"] == (1 if item["mode"] == "one" else 2)
    assert len(primary) == 2 + item["webCvPages"]
    text_native = norm("\n".join(p.get_text() for p in native))
    text_cv_native = norm("\n".join(p.get_text() for p in native.pages(2, len(native))))
    text_primary = norm("\n".join(p.get_text() for p in primary))
    checked, missing, web_cover_extraction_gaps, native_only_fields = 0, [], [], []
    for part in ["cover", "letter", "cv"]:
        for b in walk(proof["model"][part]["blocks"]):
            for run in b.get("runs", []):
                if not run.get("fieldId") or not norm(run["text"]):
                    continue
                checked += 1
                if norm(run["text"]) not in text_native:
                    missing.append({"source": "supplemental-native", "field": run["fieldId"], "text": run["text"]})
                if norm(run["text"]) not in text_primary:
                    finding = {"source": "same-source-Web-PDF", "field": run["fieldId"], "text": run["text"]}
                    if part == "cover":
                        # Existing primary PDF paints some cover text in its raster
                        # layer. It is a visual reference, not a searchable-cover gate.
                        web_cover_extraction_gaps.append(finding)
                    elif run["fieldId"] == "cv.section.person.heading" and item["template"] == "brief":
                        # The established Brief path still includes this native
                        # contact label; only the opt-in reading-row trial removes it.
                        native_only_fields.append(finding)
                    else:
                        missing.append(finding)
    assert not missing, (item["id"], missing)
    pills = []
    for b in walk(proof["model"]["cv"]["blocks"]):
        if b["kind"] != "paragraph" or not b.get("flowSurface"):
            continue
        shown = "".join(r["text"].upper() if r["style"].get("allCaps") else r["text"] for r in b["runs"])
        matches = [(n, r) for n, p in enumerate(native) for r in p.search_for(shown)]
        assert len(matches) == 1, (item["id"], shown, matches)
        n, ink = matches[0]
        surfaces = [fitz.Rect(i["bbox"]) for i in native[n].get_image_info() if abs(i["bbox"][1] - ink.y0) < 10 and i["bbox"][3] - i["bbox"][1] < 40]
        assert any(r.x0-1 <= ink.x0 and r.y0-1 <= ink.y0 and r.x1+1 >= ink.x1 and r.y1+1 >= ink.y1 for r in surfaces), (item["id"], shown, "ink outside pill")
        pills.append({"field": b["id"], "page": n+1, "inkInsideSurface": True})
    with ZipFile(app / item["file"]) as archive:
        xml = archive.read("word/document.xml").decode()
        media = [archive.read(name) for name in archive.namelist() if name.startswith("word/media/")]
        photos = [b["source"] for part in ["cover", "cv"] for b in walk(proof["model"][part]["blocks"]) if b["kind"] == "image" and b["source"].startswith("data:image/png;base64,")]
        assert all(base64.b64decode(source.split(",", 1)[1]) in media for source in photos), item["id"]
        controls = xml.count("<w:sdt>")
    results.append({"id": item["id"], "webCvPages": item["webCvPages"], "webPdfPages": len(primary), "supplementalNativePages": len(native), "supplementalNativeCvPages": native_cv, "semanticFieldsChecked": checked, "allNativeFieldsPresent": True, "letterCvWebPdfFieldsPresentExceptRecordedNativeLabels": True, "knownNativeOnlyLabels": native_only_fields, "webPdfNonExtractableCoverFields": web_cover_extraction_gaps, "nativeContentControls": controls, "originalPngSourcesPreserved": len(photos), "pillChecks": pills, "wordAcceptance": "UNVERIFIED"})
    print(json.dumps(results[-1], ensure_ascii=False))
output.write_text(json.dumps({"status": "PARTIAL pending Microsoft Word", "renderer": "Unmodified runtime LibreOfficeDev 26.8 supplemental rendering", "results": results}, ensure_ascii=False, indent=2)+"\n")
