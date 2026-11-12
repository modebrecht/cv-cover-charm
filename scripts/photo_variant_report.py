"""Retain circle diagnostics and actual long-dossier photo comparisons."""
import json
from pathlib import Path

import fitz
import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter
from scipy.ndimage import binary_erosion, binary_fill_holes, distance_transform_edt

from dossier_visual_parity import normalize_image, save_normalized_rgb
from web_pdf_gallery_report import image_score, PHOTO_SSIM_MIN, PHOTO_SMOOTHING_PX

OUT = Path("artifacts/photo-variants-report")
CIRCLES = Path("artifacts/photo-circle-raster")
LONG = Path("artifacts/pagination-2page-combined")


def silhouette(image):
    # Diagnostic only: these fixed synthetic portraits sit on flat backgrounds.
    # Full-image SSIM below still includes every pixel, including the background.
    rgb = np.asarray(image, dtype=float)
    corners = np.concatenate([rgb[:5, :5].reshape(-1, 3), rgb[-5:, :5].reshape(-1, 3),
                              rgb[:5, -5:].reshape(-1, 3), rgb[-5:, -5:].reshape(-1, 3)])
    background = np.median(corners, axis=0)
    return binary_fill_holes(np.linalg.norm(rgb - background, axis=2) > 20)


def contour_metrics(first, second, dpi):
    if not first.any() or not second.any():
        raise ValueError("Missing synthetic photo silhouette")
    a = first & ~binary_erosion(first)
    b = second & ~binary_erosion(second)
    mm = 25.4 / dpi
    edge = max(distance_transform_edt(~a)[b].max(), distance_transform_edt(~b)[a].max())
    centers = [np.argwhere(mask).mean(axis=0) for mask in (first, second)]
    radii = [np.sqrt(mask.sum() / np.pi) for mask in (first, second)]
    return {"edge_delta_mm": float(edge * mm),
            "center_delta_mm": float(np.linalg.norm(centers[0] - centers[1]) * mm),
            "area_radius_delta_mm": float(abs(radii[0] - radii[1]) * mm)}


