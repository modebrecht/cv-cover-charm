"""Separate circle rasterization from JPEG and PDF sampling without changing gates."""
import hashlib
import json
from pathlib import Path

import fitz
import numpy as np
import PIL
from PIL import Image, ImageChops, ImageFilter

from dossier_visual_parity import save_normalized_rgb
from photo_variant_report import pair_image
from web_pdf_gallery_report import image_score, PHOTO_SSIM_MIN, PHOTO_SMOOTHING_PX

CIRCLES = Path("artifacts/photo-circle-raster")
GALLERY = Path("artifacts/web-pdf-gallery")
OUT = Path("artifacts/photo-circle-encoding")


def render_photo(path, index, bounds, target):
    with fitz.open(path) as document:
        pix = document[index].get_pixmap(matrix=fitz.Matrix(96 / 72, 96 / 72), alpha=False)
        save_normalized_rgb(Image.frombytes("RGB", (pix.width, pix.height), pix.samples), target)
    return Image.open(target).convert("RGB").crop(bounds)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    stats = json.loads((CIRCLES / "results.json").read_text())["stats"]
    assert stats["expected"] == 2 and all(
        stats[key] == 0 for key in ("unexpected", "skipped", "flaky")
    ), "Incomplete circle browser evidence"
    rows = []
    source = (GALLERY / "SOURCE_SHA.txt").read_text().strip()
    for template in ("terracotta", "studio3"):
        diagnostic = json.loads((CIRCLES / f"{template}.json").read_text())
        assert diagnostic["sourceSha"] == source, "Mixed source SHAs"
        assert not any(
            path.startswith(("src/", "public/")) or path in ("package.json", "bun.lock")
            for path in diagnostic["runtimeDiff"]
        ), "Uncommitted application changes invalidate the source SHA"
        candidates = [(path, json.loads(path.read_text()))
                      for path in GALLERY.glob("[0-9][0-9]-*.json")]
        matches = [(path, data) for path, data in candidates if data["template"] == template]
        assert len(matches) == 1, f"Missing or duplicate gallery case: {template}"
        path, data = matches[0]
        x, y, width, height = data["web"][2]["photo"]
        bounds = (round(x * 794 / 210) - 3, round(y * 1123 / 297) - 3,
                  round((x + width) * 794 / 210) + 3,
                  round((y + height) * 1123 / 297) + 3)
        web = Image.open(GALLERY / f"{path.stem}--cv.png").convert("RGB").crop(bounds)
        actual_pdf = GALLERY / f"{path.stem}.pdf"
        actual = render_photo(actual_pdf, 2, bounds, OUT / f"{template}-actual.png")
        xx, yy, ww, hh = diagnostic["web"]["photo"]
        bounds3 = (round(xx * 3) - 9, round(yy * 3) - 9,
                   round((xx + ww) * 3) + 9, round((yy + hh) * 3) + 9)
        raster = Image.open(CIRCLES / f"{template}-raster3.png").convert("RGB").crop(bounds3)
        variants = []
        for encoding in ("png", "jpeg94", "jpeg100"):
            pdf = CIRCLES / f"{template}-{encoding}.pdf"
            image = CIRCLES / f"{template}-{encoding}.{'png' if encoding == 'png' else 'jpg'}"
            encoded = Image.open(image).convert("RGB").crop(bounds3)
            rendered = render_photo(pdf, 0, bounds, OUT / f"{template}-{encoding}.png")
            equal_actual = bool(np.array_equal(np.asarray(actual), np.asarray(rendered)))
            if encoding == "jpeg94":
                assert equal_actual, "Diagnostic JPEG94 does not reproduce the actual UI photo"
            raw = image_score(web, rendered)
            negative = image_score(web, ImageChops.offset(rendered, 12, 0))
            assert negative < PHOTO_SSIM_MIN, "Displaced-photo negative control escaped"
            pair_image(web, rendered, OUT / f"{template}-{encoding}-compare.png")
            variants.append({
                "encoding": encoding,
                "raw_rgb_ssim": raw,
                "smoothed_rgb_ssim": image_score(
                    web.filter(ImageFilter.GaussianBlur(PHOTO_SMOOTHING_PX)),
                    rendered.filter(ImageFilter.GaussianBlur(PHOTO_SMOOTHING_PX))),
                "canvas_vs_encoded_288dpi_ssim": image_score(raster, encoded),
                "identical_to_actual_pdf_photo": equal_actual,
                "displaced_negative_ssim": negative,
                "single_raster_pdf_bytes": pdf.stat().st_size,
                "pdf_sha256": hashlib.sha256(pdf.read_bytes()).hexdigest(),
                "image_sha256": hashlib.sha256(image.read_bytes()).hexdigest(),
            })
        rows.append({"template": template, "status": "REVIEW",
                     "actual_raw_rgb_ssim": image_score(web, actual),
                     "actual_pdf_sha256": hashlib.sha256(actual_pdf.read_bytes()).hexdigest(),
                     "variants": variants, "source": diagnostic})
    report = {"source_sha": source, "status": "REVIEW", "cases": rows,
              "limits": {"photo_ssim": PHOTO_SSIM_MIN, "smoothing_px": PHOTO_SMOOTHING_PX},
              "versions": {"pymupdf": fitz.VersionBind, "pillow": PIL.__version__,
                           "numpy": np.__version__},
              "scope": "Encoding diagnostic; no production fix or gallery gate change"}
    (OUT / "report.json").write_text(json.dumps(report, indent=2) + "\n")
    lines = ["# Circle encoding diagnostic", "",
             "Actual JPEG94 photo crops must match their diagnostic recomposition pixel for pixel.",
             "All variants use the same 288 dpi canvas and unchanged A4 placement.", "",
             "| Template | Encoding | Raw SSIM | Smoothed SSIM | One-page PDF bytes |",
             "| --- | --- | --- | --- | --- |"]
    for row in rows:
        lines += [f"| {row['template']} | {v['encoding']} | {v['raw_rgb_ssim']:.5f} | "
                  f"{v['smoothed_rgb_ssim']:.5f} | {v['single_raster_pdf_bytes']} |"
                  for v in row["variants"]]
    lines += ["", "The two production cases remain REVIEW. Neither thresholds nor masking change.",
              "Variant PDFs contain one raster page; byte counts are not full-dossier sizes."]
    (OUT / "REPORT.md").write_text("\n".join(lines) + "\n")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
