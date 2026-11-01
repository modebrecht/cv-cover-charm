#!/usr/bin/env python3
"""Bounded observational DOCX Next converter trial; no product export changes.

Reuse the x39 parity report's normalization/scoring. Each source is an actual
single-document browser download. Missing output is BLOCKED, damaged content is
FAIL. SSIM alone never certifies fidelity or Microsoft Word compatibility.
"""
from __future__ import annotations
import argparse
from collections import Counter
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import time
import unicodedata
from xml.etree import ElementTree as ET
from zipfile import ZipFile

import fitz
import numpy as np
from PIL import Image, ImageDraw
from skimage.metrics import structural_similarity
from dossier_visual_parity import analysis_arrays, save_normalized_rgb

PARTS = ("cover", "letter", "cv")
COLORS = {"red": (223, 38, 56), "green": (25, 168, 103), "blue": (32, 79, 200), "yellow": (255, 240, 36)}


def tokens(text):
    text = unicodedata.normalize("NFKC", text).lower().replace("\u00ad", "")
    return Counter(re.findall(r"[\w@]+", text))


def expected_text(docx):
    with ZipFile(docx) as z:
        w = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
        r = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
        body = ET.fromstring(z.read("word/document.xml"))
        rels = {node.get("Id"): node.get("Target") for node in ET.fromstring(z.read("word/_rels/document.xml.rels"))}
        sections = body.findall(".//" + w + "sectPr")
        if len(sections) != 1:
            raise ValueError("POC requires one production single-document section")
        section = sections[0]
        active = "first" if section.find(w + "titlePg") is not None else "default"
        entries = ["word/document.xml"]
        # The fixture has one page: default + first stories are alternatives,
        # not duplicated visible text. Page count is checked independently.
        for node in section:
            if node.tag in (w + "headerReference", w + "footerReference") and node.get(w + "type") == active:
                entries.append("word/" + rels[node.get(r + "id")])
        return " ".join(node.text or "" for n in entries for node in ET.fromstring(z.read(n)).iter(w + "t"))


def recall(expected, actual):
    e, a = tokens(expected), tokens(actual)
    missing = e - a
    return {"recall": round(sum((e & a).values()) / max(1, sum(e.values())), 6), "missing_tokens": dict(missing)}


def run_conversion(command, target, log, timeout):
    # A zero exit code is insufficient: some Builder script errors return zero.
    target.unlink(missing_ok=True)
    timing = log.with_suffix(".resources.json")
    timed = ["/usr/bin/time", "-f", '{"max_rss_kib":%M,"elapsed_seconds":%e,"exit_code":%x}', "-o", str(timing), *command] if Path("/usr/bin/time").exists() else command
    start = time.monotonic()
    try:
        with log.open("w") as stream:
            proc = subprocess.Popen(timed, stdout=stream, stderr=subprocess.STDOUT, start_new_session=True)
            usage = None
            while True:
                pid, status, current = os.wait4(proc.pid, os.WNOHANG)
                if pid:
                    proc.returncode = os.waitstatus_to_exitcode(status)
                    usage = current
                    break
                if time.monotonic() - start > timeout:
                    import signal
                    os.killpg(proc.pid, signal.SIGKILL)
                    proc.wait()
                    raise subprocess.TimeoutExpired(command, timeout)
                time.sleep(.05)
        result = {"returncode": proc.returncode, "seconds": round(time.monotonic() - start, 3), "max_rss_kib": usage.ru_maxrss, "cpu_seconds": round(usage.ru_utime + usage.ru_stime, 3)}
        if timing.exists():
            for line in timing.read_text().splitlines():
                if line.startswith("{"):
                    result.update(json.loads(line))
        if proc.returncode or not target.is_file() or target.stat().st_size < 1000:
            raise RuntimeError(f"No usable PDF; exit={proc.returncode}; see {log.name}")
        with fitz.open(target) as pdf:
            if not pdf.page_count: raise RuntimeError("Empty PDF")
        return result
    except (OSError, subprocess.TimeoutExpired, RuntimeError) as exc:
        if isinstance(exc, subprocess.TimeoutExpired):
            log.write_text(str(exc))
        return {"status": "BLOCKED", "error": str(exc), "seconds": round(time.monotonic() - start, 3)}


