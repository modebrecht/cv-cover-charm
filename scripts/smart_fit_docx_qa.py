"""Inspect the two real CV DOCX downloads produced by smart-fit browser QA.

This validates package structure, field parity and normalized photo pixels.
It does not execute Microsoft Word or certify its pagination.
"""

import base64
import hashlib
import json
import posixpath
import sys
from io import BytesIO
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

from PIL import Image

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
NS = {
    "w": W,
    "wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}


def inspect(path, original):
    with ZipFile(path) as package:
        assert package.testzip() is None
        names = package.namelist()
        assert len(names) == len(set(names)), "duplicate package entries"
        roots = {
            name: ET.fromstring(package.read(name))
            for name in names
            if name.endswith((".xml", ".rels"))
        }
        for name, root in roots.items():
            if not name.endswith(".rels"):
                continue
            folder = "" if name == "_rels/.rels" else name.rsplit("/_rels/", 1)[0] + "/"
            seen = set()
            for relation in root:
                identifier = relation.get("Id")
                assert identifier not in seen, (name, identifier)
                seen.add(identifier)
                if relation.get("TargetMode") == "External":
                    continue
                target = relation.get("Target")
                resolved = posixpath.normpath(
                    target.lstrip("/") if target.startswith("/") else folder + target
                )
                assert resolved in names, (name, resolved)
        document = roots["word/document.xml"]
        parents = {child: parent for parent in document.iter() for child in parent}
        photos = [
            anchor
            for anchor in document.findall(".//wp:anchor", NS)
            if anchor.find("wp:docPr", NS).get("name") == "cv.person.photo"
        ]
        assert len(photos) == 1, "expected one ordinary CV portrait"
        ancestor = photos[0]
        while ancestor in parents:
            ancestor = parents[ancestor]
            assert ancestor.tag != f"{{{W}}}sdt", "photo inside a content control"
        identifier = photos[0].find(".//a:blip", NS).get(f"{{{NS['r']}}}embed")
        relation = next(
            relation
            for relation in roots["word/_rels/document.xml.rels"]
            if relation.get("Id") == identifier
        )
        image_bytes = package.read(posixpath.normpath("word/" + relation.get("Target")))
        image = Image.open(BytesIO(image_bytes)).convert("RGBA")
        assert image.size == original.size and image.tobytes() == original.tobytes(), "photo pixel loss"
        sections = document.findall(".//w:sectPr", NS)
        assert len(sections) == 1, "CV-only export contains another document section"
        size = sections[0].find("w:pgSz", NS)
        assert abs(int(size.get(f"{{{W}}}w")) - 11906) <= 2
        assert abs(int(size.get(f"{{{W}}}h")) - 16838) <= 2
        fields = []
        for root in roots.values():
            if root.tag not in {f"{{{W}}}{tag}" for tag in ("document", "hdr", "ftr")}:
                continue
            for control in root.findall(".//w:sdt", NS):
                tag = control.find("w:sdtPr/w:tag", NS)
                if tag is not None:
                    fields.append((tag.get(f"{{{W}}}val"), "".join(control.itertext())))
        assert len(fields) >= 43
        return {
            "file": path.name,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            "sections": len(sections),
            "fieldOccurrences": len(fields),
            "photoDimensions": image.size,
            "originalPhotoPixelsPreserved": True,
            "ordinaryPhotoOutsideContentControl": True,
            "photoXMm": int(photos[0].find("wp:positionH/wp:posOffset", NS).text) / 36000,
            "fields": sorted(fields),
        }


if __name__ == "__main__":
    directory = Path(sys.argv[1] if len(sys.argv) > 1 else "artifacts/smart-fit-29okt")
    fixture = json.loads(Path("tests/fixtures/import/modern-sidebar-from-23okt.json").read_text())
    photo = base64.b64decode(fixture["cv"]["data"]["person"]["foto"].split(",", 1)[1])
    original = Image.open(BytesIO(photo)).convert("RGBA")
    rows = [inspect(directory / f"{side}-one-page.docx", original) for side in ("left", "right")]
    assert rows[0]["fields"] == rows[1]["fields"], "mirroring changes semantic text"
    report = {"status": "PASS", "identicalFieldsAcrossSides": True, "documents": rows}
    (directory / "native-independent.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({"status": report["status"], "documents": len(rows), "fieldOccurrencesEach": rows[0]["fieldOccurrences"]}))
