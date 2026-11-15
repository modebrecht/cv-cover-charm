"""Actual Writer saves and renders of UI downloads; never a Microsoft Word acceptance."""
import argparse
import base64
import hashlib
import importlib.util
import json
from pathlib import Path
import posixpath
import shutil
import subprocess
import sys
from zipfile import ZipFile

import fitz
import numpy as np
from PIL import Image

spec = importlib.util.spec_from_file_location(
    "reader", Path(__file__).with_name("docx-next-word-acceptance-23okt.py"))
reader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reader)
NS = {**reader.NS, "wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"}
CASES = ("cv-left", "cv-right", "letter-two-pages", "dossier")


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def compact(text):
    return "".join(c for c in text if c.isalnum()).casefold()


def assert_source_photos(name, metadata, assets):
    expected = ({"cv.person.photo", "cover.photo"} if name == "dossier" else
                {"cv.person.photo"} if name.startswith("cv-") else set())
    photos = [p for p in assets["pictures"] if p["name"] in ("cv.person.photo", "cover.photo")]
    if {p["name"] for p in photos} != expected or len(photos) != len(expected):
        raise ValueError("Source does not contain exactly the expected active photos")
    for photo in photos:
        data = (metadata["input"]["cover"]["data"]["foto"] if photo["name"] == "cover.photo"
                else metadata["input"]["cv"]["data"]["person"]["foto"])
        if not data.startswith("data:image/png;base64,"):
            raise ValueError("Unexpected synthetic input photo format")
        if reader.pixels(base64.b64decode(data.split(",", 1)[1], validate=True)) != photo["pixels"]:
            raise ValueError("Source photo pixels already differ from the actual imported input")


def inventory(path):
    """Inventory active picture/fill references separately from SDT-owner checks."""
    pictures, assets = [], []
    with ZipFile(path) as archive:
        if archive.testzip():
            raise ValueError("Damaged DOCX ZIP")
        for name in archive.namelist():
            pixel = reader.pixels(archive.read(name))
            if pixel:
                assets.append(pixel)
            if name.startswith("word/") and name.endswith(".xml"):
                root = reader._inventory.effective_tree(archive.read(name))
                rels = reader.relationships(archive, name)
                for blip in root.xpath('.//a:blip[@r:embed] | .//v:fill[@r:id] | .//v:imagedata[@r:id]', namespaces=NS):
                    rid = blip.get("{"+reader.R+"}embed") or blip.get("{"+reader.R+"}id")
                    if not rid:
                        continue
                    rel = rels.get(rid)
                    if (rel is None or rel.get("TargetMode") == "External" or
                            rel.get("Type") != reader.R+"/image"):
                        raise ValueError("Unresolved or external picture relationship")
                    target = rel.get("Target", "")
                    target = (target.lstrip("/") if target.startswith("/") else
                              posixpath.normpath(posixpath.join(posixpath.dirname(name), target)))
                    names = blip.xpath('ancestor::w:drawing[1]//wp:docPr/@name', namespaces=NS)
                    crop, fractions, container, fill = reader.crop_encoding(blip)
                    pictures.append({"name": names[0] if len(names) == 1 else "",
                                     "story": name,
                                     "crop": fractions, "crop_markup": crop,
                                     "container": container, "fill_rect": fill,
                                     "pixels": reader.pixels(archive.read(target))})
    return {"pictures": pictures, "assets": assets}