def pair_image(first, second, path):
    canvas = Image.new("RGB", (first.width * 3, first.height), "white")
    canvas.paste(first, (0, 0))
    canvas.paste(second, (first.width, 0))
    canvas.paste(ImageChops.difference(first, second), (first.width * 2, 0))
    canvas.save(path)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    browser = {}
    for name, path, expected in (
        ("standard_photo_gallery", Path("artifacts/web-pdf-gallery/results.json"), 3),
        ("circle_raster", CIRCLES / "results.json", 2),
        ("long_photo_dossiers", LONG / "results.json", 2),
    ):
        stats = json.loads(path.read_text())["stats"]
        assert stats["expected"] == expected and all(
            stats[key] == 0 for key in ("unexpected", "skipped", "flaky")
        ), f"Incomplete or failed browser evidence: {name}"
        browser[name] = stats
    circles, dossiers, failures = [], [], []
    for template in ("terracotta", "studio3"):
        data = json.loads((CIRCLES / f"{template}.json").read_text())
        x, y, width, height = data["web"]["photo"]
        bounds = (round(x * 3) - 9, round(y * 3) - 9,
                  round((x + width) * 3) + 9, round((y + height) * 3) + 9)
        web, raster = [Image.open(CIRCLES / f"{template}-{kind}3.png").convert("RGB").crop(bounds)
                       for kind in ("web", "raster")]
        masks = [silhouette(image) for image in (web, raster)]
        metrics = contour_metrics(*masks, dpi=288)
        # A displaced portrait must fail the existing 0.3-mm geometry limit.
        shifted = np.zeros_like(masks[1])
        shifted[:, 12:] = masks[1][:, :-12]
        negative = contour_metrics(masks[0], shifted, dpi=288)
        assert negative["edge_delta_mm"] > 0.3, "Displaced-circle negative control escaped"
        if metrics["edge_delta_mm"] > 0.3:
            failures.append(f"{template}: circle contour exceeds 0.3 mm")
        pair_image(web, raster, OUT / f"{template}-288dpi-compare.png")
        circles.append({"template": template, "status": "REVIEW", **metrics,
                        "raw_rgb_ssim": image_score(web, raster),
                        "displaced_negative_edge_mm": negative["edge_delta_mm"],
                        "source": data})

    for template in ("terracotta", "studio3"):
        name = f"joint-{template}-mirrored-photo-crop"
        data = json.loads((LONG / f"{name}.json").read_text())
        assert data["status"] == "PASS" and data["findings"] == []
        assert data["options"]["mirrored"] and len(data["webCv"]) > 2 and len(data["webLetter"]) > 2
        photo = data["photo"]
        assert max(abs(a - b) for a, b in zip(photo["boxMm"], photo["canonicalBoxMm"])) <= 0.3
        web_path = OUT / f"{name}-web.png"
        pdf_path = OUT / f"{name}-pdf.png"
        normalize_image(LONG / photo["webPng"], web_path)
        with fitz.open(LONG / f"{name}.pdf") as document:
            assert len(document) == len(data["webCv"]) + len(data["webLetter"]) + 1
            contact = Image.new("RGB", (810, 400 * ((len(document) + 2) // 3)), "#dddddd")
            for index, physical_page in enumerate(document):
                preview = physical_page.get_pixmap(matrix=fitz.Matrix(0.45, 0.45), alpha=False)
                tile = Image.new("RGB", (270, 400), "white")
                tile.paste(Image.frombytes("RGB", (preview.width, preview.height), preview.samples), (1, 18))
                ImageDraw.Draw(tile).text((4, 3), f"{template}: PDF page {index + 1}/{len(document)}", fill="black")
                contact.paste(tile, ((index % 3) * 270, (index // 3) * 400))
            contact.save(OUT / f"{name}-all-pages.png")
            page = document[photo["pdfPageIndex"]]
            pix = page.get_pixmap(matrix=fitz.Matrix(96 / 72, 96 / 72), alpha=False)
            save_normalized_rgb(Image.frombytes("RGB", (pix.width, pix.height), pix.samples), pdf_path)
        x, y, width, height = photo["boxMm"]
        bounds = (round(x * 794 / 210) - 3, round(y * 1123 / 297) - 3,
                  round((x + width) * 794 / 210) + 3, round((y + height) * 1123 / 297) + 3)
        web, pdf = [Image.open(path).convert("RGB").crop(bounds) for path in (web_path, pdf_path)]
        raw = image_score(web, pdf)
        smoothed = image_score(web.filter(ImageFilter.GaussianBlur(PHOTO_SMOOTHING_PX)),
                               pdf.filter(ImageFilter.GaussianBlur(PHOTO_SMOOTHING_PX)))
        negative = image_score(web, ImageChops.offset(pdf, 12, 0))
        assert negative < PHOTO_SSIM_MIN, "Wrong-crop negative control escaped"
        if smoothed < PHOTO_SSIM_MIN:
            failures.append(f"{name}: actual PDF photo below unchanged 0.95 SSIM limit")
        pair_image(web, pdf, OUT / f"{name}-photo-compare.png")
        dossiers.append({"name": name, "status": "REVIEW" if raw < PHOTO_SSIM_MIN else "PASS",
                         "letter_pages": len(data["webLetter"]), "cv_pages": len(data["webCv"]),
                         "pdf_pages": len(data["pdfPages"]), "raw_rgb_ssim": raw,
                         "smoothed_rgb_ssim": smoothed, "wrong_crop_negative_ssim": negative,
                         "photo": photo, "pdf_sha256": data["pdfSha256"],
                         "source_sha": data["sourceSha"]})
    sources = {row["source"]["sourceSha"] for row in circles} | {row["source_sha"] for row in dossiers}
    assert len(sources) == 1, "Mixed-source evidence"
    provenance = [row["source"] for row in circles] + [
        json.loads((LONG / f"{row['name']}.json").read_text()) for row in dossiers
    ]
    assert all(row["runtimeBlobs"] == provenance[0]["runtimeBlobs"] for row in provenance)
    assert not any(
        path.startswith(("src/", "public/")) or path in ("package.json", "bun.lock")
        for row in provenance for path in row["runtimeDiff"]
    ), "Uncommitted application changes invalidate the shared source SHA"
    result = {"source_sha": sources.pop(), "browser": browser,
              "source_dirty": any(row["sourceDirty"] for row in provenance),
              "runtime_blobs": provenance[0]["runtimeBlobs"],
              "status": "FAIL" if failures else "REVIEW", "failures": failures,
              "circles": circles, "long_dossiers": dossiers,
              "limits": {"geometry_mm": 0.3, "photo_ssim": PHOTO_SSIM_MIN,
                         "smoothing_px": PHOTO_SMOOTHING_PX,
                         "contour_dpi": 288, "synthetic_silhouette_rgb_distance": 20}}
    (OUT / "report.json").write_text(json.dumps(result, indent=2) + "\n")
    lines = ["# Circle diagnostics and mirrored long photo dossiers", "",
             "REVIEW remains explicit; contour diagnostics do not replace full-photo SSIM.", "",
             "| Case | Result | Detail |", "| --- | --- | --- |"]
    lines += [f"| {r['template']} circle | REVIEW | edge {r['edge_delta_mm']:.4f} mm; center {r['center_delta_mm']:.4f} mm |" for r in circles]
    lines += [f"| {r['name']} | {r['status']} | {r['pdf_pages']} PDF pages; photo raw {r['raw_rgb_ssim']:.4f}, smoothed {r['smoothed_rgb_ssim']:.4f} |" for r in dossiers]
    lines += ["", "Negative controls require a displaced contour and a wrong photo crop to fail."]
    lines += [f"FAIL: {failure}" for failure in failures]
    (OUT / "REPORT.md").write_text("\n".join(lines) + "\n")
    print(json.dumps(result, indent=2))
    return bool(failures)


if __name__ == "__main__":
    raise SystemExit(main())
