"""Crop-window arithmetic must distinguish parameter changes from lost original pixels."""
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile
from PIL import Image

spec = importlib.util.spec_from_file_location('crop_precision', Path(__file__).with_name('docx-next-crop-precision-qa.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class CropPrecisionTests(unittest.TestCase):
    def picture(self, crop=None, width=120, height=180, pixels='original'):
        return {'widthPx': width, 'heightPx': height, 'rgbaSha256': pixels,
                'crop': crop or dict.fromkeys(['l', 't', 'r', 'b'], 0)}

    def test_measured_window_shift_and_size_are_distinct(self):
        before = self.picture({'l': 8400, 't': 24400, 'r': 11600, 'b': 22267})
        after = self.picture({'l': 8378, 't': 24396, 'r': 11622, 'b': 22255})
        result = module.measure(before, after, {'cx': 1224000, 'cy': 1224000}, {'cx': 1224280, 'cy': 1224280})
        self.assertEqual(result['exactCropParameters'], 'changed')
        self.assertEqual(result['originalPhotoPixels'], 'pass')
        self.assertEqual(result['windowDeltaPx'], {'left': -0.0264, 'top': -0.0072, 'right': -0.0264, 'bottom': 0.0216,
                                                'width': 0.0, 'height': 0.0288, 'centerX': -0.0264, 'centerY': 0.0072})
        self.assertTrue(result['savedEqualsSourceNearestTwip'])

    def test_zero_crop_retains_full_window_independent_of_extent_rounding(self):
        result = module.measure(self.picture(), self.picture(), {'cx': 1224000, 'cy': 1836000}, {'cx': 1224280, 'cy': 1835785})
        self.assertEqual(result['sourceWindowPx']['width'], 120)
        self.assertEqual(result['sourceWindowPx']['height'], 180)
        self.assertEqual(set(result['windowDeltaPx'].values()), {0.0})
        self.assertEqual(result['exactCropParameters'], 'unchanged')
        self.assertTrue(result['savedEqualsSourceNearestTwip'])

    def test_extent_outside_nearest_twip_is_not_explained(self):
        result = module.measure(self.picture(), self.picture(), {'cx': 1224000, 'cy': 1836000}, {'cx': 1224915, 'cy': 1835785})
        self.assertFalse(result['savedEqualsSourceNearestTwip'])

    def test_reduced_asset_cannot_be_compared_on_original_pixel_grid(self):
        result = module.measure(self.picture(), self.picture(width=96, height=96), {'cx': 1224000, 'cy': 1224000}, {'cx': 1224280, 'cy': 1224280})
        self.assertEqual(result['originalPhotoPixels'], 'fail')
        self.assertEqual(result['windowComparison'], 'unavailable-original-pixels-changed')
        self.assertNotIn('windowDeltaPx', result)

    def test_same_dimensions_with_changed_pixels_cannot_be_compared(self):
        result = module.measure(self.picture(), self.picture(pixels='changed'), {'cx': 1224000, 'cy': 1224000}, {'cx': 1224280, 'cy': 1224280})
        self.assertNotIn('sourceWindowPx', result)

    def test_invalid_or_empty_windows_are_rejected(self):
        for crop in [{'l': -1, 't': 0, 'r': 0, 'b': 0}, {'l': 40000, 't': 0, 'r': 60000, 'b': 0}, {'l': 0, 't': 50000, 'r': 0, 'b': 50000}]:
            with self.assertRaises(AssertionError):
                module.crop_window(self.picture(crop))

    def packages(self, directory):
        image = io.BytesIO()
        Image.new('RGBA', (120, 180), (40, 60, 90, 255)).save(image, format='PNG')
        photo = module.photo
        xml = '<w:document xmlns:w="' + photo.W[1:-1] + '" xmlns:wp="' + photo.WP[1:-1] + '" xmlns:a="' + photo.A[1:-1] + '" xmlns:r="' + photo.R[1:-1] + '"><w:body><w:p><w:r><w:drawing><wp:inline><wp:extent cx="1224000" cy="1836000"/><wp:docPr name="cv.person.photo"/><a:graphic><a:graphicData><a:blip r:embed="image1"/><a:prstGeom prst="rect"/></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p></w:body></w:document>'
        source, saved = directory / 'actual.docx', directory / 'actual-qa' / 'actual.docx'
        saved.parent.mkdir()
        for path in [source, saved]:
            with ZipFile(path, 'w') as archive:
                archive.writestr('word/document.xml', xml)
                archive.writestr('word/_rels/document.xml.rels', '<Relationships xmlns="' + photo.PR[1:-1] + '"><Relationship Id="image1" Target="media/photo.png"/></Relationships>')
                archive.writestr('word/media/photo.png', image.getvalue())
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        manifest = [{'name': 'actual', 'photo': True, 'docxSha256': digest}, {'name': 'stopped', 'photo': True}]
        evidence = {'runtime': 'control', 'interface': 'native', 'stoppedAfter': 'actual:crop', 'fixtures': [
            {'fixture': 'actual', 'execution': 'rendered', 'sourceDocxSha256': digest, 'savedDocxSha256': digest},
            {'fixture': 'stopped', 'execution': 'unrendered'}]}
        (directory / 'picture-identity-manifest.json').write_text(json.dumps(manifest))
        (directory / 'picture-identity-report.json').write_text(json.dumps(evidence))
        return source, saved

    def test_stopped_case_is_not_opened_and_packages_are_unchanged(self):
        with tempfile.TemporaryDirectory() as name:
            directory = Path(name)
            source, saved = self.packages(directory)
            before = [path.read_bytes() for path in [source, saved]]
            result = module.audit(directory)
            self.assertEqual(result['actualPhotoCases'], 1)
            self.assertEqual(result['unrenderedFixtures'], ['stopped'])
            self.assertEqual(result['stoppedAfter'], 'actual:crop')
            self.assertEqual(before, [path.read_bytes() for path in [source, saved]])

    def test_package_changes_after_render_evidence_are_rejected(self):
        for target in ['source', 'saved']:
            with tempfile.TemporaryDirectory() as name:
                directory = Path(name)
                source, saved = self.packages(directory)
                path = source if target == 'source' else saved
                path.write_bytes(path.read_bytes() + b'changed')
                with self.assertRaises(AssertionError): module.audit(directory)

    def test_baseline_ignores_only_saved_metadata_hash(self):
        report = {'fixtures': [{'sourceDocxSha256': 'source', 'savedDocxSha256': 'saved', 'windowDeltaPx': {'left': -0.0264}}]}
        expected = module.comparable(report)
        report['fixtures'][0]['savedDocxSha256'] = 'metadata-only'
        self.assertEqual(module.comparable(report), expected)
        report['fixtures'][0]['windowDeltaPx'] = {'left': 0}
        self.assertNotEqual(module.comparable(report), expected)


if __name__ == '__main__': unittest.main()
