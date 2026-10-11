#!/usr/bin/env python3
"""Audit and score a same-SHA capture with the existing Web/PDF parity pipeline."""
import argparse
import csv
import hashlib
import json
import re
from pathlib import Path
from statistics import mean, median

import fitz
from PIL import Image, ImageDraw, ImageFont
from skimage.metrics import structural_similarity
from dossier_visual_parity import PAGE_KINDS, analysis_arrays, normalize_image, save_normalized_rgb


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def audit_manifest(manifest, folder):
    sha = manifest["sourceSha"]
    if not re.fullmatch(r"[0-9a-f]{40}", sha) or manifest.get("pilot"):
        raise ValueError("Only a complete capture with a valid source SHA can be scored")
    rows = manifest["rows"]
    if len(rows) != 39 or len({r["id"] for r in rows}) != 39:
        raise ValueError("Expected exactly 39 unique authoritative catalog entries")
    if len(manifest["longs"]) != 2:
        raise ValueError("Both long pagination fixtures are required")
    for row in rows + manifest["longs"]:
        for path in [row, row["current"], row["native"], *row.get("web", {}).values()]:
            if path["sourceSha"] != sha or path["fixtureHash"] != row["fixtureHash"]:
                raise ValueError(f"Mixed source SHA or stored fixture: {row['base']}")
        for path in ["current", "native"]:
            if digest(folder / f"{row['base']}--{path}.pdf") != row[path]["sha256"]:
                raise ValueError(f"Changed PDF artifact: {row['base']} {path}")
        for kind, path in row.get("web", {}).items():
            if digest(folder / f"{row['base']}--web-{kind}.png") != path["sha256"]:
                raise ValueError(f"Changed screenshot artifact: {row['base']} {kind}")
        order = [p["kind"] for p in row["canonical"]]
        if order != ["cover"] + ["letter"]*order.count("letter") + ["cv"]*order.count("cv"):
            raise ValueError(f"Invalid canonical order: {row['base']}")
        for path in ["current", "native"]:
            with fitz.open(folder / f"{row['base']}--{path}.pdf") as pdf:
                if len(pdf) != len(order):
                    raise ValueError(f"Physical page count changed: {row['base']} {path}")
                for page in pdf:
                    if abs(page.rect.width-210*72/25.4) > .5 or abs(page.rect.height-297*72/25.4) > .5:
                        raise ValueError(f"Non-A4 PDF page: {row['base']} {path}")
    return sha


def geometry_delta(a, b):
    if len(a["nodes"]) != len(b["nodes"]):
        raise ValueError("DOM node count changed")
    maximum = 0
    for x, y in zip(a["nodes"], b["nodes"]):
        if x["text"] != y["text"] or x["font"] != y["font"]:
            raise ValueError("DOM text or computed font metrics changed")
        maximum = max(maximum, *(abs(m-n) for m,n in zip(x["box"], y["box"])))
    return maximum


def raster_pages(row, path, folder, output):
    result = {}
    with fitz.open(folder / f"{row['base']}--{path}.pdf") as pdf:
        for kind in PAGE_KINDS:
            index = next(i for i,p in enumerate(row["canonical"]) if p["kind"] == kind)
            pix = pdf[index].get_pixmap(matrix=fitz.Matrix(96/72,96/72), alpha=False)
            target = output / path / f"{row['base']}--{kind}.png"
            save_normalized_rgb(Image.frombytes("RGB", (pix.width,pix.height),pix.samples), target)
            result[kind] = target
    return result


def stats(values):
    return {"mean": mean(values), "median": median(values), "min": min(values), "max": max(values)}


def write_csv(path, rows):
    with path.open("w", newline="", encoding="utf8") as file:
        writer = csv.DictWriter(file, fieldnames=list(rows[0])); writer.writeheader(); writer.writerows(rows)