def inspect_pdf(path, images_dir, prefix):
    pages, text, signatures = [], [], []
    with fitz.open(path) as doc:
        metadata = doc.metadata
        geometry = []
        image_count = []
        for i, page in enumerate(doc):
            pix = page.get_pixmap(matrix=fitz.Matrix(96 / 72, 96 / 72), alpha=False)
            rgb = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
            out = images_dir / f"{prefix}-{i+1}.png"
            save_normalized_rgb(rgb, out)
            pages.append(out)
            text.append(page.get_text())
            geometry.append([round(page.rect.width, 2), round(page.rect.height, 2)])
            image_count.append(len(page.get_image_info()))
            arr = np.asarray(rgb).astype(np.int16)
            colors = {}
            for name, color in COLORS.items():
                mask = (np.abs(arr - np.array(color)).max(axis=2) < 18)
                y, x = np.where(mask)
                colors[name] = {"pixels": int(mask.sum()), "bbox_px": [int(x.min()), int(y.min()), int(x.max()), int(y.max())] if len(x) else None}
            signatures.append(colors)
    return {"pdf_metadata": metadata, "pages": len(pages), "page_geometry_pt": geometry, "visible_image_instances": image_count, "text": "\n".join(text), "photo_colors": signatures, "raster_sha256": [hashlib.sha256(p.read_bytes()).hexdigest() for p in pages]}, pages


def scores(left, right):
    if len(left) != len(right): return None
    result = []
    for a, b in zip(left, right):
        ar, ag = analysis_arrays(a); br, bg = analysis_arrays(b)
        result.append({"rgb_ssim": round(float(structural_similarity(ar, br, data_range=255, channel_axis=2)), 6), "layout_ssim": round(float(structural_similarity(ag, bg, data_range=255)), 6)})
    return result


def contact_sheet(paths, target):
    width, height = 340, 481
    names = ("App PDF", "LibreOffice", "ONLYOFFICE")
    count = max((len(p) for p in paths), default=1)
    sheet = Image.new("RGB", (3 * width, 32 + height * count), "#dddddd")
    draw = ImageDraw.Draw(sheet)
    for col, (name, pages) in enumerate(zip(names, paths)):
        draw.text((col * width + 12, 10), name, fill="black")
        for row, path in enumerate(pages):
            with Image.open(path) as im: sheet.paste(im.resize((width, height)), (col * width, 32 + row * height))
        if not pages: draw.text((col * width + 12, 60), "BLOCKED", fill="red")
    sheet.save(target)


# The SDK renders the license mark as 19 filled glyph outlines, absent from the
# PDF text layer. Signature measured in all three actual 10.0.0.170 CI PDFs.
SDK10_WATERMARK_GLYPHS = [282, 198, 129, 80, 110, 176, 31, 166, 80, 129, 80, 133, 46, 80, 129, 31, 176, 15, 198]


def check_builder_watermark(pdf):
    """Known pinned-build outline mark; visual review remains required.

    Never modify the PDF or erase the mark. Match its exact gray glyph path
    counts, widths/heights and 10.0.0 producer rather than trusting text alone.
    """
    evidence = []
    with fitz.open(pdf) as document:
        producer = document.metadata.get("producer", "")
        for page in document:
            glyphs = [len(d["items"]) for d in page.get_drawings()
                if d.get("fill") and all(abs(c - 192 / 255) < .001 for c in d["fill"])
                and 20 < d["rect"].width < 100 and 20 < d["rect"].height < 100]
            found = producer.startswith("ONLYOFFICE/10.0.0.") and any(
                glyphs[i:i + len(SDK10_WATERMARK_GLYPHS)] == SDK10_WATERMARK_GLYPHS
                for i in range(len(glyphs) - len(SDK10_WATERMARK_GLYPHS) + 1))
            evidence.append({"page": page.number + 1, "glyph_path_counts": glyphs, "detected": found})
    return {"detected": any(e["detected"] for e in evidence), "evidence": evidence,
        "scope": "measured SDK 10.0.0.170 outlined license mark; other builds need visual review"}


