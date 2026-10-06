"""Run with the same PyMuPDF environment as docx-next-render-qa.py."""
import unittest

import fitz

from docx_next_flow_qa import check_first_page_flow


class OpeningFlowTests(unittest.TestCase):
    def fixture(self):
        return {
            'fixture': 'native-picture-before-span',
            'parts': [{
                'expectedPages': 2,
                'contentBoxMm': {'top': 20, 'bottom': 20},
                'firstPageFlowProbes': [{
                    'fieldId': 'cv.entry.family.description',
                    'text': 'Following editable content',
                    'leftMm': 20,
                    'rightMm': 130,
                }],
            }],
        }

    def document(self):
        document = fitz.open()
        for _ in range(2):
            document.new_page(width=595, height=842)
        document[0].draw_circle((100, 100), 30, color=(1, 0, 0))
        document[0].insert_text((60, 150), 'CV title')
        return document

    def test_picture_and_label_do_not_replace_following_content(self):
        with self.document() as document:
            document[1].insert_text((60, 180), 'Following editable content')
            # Whole-document text and the opening label both survive this failure.
            self.assertIn('CV title', document[0].get_text())
            self.assertIn('Following editable content', ''.join(p.get_text() for p in document))
            with self.assertRaisesRegex(AssertionError, 'first-page flow detached: cv.entry.family.description'):
                check_first_page_flow(document, self.fixture())

    def test_neighbouring_track_or_header_cannot_satisfy_body_probe(self):
        for point in [(390, 180), (60, 30)]:
            with self.document() as document:
                document[0].insert_text(point, 'Following editable content')
                with self.assertRaisesRegex(AssertionError, 'first-page flow detached'):
                    check_first_page_flow(document, self.fixture())

    def test_opening_band_does_not_replace_track_continuation(self):
        with self.document() as document:
            fixture = self.fixture()
            document[0].insert_text((60, 180), 'Following editable content')
            check_first_page_flow(document, fixture)
            document[1].insert_text((60, 180), 'First continuation entry')
            fixture['parts'][0]['firstPageFlowProbes'].append({
                'fieldId': 'cv.entry.school.title',
                'text': 'First continuation entry',
                'leftMm': 20,
                'rightMm': 130,
            })
            with self.assertRaisesRegex(AssertionError, 'first-page flow detached: cv.entry.school.title'):
                check_first_page_flow(document, fixture)

    def test_wrapped_body_field_passes_in_own_first_page_track(self):
        with self.document() as document:
            document[0].insert_text((60, 180), 'Following editable')
            document[0].insert_text((60, 195), 'content')
            check_first_page_flow(document, self.fixture())

    def test_part_offset_is_respected(self):
        with self.document() as document:
            document[0].insert_text((60, 180), 'Following editable content')
            fixture = self.fixture()
            fixture['parts'].insert(0, {'expectedPages': 1, 'contentBoxMm': {'top': 20, 'bottom': 20}})
            fixture['parts'][1]['expectedPages'] = 1
            with self.assertRaisesRegex(AssertionError, 'first-page flow detached'):
                check_first_page_flow(document, fixture)


if __name__ == '__main__':
    unittest.main()
