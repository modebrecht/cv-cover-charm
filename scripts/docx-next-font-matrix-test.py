"""Real-PDF counterexamples for completeness checks; no font/layout tolerance changes."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
import fitz

spec = importlib.util.spec_from_file_location('font_matrix_qa', Path(__file__).with_name('docx-next-font-matrix-qa.py'))
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)


def paragraph(part, identity, text):
    return {'part': part, 'id': identity, 'runs': [{'text': text, 'font': 'Arial', 'bold': False, 'italic': False}]}


class FontCompletenessTests(unittest.TestCase):
    def make_pdf(self, directory, missing=False, masked=False):
        doc = fitz.open()
        cover = doc.new_page()
        cover.insert_text((72, 80), 'B E W E R B U N G')
        letter = doc.new_page()
        letter.insert_text((72, 20), 'letter Kopfprobe Äé')
        letter.insert_text((72, 80), 'Editierbarer Brief Zürich')
        cv = doc.new_page()
        cv.insert_text((72, 20), 'cv Kopfprobe Äé')
        cv.insert_text((72, 80), 'Vollständiger Inhalt' if missing else 'Vollständiger Inhalt Zürich')
        if masked: cv.insert_text((72, 34), 'Vollständiger Inhalt Zürich')
        path = Path(directory) / 'fixture.pdf'
        doc.save(path)
        doc.close()
        return path

    def fixture(self):
        return {'fontPolicy': {'availability': 'target-application'},
                'parts': [{'id': part, 'margins': {'top': 20, 'bottom': 20}} for part in ['cover', 'letter', 'cv']],
                'paragraphs': [paragraph('cover', 'cover.heading', 'BEWERBUNG'),
                    paragraph('letter', 'letter.header.title', 'letter Kopfprobe Äé'),
                    paragraph('letter', 'letter.header.first.title', 'letter Kopfprobe Äé'),
                    paragraph('letter', 'letter.body.0', 'Editierbarer Brief Zürich'),
                    paragraph('cv', 'cv.body', 'Vollständiger Inhalt Zürich')]}

    def test_tracking_and_unused_follow_story_do_not_report_content_loss(self):
        with tempfile.TemporaryDirectory() as directory:
            self.assertEqual(qa.pdf_evidence(self.make_pdf(directory), self.fixture())['text'], 'complete')

    def test_missing_body_text_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(AssertionError, 'Missing complete source paragraph: cv.body'):
                qa.pdf_evidence(self.make_pdf(directory, missing=True), self.fixture())

    def test_repeated_chrome_cannot_replace_missing_body_text(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(AssertionError, 'Missing complete source paragraph: cv.body'):
                qa.pdf_evidence(self.make_pdf(directory, missing=True, masked=True), self.fixture())

    def test_one_occurrence_cannot_replace_two_identical_body_paragraphs(self):
        fixture = self.fixture()
        fixture['paragraphs'].append(paragraph('cv', 'cv.body.second', 'Vollständiger Inhalt Zürich'))
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(AssertionError, 'Missing repeated source paragraph: cv'):
                qa.pdf_evidence(self.make_pdf(directory), fixture)


if __name__ == '__main__': unittest.main()