def run(command, logfile, timeout=120):
    result = subprocess.run(command, capture_output=True, text=True, timeout=timeout)
    logfile.write_text(result.stdout + result.stderr)
    if result.returncode:
        raise RuntimeError(f"Command exited {result.returncode}: {logfile}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=Path("artifacts/lo-product-roundtrip"))
    parser.add_argument("--renderer", type=Path, required=True)
    parser.add_argument("--soffice", default=shutil.which("soffice"))
    parser.add_argument("--analyse-only", action="store_true",
                        help="Reanalyse verified existing save/render outputs without opening Office again")
    parser.add_argument("--runtime-manifest", type=Path)
    parser.add_argument("--output", type=Path, help="Fresh run directory; existing reports require --analyse-only")
    args = parser.parse_args()
    if not args.soffice or not args.renderer.is_file():
        raise ValueError("Missing declared Office runtime or renderer")
    source = args.source.resolve()
    out = args.output.resolve() if args.output else source / "roundtrip"
    if not args.analyse_only and out.exists() and any(out.iterdir()):
        raise ValueError("Existing execution output: use --analyse-only or a fresh --output")
    out.mkdir(parents=True, exist_ok=True)
    stats = json.loads((source / "results.json").read_text())["stats"]
    assert stats["expected"] == 4 and all(stats[k] == 0 for k in ("unexpected", "skipped", "flaky"))
    version = subprocess.check_output([args.soffice, "--version"], text=True).strip()
    report = {"office_version": version, "word_acceptance": "UNVERIFIED", "cases": []}
    if args.runtime_manifest:
        manifest = json.loads(args.runtime_manifest.read_text())
        assert manifest["upstreamVersion"] in version and manifest["sourceRef"] in version
        report["runtime_manifest"] = manifest
    report_path = out / "report.json"
    baseline_report = None
    if args.analyse_only:
        baseline = out / "execution-baseline.json"
        if not baseline.exists():
            baseline.write_bytes(report_path.read_bytes())
        baseline_report = json.loads(baseline.read_text())
        assert baseline_report["office_version"] == version
        assert len(baseline_report["cases"]) == 4 and all(len(row["phases"]) == 3 for row in baseline_report["cases"])
        report["execution_baseline_sha256"] = sha(baseline)
    report["analysis_only"] = args.analyse_only
    for name in CASES:
        original = source / f"{name}.docx"
        metadata = json.loads((source / f"{name}.json").read_text())
        assert sha(original) == metadata["sha256"]
        assert not any(p.startswith(("src/", "public/")) or p in ("package.json", "bun.lock")
                       for p in metadata["runtimeDiff"])
        before = reader.inspect(original)
        original_assets = inventory(original)
        assert_source_photos(name, metadata, original_assets)
        with ZipFile(original) as archive:
            root = reader._inventory.effective_tree(archive.read("word/document.xml"))
            margins = root.find(".//w:sectPr/w:pgMar", NS)
            top = int(margins.get("{"+reader.W+"}top", "0")) / 20
            bottom = int(margins.get("{"+reader.W+"}bottom", "0")) / 20
        row = {"name": name, "source": metadata, "source_inventory": original_assets, "phases": []}
        report["cases"].append(row)
        current = original
        for phase in range(3):
            folder = out / name / f"phase-{phase}"
            folder.mkdir(parents=True, exist_ok=True)
            if phase and not args.analyse_only:
                save_source = current
                if (folder / original.name).exists():
                    raise ValueError(f"Save output already exists: {folder / original.name}")
                profile = folder / "save-profile"
                run([args.soffice, "--headless", f"-env:UserInstallation={profile.as_uri()}",
                     "--convert-to", "docx:Office Open XML Text", "--outdir", str(folder), str(save_source)],
                    folder / "save.log")
                current = folder / original.name
                if not current.is_file():
                    raise RuntimeError(f"Writer did not save {current}")
            elif phase:
                current = folder / original.name
            if not args.analyse_only:
                run([sys.executable, str(args.renderer.resolve()), str(current), "--output_dir",
                     str(folder / "render"), "--dpi", "96", "--emit_pdf", "--verbose"], folder / "render.log")
            pdf_path = folder / "render" / f"{current.stem}.pdf"
            if baseline_report:
                old = next(r for r in baseline_report["cases"] if r["name"] == name)["phases"][phase]
                assert sha(current) == old["docx_sha256"] and sha(pdf_path) == old["pdf_sha256"]
            with fitz.open(pdf_path) as pdf:
                text = compact("".join(page.get_text() for page in pdf))
                body_text = compact("".join(page.get_text(clip=fitz.Rect(
                    0, top, page.rect.width, page.rect.height-bottom)) for page in pdf))
                pages = len(pdf)
                fonts = sorted({font[3] for page in pdf for font in page.get_fonts()})
            after = before if phase == 0 else reader.inspect(current)
            instances = reader.compare_instances(before, after)
            assets = original_assets if phase == 0 else inventory(current)
            source_fields = [(key, f["plainText"]) for key, fields in before["fields"].items() for f in fields
                             if compact(f["plainText"])]
            # Joining full physical pages inserts repeated contact headers into
            # a paragraph that spans pages. Only letter-body checks exclude the
            # known source margins; header/footer fields still use the full PDF.
            missing_pdf = [key for key, value in source_fields if compact(value) not in (
                body_text if name == "letter-two-pages" and key.startswith("letter.body.") else text)]
            missing_xml = [key for key, value in source_fields
                           if compact(value) not in compact(after["plainText"])]
            photos = []
            for pic in original_assets["pictures"]:
                if pic["name"] not in ("cv.person.photo", "cover.photo"):
                    continue
                matches = [p for p in assets["pictures"] if p["name"] == pic["name"]]
                photos.append({"name": pic["name"], "matches": len(matches),
                               "pixels_equal": len(matches) == 1 and pic["pixels"] == matches[0]["pixels"],
                               "crop_equal": (None if len(matches) != 1 or pic["crop"] is None or matches[0]["crop"] is None
                                              else pic["crop"] == matches[0]["crop"]),
                               "pixels_present_in_active_drawings": any(p["pixels"] == pic["pixels"] for p in assets["pictures"])})
                photos[-1]["pixels_present_in_package"] = pic["pixels"] in assets["assets"]
                photos[-1]["source_pixels"] = pic["pixels"]
                photos[-1]["saved_pixels"] = matches[0]["pixels"] if len(matches) == 1 else None
                photos[-1]["source_container"] = pic["container"]
                photos[-1]["saved_container"] = matches[0]["container"] if len(matches) == 1 else None
            source_pixels = {json.dumps(p["pixels"], sort_keys=True) for p in original_assets["pictures"]}
            saved_pixels = {json.dumps(p["pixels"], sort_keys=True) for p in assets["pictures"]}
            pixel_pairs = []
            previous_pixel_pairs = []
            if phase:
                baseline = out / name / "phase-0" / "render"
                for page_index in range(1, pages+1):
                    a, b = [folder_ / f"page-{page_index}.png" for folder_ in (baseline, folder / "render")]
                    if a.is_file() and b.is_file():
                        with Image.open(a) as ai, Image.open(b) as bi:
                            equal = np.array_equal(np.asarray(ai.convert("RGB")), np.asarray(bi.convert("RGB")))
                        pixel_pairs.append(equal)
                    previous_page = out / name / f"phase-{phase-1}" / "render" / f"page-{page_index}.png"
                    if previous_page.is_file() and b.is_file():
                        with Image.open(previous_page) as ai, Image.open(b) as bi:
                            previous_pixel_pairs.append(bool(np.array_equal(np.asarray(ai.convert("RGB")), np.asarray(bi.convert("RGB")))))
            item = {"phase": phase, "docx_sha256": sha(current), "pdf_sha256": sha(pdf_path),
                    "pdf_pages": pages, "missing_xml_text": missing_xml, "missing_pdf_text": missing_pdf,
                    "pdf_fonts": fonts,
                    "photos": photos, "missing_original_media_pixels": len(source_pixels-saved_pixels),
                    "field_instances": instances,
                    "field_bindings_missing_or_changed": sum(i["matchStatus"] != "MATCHED" or not i["fieldTokensUnchanged"] for i in instances),
                    "field_owner_nesting_changed": sum(not i["controlNestingUnchanged"] for i in instances),
                    "picture_inventory": assets["pictures"],
                    "same_page_count_as_source": not phase or pages == row["phases"][0]["pdf_pages"],
                    "rendered_page_pairs_equal": pixel_pairs,
                    "rendered_page_pairs_equal_previous_phase": previous_pixel_pairs,
                    "png_sha256": [sha(p) for p in sorted((folder / "render").glob("page-*.png"))]}
            row["phases"].append(item)
            assert sha(original) == metadata["sha256"], "Office overwrote the original input"
            report_path.write_text(json.dumps(report, indent=2) + "\n")
            print(name, phase, "pages", pages, "missing text", len(missing_xml), len(missing_pdf),
                  "photos", photos, "equal page pairs", pixel_pairs, flush=True)
    issues = []
    assert len({c["source"]["sourceSha"] for c in report["cases"]}) == 1, "Mixed application sources"
    assert all(c["source"]["runtimeBlobs"] == report["cases"][0]["source"]["runtimeBlobs"] for c in report["cases"])
    for case in report["cases"]:
        for phase in case["phases"]:
            if phase["missing_xml_text"] or phase["missing_pdf_text"]:
                issues.append(f"{case['name']} phase {phase['phase']}: missing text")
            if any(not photo["pixels_present_in_package"] for photo in phase["photos"]):
                issues.append(f"{case['name']} phase {phase['phase']}: original photo pixels lost")
            if not phase["same_page_count_as_source"]:
                issues.append(f"{case['name']} phase {phase['phase']}: changed page count")
            if phase["field_bindings_missing_or_changed"] or phase["field_owner_nesting_changed"]:
                issues.append(f"{case['name']} phase {phase['phase']}: field controls rewritten")
    report["findings"] = issues
    report["status"] = "INCOMPATIBLE" if issues else "REVIEW"
    report_path.write_text(json.dumps(report, indent=2) + "\n")
    print(report["status"], issues)
    return 2 if issues else 0


if __name__ == "__main__":
    raise SystemExit(main())
