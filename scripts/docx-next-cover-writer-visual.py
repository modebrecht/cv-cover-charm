#!/usr/bin/env python3
"""Audit real full-app cover DOCX exports against their saved Web reference.

Input: output directory of scripts/docx-next-cover-family-ten.ts with
DOCX_NEXT_FULL_APP_QA=1. LibreOffice Writer evidence is NOT Microsoft Word
Save/Reopen and never authorizes production export by itself.
"""
import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path
from xml.etree import ElementTree as ET

from PIL import Image, ImageChops, ImageStat

PT_TO_MM = 25.4 / 72
WORD_NS = {"x": "http://www.w3.org/1999/xhtml"}
AUDIT_IDS = ("eyebrow", "kicker", "beruf", "name", "lehrbeginn", "kontaktTitel", "beilagenTitel")


def run(argv, timeout=120):
    proc = subprocess.run(argv, capture_output=True, text=True, timeout=timeout)
    if proc.returncode:
        raise RuntimeError(f"{' '.join(map(str, argv[:2]))}: {proc.stderr[-350:] or proc.stdout[-350:]}")
    return proc.stdout


def words_on_cover(pdf):
    xml = run(["pdftotext", "-f", "1", "-l", "1", "-bbox", str(pdf), "-"])
    doc = ET.fromstring(xml)
    words = []
    for elem in doc.findall(".//x:word", WORD_NS):
        value = " ".join((elem.text or "").split())
        if value:
            words.append({
                "text": value,
                "x0": float(elem.attrib["xMin"]) * PT_TO_MM,
                "x1": float(elem.attrib["xMax"]) * PT_TO_MM,
                "y0": float(elem.attrib["yMin"]) * PT_TO_MM,
                "y1": float(elem.attrib["yMax"]) * PT_TO_MM,
            })
    return words


def words_for_text(words, query):
    tokens = query.casefold().split()
    found = []
    for i in range(len(words) - len(tokens) + 1):
        if [w["text"].casefold() for w in words[i:i + len(tokens)]] == tokens:
            seq = words[i:i + len(tokens)]
            found.append({
                "x0": min(w["x0"] for w in seq), "x1": max(w["x1"] for w in seq),
                "y0": min(w["y0"] for w in seq), "y1": max(w["y1"] for w in seq),
            })
    return found


def center(rect):
    return ((rect["x0"] + rect["x1"]) / 2, (rect["y0"] + rect["y1"]) / 2)


def compare_web_text(web, words):
    results = []
    for block in web:
        if block.get("id") not in AUDIT_IDS or not block.get("text", "").strip():
            continue
        rect = block.get("rect") or {}
        if not all(isinstance(rect.get(k), (int, float)) for k in ("x", "y", "w", "h")):
            continue
        query = " ".join(block["text"].split())
        matches = words_for_text(words, query)
        if not matches:
            results.append({"id": block["id"], "status": "NOT_FOUND", "webText": query})
            continue
        align = (block.get("style") or {}).get("textAlign", "left")
        want_x = rect["x"] + (rect["w"] / 2 if align == "center" else rect["w"] if align == "right" else 0)
        want_y = rect["y"] + rect["h"] / 2

        def offset(word):
            x = (word["x0"] + word["x1"]) / 2 if align == "center" else (
                word["x1"] if align == "right" else word["x0"])
            return x - want_x, center(word)[1] - want_y

        candidate = min(matches, key=lambda m: sum(abs(v) for v in offset(m)))
        dx, dy = offset(candidate)
        results.append({
            "id": block["id"],
            "status": "PASS" if max(abs(dx), abs(dy)) <= 9 else "DRIFT",
            "dxMm": round(dx, 2), "dyMm": round(dy, 2), "text": query,
        })
    return results


