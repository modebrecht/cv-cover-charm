"""Adversarial picture-reader fixtures, not fabricated Office acceptance files."""
import io
import base64
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from zipfile import ZipFile

from PIL import Image

from lo_product_roundtrip import inventory, assert_source_photos, main

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
A = "http://schemas.openxmlformats.org/drawingml/2006/main"
WP = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
PIC = "http://schemas.openxmlformats.org/drawingml/2006/picture"
WPS = "http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
MC = "http://schemas.openxmlformats.org/markup-compatibility/2006"
DRAWING = '<w:drawing><wp:inline><wp:docPr id="1" name="cv.person.photo"/><a:graphic><a:graphicData>{}</a:graphicData></a:graphic></wp:inline></w:drawing>'
BLIP = '<a:blip r:embed="photo"/>'


class Pictures(unittest.TestCase):
    def package(self, directory, content, relationship="", target="media/photo.png"):
        path = Path(directory) / "fixture.docx"
        root = f'<w:document xmlns:w="{W}" xmlns:r="{R}" xmlns:a="{A}" xmlns:wp="{WP}" xmlns:pic="{PIC}" xmlns:wps="{WPS}" xmlns:mc="{MC}"><w:body><w:p><w:r>{content}</w:r></w:p></w:body></w:document>'
        rels = f'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="photo" Type="{R}/image" Target="{target}" {relationship}/></Relationships>'
        image = io.BytesIO()
        Image.new("RGB", (2, 3), "#246baf").save(image, "PNG")
        with ZipFile(path, "w") as archive:
            archive.writestr("word/document.xml", root)
            archive.writestr("word/_rels/document.xml.rels", rels)
            archive.writestr("word/media/photo.png", image.getvalue())
        return path

    def test_direct_untagged_picture_is_included(self):
        with tempfile.TemporaryDirectory() as directory:
            result = inventory(self.package(directory, DRAWING.format(
                '<pic:pic><pic:blipFill>'+BLIP+'<a:srcRect l="1000"/></pic:blipFill></pic:pic>')))
        self.assertEqual(len(result["pictures"]), 1)
        photo = result["pictures"][0]
        self.assertEqual(photo["name"], "cv.person.photo")
        self.assertEqual(photo["container"], "native-picture")
        self.assertEqual(photo["pixels"]["width"], 2)
        self.assertEqual(photo["crop"], ["0.01", "0", "0", "0"])

    def test_writer_shape_fill_is_active_once_and_nontrivial_fill_is_not_a_known_crop(self):
        direct = DRAWING.format('<pic:pic><pic:blipFill>'+BLIP+'</pic:blipFill></pic:pic>')
        shape = DRAWING.format('<wps:wsp><wps:spPr><a:blipFill>'+BLIP+'<a:stretch><a:fillRect l="2000"/></a:stretch></a:blipFill></wps:spPr></wps:wsp>')
        alternate = f'<mc:AlternateContent><mc:Choice Requires="wps">{shape}</mc:Choice><mc:Fallback>{direct}</mc:Fallback></mc:AlternateContent>'
        with tempfile.TemporaryDirectory() as directory:
            before = inventory(self.package(directory, direct))
            after = inventory(self.package(directory, alternate))
        self.assertEqual(len(after["pictures"]), 1)
        self.assertEqual(after["pictures"][0]["pixels"], before["pictures"][0]["pixels"])
        self.assertEqual(after["pictures"][0]["container"], "drawing-shape-fill")
        self.assertIsNone(after["pictures"][0]["crop"])

    def test_external_or_missing_image_cannot_be_counted_as_preserved(self):
        picture = DRAWING.format('<pic:pic><pic:blipFill>'+BLIP+'</pic:blipFill></pic:pic>')
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(ValueError):
                inventory(self.package(directory, picture, 'TargetMode="External"', "https://example.invalid/photo.png"))
            with self.assertRaises(KeyError):
                inventory(self.package(directory, picture, target="media/missing.png"))

    def test_source_must_contain_complete_imported_pixels_not_just_a_named_picture(self):
        picture = DRAWING.format('<pic:pic><pic:blipFill>'+BLIP+'</pic:blipFill></pic:pic>')
        with tempfile.TemporaryDirectory() as directory:
            path = self.package(directory, picture)
            result = inventory(path)
            with ZipFile(path) as archive:
                png = archive.read("word/media/photo.png")
        metadata = {"input": {"cv": {"data": {"person": {"foto": "data:image/png;base64,"+base64.b64encode(png).decode()}}}}}
        assert_source_photos("cv-left", metadata, result)
        result["pictures"][0]["pixels"]["width"] = 1
        with self.assertRaises(ValueError):
            assert_source_photos("cv-left", metadata, result)

    def test_stale_outputs_are_rejected_before_office_is_started(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            renderer = root / "renderer.py"
            renderer.write_text("")
            output = root / "out"
            output.mkdir()
            marker = output / "old.docx"
            marker.write_bytes(b"must remain unchanged")
            with patch("sys.argv", ["roundtrip", "--source", directory, "--renderer", str(renderer),
                                    "--soffice", "never-run-office", "--output", str(output)]):
                with patch("subprocess.check_output") as office:
                    with self.assertRaises(ValueError):
                        main()
                    office.assert_not_called()
            self.assertEqual(marker.read_bytes(), b"must remain unchanged")


if __name__ == "__main__":
    unittest.main()
