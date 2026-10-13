"""Read real PDF bytes with MuPDF and PDFium; compact text is diagnostic only."""
import argparse
import hashlib
import json
from pathlib import Path
import fitz
import pypdfium2 as pdfium
from pypdf import PdfReader


def inspect_pdf(path):
    raw = path.read_bytes()
    doc = fitz.open(stream=raw, filetype="pdf")
    pdf = pdfium.PdfDocument(raw)
    pages = []
    for i, page in enumerate(doc):
        chars = [c for b in page.get_text("rawdict")["blocks"] if b["type"] == 0
                 for line in b["lines"] for span in line["spans"] for c in span["chars"]]
        textpage = pdf[i].get_textpage()
        search = textpage.search("Familie", match_case=False)
        hits = []
        while (hit := search.get_next()) is not None:
            hits.append(hit)
        pages.append({"mupdf": page.get_text(),
                      "mupdfWithoutInferredSpaces": page.get_text(flags=fitz.TEXT_INHIBIT_SPACES),
                      "mupdfLiteralFamilieHits": len(page.search_for("Familie")),
                      "pdfium": textpage.get_text_range(),
                      "pdfiumLiteralFamilieHits": len(hits),
                      "box": list(page.rect),
                      "characterCount": len(chars)})
        search.close()
        textpage.close()
    reader = PdfReader(path)
    streams_list = []
    seen_forms = set()
    fonts = []
    def resources(res):
        res = res.get_object()
        for name, reference in res.get("/Font", {}).items():
            font = reference.get_object()
            descendants = font.get("/DescendantFonts", [])
            descendant = descendants[0].get_object() if descendants else font
            descriptor = descendant.get("/FontDescriptor", {})
            if hasattr(descriptor, "get_object"):
                descriptor = descriptor.get_object()
            fonts.append({"name": name, "baseFont": str(font.get("/BaseFont")),
                          "subtype": str(font.get("/Subtype")),
                          "toUnicode": "/ToUnicode" in font,
                          "embedded": any(key in descriptor for key in ("/FontFile", "/FontFile2", "/FontFile3")),
                          "widths": str(descendant.get("/W", descendant.get("/Widths", [])))[:1200]})
        for reference in res.get("/XObject", {}).values():
            obj = reference.get_object()
            key = (reference.idnum, reference.generation)
            if obj.get("/Subtype") != "/Form" or key in seen_forms:
                continue
            seen_forms.add(key)
            streams_list.append(obj.get_data())
            if "/Resources" in obj:
                resources(obj["/Resources"])
    for page in reader.pages:
        streams_list.append(page.get_contents().get_data())
        resources(page["/Resources"])
    streams = b"\n".join(streams_list)
    pdf.close()
    doc.close()
    return {"file": path.name, "sha256": hashlib.sha256(raw).hexdigest(), "pages": pages,
            "fonts": fonts, "actualTextOperators": streams.count(b"/ActualText"),
            "textOperators": {op.decode(): streams.count(op) for op in [b" Tj", b" TJ", b" Td", b" Tm", b" Tc"]},
            "firstTextStream": streams.decode("latin1")[:12000] if len(reader.pages) == 1 else None}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", type=Path)
    args = parser.parse_args()
    rows = [inspect_pdf(path) for path in sorted(args.directory.glob("*.pdf"))]
    result = {"engines": {"mupdf": fitz.VersionBind, "pdfium": str(pdfium.PDFIUM_INFO)}, "rows": rows}
    (args.directory / "readers.json").write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(json.dumps({"files": len(rows), "engines": result["engines"],
                      "familie": [{"file": row["file"], "mupdf": sum(p["mupdfLiteralFamilieHits"] for p in row["pages"]),
                                   "pdfium": sum(p["pdfiumLiteralFamilieHits"] for p in row["pages"])} for row in rows]}))


if __name__ == "__main__":
    main()
