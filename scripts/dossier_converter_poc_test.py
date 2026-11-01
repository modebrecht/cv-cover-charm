#!/usr/bin/env python3
"""Failure modes of the converter trial, independent of either Office engine."""
import tempfile
import unittest
from pathlib import Path
from zipfile import ZipFile
from dossier_converter_poc import expected_text, recall, run_conversion

class TrialTests(unittest.TestCase):
    def test_inactive_default_header_is_not_counted_as_missing_first_page_text(self):
        with tempfile.TemporaryDirectory() as folder:
            docx = Path(folder) / "case.docx"
            ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
            rel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
            with ZipFile(docx, "w") as z:
                z.writestr("word/document.xml", f'<w:document xmlns:w="{ns}" xmlns:r="{rel}"><w:body><w:p><w:r><w:t>Visible body</w:t></w:r></w:p><w:sectPr><w:titlePg/><w:headerReference w:type="default" r:id="default"/><w:headerReference w:type="first" r:id="first"/></w:sectPr></w:body></w:document>')
                z.writestr("word/_rels/document.xml.rels", '<Relationships><Relationship Id="default" Target="default.xml"/><Relationship Id="first" Target="first.xml"/></Relationships>')
                for key in ("default", "first"):
                    z.writestr(f"word/{key}.xml", f'<w:hdr xmlns:w="{ns}"><w:p><w:r><w:t>{key} header</w:t></w:r></w:p></w:hdr>')
            self.assertEqual(expected_text(docx), "Visible body first header")

    def test_stale_pdf_and_zero_exit_do_not_look_like_success(self):
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder) / "stale.pdf"
            target.write_bytes(b"old output" * 1000)
            result = run_conversion(["/bin/true"], target, target.with_suffix(".log"), 2)
            self.assertEqual(result["status"], "BLOCKED")
            self.assertFalse(target.exists())

    def test_timeout_returns_blocked_and_terminates_converter(self):
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder) / "case.pdf"
            result = run_conversion(["/bin/sleep", "10"], target, target.with_suffix(".log"), .1)
            self.assertEqual(result["status"], "BLOCKED")
            self.assertLess(result["seconds"], 2)

    def test_real_missing_content_is_counted(self):
        self.assertEqual(recall("Alpha Beta", "Alpha")["recall"], .5)

if __name__ == "__main__":
    unittest.main()
