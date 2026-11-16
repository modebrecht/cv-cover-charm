"""Compare the eight actual Modern dossier PDF downloads with their Web pages."""

import argparse
import hashlib
import json
from pathlib import Path

import fitz
import numpy as np
from PIL import Image, ImageChops
from skimage.metrics import structural_similarity

from dossier_visual_parity import normalize_image, rasterize_pdf


FONT_KEYS = {"sans", "serif", "times", "humanist", "freundlich", "schmal", "maschine", "plakativ"}
PARTS = ("cover", "letter", "cv")


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=Path("artifacts/dossier-font-matrix"))
    args = parser.parse_args()
    source = args.source
    report = source / "comparison"
    report.mkdir(exist_ok=True)
    playwright = json.loads((source / "results.json").read_text())
    stats = playwright["stats"]
    complete = stats["expected"] == len(FONT_KEYS) and not any(
        stats.get(key, 0) for key in ("unexpected", "skipped", "flaky")
    )
    rows = []
    inputs = {}
    for font in sorted(FONT_KEYS):
        metadata = source / f"{font}.json"
        pdf = source / f"{font}.pdf"
        if not metadata.is_file() or not pdf.is_file():
            complete = False
            continue
        data = json.loads(metadata.read_text())
        assert data["font"] == font and data["template"] == "modern"
        assert data["storedFonts"] == dict.fromkeys(PARTS, font)
        inputs[font] = {"metadata_sha256": sha256(metadata), "pdf_sha256": sha256(pdf)}
        images = rasterize_pdf(pdf, report / "pdf", font)
        with fitz.open(pdf) as document:
            assert all(abs(page.rect.width - 210 * 72 / 25.4) < 0.1 and
                       abs(page.rect.height - 297 * 72 / 25.4) < 0.1 for page in document)
            page_texts = [page.get_text() for page in document]
            # The designed cover is rasterized by the current product. Only
            # letter/CV promise selectable text; visible cover glyphs are
            # checked with the full-page RGB comparison below.
            assert all("lea" in text.casefold() and "müller" in text.casefold()
                       for text in page_texts[1:])
        for index, kind in enumerate(PARTS):
            expected = data["web"][index]
            actual = data["canonical"][index]
            assert expected["kind"] == actual["kind"] == kind
            assert expected["text"] == actual["text"]
            assert len(expected["nodes"]) == len(actual["nodes"])
            delta = 0.0
            for node, found in zip(expected["nodes"], actual["nodes"]):
                assert node["text"] == found["text"] and node["font"] == found["font"]
                assert len(node["lines"]) == len(found["lines"])
                delta = max(delta, *(abs(a-b) for box, other in zip(node["lines"], found["lines"])
                                    for a, b in zip(box, other)))
            web_file = report / "web" / f"{font}--{kind}.png"
            normalize_image(source / f"{font}--{kind}.png", web_file)
            with Image.open(web_file) as image:
                web = image.convert("RGB")
            with Image.open(images[kind]) as image:
                rendered = image.convert("RGB")
            score = float(structural_similarity(np.asarray(web), np.asarray(rendered),
                                               data_range=255, channel_axis=2))
            difference = ImageChops.difference(web, rendered)
            diff_file = report / f"{font}--{kind}--diff.png"
            difference.save(diff_file)
            status = "FAIL" if delta > data["toleranceMm"] else "REVIEW" if score < 0.95 else "PASS"
            rows.append({
                "font": font, "part": kind, "status": status, "rgb_ssim": score,
                "geometry_delta_mm": delta, "text_nodes": len(expected["nodes"]),
                "platform_fonts_for_sample": expected["platformFonts"],
                "css_sample_family": expected["sampleFamily"],
                "pdf_text_characters": len(page_texts[index]),
                "web_png_sha256": sha256(web_file), "pdf_png_sha256": sha256(images[kind]),
                "diff_png_sha256": sha256(diff_file),
            })
    complete = complete and len(rows) == len(FONT_KEYS) * len(PARTS)
    source_diff = source / "SOURCE_DIFF.patch"
    source_diff_sha256 = sha256(source_diff) if source_diff.is_file() else None
    if complete:
        assert source_diff_sha256 == (source / "SOURCE_DIFF.sha256").read_text().strip()
    counts = {status: sum(row["status"] == status for row in rows)
              for status in ("PASS", "REVIEW", "FAIL")}
    status = "INCOMPLETE" if not complete else "FAIL" if counts["FAIL"] else "REVIEW" if counts["REVIEW"] else "PASS"
    result = {
        "status": status, "source_sha": (source / "SOURCE_SHA.txt").read_text().strip(),
        "source_diff_sha256": source_diff_sha256,
        "scope": "Eight explicit font selections; Modern short three-part dossier; one Chromium/Linux environment. Not an all-template, long-content or Windows/Word acceptance.",
        "pdf_visuals": "Browser-rasterized glyphs; PDF text extraction fonts are not proof of the visible font.",
        "complete": complete, "browser_stats": stats, "counts": counts,
        "inputs": inputs, "rows": rows,
    }
    (report / "report.json").write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({"status": status, "complete": complete, "counts": counts,
                      "page_pairs": len(rows)}, indent=2))
    return 1 if status in {"INCOMPLETE", "FAIL"} else 0


if __name__ == "__main__":
    raise SystemExit(main())
