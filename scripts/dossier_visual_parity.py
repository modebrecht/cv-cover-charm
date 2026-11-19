#!/usr/bin/env python3
"""Build a visual parity report for the 39 dossier templates.

Each browser batch captures visible Web pages, a real PDF download and the
observed DOCX availability from the same saved fixture. It supplies a DOCX
only for regular downloads and configured internal previews.

The script converts PDF/DOCX to normalized A4 PNGs, computes SSIM for
Web<->PDF, Web<->DOCX and PDF<->DOCX, and emits CSV/Markdown plus visual
contact sheets. Low similarity is reported, not treated as a failure; malformed
or incomplete source packages do fail the run.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from statistics import mean
from typing import Iterable
from zipfile import ZipFile

import fitz
import numpy as np
import PIL
import skimage
from PIL import Image, ImageDraw, ImageOps
from skimage.metrics import structural_similarity

PAGE_KINDS = ("cover", "letter", "cv")
PAIR_KEYS = ("web_pdf", "web_docx", "pdf_docx")
LAYOUT_KEYS = tuple(f"{key}_layout" for key in PAIR_KEYS)
PAIR_LABELS = {
    "web_pdf": "Web ↔ PDF",
    "web_docx": "Web ↔ DOCX",
    "pdf_docx": "PDF ↔ DOCX",
}
TARGET_SIZE = (794, 1123)
ANALYSIS_SIZE = (265, 375)


@dataclass(frozen=True)
class TemplateCase:
    base: str
    template: str
    label: str
    directory: Path
    input_hash: str
    docx: dict

    @property
    def docx_kind(self) -> str | None:
        return next((kind for kind, row in self.docx.items() if row["status"] == "exported"), None)

    @property
    def docx_path(self) -> Path | None:
        kind = self.docx_kind
        return self.directory / self.docx[kind]["file"] if kind else None


def run(cmd: list[str], *, timeout: int = 180) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        cmd,
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        timeout=timeout,
    )
    if result.returncode != 0:
        raise RuntimeError(f"Command failed ({result.returncode}): {' '.join(cmd)}\n{result.stdout}")
    return result


def require_command(name: str) -> None:
    if shutil.which(name) is None:
        raise RuntimeError(f"Required command not found: {name}")


def read_gallery_cases(directories: list[Path], sha: str) -> list[TemplateCase]:
    if not re.fullmatch(r"[0-9a-f]{40}", sha):
        raise RuntimeError("Expected a full SHA for visual parity sources")
    cases: list[TemplateCase] = []
    for directory in directories:
        if (directory / "SOURCE_SHA.txt").read_text().strip() != sha:
            raise RuntimeError(f"Source SHA does not match for {directory}")
        expected_docx: set[Path] = set()
        expected_web: set[Path] = set()
        expected_pdf: set[Path] = set()
        records = sorted(directory.glob("*--docx-status.json"))
        if not records:
            raise RuntimeError(f"No DOCX status records in {directory}")
        for path in records:
            item = json.loads(path.read_text())
            base = item["base"]
            if not re.fullmatch(r"\d{2}-[A-Za-z0-9_-]+", base) or path.name != f"{base}--docx-status.json":
                raise RuntimeError(f"Invalid template key in {path}")
            if not re.fullmatch(r"[0-9a-f]{64}", item["inputHash"]):
                raise RuntimeError(f"Missing input hash for {base}")
            docx = item["docx"]
            if set(docx) != {"regular", "preview"}:
                raise RuntimeError(f"Missing or unknown DOCX paths for {base}")
            for kind, empty_status in (("regular", "blocked"), ("preview", "not-configured")):
                row = docx[kind]
                if row["status"] == empty_status:
                    if "file" in row or (kind == "regular" and not row.get("reason", "").strip()):
                        raise RuntimeError(f"Invalid {kind} status for {base}")
                    continue
                file = f"{base}--{kind}.docx"
                if row["status"] != "exported" or row.get("file") != file:
                    raise RuntimeError(f"Unexpected {kind} record for {base}")
                document = directory / file
                if hashlib.sha256(document.read_bytes()).hexdigest() != row["sha256"]:
                    raise RuntimeError(f"DOCX digest mismatch for {file}")
                with ZipFile(document) as package:
                    if package.testzip() or not {
                        "[Content_Types].xml", "word/document.xml", "word/styles.xml",
                        "word/_rels/document.xml.rels",
                    }.issubset(package.namelist()):
                        raise RuntimeError(f"Incomplete DOCX package {file}")
                expected_docx.add(document)
            if all(row["status"] == "exported" for row in docx.values()):
                raise RuntimeError(f"Multiple comparison sources for {base}")
            expected_pdf.add(directory / f"{base}.pdf")
            expected_web.update(directory / f"{base}--{kind}.png" for kind in PAGE_KINDS)
            cases.append(TemplateCase(base, item["template"], item["label"], directory, item["inputHash"], docx))
        for pattern, expected in (("*.docx", expected_docx), ("*.pdf", expected_pdf), ("*.png", expected_web)):
            if set(directory.glob(pattern)) != expected:
                raise RuntimeError(f"Unexpected or missing {pattern} sources in {directory}")
    if len(cases) != 39:
        raise RuntimeError(f"Expected 39 template status records, found {len(cases)}")
    if (
        {case.base[:2] for case in cases} != {f"{i:02d}" for i in range(1, 40)}
        or len({case.template for case in cases}) != 39
    ):
        raise RuntimeError("Gallery contains duplicate or missing template keys")
    return sorted(cases, key=lambda case: case.base)


def save_normalized_rgb(rgb: Image.Image, target: Path) -> None:
    # All three renderers are A4. Fit defensively without cropping so a bad
    # page geometry remains visible instead of being hidden by normalization.
    fitted = ImageOps.contain(rgb, TARGET_SIZE, method=Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", TARGET_SIZE, "white")
    x = (TARGET_SIZE[0] - fitted.width) // 2
    y = (TARGET_SIZE[1] - fitted.height) // 2
    canvas.paste(fitted, (x, y))
    target.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(target, "PNG", compress_level=1)


def normalize_image(source: Path, target: Path) -> None:
    with Image.open(source) as image:
        save_normalized_rgb(image.convert("RGB"), target)


def rasterize_pdf(pdf: Path, out_dir: Path, base: str) -> dict[str, Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    document = fitz.open(pdf)
    try:
        if document.page_count != 3:
            raise RuntimeError(f"{pdf.name}: expected 3 PDF pages, found {document.page_count}")

        result: dict[str, Path] = {}
        scale = 96.0 / 72.0
        matrix = fitz.Matrix(scale, scale)
        for page_number, kind in enumerate(PAGE_KINDS):
            page = document.load_page(page_number)
            pix = page.get_pixmap(matrix=matrix, alpha=False)
            target = out_dir / f"{base}--{kind}.png"
            rgb = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
            save_normalized_rgb(rgb, target)
            result[kind] = target
        return result
    finally:
        document.close()

def convert_all_docx_to_pdf(cases: list[TemplateCase], out_dir: Path) -> dict[str, Path]:
    files = {case.base: path for case in cases if (path := case.docx_path) is not None}
    if not files:
        return {}
    require_command("libreoffice")
    out_dir.mkdir(parents=True, exist_ok=True)
    profile = out_dir / "lo-profile"
    profile_uri = profile.resolve().as_uri()
    for path in files.values():
        (out_dir / f"{path.stem}.pdf").unlink(missing_ok=True)

    try:
        run(
            [
                "libreoffice",
                "--headless",
                "--nologo",
                "--nodefault",
                "--nolockcheck",
                "--nofirststartwizard",
                f"-env:UserInstallation={profile_uri}",
                "--convert-to",
                "pdf",
                "--outdir",
                str(out_dir),
                *[str(path) for path in files.values()],
            ],
            timeout=600,
        )
    finally:
        shutil.rmtree(profile, ignore_errors=True)

    result: dict[str, Path] = {}
    for base, source in files.items():
        pdf = out_dir / f"{source.stem}.pdf"
        if not pdf.is_file() or pdf.stat().st_size < 1000:
            raise RuntimeError(f"LibreOffice did not create a usable PDF for {source.name}")
        result[base] = pdf
    return result

def analysis_arrays(path: Path) -> tuple[np.ndarray, np.ndarray]:
    with Image.open(path) as image:
        if image.size != TARGET_SIZE:
            raise RuntimeError(f"Unexpected normalized size for {path}: {image.size}")
        rgb_image = image.convert("RGB").resize(ANALYSIS_SIZE, Image.Resampling.LANCZOS)
        rgb = np.asarray(rgb_image, dtype=np.uint8)
        gray = np.asarray(rgb_image.convert("L"), dtype=np.uint8)
        return rgb, gray


def pair_scores(web: Path, pdf: Path, docx: Path | None) -> dict[str, float]:
    web_rgb, web_gray = analysis_arrays(web)
    pdf_rgb, pdf_gray = analysis_arrays(pdf)

    def rgb_ssim(a: np.ndarray, b: np.ndarray) -> float:
        return float(structural_similarity(a, b, data_range=255, channel_axis=2))

    def layout_ssim(a: np.ndarray, b: np.ndarray) -> float:
        return float(structural_similarity(a, b, data_range=255))

    scores = {
        "web_pdf": rgb_ssim(web_rgb, pdf_rgb),
        "web_pdf_layout": layout_ssim(web_gray, pdf_gray),
    }
    if docx:
        docx_rgb, docx_gray = analysis_arrays(docx)
        scores.update(
            web_docx=rgb_ssim(web_rgb, docx_rgb),
            pdf_docx=rgb_ssim(pdf_rgb, docx_rgb),
            web_docx_layout=layout_ssim(web_gray, docx_gray),
            pdf_docx_layout=layout_ssim(pdf_gray, docx_gray),
        )
    return scores


def assert_no_exact_duplicate_images(
    source: str,
    rows: list[dict[str, object]],
    image_lookup: dict[tuple[str, str, str], Path],
) -> None:
    by_digest: dict[tuple[str, str], list[str]] = {}
    for row in rows:
        base = str(row["base"])
        page = str(row["page"])
        path = image_lookup.get((base, page, source))
        if path is None:
            continue
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        by_digest.setdefault((page, digest), []).append(base)
    duplicates = [
        [f"{base}:{page}" for base in bases]
        for (page, _digest), bases in by_digest.items()
        if len(bases) > 1
    ]
    if duplicates:
        detail = "; ".join(", ".join(items) for items in duplicates[:8])
        raise RuntimeError(
            f"{source} contains exact duplicate normalized pages across distinct gallery cases: {detail}"
        )


def renderer_versions() -> list[str]:
    libreoffice = run(["libreoffice", "--version"], timeout=30).stdout.strip()
    return [
        f"Python {sys.version.split()[0]}",
        libreoffice,
        f"PyMuPDF {fitz.VersionBind}",
        f"Pillow {PIL.__version__}",
        f"NumPy {np.__version__}",
        f"scikit-image {skimage.__version__}",
    ]

def resize_for_sheet(path: Path, width: int) -> Image.Image:
    with Image.open(path) as image:
        rgb = image.convert("RGB")
        height = round(rgb.height * width / rgb.width)
        return rgb.resize((width, height), Image.Resampling.LANCZOS)


def create_template_sheet(case: TemplateCase, rows: list[dict[str, object]], image_map: dict[str, dict[str, Path]], target: Path) -> None:
    thumb_w = 340
    thumb_h = round(TARGET_SIZE[1] * thumb_w / TARGET_SIZE[0])
    margin = 18
    title_h = 42
    row_caption_h = 38
    col_gap = 14
    row_gap = 18
    width = margin * 2 + thumb_w * 3 + col_gap * 2
    content_top = title_h + margin + 20
    height = content_top + 3 * (row_caption_h + thumb_h) + 2 * row_gap + margin
    sheet = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(sheet)
    draw.text((margin, 12), f"{case.base} — {case.label}   |   Web / PDF / DOCX", fill="black")
    docx_label = {
        "regular": "DOCX / LibreOffice (regular)",
        "preview": "DOCX / LibreOffice (internal preview)",
        None: "DOCX unavailable",
    }[case.docx_kind]
    for col, label in enumerate(("WEB (visible site)", "PDF", docx_label)):
        x = margin + col * (thumb_w + col_gap)
        draw.text((x, title_h), label, fill="black")
    row_lookup = {str(row["page"]): row for row in rows}
    y = content_top
    for kind in PAGE_KINDS:
        row = row_lookup[kind]
        draw.text(
            (margin, y),
            (
                f"{kind.upper()}  Web↔PDF {format_score(row.get('web_pdf'))}   "
                f"Web↔DOCX {format_score(row.get('web_docx'))}   "
                f"PDF↔DOCX {format_score(row.get('pdf_docx'))}"
            ),
            fill="black",
        )
        y += row_caption_h
        for col, source in enumerate(("web", "pdf", "docx")):
            if source in image_map:
                thumb = resize_for_sheet(image_map[source][kind], thumb_w)
                x = margin + col * (thumb_w + col_gap)
                sheet.paste(thumb, (x, y))
        y += thumb_h + row_gap
    target.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(target, "JPEG", quality=84, optimize=True)


def create_worst_sheet(rows: list[dict[str, object]], pair: str, image_lookup: dict[tuple[str, str, str], Path], target: Path, count: int = 12) -> None:
    worst = sorted((row for row in rows if pair in row), key=lambda row: float(row[pair]))[:count]
    if not worst:
        return
    left, right = pair.split("_")
    thumb_w = 210
    thumb_h = round(TARGET_SIZE[1] * thumb_w / TARGET_SIZE[0])
    cell_w = thumb_w * 2 + 28
    cell_h = thumb_h + 54
    cols = 3
    rows_count = (len(worst) + cols - 1) // cols
    canvas = Image.new("RGB", (cell_w * cols, cell_h * rows_count), "white")
    draw = ImageDraw.Draw(canvas)
    for index, row in enumerate(worst):
        x0 = (index % cols) * cell_w
        y0 = (index // cols) * cell_h
        base = str(row["base"])
        page = str(row["page"])
        source = f" ({row['docx_source']})" if "docx" in pair else ""
        draw.text(
            (x0 + 6, y0 + 4),
            f"{base} {page}  {PAIR_LABELS[pair]}{source} {row[pair]:.3f}",
            fill="black",
        )
        a = resize_for_sheet(image_lookup[(base, page, left)], thumb_w)
        b = resize_for_sheet(image_lookup[(base, page, right)], thumb_w)
        canvas.paste(a, (x0 + 6, y0 + 30))
        canvas.paste(b, (x0 + 16 + thumb_w, y0 + 30))
    target.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(target, "JPEG", quality=84, optimize=True)


def format_score(value: object) -> str:
    return "—" if value is None else f"{float(value):.3f}"


def average(rows: Iterable[dict[str, object]], key: str) -> str:
    values = [float(row[key]) for row in rows if key in row]
    return format_score(mean(values) if values else None)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch-dir", type=Path, nargs="+", required=True)
    parser.add_argument("--sha", required=True)
    parser.add_argument("--out-dir", type=Path, required=True)
    args = parser.parse_args()

    cases = read_gallery_cases(args.batch_dir, args.sha)
    args.out_dir.mkdir(parents=True, exist_ok=True)
    normalized = args.out_dir / "normalized"
    pdf_png_dir = normalized / "pdf"
    docx_png_dir = normalized / "docx"
    web_png_dir = normalized / "web"
    docx_pdf_dir = args.out_dir / "docx-pdf"

    rows: list[dict[str, object]] = []
    image_lookup: dict[tuple[str, str, str], Path] = {}

    docx_pdfs = convert_all_docx_to_pdf(cases, docx_pdf_dir)
    print(f"Converted {len(docx_pdfs)} DOCX files through LibreOffice.", flush=True)

    for index, case in enumerate(cases, start=1):
        print(f"[{index:02d}/39] {case.base} {case.label}", flush=True)
        pdf_pages = rasterize_pdf(case.directory / f"{case.base}.pdf", pdf_png_dir, case.base)
        docx_pages = (
            rasterize_pdf(docx_pdfs[case.base], docx_png_dir, case.base)
            if case.base in docx_pdfs
            else {}
        )

        template_images: dict[str, dict[str, Path]] = {"web": {}, "pdf": pdf_pages}
        if docx_pages:
            template_images["docx"] = docx_pages
        template_rows: list[dict[str, object]] = []
        for kind in PAGE_KINDS:
            source_web = case.directory / f"{case.base}--{kind}.png"
            normalized_web = web_png_dir / f"{case.base}--{kind}.png"
            normalize_image(source_web, normalized_web)
            template_images["web"][kind] = normalized_web

            scores = pair_scores(normalized_web, pdf_pages[kind], docx_pages.get(kind))
            row = {
                "base": case.base,
                "label": case.label,
                "page": kind,
                "docx_source": case.docx_kind or "unavailable",
                **scores,
            }
            rows.append(row)
            template_rows.append(row)
            for source, pages in template_images.items():
                image_lookup[(case.base, kind, source)] = pages[kind]

        create_template_sheet(
            case,
            template_rows,
            template_images,
            args.out_dir / "templates" / f"{case.base}.jpg",
        )

    if len(rows) != 117:
        raise RuntimeError(f"Expected 117 parity rows, found {len(rows)}")

    # Exact duplicate page images are a source-integrity failure, not merely a
    # low-similarity observation. This specifically guards against gallery state
    # races that can silently capture a previous template under a new filename.
    for source in ("web", "pdf", "docx"):
        assert_no_exact_duplicate_images(source, rows, image_lookup)

    fields = ["base", "label", "page", "docx_source", *PAIR_KEYS, *LAYOUT_KEYS]
    with (args.out_dir / "metrics.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow({
                **row,
                **{key: f"{float(row[key]):.6f}" for key in (*PAIR_KEYS, *LAYOUT_KEYS) if key in row},
            })

    for pair in PAIR_KEYS:
        create_worst_sheet(rows, pair, image_lookup, args.out_dir / f"worst-{pair.replace('_', '-vs-')}.jpg")

    versions = renderer_versions()
    counts = {
        "templates": len(cases),
        "regular_docx_exports": sum(case.docx_kind == "regular" for case in cases),
        "regular_docx_blocked": sum(case.docx["regular"]["status"] == "blocked" for case in cases),
        "preview_docx_exports": sum(case.docx_kind == "preview" for case in cases),
        "web_pdf_pairs": len(rows),
        "pages_with_docx": sum(row["docx_source"] != "unavailable" for row in rows),
    }
    report = {
        "source_sha": args.sha,
        "docx_coverage": "complete" if len(docx_pdfs) == len(cases) else "partial",
        "counts": counts,
        "renderer_versions": versions,
        "templates": [
            {
                "base": case.base, "template": case.template, "label": case.label,
                "input_hash": case.input_hash, "docx": case.docx,
            }
            for case in cases
        ],
        "pages": rows,
    }
    (args.out_dir / "report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8",
    )
    summary_lines = [
        "# Dossier Visual Parity x39",
        "",
        f"Source: `{args.sha}`",
        f"DOCX comparison coverage: **{report['docx_coverage'].upper()}**.",
        "",
        f"- Web/PDF: **{counts['web_pdf_pairs']} page pairs**.",
        f"- Regular DOCX: **{counts['regular_docx_exports']} exported**, **{counts['regular_docx_blocked']} expected blocks**.",
        f"- Internal DOCX previews: **{counts['preview_docx_exports']} exported**.",
        f"- DOCX comparisons in LibreOffice: **{counts['pages_with_docx']} pages**.",
        "",
        "Each comparison uses the same saved input within a template. Modern and Brief use Sans.",
        "Blank scores indicate unavailable outputs. SSIM describes raster similarity.",
        "Internal previews and LibreOffice renders carry no desktop Word acceptance.",
        "",
        "## Renderer versions",
        "",
        *[f"- {version}" for version in versions],
        "",
        "## Mean RGB visual SSIM",
        "",
        "| Coverage | Web ↔ PDF | Web ↔ DOCX | PDF ↔ DOCX |",
        "| --- | ---: | ---: | ---: |",
        f"| All Web/PDF pages | {average(rows, 'web_pdf')} | — | — |",
    ]
    for kind in ("regular", "preview"):
        group = [row for row in rows if row["docx_source"] == kind]
        summary_lines.append(f"| DOCX {kind} | {' | '.join(average(group, key) for key in PAIR_KEYS)} |")

    summary_lines += [
        "", "## Per-template mean RGB visual SSIM", "",
        "| Template | Regular DOCX | Internal preview | Web ↔ PDF | Web ↔ DOCX | PDF ↔ DOCX |",
        "| --- | --- | --- | ---: | ---: | ---: |",
    ]
    for case in cases:
        case_rows = [row for row in rows if row["base"] == case.base]
        scores = " | ".join(average(case_rows, key) for key in PAIR_KEYS)
        summary_lines.append(
            f"| {case.base} — {case.label} | {case.docx['regular']['status']} | "
            f"{case.docx['preview']['status']} | {scores} |"
        )

    for pair in PAIR_KEYS:
        ranked = sorted((row for row in rows if pair in row), key=lambda row: float(row[pair]))
        summary_lines += [
            "", f"## Lowest similarities — {PAIR_LABELS[pair]}", "",
            "| Template | Page | DOCX evidence | RGB SSIM | Layout SSIM |",
            "| --- | --- | --- | ---: | ---: |",
        ]
        for row in ranked[:12]:
            summary_lines.append(
                f"| {row['base']} | {row['page']} | {row['docx_source']} | "
                f"{format_score(row[pair])} | {format_score(row[pair + '_layout'])} |"
            )

    (args.out_dir / "SUMMARY.md").write_text("\n".join(summary_lines) + "\n", encoding="utf-8")
    print("\n".join(summary_lines[:36]))
    print(f"\nReport written to {args.out_dir}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
