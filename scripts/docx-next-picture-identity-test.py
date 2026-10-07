"""Adversarial QA controls: visible text cannot hide identity or picture geometry loss."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
import fitz

spec = importlib.util.spec_from_file_location('picture_identity', Path(__file__).with_name('docx-next-picture-identity-qa.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PictureIdentityTests(unittest.TestCase):
    def result(self, field='pass', table='pass', text='pass', pdf='pass'):
        return {'native': {'fieldIdentity': field, 'tableIdentity': table, 'completeNativeText': text}, 'render': {'status': pdf}, 'saveReopen': {'status': 'pass'}}

    def test_lost_field_stops_even_when_text_survives(self):
        self.assertEqual(module.stop_reason(self.result(field='fail')), 'field-identity')

    def test_lost_caption_remains_separate(self):
        self.assertIsNone(module.stop_reason(self.result(table='fail')))

    def test_native_text_loss_stops(self):
        self.assertEqual(module.stop_reason(self.result(text='fail')), 'complete-native-text')

    def test_pdf_loss_stops(self):
        self.assertEqual(module.stop_reason(self.result(pdf='fail')), 'pdf-text-or-geometry')

    def photo_result(self, pixels='pass', crop='unchanged', frame='pass'):
        return {**self.result(), 'nativePhoto': [{'originalPhotoPixels': pixels, 'nativeCropParameters': crop, 'nativeFrameGeometry': frame, 'drawingName': 'pass'}]}

    def test_original_pixel_loss_stops_before_next_shape(self):
        self.assertEqual(module.stop_reason(self.photo_result(pixels='fail')), 'original-photo-pixels')

    def test_crop_parameter_loss_stops_even_with_original_pixels(self):
        self.assertEqual(module.stop_reason(self.photo_result(crop='changed')), 'native-photo-frame-or-crop')

    def test_frame_loss_stops_even_with_original_pixels(self):
        self.assertEqual(module.stop_reason(self.photo_result(frame='fail')), 'native-photo-frame-or-crop')

    def test_preserved_native_photo_allows_next_control(self):
        self.assertIsNone(module.stop_reason(self.photo_result()))

    def framed_image(self, missing=False, thickness=0.4, inset=0.4):
        document = fitz.open()
        self.addCleanup(document.close)
        page = document.new_page()
        outer = fitz.Rect(20 * module.MM, 30 * module.MM, 54 * module.MM, 81 * module.MM)
        image = outer + (inset * module.MM, inset * module.MM, -inset * module.MM, -inset * module.MM)
        center = outer + (0.2 * module.MM, 0.2 * module.MM, -0.2 * module.MM, -0.2 * module.MM)
        points = [center.tl, center.tr, center.br, center.bl]
        for index in range(3 if missing else 4):
            page.draw_line(points[index], points[(index + 1) % 4], color=(36 / 255, 74 / 255, 97 / 255), width=thickness * module.MM)
        geometry = {'shape': 'rect', 'borderWidthMm': 0.4, 'borderColor': '244A61'}
        return module.rectangular_frame(page, image, geometry), outer

    def test_rectangular_frame_measures_strokes_and_image_inset(self):
        (measured, failure), expected = self.framed_image()
        self.assertIsNone(failure)
        self.assertTrue(all(abs(a - b) < 0.001 for a, b in zip(measured, expected)))

    def test_missing_frame_edge_cannot_make_small_image_pass(self):
        self.assertEqual(self.framed_image(missing=True)[0][1], 'picture-frame-strokes')

    def test_wrong_frame_thickness_is_rejected(self):
        self.assertEqual(self.framed_image(thickness=0.1)[0][1], 'picture-frame-strokes')

    def test_wrong_image_inset_is_rejected(self):
        self.assertEqual(self.framed_image(inset=0.59)[0][1], 'picture-frame-inset')

    def test_baseline_ignores_only_saved_package_metadata(self):
        first = {'fixtures': [{'fixture': 'one', 'sourceDocxSha256': 'source', 'savedDocxSha256': 'old', 'native': self.result()['native']}]}
        second = {'fixtures': [{**first['fixtures'][0], 'savedDocxSha256': 'new'}]}
        self.assertEqual(module.comparable(first), module.comparable(second))
        second['fixtures'][0]['sourceDocxSha256'] = 'changed'
        self.assertNotEqual(module.comparable(first), module.comparable(second))

    def test_changed_native_baseline_is_not_hidden(self):
        first = {'fixtures': [{'native': self.result()['native']}]}
        second = {'fixtures': [{'native': self.result(field='fail')['native']}]}
        self.assertNotEqual(module.comparable(first), module.comparable(second))

    def pdf(self, text='Complete field', image=False, width=20):
        work = tempfile.TemporaryDirectory()
        self.addCleanup(work.cleanup)
        path = Path(work.name) / 'probe.pdf'
        document = fitz.open()
        for _ in range(3): document.new_page(width=210 * module.MM, height=297 * module.MM)
        page = document[2]
        page.insert_text((20 * module.MM, 35 * module.MM), text)
        if image:
            pix = fitz.Pixmap(fitz.csRGB, fitz.IRect(0, 0, 10, 10))
            pix.clear_with(90)
            page.insert_image(fitz.Rect(20 * module.MM, 40 * module.MM, (20 + width) * module.MM, 60 * module.MM), stream=pix.tobytes('png'), keep_proportion=False)
        document.save(path)
        document.close()
        fixture = {'expectedPages': 3, 'fields': [{'fieldId': 'cv.test', 'text': 'Complete field'}], 'photo': image, 'owner': 'body', 'margins': {'left': 20, 'right': 20, 'top': 20, 'bottom': 20}, 'cellWidthMm': 170, 'pictureGeometry': {'widthMm': 20, 'heightMm': 20}}
        return module.pdf_result(path, fixture)

    def test_complete_pdf_and_picture_pass(self):
        self.assertEqual(self.pdf(image=True)['status'], 'pass')

    def test_truncated_pdf_description_fails(self):
        self.assertIn('pdf-text:cv.test', self.pdf(text='Complete')['failures'])

    def test_stretched_picture_fails(self):
        self.assertIn('picture-geometry', self.pdf(image=True, width=30)['failures'])


if __name__ == '__main__': unittest.main()
