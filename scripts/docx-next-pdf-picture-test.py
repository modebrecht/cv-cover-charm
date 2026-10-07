"""Actual PDF graphic-state controls; hidden image transforms cannot masquerade as visible bounds."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
from pypdf import PdfWriter
from pypdf.generic import ArrayObject, DictionaryObject, NameObject, NumberObject, DecodedStreamObject

spec = importlib.util.spec_from_file_location('pdf_picture', Path(__file__).with_name('docx-next-pdf-picture-qa.py'))
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)


class PictureClipTests(unittest.TestCase):
    def pdf(self, operations, form=False):
        work = tempfile.TemporaryDirectory()
        self.addCleanup(work.cleanup)
        path = Path(work.name) / 'clip.pdf'
        writer = PdfWriter()
        page = writer.add_blank_page(200, 200)
        image = DecodedStreamObject()
        image.set_data(bytes([255, 0, 0]))
        image.update({NameObject('/Type'): NameObject('/XObject'), NameObject('/Subtype'): NameObject('/Image'), NameObject('/Width'): NumberObject(1), NameObject('/Height'): NumberObject(1), NameObject('/BitsPerComponent'): NumberObject(8), NameObject('/ColorSpace'): NameObject('/DeviceRGB')})
        resources = DictionaryObject({NameObject('/XObject'): DictionaryObject({NameObject('/Im0'): writer._add_object(image)})})
        if form:
            obj = DecodedStreamObject()
            obj.set_data(b'100 0 0 100 0 0 cm /Im0 Do')
            obj.update({NameObject('/Type'): NameObject('/XObject'), NameObject('/Subtype'): NameObject('/Form'), NameObject('/Resources'): resources, NameObject('/BBox'): ArrayObject(map(NumberObject, [0, 0, 20, 20])), NameObject('/Matrix'): ArrayObject(map(NumberObject, [1, 0, 0, 1, 30, 40]))})
            resources = DictionaryObject({NameObject('/XObject'): DictionaryObject({NameObject('/Form0'): writer._add_object(obj)})})
        page[NameObject('/Resources')] = resources
        content = DecodedStreamObject()
        content.set_data(operations.encode('ascii'))
        page[NameObject('/Contents')] = writer._add_object(content)
        with path.open('wb') as output:
            writer.write(output)
        return path

    def test_rectangular_clip_replaces_raw_bounds_only_for_actual_paint(self):
        rows = qa.image_rectangles(self.pdf('q 20 60 40 50 re W n 100 0 0 100 0 0 cm /Im0 Do Q'), 0)
        self.assertEqual(tuple(rows[0]['raw']), (0, 100, 100, 200))
        self.assertEqual(tuple(rows[0]['visible']), (20, 100, 60, 140))

    def test_restore_does_not_leak_prior_clip_to_later_image(self):
        rows = qa.image_rectangles(self.pdf('q 20 60 40 50 re W n 100 0 0 100 0 0 cm /Im0 Do Q q 20 0 0 20 120 10 cm /Im0 Do Q'), 0)
        self.assertEqual(tuple(rows[1]['visible']), (120, 170, 140, 190))
        self.assertIsNone(rows[1]['clip'])

    def test_nested_clip_is_intersection(self):
        rows = qa.image_rectangles(self.pdf('q 10 50 40 70 re W n q 20 60 40 50 re W* n 100 0 0 100 0 0 cm /Im0 Do Q Q'), 0)
        self.assertEqual(tuple(rows[0]['visible']), (20, 100, 50, 140))

    def test_form_matrix_and_bbox_are_both_measured(self):
        rows = qa.image_rectangles(self.pdf('/Form0 Do', form=True), 0)
        self.assertEqual(tuple(rows[0]['raw']), (30, 60, 130, 160))
        self.assertEqual(tuple(rows[0]['visible']), (30, 140, 50, 160))

    def test_missing_clip_leaves_oversized_picture_oversized(self):
        rows = qa.image_rectangles(self.pdf('q 100 0 0 100 0 0 cm /Im0 Do Q'), 0)
        self.assertEqual(rows[0]['raw'], rows[0]['visible'])
        self.assertIsNone(rows[0]['clip'])

    def test_nonrectangular_clip_is_rejected(self):
        with self.assertRaisesRegex(AssertionError, 'Nonrectangular'):
            qa.image_rectangles(self.pdf('q 0 0 m 10 0 20 30 40 40 c W n 100 0 0 100 0 0 cm /Im0 Do Q'), 0)

    def test_crossed_corner_path_is_not_a_rectangle(self):
        with self.assertRaisesRegex(AssertionError, 'Nonrectangular'):
            qa.image_rectangles(self.pdf('q 0 0 m 50 50 l 0 50 l 50 0 l h W n 100 0 0 100 0 0 cm /Im0 Do Q'), 0)

    def test_skewed_image_is_rejected(self):
        with self.assertRaisesRegex(AssertionError, 'skewed picture'):
            qa.image_rectangles(self.pdf('q 100 10 0 100 0 0 cm /Im0 Do Q'), 0)


if __name__ == '__main__':
    unittest.main()
