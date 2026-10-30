"""Protect opaque native bitmap decoding and the observed integer-crop boundary."""
import hashlib
import importlib.util
import io
from pathlib import Path
import struct
import unittest

from PIL import Image


def module(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(name + '.py'))
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


worker = module('docx-next-picture-import-worker')
qa = module('docx-next-picture-import-qa')


class PictureImportTests(unittest.TestCase):
    def bitmap(self, color=(20, 40, 60)):
        image = Image.new('RGB', (3, 5), color)
        stream = io.BytesIO()
        image.save(stream, format='BMP')
        return image, stream.getvalue()

    def test_decoded_pixels_ignore_bmp_resolution_metadata_and_row_padding(self):
        image, before = self.bitmap()
        after = bytearray(before)
        struct.pack_into('<ii', after, 38, 2835, 2835)
        a = worker.decode_bitmap(before, [3, 5])
        b = worker.decode_bitmap(bytes(after), [3, 5])
        self.assertEqual(a['rgbaSha256'], hashlib.sha256(image.convert('RGBA').tobytes()).hexdigest())
        self.assertEqual(a['rgbaSha256'], b['rgbaSha256'])
        self.assertNotEqual(a['dibSha256'], b['dibSha256'])

    def test_changed_rgb_is_not_the_same_bitmap(self):
        a = worker.decode_bitmap(self.bitmap()[1], [3, 5])
        b = worker.decode_bitmap(self.bitmap((20, 40, 61))[1], [3, 5])
        self.assertNotEqual(a['rgbaSha256'], b['rgbaSha256'])

    def test_reported_dimensions_cannot_be_replaced_by_equal_area(self):
        with self.assertRaisesRegex(AssertionError, 'dimensions disagree'):
            worker.decode_bitmap(self.bitmap()[1], [5, 3])

    def test_missing_or_undecodable_native_bitmap_never_passes(self):
        with self.assertRaisesRegex(AssertionError, 'Empty native bitmap'):
            worker.decode_bitmap(b'', [3, 5])
        with self.assertRaises((OSError, ValueError)):
            worker.decode_bitmap(b'not a native bitmap', [3, 5])

    def test_unmeasured_alpha_mask_is_not_reported_as_preserved(self):
        with self.assertRaisesRegex(AssertionError, 'opaque source'):
            qa.opaque_source_pixels(Image.new('RGBA', (3, 5), (20, 40, 60, 254)))

    def test_integer_crop_uses_half_away_rounding_instead_of_python_ties_to_even(self):
        image = Image.new('RGBA', (10, 10), (20, 40, 60, 255))
        box, cropped = qa.integer_crop(image, dict.fromkeys('ltrb', 5000))
        self.assertEqual(box, (1, 1, 9, 9))
        self.assertEqual(cropped.size, (8, 8))
        self.assertEqual(qa.integer_crop(image, dict.fromkeys('ltrb', 4999))[0], (0, 0, 10, 10))

    def test_zero_crop_preserves_the_entire_source(self):
        image = Image.new('RGBA', (3, 5), (20, 40, 60, 255))
        box, cropped = qa.integer_crop(image, {})
        self.assertEqual(box, (0, 0, 3, 5))
        self.assertEqual(qa.pixels(cropped), qa.opaque_source_pixels(image))

    def test_outsets_and_empty_crop_are_explicitly_outside_this_measurement(self):
        image = Image.new('RGBA', (3, 5))
        for edges in [{'l': -1}, {'l': 90000, 'r': 90000}]:
            with self.assertRaises(AssertionError):
                qa.integer_crop(image, edges)


if __name__ == '__main__':
    unittest.main()
