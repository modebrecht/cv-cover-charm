"""Strict real-byte Neon PDF acceptance; raw reader text is never repaired."""
import argparse
import hashlib
import json
from pathlib import Path

import fitz
import numpy as np
import pypdfium2 as pdfium
from pypdf import PdfReader
from PIL import Image
from skimage.metrics import structural_similarity


def trace_name(page, name):
    return [
        {"font": run["font"], "opacity": run["opacity"], "type": run["type"],
         "bbox": run["bbox"], "origins": [char[2] for char in run["chars"]]}
        for run in page.get_texttrace()
        if "".join(chr(char[0]) for char in run["chars"]) == name
    ]


def fonts(resources):
    result = []
    for key, value in resources.get("/Font", {}).items():
        font = value.get_object()
        result.append({"id": key, "base": str(font.get("/BaseFont")),
                       "subtype": str(font.get("/Subtype")),
                       "to_unicode": "/ToUnicode" in font})
    for value in resources.get("/XObject", {}).values():
        obj = value.get_object()
        if "/Resources" in obj:
            result.extend(fonts(obj["/Resources"]))
    return result


def pixels(page, scale=2):
    pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
    return np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, 3)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", type=Path)
    args = parser.parse_args()
    source = json.loads((args.directory / "results.json").read_text())
    assert len(source["rows"]) == 9, "Incomplete nine-fixture capture"
    report = {"source": source["source"], "browser": source["browser"],
              "runtime_sources": source.get("runtimeSources"),
              "mupdf": fitz.VersionBind, "pdfium": str(pdfium.PDFIUM_INFO), "rows": []}
    for row in source["rows"]:
        fixture = row["fixture"]
        name = next(n["text"] for n in row["canonical"][0]["nodes"] if n["kind"] == "name")
        canonical_text = "\n".join(p["text"] for p in row["canonical"])
        expected = {n["text"]: canonical_text.count(n["text"])
                    for p in row["canonical"] for n in p["nodes"]
                    if n["kind"] in ("entry", "subtitle")}
        observations = []
        opened = {}
        for capture in row["captures"]:
            path = args.directory / capture["file"]
            assert hashlib.sha256(path.read_bytes()).hexdigest() == capture["sha256"]
            document = fitz.open(path)
            opened[capture["variant"]] = document
            pf = pdfium.PdfDocument(path)
            mupdf_text = "\n".join(p.get_text() for p in list(document)[2:])
            pdfium_text = "\n".join(p.get_textpage().get_text_range() for p in list(pf)[2:])
            pdfjs_text = "\n".join(p["text"] for p in capture["pages"][2:])
            readers = {}
            for engine, text in [("PDF.js", pdfjs_text), ("MuPDF", mupdf_text), ("PDFium", pdfium_text)]:
                readers[engine] = {"name_count": text.count(name), "literal_name": name in text,
                                   "text": text, "essential_counts": {s: text.count(s) for s in expected}}
                if capture["variant"] != "baseline" or fixture["id"] != "neon":
                    assert text.count(name) == 1, (fixture, capture["variant"], engine, text[:220])
                    for value, count in expected.items():
                        assert text.count(value) == count, (fixture, engine, value, count, text.count(value))
                    assert "LLeeaa" not in text and "MMüülllleerr" not in text
            # Selection ranges are actual reader geometry, not just DOM boxes.
            textpage = pf[2].get_textpage()
            search = textpage.search(name, match_case=True)
            selections = []
            while True:
                found = search.get_next()
                if found is None:
                    break
                start, count = found
                selections.append({"copy": textpage.get_text_range(start, count),
                                   "boxes": [textpage.get_charbox(i) for i in range(start, start + count)]})
            trace = trace_name(document[2], name)
            observations.append({"variant": capture["variant"], "sha256": capture["sha256"],
                                 "readers": readers, "mupdf_search": [list(r) for r in document[2].search_for(name)],
                                 "pdfium_selections": selections, "name_text_runs": trace,
                                 "fonts": fonts(PdfReader(path).pages[2]["/Resources"])})
            if capture["variant"] != "baseline" or fixture["id"] != "neon":
                assert len(selections) == 1 and selections[0]["copy"] == name
                assert len(document[2].search_for(name)) == 1
                assert len(trace) == 1 and trace[0]["opacity"] == 1
        fixed = next(o for o in observations if o["variant"] == "fixed")
        baseline = next(o for o in observations if o["variant"] == "baseline")
        if fixture["id"] == "neon":
            assert baseline["readers"]["PDF.js"]["name_count"] == 2
            assert baseline["readers"]["MuPDF"]["name_count"] == 2
            assert baseline["readers"]["PDFium"]["name_count"] == 0
            reference = next(o for o in observations if o["variant"] == "no-shadow")
        else:
            reference = baseline
        origins = np.asarray(fixed["name_text_runs"][0]["origins"])
        ref_origins = np.asarray(reference["name_text_runs"][0]["origins"])
        glyph_delta = float(np.max(np.abs(origins - ref_origins))) * 25.4 / 72
        select_delta = float(np.max(np.abs(np.asarray(fixed["pdfium_selections"][0]["boxes"]) -
                                                 np.asarray(reference["pdfium_selections"][0]["boxes"])))) * 25.4 / 72
        assert glyph_delta <= .02 and select_delta <= .02
        visuals = []
        for index, (before, after) in enumerate(zip(opened["baseline"], opened["fixed"])):
            a, b = pixels(before), pixels(after)
            delta = np.abs(a.astype(int) - b.astype(int))
            score = float(structural_similarity(a, b, channel_axis=2, data_range=255))
            changed = int(np.any(delta, axis=2).sum())
            visuals.append({"page": index + 1, "ssim": score, "changed_pixels": changed,
                            "mean_absolute_rgb": float(delta.mean()), "max_rgb": int(delta.max())})
            if fixture["id"] != "neon" or index != 2:
                assert changed == 0, (fixture, index, changed)
            else:
                assert score >= .995, (fixture, score)
                assert float(delta.mean()) <= .15
        report["rows"].append({"fixture": fixture, "name": name, "observations": observations,
                               "glyph_delta_mm": glyph_delta, "selection_delta_mm": select_delta,
                               "visuals": visuals})
        if fixture["label"] == "neon":
            original_web = np.asarray(Image.open(args.directory / "neon-baseline-web.png").convert("RGB"))
            fixed_web = np.asarray(Image.open(args.directory / "neon-fixed-web.png").convert("RGB"))
            web_ssim = float(structural_similarity(original_web, fixed_web, channel_axis=2, data_range=255))
            assert web_ssim >= .995, web_ssim
            native = pixels(opened["fixed"][2], scale=96/72)
            assert native.shape == original_web.shape, (native.shape, original_web.shape)
            web_pdf_ssim = float(structural_similarity(original_web, native, channel_axis=2, data_range=255))
            original_native = pixels(opened["baseline"][2], scale=96/72)
            baseline_web_pdf_ssim = float(structural_similarity(original_web, original_native, channel_axis=2, data_range=255))
            # Cross-engine screenshot/PDF antialiasing already differs before
            # the fix. Gate its regression against that same measured baseline,
            # alongside the independent >= .995 native/native gate above.
            assert web_pdf_ssim >= baseline_web_pdf_ssim - .0005, (baseline_web_pdf_ssim, web_pdf_ssim)
            report["rows"][-1]["original_design_web_ssim"] = web_ssim
            report["rows"][-1]["original_design_baseline_native_ssim"] = baseline_web_pdf_ssim
            report["rows"][-1]["original_design_native_ssim"] = web_pdf_ssim
        print(f"PASS {fixture['label']}: 3 readers, literal/copy/count/Unicode; glyph {glyph_delta:.8f} mm; selection {select_delta:.8f} mm", flush=True)
    report["verdict"] = "PASS"
    (args.directory / "reader-acceptance.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
