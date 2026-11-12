"""Compare actual PDF photos at A4 edges and retain hard rejection evidence."""
import json
import re
from pathlib import Path

import fitz
import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

from dossier_visual_parity import normalize_image, save_normalized_rgb
from photo_variant_report import pair_image
from web_pdf_gallery_report import image_score, PHOTO_SSIM_MIN, PHOTO_SMOOTHING_PX

SOURCE = Path("artifacts/free-photo-edges")
OUT = SOURCE / "comparison"
VALID = ("left-square", "right-portrait", "top-circle", "bottom-portrait-mirrored", "left-square-mirrored")
BLOCKED = ("outside-right", "outside-bottom", "outside-left-mirrored", "overlap-date-left")
FRAME_RGB = np.array([11, 115, 98])


def photo_palette(filter_string):
    # Include Brief's measured contrast/saturation treatment and all
    # four authored photo colours and white paper as possible edge neighbours.
    match = re.fullmatch(r"contrast\(([\d.]+)\) saturate\(([\d.]+)\)", filter_string)
    assert match, f"Unsupported synthetic fixture treatment: {filter_string}"
    original = np.array([[201, 72, 56], [36, 107, 175], [229, 197, 81], [23, 44, 57]])
    filtered = np.clip((original - 127.5) * float(match[1]) + 127.5, 0, 255)
    # W3C Filter Effects: https://www.w3.org/TR/filter-effects-1/#saturateEquivalent
    saturation = float(match[2])
    gray = filtered @ np.array([0.213, 0.715, 0.072])
    filtered = np.clip(saturation * filtered + (1 - saturation) * gray[:, None], 0, 255)
    return np.concatenate([filtered, [[255, 255, 255]]])


def frame_sides(image, center, palette):
    rgb = np.asarray(image, dtype=float)
    # Estimate green coverage, including anti-aliased mixtures with paper or
    # photo. Counting only pure-green pixels loses an entire low-DPI row.
    axes = FRAME_RGB - palette
    alpha = np.clip(((rgb[:, :, None, :] - palette) * axes).sum(axis=-1) /
                    (axes * axes).sum(axis=-1), 0, 1)
    error = ((rgb[:, :, None, :] - (palette + alpha[:, :, :, None] * axes)) ** 2).sum(axis=-1)
    background = error.argmin(axis=-1)
    coverage = np.take_along_axis(alpha, background[:, :, None], axis=2)[:, :, 0]
    y, x = np.indices(coverage.shape)
    x, y = (x - center[0]) / image.width, (y - center[1]) / image.height
    vertical = np.abs(y) >= np.abs(x)
    sectors = {"top": vertical & (y < 0), "bottom": vertical & (y >= 0),
               "left": ~vertical & (x < 0), "right": ~vertical & (x >= 0)}
    return coverage, palette[background], sectors, {
        name: float(coverage[sector].sum()) for name, sector in sectors.items()
    }


