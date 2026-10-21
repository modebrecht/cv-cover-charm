"""Adversarial checks for separate field, picture ownership and pixel verdicts."""
import importlib.util
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('ownership', Path(__file__).with_name('docx-next-picture-ownership-qa.py'))
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)


class OwnershipComparisonTest(unittest.TestCase):
    def setUp(self):
        self.photo = {'width': 120, 'height': 180, 'rgbaSha256': 'original', 'srcRect': {'l': '8400'}}
        self.source = {'fields': {'photo': '', 'after': 'Still visible'}, 'ownedPictures': {'photo': self.photo}, 'texts': ['Still visible'], 'grids': [[40, 60]], 'drawingCounts': {'photo': 1}}

    def compare(self, saved):
        with patch.object(qa, 'inventory', side_effect=[self.source, saved]):
            return qa.compare('source.docx', 'saved.docx')

    def test_visible_text_does_not_hide_lost_field(self):
        row = self.compare({**self.source, 'fields': {'photo': ''}})
        self.assertTrue(row['completeTextPreserved'])
        self.assertFalse(row['fieldIdsAndTextPreserved'])

    def test_empty_photo_tag_does_not_prove_picture_ownership(self):
        row = self.compare({**self.source, 'ownedPictures': {}})
        self.assertTrue(row['fieldIdsAndTextPreserved'])
        self.assertFalse(row['pictures']['photo']['ownsDrawing'])

    def test_owned_cropped_bitmap_still_fails_original_pixels(self):
        row = self.compare({**self.source, 'ownedPictures': {'photo': {**self.photo, 'width': 96, 'height': 96}}})
        self.assertTrue(row['pictures']['photo']['ownsDrawing'])
        self.assertFalse(row['pictures']['photo']['fullPixelsPreserved'])

    def test_crop_encoding_change_is_separate_from_original_pixels(self):
        row = self.compare({**self.source, 'ownedPictures': {'photo': {**self.photo, 'srcRect': None}}})
        self.assertTrue(row['pictures']['photo']['fullPixelsPreserved'])
        self.assertFalse(row['pictures']['photo']['exactCropMarkupPreserved'])

    def test_extra_unowned_duplicate_picture_fails(self):
        row = self.compare({**self.source, 'drawingCounts': {'photo': 2}})
        self.assertFalse(row['pictures']['photo']['ownsDrawing'])


if __name__ == '__main__':
    unittest.main()
