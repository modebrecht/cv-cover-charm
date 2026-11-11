"""Compare all 39 photographed Web/PDF references and retain their visual evidence."""
import argparse
import csv
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter
from skimage.metrics import structural_similarity

from dossier_visual_parity import analysis_arrays, normalize_image, rasterize_pdf

PHOTO_SSIM_MIN = 0.95
PAGE_REVIEW_SSIM = 0.95
PHOTO_SMOOTHING_PX = 0.4


def image_score(first, second):
    return float(structural_similarity(
        np.asarray(first), np.asarray(second), data_range=255, channel_axis=2,
    ))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=Path("artifacts/web-pdf-gallery"))
    args = parser.parse_args()
    source = args.source
    report = source / "comparison"
    report.mkdir(exist_ok=True)
    results = json.loads((source / "results.json").read_text())
    rows = []
    files = sorted(source.glob("[0-9][0-9]-*.json"))
    complete = len(files) == 39 and results["stats"]["expected"] == 39
    for file in files:
        data = json.loads(file.read_text())
        pdf = source / (file.stem + ".pdf")
        if not pdf.exists():
            complete = False
            continue
        images = rasterize_pdf(pdf, report / "pdf", file.stem)
        for index, kind in enumerate(("cover", "letter", "cv")):
            normalized = report / "web" / f"{file.stem}--{kind}.png"
            normalize_image(source / f"{file.stem}--{kind}.png", normalized)
            web_rgb, web_gray = analysis_arrays(normalized)
            pdf_rgb, pdf_gray = analysis_arrays(images[kind])
            rgb = float(structural_similarity(web_rgb, pdf_rgb, data_range=255, channel_axis=2))
            layout = float(structural_similarity(web_gray, pdf_gray, data_range=255))
            expected = data["web"][index]
            actual = data["canonical"][index]
            delta = max(
                abs(a - b)
                for wanted, found in zip(expected["nodes"], actual["nodes"])
                for a, b in zip(wanted["box"], found["box"])
            )
            web_image = Image.open(normalized).convert("RGB")
            pdf_image = Image.open(images[kind]).convert("RGB")
            photo_score = None
            photo_raw = None
            if expected["photo"]:
                x, y, width, height = expected["photo"]
                # Include the outer frame as well as the cropped image.
                bounds = (
                    max(0, round(x * 794 / 210) - 3),
                    max(0, round(y * 1123 / 297) - 3),
                    min(794, round((x + width) * 794 / 210) + 3),
                    min(1123, round((y + height) * 1123 / 297) + 3),
                )
                web_photo = web_image.crop(bounds)
                pdf_photo = pdf_image.crop(bounds)
                photo_raw = image_score(web_photo, pdf_photo)
                # At 96 dpi this is 0.11 mm, below the geometry tolerance.
                # Retain raw scores so background drift still receives review.
                photo_score = image_score(
                    web_photo.filter(ImageFilter.GaussianBlur(PHOTO_SMOOTHING_PX)),
                    pdf_photo.filter(ImageFilter.GaussianBlur(PHOTO_SMOOTHING_PX)),
                )
            failed = delta > data["geometryToleranceMm"] or (
                photo_score is not None and photo_score < PHOTO_SSIM_MIN
            )
            review = rgb < PAGE_REVIEW_SSIM or (
                photo_raw is not None and photo_raw < PHOTO_SSIM_MIN
            )
            status = "FAIL" if failed else "REVIEW" if review else "PASS"
            rows.append({
                "template": data["template"], "page": kind, "status": status,
                "rgb_ssim": rgb, "layout_ssim": layout,
                "photo_ssim": photo_score, "photo_raw_ssim": photo_raw, "geometry_delta_mm": delta,
                "pdf_sha256": hashlib.sha256(pdf.read_bytes()).hexdigest(),
            })
            pair = Image.new("RGB", (794 * 3, 1123), "white")
            pair.paste(web_image, (0, 0))
            pair.paste(pdf_image, (794, 0))
            pair.paste(ImageChops.difference(web_image, pdf_image), (794 * 2, 0))
            pair.thumbnail((1050, 500))
            ImageDraw.Draw(pair).text((4, 4), f"{data['label']} / {kind} / Web | PDF | difference", fill="black")
            pair.save(report / f"{file.stem}--{kind}--compare.png")
    complete = complete and len(rows) == 117
    fail = not complete or results["stats"]["unexpected"] > 0 or any(r["status"] == "FAIL" for r in rows)
    status = "FAIL" if fail else "REVIEW" if any(r["status"] == "REVIEW" for r in rows) else "PASS"
    output = {
        "source_sha": (source / "SOURCE_SHA.txt").read_text().strip(),
        "fixture_sha256": hashlib.sha256((source / "fixture.json").read_bytes()).hexdigest(),
        "status": status, "templates": len(files), "page_pairs": len(rows),
        "photo_ssim_min": PHOTO_SSIM_MIN, "photo_smoothing_px": PHOTO_SMOOTHING_PX,
        "page_review_ssim": PAGE_REVIEW_SSIM,
        "browser": results["stats"], "pages": rows,
    }
    (report / "report.json").write_text(json.dumps(output, indent=2) + "\n")
    if rows:
        with (report / "scores.csv").open("w") as target:
            writer = csv.DictWriter(target, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)
    lines = [
        "# Web/PDF gallery with cropped photos", "",
        f"Source `{output['source_sha']}`", "",
        f"**{status}** · {len(files)}/39 templates · {len(rows)}/117 page pairs", "",
        "Geometry tolerance is 0.3 mm. Photo and frame RGB SSIM must reach 0.95 after 0.4 px smoothing.",
        "Raw photo scores and whole-page RGB SSIM below 0.95 require visual review.",
        "Each comparison image shows Web, PDF and their pixel difference.", "",
        "| Template | Part | Result | RGB SSIM | Photo SSIM | Geometry mm |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for row in rows:
        photo = "" if row["photo_ssim"] is None else f"{row['photo_ssim']:.4f}"
        lines.append(
            f"| {row['template']} | {row['page']} | {row['status']} | "
            f"{row['rgb_ssim']:.4f} | {photo} | {row['geometry_delta_mm']:.4f} |"
        )
    (report / "REPORT.md").write_text("\n".join(lines) + "\n")
    print(json.dumps({key: output[key] for key in ("status", "templates", "page_pairs")}))
    return 1 if fail else 0


if __name__ == "__main__":
    raise SystemExit(main())