def audit_retained_report(directory):
    """Recheck exact retained CI PDFs; do not rerun/relabel conversion metrics."""
    path = directory / "RESULTS.json"
    report = json.loads(path.read_text())
    failures = []
    for row in report["documents"]:
        for converter, result in row["converters"].items():
            for index, run in enumerate(result["runs"]):
                if "pages" not in run: continue
                pdf = directory / converter / f"run-{index+1}" / f"{row['part']}.pdf"
                run["watermark_check"] = check_builder_watermark(pdf)
                if run["watermark_check"]["detected"]:
                    run.setdefault("structural_status", run["status"])
                    run["status"] = "FAIL"
                    run["failure_reason"] = "Visible Unregistered Version license watermark"
            if any(run["status"] == "FAIL" for run in result["runs"]):
                result["status"] = "FAIL"
                failures.append(f"{row['part']}/{converter}")
    report["visual_audit"] = {"method": "known SDK glyph outline signature on exact retained CI PDFs plus inspected contact sheets", "failed": failures, "note": "Watermarked SSIM is contaminated; no clean engine-fidelity ranking."}
    path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(report["visual_audit"], indent=2))
    return 1 if failures else 0


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--source-dir", type=Path)
    p.add_argument("--out-dir", type=Path)
    p.add_argument("--onlyoffice", default="", help="CLI executable/wrapper with configured fonts/runtime")
    p.add_argument("--libreoffice", default="libreoffice")
    p.add_argument("--repeats", type=int, default=2, choices=range(1, 4))
    p.add_argument("--timeout", type=int, default=90)
    p.add_argument("--audit-report", type=Path, help="Audit exact retained report PDFs without installing/rerunning converters")
    args = p.parse_args()
    if args.audit_report:
        return audit_retained_report(args.audit_report.resolve())
    if not args.source_dir or not args.out_dir or not args.onlyoffice:
        p.error("--source-dir, --out-dir and --onlyoffice are required for conversion")
    args.source_dir = args.source_dir.resolve(); args.out_dir = args.out_dir.resolve()
    out = args.out_dir; out.mkdir(parents=True, exist_ok=True)
    images = out / "rendered"; images.mkdir(exist_ok=True)
    report = {"source": json.loads((args.source_dir / "SOURCE.json").read_text()), "repeats": args.repeats, "documents": [], "limitations": ["Text extraction can include hidden text; inspect the contact sheets.", "SSIM is observational, not a release gate or a Word oracle.", "Only Modern/sidebar is accepted by the current production DOCX Next guard."]}
    for item in report["source"]["files"]:
        path = args.source_dir / item["filename"]
        if hashlib.sha256(path.read_bytes()).hexdigest() != item["sha256"]:
            raise ValueError(f"Source hash mismatch: {item['filename']}")
    for part in PARTS:
        source = args.source_dir / f"{part}.docx"
        expected = expected_text(source)
        row = {"part": part, "converters": {}, "comparisons": {}}
        app, app_paths = inspect_pdf(args.source_dir / f"{part}.pdf", images, f"{part}-app")
        app.update(recall(expected, app.pop("text")))
        app["status"] = "PASS" if app["recall"] >= .98 else "VISUAL_REVIEW"
        row["app_pdf"] = app
        all_paths = [app_paths]
        for converter, exe in (("libreoffice", args.libreoffice), ("onlyoffice", args.onlyoffice)):
            rounds, first_paths = [], []
            for repeat in range(args.repeats):
                folder = out / converter / f"run-{repeat+1}"; folder.mkdir(parents=True, exist_ok=True)
                target = folder / f"{part}.pdf"
                if converter == "onlyoffice":
                    script = folder / f"{part}.js"
                    script.write_text(f'builder.OpenFile({json.dumps(str(source))}, "");\nbuilder.SaveFile("pdf", {json.dumps(str(target))});\nbuilder.CloseFile();\n')
                    cmd = [exe, str(script)]
                else:
                    profile = folder / f"profile-{part}"
                    cmd = [exe, "--headless", "--nologo", "--nodefault", "--nofirststartwizard", f"-env:UserInstallation={profile.as_uri()}", "--convert-to", "pdf", "--outdir", str(folder), str(source)]
                measured = run_conversion(cmd, target, folder / f"{part}.log", args.timeout)
                if measured.get("status") == "BLOCKED":
                    rounds.append(measured); break
                try:
                    facts, paths = inspect_pdf(target, images, f"{part}-{converter}-{repeat+1}")
                    facts.update(recall(expected, facts.pop("text")))
                    facts["resources"] = measured
                    facts["watermark_check"] = check_builder_watermark(target)
                    photo_ok = part != "cv" or all(any(page[c]["pixels"] >= 40 for page in facts["photo_colors"]) for c in COLORS)
                    facts["photo_visible"] = photo_ok if part == "cv" else None
                    facts["status"] = "PASS" if facts["pages"] == app["pages"] and facts["recall"] >= .98 and photo_ok and not facts["watermark_check"]["detected"] else "FAIL"
                    if facts["watermark_check"]["detected"]:
                        facts["failure_reason"] = "Visible Unregistered Version license watermark"
                    rounds.append(facts)
                    if not first_paths: first_paths = paths
                except Exception as exc:
                    rounds.append({"status": "FAIL", "error": str(exc)})
            stable = len(rounds) == args.repeats and all(r.get("raster_sha256") == rounds[0].get("raster_sha256") for r in rounds)
            status = "BLOCKED" if any(r["status"] == "BLOCKED" for r in rounds) else "PASS" if all(r["status"] == "PASS" for r in rounds) and stable else "FAIL"
            row["converters"][converter] = {"status": status, "raster_repeatable": stable, "runs": rounds}
            row["comparisons"][f"app_{converter}"] = scores(app_paths, first_paths)
            all_paths.append(first_paths)
        row["comparisons"]["libreoffice_onlyoffice"] = scores(all_paths[1], all_paths[2])
        contact_sheet(all_paths, out / f"{part}-comparison.png")
        report["documents"].append(row)
    (out / "RESULTS.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    lines = ["# P2-01 DOCX Next converter trial", "", f"Source commit: `{report['source']['sha']}`. Synthetic inputs; generated calibration card.", "", "PASS = page count matches App PDF, >=98% XML token recall, CV card visible, repeatable raster, no detected SDK license watermark.", "SSIM is observational; watermark-contaminated scores cannot rank clean renderer fidelity. Inspect comparison PNGs.", "", "| Document | App PDF | LibreOffice | ONLYOFFICE | App/LO RGB SSIM | App/OO RGB SSIM | LO/OO RGB SSIM |", "|---|---|---|---|---:|---:|---:|"]
    for r in report["documents"]:
        means = [f"{np.mean([x['rgb_ssim'] for x in values]):.3f}" if values else "n/a" for values in r["comparisons"].values()]
        lines.append(f"| {r['part']} | {r['app_pdf']['status']} | {r['converters']['libreoffice']['status']} | {r['converters']['onlyoffice']['status']} | {' | '.join(means)} |")
    lines += ["", *report["limitations"]]
    (out / "SUMMARY.md").write_text("\n".join(lines) + "\n")
    print("\n".join(lines))
    # Trial produces a usable BLOCKED report; never disguise content failures.
    return 1 if any(c["status"] == "FAIL" for r in report["documents"] for c in r["converters"].values()) else 0

if __name__ == "__main__":
    raise SystemExit(main())
