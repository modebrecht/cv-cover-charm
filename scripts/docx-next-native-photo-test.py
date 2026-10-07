"""Different PNG compression must not be confused with lost source pixels."""
import importlib.util
import io
from pathlib import Path
import unittest
import tempfile
from zipfile import ZipFile
from PIL import Image

spec = importlib.util.spec_from_file_location('native_photo', Path(__file__).with_name('docx-next-native-photo-qa.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class NativePhotoTests(unittest.TestCase):
    def png(self, size=(120, 180), color=(200, 40, 30, 255), compression=6):
        buffer = io.BytesIO()
        Image.new('RGBA', size, color).save(buffer, format='PNG', compress_level=compression)
        return buffer.getvalue()

    def test_recompressed_pixels_remain_equal(self):
        first, second = self.png(compression=0), self.png(compression=9)
        self.assertNotEqual(first, second)
        self.assertEqual(module.decoded_photo(first), module.decoded_photo(second))

    def test_smaller_crop_is_not_original_photo(self):
        self.assertNotEqual(module.decoded_photo(self.png()), module.decoded_photo(self.png(size=(96, 96))))

    def test_changed_pixel_content_is_not_original_photo(self):
        self.assertNotEqual(module.decoded_photo(self.png()), module.decoded_photo(self.png(color=(30, 40, 200, 255))))

    def test_alpha_loss_is_visible_to_audit(self):
        self.assertNotEqual(module.decoded_photo(self.png()), module.decoded_photo(self.png(color=(200, 40, 30, 0))))

    def test_editor_image_fill_is_inventoried_as_native_picture_content(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'image-fill.docx'
            drawing = '<w:document xmlns:w="' + module.W[1:-1] + '" xmlns:wp="' + module.WP[1:-1] + '" xmlns:a="' + module.A[1:-1] + '" xmlns:r="' + module.R[1:-1] + '"><w:body><w:p><w:r><w:drawing><wp:inline><wp:extent cx="720000" cy="720000"/><wp:docPr name="cv.photo" descr="Photo"/><a:graphic><a:graphicData><a:blip r:embed="image1"/><a:prstGeom prst="ellipse"/></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p></w:body></w:document>'
            with ZipFile(path, 'w') as archive:
                archive.writestr('word/document.xml', drawing)
                archive.writestr('word/_rels/document.xml.rels', '<Relationships xmlns="' + module.PR[1:-1] + '"><Relationship Id="image1" Target="media/photo.png"/></Relationships>')
                archive.writestr('word/media/photo.png', self.png())
            result = module.inventory(path)
            self.assertEqual(len(result), 1)
            self.assertEqual(result[0]['representation'], 'image-fill')
            self.assertEqual(result[0]['pictureId'], 'cv.photo')
            self.assertEqual(result[0]['crop'], dict.fromkeys(['l', 't', 'r', 'b'], 0))


if __name__ == '__main__': unittest.main()
