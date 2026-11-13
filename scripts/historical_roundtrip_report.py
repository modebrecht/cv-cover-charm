"""Render every downloaded PDF before/after historical JSON restore, without masks."""
import hashlib
import json
from pathlib import Path

import fitz
from PIL import Image, ImageChops, ImageDraw, ImageStat, __version__ as pillow_version

SOURCE = Path("test-results/import-recovery")
OUT = Path("artifacts/import-recovery/comparison")
EXPECTED_CASES = 18
DPI = 90
BACKGROUND_CHANNEL_DELTA_MAX = 3


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    stats = json.loads(Path("artifacts/import-recovery/results.json").read_text())["stats"]
    assert stats["expected"] > EXPECTED_CASES and all(
        stats[key] == 0 for key in ("unexpected", "skipped", "flaky")
    ), "Incomplete or failed import/recovery browser run"
    evidence = sorted(SOURCE.glob("*/roundtrip-evidence.json"))
    assert len(evidence) == EXPECTED_CASES, "Missing complete download/restore cases"
    rows, sources, fixtures, failures = [], set(), set(), []
    dirty = False
    for case_index, evidence_path in enumerate(evidence, 1):
        data = json.loads(evidence_path.read_text())
        assert data["status"] == "PASS"
        assert data["fixtureKind"] in ("historical-original", "derived-sidebar-control")
        sources.add(data["sourceSha"])
        fixtures.add(data["fixture"])
        dirty |= data["sourceDirty"]
        assert sha256(Path(data["fixture"])) == data["fixtureSha256"]
        files = {phase: evidence_path.parent / f"{phase}.pdf" for phase in ("before", "after")}
        for phase, path in files.items():
            assert sha256(path) == data["pdfSha256"][phase]
            assert sha256(evidence_path.parent / f"{phase}.json") == data["jsonSha256"][phase]
        pages, pdf_checks = [], {}
        with fitz.open(files["before"]) as before, fitz.open(files["after"]) as after:
            assert len(before) == len(after) == data["pdfPages"]
            contact = Image.new("RGB", (930, 455 * ((len(before) + 2) // 3)), "#dddddd")
            for index in range(len(before)):
                assert abs(before[index].rect.width - 595.28) < 1
                assert abs(before[index].rect.height - 841.89) < 1
                assert before[index].rect == after[index].rect
                images = []
                for phase, document in (("before", before), ("after", after)):
                    pix = document[index].get_pixmap(matrix=fitz.Matrix(DPI / 72, DPI / 72), alpha=False)
                    image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
                    image.save(OUT / f"{case_index:02}-{index + 1:02}-{phase}.png")
                    images.append(image)
                difference = ImageChops.difference(*images)
                identical = difference.getbbox() is None
                if not identical:
                    failures.append(f"{data['label']}: rendered page {index + 1} changed")
                    difference.save(OUT / f"{case_index:02}-{index + 1:02}-diff.png")
                if data["fixture"].endswith("header-inline-unsynced-project.json") and index in (1, 2):
                    assert data["chrome"]["sync"] is False
                    scope = "letter" if index == 1 else "cv"
                    color = data["chrome"][scope]["headerBackgroundColor"]
                    expected = [int(color[i:i + 2], 16) for i in (1, 3, 5)]
                    x, y = round(185 * DPI / 25.4), round(1.5 * DPI / 25.4)
                    measured = ImageStat.Stat(images[1].crop((x - 2, y - 2, x + 3, y + 3))).mean
                    delta = max(abs(a - b) for a, b in zip(expected, measured))
                    if delta > BACKGROUND_CHANNEL_DELTA_MAX:
                        failures.append(f"{data['label']}: {scope} header changed colour")
                    pdf_checks[f"{scope}_header"] = {"expected_rgb": expected, "measured_rgb": measured,
                                                    "max_channel_delta": delta}
                preview = images[1].copy()
                preview.thumbnail((300, 425))
                tile = Image.new("RGB", (310, 455), "white")
                tile.paste(preview, (5, 25))
                ImageDraw.Draw(tile).text((5, 5), f"{case_index:02} / page {index + 1} / {'PASS' if identical else 'FAIL'}", fill="black")
                contact.paste(tile, ((index % 3) * 310, (index // 3) * 455))
                pages.append({"page": index + 1, "pixel_identical": identical})
            contact.save(OUT / f"{case_index:02}-all-pages.png")
            if data.get("continuation"):
                assert abs(data["continuation"]["topMm"] - 40) <= 0.1
                assert len(after) == 4
                headings = after[3].search_for("Referenzen")
                assert len(headings) == 1, "Missing continuation reference heading in actual PDF"
                top = headings[0].y0 * 25.4 / 72
                # PDF text bounds include font ascenders/descenders; the
                # heading must lie within its first text line below 40 mm.
                if not 40 <= top <= 45:
                    failures.append(f"{data['label']}: actual PDF reference heading at {top:.3f} mm")
                pdf_checks["continuation_heading_top_mm"] = top
        rows.append({**data, "pages": pages, "pdf_checks": pdf_checks})
    assert len(sources) == 1 and len(fixtures) == EXPECTED_CASES, "Mixed source or duplicate fixtures"
    result = {"source_sha": sources.pop(), "source_dirty": dirty,
              "status": "FAIL" if failures else "PASS", "failures": failures, "browser": stats,
              "summary": {"complete_flows": len(rows), "historical_originals": sum(row["fixtureKind"] == "historical-original" for row in rows),
                          "pdf_downloads": len(rows) * 2, "page_pairs": sum(len(row["pages"]) for row in rows)},
              "render_dpi": DPI, "render_runtime": {"pymupdf": fitz.VersionBind, "pillow": pillow_version},
              "cases": rows}
    (OUT / "report.json").write_text(json.dumps(result, indent=2) + "\n")
    lines = ["# Historical project download / JSON restore", "",
             f"**{result['status']}** on `{result['source_sha']}`", "",
             "Whole A4 pages at 90 DPI; exact RGB comparison, no masks or smoothing.", "",
             "| Case | PDF pages per download | DOCX | Pixel-identical pages |",
             "| --- | --- | --- | --- |"]
    for row in rows:
        lines.append(f"| {row['label']} | {row['pdfPages']} | {'Downloaded and package-compared' if row['word'] else 'Expected support boundary'} | "
                     f"{sum(p['pixel_identical'] for p in row['pages'])}/{len(row['pages'])} |")
    lines += ["", "This proves restoration consistency for the selected files. It does not prove visual parity with historical Word documents or desktop Word save/reopen acceptance."]
    (OUT / "REPORT.md").write_text("\n".join(lines) + "\n")
    print(json.dumps({key: result[key] for key in ("source_sha", "source_dirty", "status", "summary", "failures")}))
    print(json.dumps({"pdf_checks": {row["label"]: row["pdf_checks"] for row in rows if row["pdf_checks"]}}))
    assert not failures, "; ".join(failures)


if __name__ == "__main__":
    main()
