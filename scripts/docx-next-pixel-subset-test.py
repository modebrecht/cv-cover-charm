"""Pixel subset counterexamples: matching a cropped region never accepts full-original loss."""
import hashlib
import importlib.util
import io
from pathlib import Path
import unittest
import json
import tempfile
from PIL import Image
from fractions import Fraction

spec = importlib.util.spec_from_file_location('subset', Path(__file__).with_name('docx-next-pixel-subset-qa.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def encoded(image):
    out = io.BytesIO()
    image.save(out, format='PNG')
    return out.getvalue()


class PixelSubsetTests(unittest.TestCase):
    def image(self, size=(240, 360)):
        value = Image.new('RGBA', size)
        value.putdata([((x * 17) % 256, (y * 13) % 256, (x + y * 3) % 256, 255) for y in range(size[1]) for x in range(size[0])])
        return value

    def measure(self, saved, crop=None):
        return module.measure(encoded(self.image()), encoded(saved), crop or {'l': 8394, 't': 24388, 'r': 11606, 'b': 22257})

    def test_full_original_is_not_labeled_a_subset(self):
        result = self.measure(self.image())
        self.assertEqual(result['originalPhotoPixels'], 'pass')
        self.assertEqual(result['subsetComparison'], 'not-needed-original-preserved')
        self.assertNotIn('missingOriginalPixels', result)

    def test_exact_192_crop_still_fails_original_retention(self):
        result = self.measure(self.image().crop((20, 88, 212, 280)))
        self.assertEqual(result['subsetComparison'], 'exact-rounded-source-crop')
        self.assertEqual(result['originalPhotoPixels'], 'fail')
        self.assertEqual(result['roundedCropEdgesPx'], [20, 88, 28, 80])
        self.assertEqual(result['missingOriginalPixels'], 49536)
        self.assertEqual(result['retainedOriginalPixels'], 36864)

    def test_same_dimensions_wrong_source_region_is_not_a_match(self):
        result = self.measure(self.image().crop((21, 88, 213, 280)))
        self.assertEqual(result['subsetComparison'], 'no-exact-rounded-source-crop')
        self.assertNotIn('retainedOriginalPixels', result)

    def test_changed_pixel_colors_cannot_match_a_crop(self):
        saved = self.image().crop((20, 88, 212, 280))
        saved.putpixel((0, 0), (0, 0, 0, 0))
        self.assertEqual(self.measure(saved)['subsetComparison'], 'no-exact-rounded-source-crop')

    def test_resized_region_cannot_be_claimed_as_original_subset(self):
        saved = self.image().crop((20, 88, 212, 280)).resize((96, 96))
        self.assertEqual(self.measure(saved)['subsetComparison'], 'no-exact-rounded-source-crop')

    def test_positive_half_values_round_up_as_the_upstream_crop_helper(self):
        self.assertEqual(module.rounded_positive(Fraction(5, 2)), 3)
        self.assertEqual(module.rounded_positive(Fraction(249, 100)), 2)
        self.assertEqual(module.rounded_positive(Fraction(251, 100)), 3)

    def test_invalid_percent_crop_is_rejected(self):
        with self.assertRaisesRegex(AssertionError, 'range'):
            self.measure(self.image().crop((20, 88, 212, 280)), {'l': -1, 't': 0, 'r': 0, 'b': 0})

    def test_empty_integer_window_cannot_be_labeled_preserved(self):
        source = Image.new('RGBA', (2, 2), (10, 20, 30, 255))
        saved = Image.new('RGBA', (1, 1), (10, 20, 30, 255))
        result = module.measure(encoded(source), encoded(saved), {'l': 49999, 't': 49999, 'r': 49999, 'b': 49999})
        self.assertEqual(result['subsetComparison'], 'rounded-window-empty')
        self.assertEqual(result['originalPhotoPixels'], 'fail')

    def audit_files(self, source=b'source', saved=b'saved'):
        work = tempfile.TemporaryDirectory()
        self.addCleanup(work.cleanup)
        root = Path(work.name)
        (root / 'one.docx').write_bytes(source)
        (root / 'one-qa').mkdir()
        (root / 'one-qa' / 'one.docx').write_bytes(saved)
        fixture = {'name': 'one', 'photo': True, 'pictureId': 'cv.person.photo', 'docxSha256': hashlib.sha256(source).hexdigest()}
        report = {'runtime': 'verified', 'interface': 'test', 'stoppedAfter': None,
                  'fixtures': [{'fixture': 'one', 'execution': 'rendered', 'sourceDocxSha256': fixture['docxSha256'], 'savedDocxSha256': hashlib.sha256(saved).hexdigest()}]}
        (root / 'picture-identity-manifest.json').write_text(json.dumps([fixture]))
        (root / 'picture-identity-report.json').write_text(json.dumps(report))
        return root, report

    def test_changed_source_package_cannot_supply_subset_evidence(self):
        root, _ = self.audit_files()
        (root / 'one.docx').write_bytes(b'changed source')
        with self.assertRaisesRegex(AssertionError, 'Source package changed'):
            module.audit(root)

    def test_changed_saved_package_cannot_supply_subset_evidence(self):
        root, _ = self.audit_files()
        (root / 'one-qa' / 'one.docx').write_bytes(b'changed saved artifact')
        with self.assertRaisesRegex(AssertionError, 'actual render evidence'):
            module.audit(root)

    def test_unrendered_control_never_requires_saved_media(self):
        root, report = self.audit_files()
        report['fixtures'][0] = {'fixture': 'one', 'execution': 'unrendered'}
        (root / 'picture-identity-report.json').write_text(json.dumps(report))
        (root / 'one.docx').unlink()
        (root / 'one-qa' / 'one.docx').unlink()
        result = module.audit(root)
        self.assertEqual(result['actualPhotoCases'], 0)
        self.assertEqual(result['exactSubsetCases'], 0)
        self.assertEqual(result['unrenderedFixtures'], ['one'])

    def test_baseline_ignores_only_saved_package_metadata(self):
        first = {'fixtures': [{'savedDocxSha256': 'old', 'sourceDocxSha256': 'source', 'originalPhotoPixels': 'fail'}]}
        second = {'fixtures': [{**first['fixtures'][0], 'savedDocxSha256': 'new'}]}
        self.assertEqual(module.comparable(first), module.comparable(second))
        second['fixtures'][0]['originalPhotoPixels'] = 'pass'
        self.assertNotEqual(module.comparable(first), module.comparable(second))


if __name__ == '__main__': unittest.main()