def frame_matches(first, second):
    return all(first[side] > 0 and 0.8 <= second[side] / first[side] <= 1.25 for side in first)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    stats = json.loads((SOURCE / "results.json").read_text())["stats"]
    assert stats["expected"] == 9 and all(stats[key] == 0 for key in ("unexpected", "flaky", "skipped"))
    evidence = [json.loads((SOURCE / f"{name}.json").read_text()) for name in (*VALID, *BLOCKED)]
    assert all(row["status"] == "PASS" for row in evidence)
    assert len({row["sourceSha"] for row in evidence}) == 1
    assert all(row["runtimeBlobs"] == evidence[0]["runtimeBlobs"] for row in evidence)
    rows, failures = [], []
    for data in evidence:
        name = data["name"]
        assert max(abs(a - b) for a, b in zip(data["webBoxMm"], data["canonicalBoxMm"])) <= 0.3
        if name in BLOCKED:
            assert data["expectedBlocked"] and data["verdict"]["status"] == "blocked"
            assert data["pdf"] is None and data["downloads"] == [] and "Lebenslauf" in data["directFailure"]
            assert any(issue["code"] == "physical-overflow" and issue["documentKind"] == "cv"
                       and not issue.get("overridePermitted", False) for issue in data["verdict"]["issues"])
            assert not (SOURCE / f"{name}.pdf").exists()
            rows.append({"name": name, "status": "PASS", "outcome": "BLOCKED_AS_REQUIRED",
                         "box_mm": data["canonicalBoxMm"], "issues": data["verdict"]["issues"]})
            continue
        assert not data["expectedBlocked"] and data["verdict"]["status"] == "pass"
        web_path, pdf_path = OUT / f"{name}-web.png", OUT / f"{name}-pdf.png"
        normalize_image(SOURCE / f"{name}--cv-web.png", web_path)
        with fitz.open(SOURCE / f"{name}.pdf") as document:
            assert len(document) == data["pdf"]["pages"]
            pix = document[data["pdf"]["cvPageIndex"]].get_pixmap(matrix=fitz.Matrix(96 / 72, 96 / 72), alpha=False)
            save_normalized_rgb(Image.frombytes("RGB", (pix.width, pix.height), pix.samples), pdf_path)
        x, y, width, height = data["webBoxMm"]
        bounds = (max(0, round(x * 794 / 210) - 3), max(0, round(y * 1123 / 297) - 3),
                  min(794, round((x + width) * 794 / 210) + 3), min(1123, round((y + height) * 1123 / 297) + 3))
        web, pdf = [Image.open(path).convert("RGB").crop(bounds) for path in (web_path, pdf_path)]
        raw = image_score(web, pdf)
        smoothed = image_score(web.filter(ImageFilter.GaussianBlur(PHOTO_SMOOTHING_PX)),
                               pdf.filter(ImageFilter.GaussianBlur(PHOTO_SMOOTHING_PX)))
        center = ((x + width / 2) * 794 / 210 - bounds[0], (y + height / 2) * 1123 / 297 - bounds[1])
        palette = photo_palette(data["photoRendering"]["filter"])
        _, _, _, web_frame = frame_sides(web, center, palette)
        pdf_coverage, pdf_background, sectors, pdf_frame = frame_sides(pdf, center, palette)
        missing_frame = np.asarray(pdf).copy()
        erased = sectors["left"] & (pdf_coverage > 0.05)
        missing_frame[erased] = pdf_background[erased]
        _, _, _, negative_frame = frame_sides(Image.fromarray(missing_frame), center, palette)
        assert not frame_matches(web_frame, negative_frame), "Missing-left-frame negative control escaped"
        wrong_crop = image_score(web, ImageChops.offset(pdf, 12, 0))
        assert wrong_crop < PHOTO_SSIM_MIN, "Wrong-crop negative control escaped"
        case_failed = smoothed < PHOTO_SSIM_MIN or not frame_matches(web_frame, pdf_frame)
        if smoothed < PHOTO_SSIM_MIN:
            failures.append(f"{name}: photo SSIM {smoothed:.6f} below 0.95")
        if not frame_matches(web_frame, pdf_frame):
            failures.append(f"{name}: a frame side is missing or has different weight")
        pair_image(web, pdf, OUT / f"{name}-photo-compare.png")
        rows.append({"name": name, "status": "FAIL" if case_failed else "REVIEW" if raw < PHOTO_SSIM_MIN else "PASS",
                     "outcome": "PDF_DOWNLOADED", "pdf_pages": data["pdf"]["pages"],
                     "raw_rgb_ssim": raw, "smoothed_rgb_ssim": smoothed,
                     "frame_web_coverage": web_frame, "frame_pdf_coverage": pdf_frame,
                     "frame_side_ratios": {side: pdf_frame[side] / web_frame[side] if web_frame[side] else 0 for side in web_frame},
                     "missing_left_frame_negative": negative_frame,
                     "wrong_crop_negative_ssim": wrong_crop, "box_mm": data["webBoxMm"],
                     "pdf_sha256": data["pdf"]["sha256"]})
    status = "FAIL" if failures else "REVIEW" if any(row["status"] == "REVIEW" for row in rows) else "PASS"
    overview = Image.new("RGB", (795, 790), "#dddddd")
    for index, name in enumerate(VALID):
        image = Image.open(OUT / f"{name}-pdf.png").convert("RGB")
        image.thumbnail((265, 375))
        tile = Image.new("RGB", (265, 395), "white")
        tile.paste(image, (0, 20))
        ImageDraw.Draw(tile).text((3, 4), name, fill="black")
        overview.paste(tile, ((index % 3) * 265, (index // 3) * 395))
    overview.save(OUT / "all-valid-positions.png")
    result = {"source_sha": evidence[0]["sourceSha"], "source_dirty": any(row["sourceDirty"] for row in evidence),
              "browser": stats, "status": status, "failures": failures, "cases": rows,
              "summary": {"valid_exports": len(VALID), "blocked_as_required": len(BLOCKED),
                          "pdf_pages": sum(row.get("pdf_pages", 0) for row in rows)},
              "limits": {"photo_ssim": PHOTO_SSIM_MIN, "smoothing_px": PHOTO_SMOOTHING_PX,
                         "frame_side_ratio_min": 0.8, "frame_side_ratio_max": 1.25,
                         "frame_rgb": FRAME_RGB.tolist(),
                         "frame_coverage_model": "mixture with the filtered synthetic photo palette and white paper"}}
    (OUT / "report.json").write_text(json.dumps(result, indent=2) + "\n")
    lines = ["# Free CV photos at A4 edges", "", f"**{status}** on `{result['source_sha']}`", "",
             "Photo and frame pixels remain in the comparison; only editor resize handles are excluded.",
             "The existing 0.95 photo SSIM / 0.4 px smoothing limits remain unchanged.", "",
             "| Case | Result | Outcome | Raw SSIM | Smoothed SSIM |", "| --- | --- | --- | --- | --- |"]
    for row in rows:
        raw = f"{row['raw_rgb_ssim']:.4f}" if "raw_rgb_ssim" in row else ""
        smoothed = f"{row['smoothed_rgb_ssim']:.4f}" if "smoothed_rgb_ssim" in row else ""
        lines.append(f"| {row['name']} | {row['status']} | {row['outcome']} | {raw} | {smoothed} |")
    lines += ["", "Negative controls remove the left coloured frame and shift the photo crop; both must be rejected."]
    lines += [f"FAIL: {failure}" for failure in failures]
    (OUT / "REPORT.md").write_text("\n".join(lines) + "\n")
    print(json.dumps(result, indent=2))
    return bool(failures)


if __name__ == "__main__":
    raise SystemExit(main())