def check_case(folder, soffice, pages_required, image_size):
    files = [folder / name for name in
             ("full-app-native.docx", "snapshot.json", "web-cover.json", "web-cover.png")]
    if not all(p.is_file() for p in files):
        raise ValueError("Missing actual application DOCX, saved snapshot or Web reference")
    source = json.loads(files[1].read_text(encoding="utf-8"))["cover"]
    web = json.loads(files[2].read_text(encoding="utf-8"))
    photo = next((b for b in source["blocks"] if b["id"] == "foto"), None)
    output = folder / "writer-visual"
    output.mkdir(exist_ok=True)
    profile = (output / "writer-profile").resolve().as_uri()
    run([soffice, "-env:UserInstallation=" + profile, "--headless",
         "--convert-to", "pdf", "--outdir", str(output), str(files[0])])
    pdf = output / "full-app-native.pdf"
    if not pdf.is_file():
        raise RuntimeError("Writer did not create the full-dossier PDF")
    info = run(["pdfinfo", str(pdf)])
    pages = int(next(line.split(":", 1)[1].strip() for line in info.splitlines() if line.startswith("Pages:")))
    words = words_on_cover(pdf)
    text_results = compare_web_text(web, words)
    initials = "".join((source["data"].get(k) or "")[:1] for k in ("vorname", "nachname")).upper()
    expect_initials = bool(photo and not source["data"].get("foto") and not photo["style"].get("hidden"))
    error = None
    if expect_initials:
        style = photo["style"]
        desired = (style["x"] + style["w"] / 2,
                   style["y"] + style["w"] * style.get("ratio", 1) / 2)
        matches = words_for_text(words, initials)
        if matches:
            error = min([
                (round(center(m)[0] - desired[0], 2), round(center(m)[1] - desired[1], 2))
                for m in matches
            ], key=lambda e: abs(e[0]) + abs(e[1]))
    png = output / "page1.png"
    run(["pdftoppm", "-f", "1", "-l", "1", "-scale-to-x", str(image_size[0]),
         "-scale-to-y", str(image_size[1]), "-png", "-singlefile",
         str(pdf), str(png.with_suffix(""))], timeout=90)
    web_image = Image.open(files[3]).convert("RGB").resize(image_size)
    word_image = Image.open(png).convert("RGB").resize(image_size)
    mae = sum(ImageStat.Stat(ImageChops.difference(web_image, word_image)).mean) / 3
    photo_region_difference = None
    if photo and source["data"].get("foto") and not photo["style"].get("hidden"):
        # A missing or wrongly cropped portrait affects only a small fraction
        # of A4. Whole-page pixel similarity can hide a significant failure.
        style = photo["style"]
        x = style["x"] / 210 * image_size[0]
        y = style["y"] / 297 * image_size[1]
        w = style["w"] / 210 * image_size[0]
        h = style["w"] * style.get("ratio", 1) / 297 * image_size[1]
        crop = (max(0, int(x)), max(0, int(y)),
                min(image_size[0], int(x + w)), min(image_size[1], int(y + h)))
        if crop[2] <= crop[0] or crop[3] <= crop[1]:
            raise ValueError("Actual uploaded photo has no valid on-page region")
        a = web_image.crop(crop)
        z = word_image.crop(crop)
        photo_region_difference = sum(ImageStat.Stat(ImageChops.difference(a, z)).mean) / 3
    side = Image.new("RGB", (image_size[0] * 2, image_size[1]), "white")
    side.paste(web_image, (0, 0))
    side.paste(word_image, (image_size[0], 0))
    side.save(output / "web-vs-writer.jpg", quality=88)
    reasons = []
    if pages_required and pages != pages_required:
        reasons.append(f"page-count {pages} vs {pages_required}")
    if expect_initials and (error is None or any(abs(x) > 2 for x in error)):
        reasons.append("editable initials missing or >2mm from saved avatar center")
    if photo_region_difference is not None and photo_region_difference > 35:
        reasons.append("uploaded photo region differs from Web by >35/255 RGB MAE")
    reasons.extend("cover text " + x["status"].lower() + ": " + x["id"]
                   for x in text_results if x["status"] != "PASS")
    if not text_results:
        reasons.append("No comparable Web cover text fields: visual acceptance impossible")
    return {
        "case": folder.name, "status": "REVIEW" if reasons else "PASS_WITH_LIMITATIONS",
        "pages": pages, "initials": initials if expect_initials else None,
        "initialsErrorMm": error, "textMetrics": text_results,
        "meanPixelDifference": round(mae, 2),
        "photoRegionPixelDifference": round(photo_region_difference, 2)
        if photo_region_difference is not None else None,
        "reasons": reasons,
        "preview": str((output / "web-vs-writer.jpg").relative_to(folder.parent)),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("batch", type=Path)
    parser.add_argument("--soffice", default=shutil.which("libreoffice") or shutil.which("soffice"))
    parser.add_argument("--pages", type=int, default=4)
    parser.add_argument("--width", type=int, default=686)
    parser.add_argument("--height", type=int, default=970)
    args = parser.parse_args()
    if not args.soffice:
        parser.error("LibreOffice is required; pass --soffice")
    if not all(shutil.which(x) for x in ("pdfinfo", "pdftotext", "pdftoppm")):
        parser.error("Poppler pdfinfo, pdftotext and pdftoppm are required")
    folders = sorted(p for p in args.batch.iterdir() if p.is_dir() and
                     ((p / "full-app-native.docx").exists() or (p / "snapshot.json").exists()))
    if not folders:
        parser.error("No genuine application DOCX cases found")
    results = []
    for folder in folders:
        try:
            result = check_case(folder, args.soffice, args.pages, (args.width, args.height))
        except Exception as exc:
            result = {"case": folder.name, "status": "FAIL", "reasons": [str(exc)]}
        results.append(result)
        print(folder.name, result["status"], result["reasons"], flush=True)
    report = {
        "renderer": "LibreOffice Writer, not Desktop Microsoft Word",
        "cases": len(results),
        "passedWithLimitations": sum(x["status"] == "PASS_WITH_LIMITATIONS" for x in results),
        "requireReview": sum(x["status"] != "PASS_WITH_LIMITATIONS" for x in results),
        "results": results,
    }
    (args.batch / "writer-visual-evidence.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "results"}, ensure_ascii=False))
    return 0 if report["requireReview"] == 0 and len(results) == 10 else 1


if __name__ == "__main__":
    sys.exit(main())