def contact_sheet(rows, images, target, title):
    width, height, pad, label = 318, 450, 16, 36
    sheet = Image.new("RGB", (3*width+4*pad, 55+len(rows)*(height+label+pad)), "#e5e7eb")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 17)
    draw.text((pad,12), title, fill="#111827", font=font)
    for index, row in enumerate(rows):
        top = 55+index*(height+label+pad)
        for col,path in enumerate(["web","current","native"]):
            left = pad+col*(width+pad)
            draw.text((left,top), f"{row['template']} | {path.upper()}", fill="#111827", font=font)
            with Image.open(images[(row["template"],"cv",path)]) as im:
                sheet.paste(im.convert("RGB").resize((width,height), Image.Resampling.LANCZOS), (left,top+label))
    sheet.save(target, optimize=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--capture-dir", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, required=True)
    args = parser.parse_args(); folder, output = args.capture_dir, args.out_dir
    manifest = json.loads((folder/"manifest.json").read_text())
    sha = audit_manifest(manifest, folder)
    output.mkdir(parents=True, exist_ok=True)
    rows, images, geometries, text_checks = [], {}, [], []
    for case in manifest["rows"]:
        live = geometry_delta(case["liveGeometry"],case["screenGeometry"])
        native = geometry_delta(case["screenGeometry"],case["printGeometry"])
        if live > .02 or native > .02:
            raise ValueError(f"Geometry exceeds existing .02mm tolerance: {case['template']}, live={live}, print={native}")
        geometries.append({"template": case["template"], "live_to_canonical_mm": live, "canonical_to_print_mm": native,
                           "nodes": len(case["screenGeometry"]["nodes"]), "pages": len(case["canonical"])})
        raster = {path:raster_pages(case,path,folder,output) for path in ["current","native"]}
        for kind in PAGE_KINDS:
            web = output/"web"/f"{case['base']}--{kind}.png"
            normalize_image(folder/f"{case['base']}--web-{kind}.png",web)
            images[(case["template"],kind,"web")] = web
            w_rgb,w_gray = analysis_arrays(web)
            row = {"template":case["template"],"document":kind,"web_source_sha":sha,"current_pdf_source_sha":sha,"native_pdf_source_sha":sha,"fixture_sha256":case["fixtureHash"]}
            for path in ["current","native"]:
                image = raster[path][kind]; images[(case["template"],kind,path)] = image
                rgb,gray = analysis_arrays(image)
                row[f"{path}_pdf_rgb_ssim"] = float(structural_similarity(w_rgb,rgb,channel_axis=2,data_range=255))
                row[f"{path}_pdf_layout_ssim"] = float(structural_similarity(w_gray,gray,data_range=255))
            row["rgb_delta"] = row["native_pdf_rgb_ssim"]-row["current_pdf_rgb_ssim"]
            row["layout_delta"] = row["native_pdf_layout_ssim"]-row["current_pdf_layout_ssim"]
            rows.append(row)
        for path in ["current","native"]:
            with fitz.open(folder/f"{case['base']}--{path}.pdf") as pdf:
                letters = [i for i,p in enumerate(case["canonical"]) if p["kind"] == "letter"]
                cvs = [i for i,p in enumerate(case["canonical"]) if p["kind"] == "cv"]
                letter_text = " ".join(pdf[i].get_text() for i in letters)
                cv_text = " ".join(pdf[i].get_text() for i in cvs)
                compact = lambda text: re.sub(r"\s+", "", text).casefold()
                samples = {"letter_header":("Herr Thomas Weber",letter_text), "letter_body":("Guten Tag",letter_text),
                           "cv_name":("Lea Müller",cv_text), "cv_section":("Schulbildung",cv_text),
                           "cv_entry":("Sekundarschule, Niveau A",cv_text)}
                checks = {key:compact(needle) in compact(text) for key,(needle,text) in samples.items()}
                if not all(checks.values()):
                    # The authoritative DOM heading is allowed to differ by template, never fabricate missing text.
                    heading = next((n["text"] for n in case["screenGeometry"]["nodes"] if "data-cv-section-title" in n["tag"]), "")
                    checks["cv_section"] = bool(heading) and compact(heading) in compact(cv_text)
                text_checks.append({"template":case["template"],"path":path, **checks,
                    "literal_search_hits":{key:sum(len(pdf[i].search_for(needle)) for i in (letters if key.startswith("letter") else cvs)) for key,(needle,_) in samples.items()},
                    "letter_header_before_body":compact(letter_text).find("HerrThomasWeber".casefold()) < compact(letter_text).find("GutenTag".casefold()),
                    "cv_name_before_entry":compact(cv_text).find("LeaMüller".casefold()) < compact(cv_text).find("Sekundarschule,NiveauA".casefold()),
                    "letter_body_before_closing":compact(letter_text).find("DieInformatikbegeistertmich".casefold()) < compact(letter_text).find("FreundlicheGrüsse".casefold()),
                    "cv_title_before_entry":compact(cv_text).find("Lebenslauf".casefold()) < compact(cv_text).find("Sekundarschule,NiveauA".casefold()),
                    "text_characters":len(letter_text)+len(cv_text), "font_names": sorted({font[3] for page in pdf for font in page.get_fonts()})})
    if len(rows) != 117: raise ValueError("Incomplete comparison set")
    write_csv(output/"native-chromium-print-scores.csv",rows)
    write_csv(output/"native-chromium-print-geometry.csv",geometries)
    summary = {kind:{path:{metric:stats([r[f"{path}_pdf_{metric}_ssim"] for r in rows if kind=="overall" or r["document"]==kind]) for metric in ["rgb","layout"]} for path in ["current","native"]} for kind in [*PAGE_KINDS,"overall"]}
    template_rows = []
    for case in manifest["rows"]:
        group = [r for r in rows if r["template"]==case["template"]]
        row = {"template":case["template"]}
        for path in ["current","native"]:
            for metric in ["rgb","layout"]: row[f"{path}_{metric}_ssim"] = mean(r[f"{path}_pdf_{metric}_ssim"] for r in group)
        row["rgb_delta"] = row["native_rgb_ssim"]-row["current_rgb_ssim"]
        row["layout_delta"] = row["native_layout_ssim"]-row["current_layout_ssim"]
        template_rows.append(row)
    write_csv(output/"native-chromium-print-template-deltas.csv",template_rows)
    write_csv(output/"native-chromium-print-deltas-descending.csv",sorted(template_rows,key=lambda r:r["layout_delta"],reverse=True))
    cv = [r for r in rows if r["document"]=="cv"]
    priorities = ["Neon","Edel","Citrus","Verlauf","Colorful","Human","Horizont","Seriös","Editorial","Modern"]
    selected = [next(r for r in cv if r["template"]==name) for name in priorities]
    additional = sorted(cv,key=lambda r:r["layout_delta"],reverse=True)[:3] + sorted(cv,key=lambda r:r["layout_delta"])[:3]
    for r in additional:
        if r not in selected: selected.append(r)
    for i in range(0,len(selected),3):
        contact_sheet(selected[i:i+3],images,output/f"native-chromium-print-contact-{i//3+1}.png","WEB | CURRENT PDF | NATIVE PDF — CV, same source")
    metadata = {"source_sha":sha,"source_tree":manifest["sourceTree"],"browser":manifest["browser"],"playwright":manifest["playwright"],"pdf_options":manifest["pdfOptions"],
        "environment":manifest["environment"],
        "ssim":summary,"geometry":geometries,"text_checks":text_checks,
        "file_bytes":{path:stats([r[path]["bytes"] for r in manifest["rows"]]) for path in ["current","native"]},
        "generation_ms":{path:stats([r[path]["ms"] for r in manifest["rows"]]) for path in ["current","native"]},
        "long_fixtures":[{"fixture":r["base"],"canonical_pages":[p["kind"] for p in r["canonical"]],"current_pages":len(r["current"]["pages"]),"native_pages":len(r["native"]["pages"])} for r in manifest["longs"]],
        "cv_deltas_descending":sorted(cv,key=lambda r:r["layout_delta"],reverse=True)}
    (output/"native-chromium-print-summary.json").write_text(json.dumps(metadata,indent=2)+"\n")
    print(json.dumps({"ssim":summary,"file_bytes":metadata["file_bytes"],"generation_ms":metadata["generation_ms"]},indent=2))


if __name__ == "__main__": main()
