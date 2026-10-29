"""Inspect real DOCX downloads after JSON import, without claiming Word acceptance."""
import hashlib
import json
import posixpath
import re
import sys
import unicodedata
import zipfile
from io import BytesIO
from pathlib import Path
from xml.etree import ElementTree as ET

from PIL import Image

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
NS = {"w": W, "r": R, "wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing", "a": "http://schemas.openxmlformats.org/drawingml/2006/main"}


def normalized(value):
    return "".join(unicodedata.normalize("NFKC", value).replace("\u00ad", "").replace("•", "").split()).casefold()


def text(node):
    if node.tag == f"{{{W}}}t":
        return node.text or ""
    if node.tag in {f"{{{W}}}tab", f"{{{W}}}br"}:
        return " "
    return "".join(text(child) for child in node) + (" " if node.tag in {f"{{{W}}}p", f"{{{W}}}tr"} else "")


def inspect(path, expected):
    payload = path.read_bytes()
    assert hashlib.sha256(payload).hexdigest() == expected["docxSha256"], path
    with zipfile.ZipFile(BytesIO(payload)) as package:
        assert package.testzip() is None, path
        names = package.namelist()
        assert len(names) == len(set(names)), (path, "duplicate members")
        assert {"[Content_Types].xml", "word/document.xml", "word/_rels/document.xml.rels"} <= set(names), path
        xml = {name: ET.fromstring(package.read(name)) for name in names if name.endswith((".xml", ".rels"))}
        relationships = {}
        for name, root in xml.items():
            if not name.endswith(".rels"):
                continue
            if name == "_rels/.rels":
                source = ""
            else:
                folder, filename = name.rsplit("/_rels/", 1)
                source = f"{folder}/{filename[:-5]}"
            mapping = {}
            for relation in root:
                identifier = relation.attrib["Id"]
                assert identifier not in mapping, (path, name, identifier)
                target = relation.attrib["Target"]
                resolved = None if relation.get("TargetMode") == "External" else posixpath.normpath(target.lstrip("/") if target.startswith("/") else posixpath.join(posixpath.dirname(source), target))
                if resolved is not None:
                    assert not resolved.startswith("../") and resolved in names, (path, name, target)
                mapping[identifier] = resolved
            relationships[source] = mapping
        for name, root in xml.items():
            if name.endswith(".rels"):
                continue
            for node in root.iter():
                for attribute in [f"{{{R}}}id", f"{{{R}}}embed", f"{{{R}}}link"]:
                    if node.get(attribute):
                        assert node.get(attribute) in relationships.get(name, {}), (path, name, node.get(attribute))
        stories = [root for name, root in xml.items() if re.fullmatch(r"word/(document|header[^/]*|footer[^/]*)\.xml", name)]
        logical = normalized(" ".join(text(root) for root in stories))
        missing = [field for field in expected["expectedFields"] if normalized(field) not in logical]
        assert not missing, (path, "missing fields", missing)
        document = xml["word/document.xml"]
        sections = document.findall(".//w:sectPr", NS)
        assert len(sections) >= 3, (path, "missing sections")
        for section in sections:
            size = section.find("w:pgSz", NS)
            assert size is not None, path
            assert abs(int(size.get(f"{{{W}}}w")) - 11906) <= 2, (path, "non-A4 width")
            assert abs(int(size.get(f"{{{W}}}h")) - 16838) <= 2, (path, "non-A4 height")
        parents = {child: parent for parent in document.iter() for child in parent}
        photos = []
        for drawing in document.findall(".//wp:anchor", NS) + document.findall(".//wp:inline", NS):
            description = drawing.find("wp:docPr", NS)
            if description is None or description.get("name") != "cv.person.photo":
                continue
            ancestor = drawing
            while ancestor in parents:
                ancestor = parents[ancestor]
                assert ancestor.tag != f"{{{W}}}sdt", (path, "photo inside content control")
            blip = drawing.find(".//a:blip", NS)
            assert blip is not None, path
            member = relationships["word/document.xml"][blip.get(f"{{{R}}}embed")]
            with Image.open(BytesIO(package.read(member))) as image:
                image.load()
                assert min(image.size) > 1, (path, "empty photo")
                photos.append({"member": member, "width": image.width, "height": image.height})
        assert len(photos) == 1, (path, "ordinary CV photo count", len(photos))
        return {"file": path.name, "status": "PASS", "packageMembers": len(names), "sections": len(sections), "logicalFields": len(expected["expectedFields"]), "photos": photos}


def main():
    directory = Path(sys.argv[1] if len(sys.argv) > 1 else "artifacts/historical-import-28okt/browser")
    rows = []
    for variant in ["baseline", "mirrored", "embedded-legacy-chrome"]:
        expected = json.loads((directory / f"docx-{variant}-result.json").read_text())
        rows.append(inspect(directory / f"docx-{variant}.docx", expected))
    result = {"documents": len(rows), "passed": len(rows), "failed": 0, "rows": rows, "limitation": "Desktop Word save/reopen was not tested."}
    (directory / "docx-independent.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result))


if __name__ == "__main__":
    main()
