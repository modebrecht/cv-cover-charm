"""Render every downloaded PDF before/after historical JSON restore, without masks."""
import hashlib
import json
from pathlib import Path

import fitz
from PIL import Image, ImageChops, ImageDraw

SOURCE = Path("test-results/import-recovery")
OUT = Path("artifacts/import-recovery/comparison")
EXPECTED_CASES = 6
DPI = 90


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
        sources.add(data["sourceSha"])
        fixtures.add(data["fixture"])
        dirty |= data["sourceDirty"]
        assert sha256(Path(data["fixture"])) == data["fixtureSha256"]
        files = {phase: evidence_path.parent / f"{phase}.pdf" for phase in ("before", "after")}
        for phase, path in files.items():
            assert sha256(path) == data["pdfSha256"][phase]
            assert sha256(evidence_path.parent / f"{phase}.json") == data["jsonSha256"][phase]
        pages = []
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
                preview = images[1].copy()
                preview.thumbnail((300, 425))
                tile = Image.new("RGB", (310, 455), "white")
                tile.paste(preview, (5, 25))
                ImageDraw.Draw(tile).text((5, 5), f"{case_index:02} / page {index + 1} / {'PASS' if identical else 'FAIL'}", fill="black")
                contact.paste(tile, ((index % 3) * 310, (index // 3) * 455))
                pages.append({"page": index + 1, "pixel_identical": identical})
            contact.save(OUT / f"{case_index:02}-all-pages.png")
        rows.append({**data, "pages": pages})
    assert len(sources) == 1 and len(fixtures) == EXPECTED_CASES, "Mixed source or duplicate fixtures"
    result = {"source_sha": sources.pop(), "source_dirty": dirty,
              "status": "FAIL" if failures else "PASS", "failures": failures, "browser": stats,
              "summary": {"complete_flows": len(rows), "historical_originals": sum(not row["word"] for row in rows),
                          "pdf_downloads": len(rows) * 2, "page_pairs": sum(len(row["pages"]) for row in rows)},
              "render_dpi": DPI, "cases": rows}
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
    assert not failures, "; ".join(failures)


if __name__ == "__main__":
    main()
