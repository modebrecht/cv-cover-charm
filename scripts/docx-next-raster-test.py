"""Opaque/transparent alpha must never hide an RGB or dimension difference."""
from pathlib import Path
import tempfile
import unittest
from PIL import Image, PngImagePlugin
from docx_next_raster_qa import same_pixels


class RasterTests(unittest.TestCase):
    def compare(self, first, second, metadata=False):
        with tempfile.TemporaryDirectory() as directory:
            a, b = Path(directory) / 'first.png', Path(directory) / 'second.png'
            first.save(a)
            info = PngImagePlugin.PngInfo()
            if metadata:
                info.add_text('unrelated', 'metadata')
            second.save(b, pnginfo=info)
            return same_pixels(a, b)

    def test_opaque_alpha_does_not_hide_an_rgb_change(self):
        self.assertFalse(self.compare(Image.new('RGBA', (2, 2), (1, 2, 3, 255)), Image.new('RGBA', (2, 2), (2, 2, 3, 255))))

    def test_zero_alpha_does_not_hide_an_original_rgb_change(self):
        self.assertFalse(self.compare(Image.new('RGBA', (2, 2), (1, 2, 3, 0)), Image.new('RGBA', (2, 2), (2, 2, 3, 0))))

    def test_alpha_change_is_also_rejected(self):
        self.assertFalse(self.compare(Image.new('RGBA', (2, 2), (1, 2, 3, 255)), Image.new('RGBA', (2, 2), (1, 2, 3, 254))))

    def test_dimensions_are_part_of_pixel_identity(self):
        self.assertFalse(self.compare(Image.new('RGB', (2, 1), 'white'), Image.new('RGB', (1, 2), 'white')))

    def test_png_metadata_is_not_a_pixel_change(self):
        self.assertTrue(self.compare(Image.new('RGB', (2, 2), 'white'), Image.new('RGB', (2, 2), 'white'), metadata=True))

    def test_rgb_and_fully_opaque_rgba_have_the_same_pixels(self):
        self.assertTrue(self.compare(Image.new('RGB', (2, 2), 'white'), Image.new('RGBA', (2, 2), 'white')))


if __name__ == '__main__':
    unittest.main()
