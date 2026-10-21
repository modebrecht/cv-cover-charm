#!/usr/bin/env python3
"""Writer-only visual center check of diagnostic one-owner DOCX avatars.
Never interpret the result as Microsoft Word acceptance.
Examples:
  python scripts/docx-next-avatar-writer-gate.py --file Neon.docx --rect 132,26,50,50
  python scripts/docx-next-avatar-writer-gate.py --packet /tmp/docx-next-cover-family-ten
"""
import argparse
import json
import shutil
import subprocess
import tempfile
from pathlib import Path
from xml.etree import ElementTree as ET

NS = {"x": "http://www.w3.org/1999/xhtml"}
POINTS_PER_MM = 72 / 25.4


def probe(file, rect, initials):
    x, y, w, h = (n * POINTS_PER_MM for n in rect)
    with tempfile.TemporaryDirectory(prefix="avatar-writer-") as folder:
        folder = Path(folder)
        run = subprocess.run(
            ["libreoffice", "-env:UserInstallation=file://" + str(folder / "profile"),
             "--headless", "--convert-to", "pdf", "--outdir", str(folder), str(file)],
            capture_output=True, text=True, timeout=90,
        )
        pdf = folder / (file.stem + ".pdf")
        if run.returncode or not pdf.exists():
            raise RuntimeError("Writer failed: " + run.stdout + run.stderr)
        bbox = subprocess.run(
            ["pdftotext", "-f", "1", "-l", "1", "-bbox", str(pdf), "-"],
            capture_output=True, text=True, check=True,
        ).stdout
    root = ET.fromstring(bbox)
    matches = []
    for item in root.findall(".//x:word", NS):
        if (item.text or "").strip() != initials:
            continue
        matches.append(((float(item.get("xMin")) + float(item.get("xMax"))) / 2,
                        (float(item.get("yMin")) + float(item.get("yMax"))) / 2))
    inside = any(x <= a <= x + w and y <= z <= y + h for a, z in matches)
    center = any(x + .25*w <= a <= x + .75*w and
                 y + .25*h <= z <= y + .75*h for a, z in matches)
    return {"file": str(file), "initials": initials, "rectMm": rect,
            "visible": bool(matches), "insideCircle": inside,
            "centered": center, "status": "PASS" if center else "FAIL"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--file", type=Path)
    group.add_argument("--packet", type=Path)
    parser.add_argument("--rect", help="x,y,width,height mm")
    parser.add_argument("--initials", default="LM")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    for exe in ("libreoffice", "pdftotext"):
        if not shutil.which(exe):
            parser.error("Executable missing: " + exe)
    entries = []
    if args.file:
        if not args.rect:
            parser.error("--file needs --rect")
        values = [float(x) for x in args.rect.split(",")]
        if len(values) != 4:
            parser.error("--rect requires 4 mm values")
        entries.append((args.file, values, args.initials))
    else:
        for folder in sorted(args.packet.iterdir()):
            file = folder / "diagnostic-avatar.docx"
            snap = folder / "snapshot.json"
            if not file.exists() or not snap.exists():
                continue
            cover = json.loads(snap.read_text(encoding="utf8"))["cover"]
            if cover["data"].get("foto"):
                continue
            photo = next(block for block in cover["blocks"] if block["id"] == "foto")
            s = photo["style"]
            rect = [s["x"], s["y"], s["w"], s["w"] * s.get("ratio", 1)]
            initials = "".join(str(cover["data"].get(key, "")).strip()[:1]
                               for key in ("vorname", "nachname")).upper()
            entries.append((file, rect, initials))
        if not entries:
            parser.error("No diagnostic no-photo DOCX files in packet")
    results = []
    for file, rect, initials in entries:
        try:
            outcome = probe(file, rect, initials)
        except Exception as error:
            outcome = {"file": str(file), "status": "ERROR", "reason": str(error)}
        print(outcome["status"], file, outcome.get("insideCircle"),
              outcome.get("centered"))
        results.append(outcome)
    report = {"scope": "LibreOffice Writer only; not desktop Word",
              "total": len(results),
              "passed": sum(r["status"] == "PASS" for r in results),
              "results": results}
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, indent=2), encoding="utf8")
    print(report["passed"], "/", report["total"], "centered")
    if report["passed"] != report["total"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
