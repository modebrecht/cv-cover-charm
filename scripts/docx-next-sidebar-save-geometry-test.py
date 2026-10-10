"""Adversarial exact geometry and complete canonical owner checks."""
import copy
import importlib.util
from pathlib import Path
import tempfile
import unittest
from xml.etree import ElementTree as ET

import fitz

spec = importlib.util.spec_from_file_location('geometry', Path(__file__).with_name('docx-next-sidebar-save-geometry-qa.py'))
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)


def table(tags=('first', 'last'), grid=(20, 10, 70), width=100):
    controls = ''.join(f'<w:sdt><w:sdtPr><w:tag w:val="{tag}"/></w:sdtPr><w:sdtContent><w:p/></w:sdtContent></w:sdt>' for tag in tags)
    cells = ''.join(f'<w:tc><w:tcPr><w:tcW w:w="{size}" w:type="dxa"/></w:tcPr>{controls if index == 0 else ""}</w:tc>' for index, size in enumerate(grid))
    return ET.fromstring(f'<w:tbl xmlns:w="{qa.W[1:-1]}"><w:tblPr><w:tblW w:w="{width}" w:type="dxa"/></w:tblPr><w:tblGrid>' +
                         ''.join(f'<w:gridCol w:w="{size}"/>' for size in grid) + '</w:tblGrid><w:tr>' + cells + '</w:tr></w:tbl>')


def pdf(path, offset=0, text='Canonical text', pages=1, paint=False, title=''):
    doc = fitz.open()
    for _ in range(pages):
        page = doc.new_page()
        page.insert_text((50 + offset, 70), text)
        if paint:
            page.draw_rect(fitz.Rect(20, 20, 30, 30), fill=(1, 0, 0))
    doc.set_metadata({'title': title})
    doc.save(path)
    doc.close()


class GeometryTests(unittest.TestCase):
    def test_complete_owner_never_uses_names_width_or_a_partial_inventory(self):
        root = ET.Element(qa.W + 'document')
        root.append(table(('unrelated',)))
        owner = table()
        root.append(owner)
        self.assertIs(qa.canonical_table(root, ['first', 'last']), owner)
        for canonical in ([], ['first'], ['last', 'first'], ['first', 'missing'], ['first', 'first']):
            with self.assertRaises(AssertionError):
                qa.canonical_table(root, canonical)
        root.append(copy.deepcopy(owner))
        with self.assertRaisesRegex(AssertionError, 'ambiguous'):
            qa.canonical_table(root, ['first', 'last'])

    def test_declared_grid_and_cells_must_conserve_the_same_width(self):
        self.assertTrue(qa.grid_record(table())['sourceGridConsistent'])
        self.assertFalse(qa.grid_record(table(width=101))['sourceGridConsistent'])
        cell_mismatch = table()
        cell_mismatch.find(qa.W + 'tr/' + qa.W + 'tc/' + qa.W + 'tcPr/' + qa.W + 'tcW').set(qa.W + 'w', '21')
        self.assertFalse(qa.grid_record(cell_mismatch)['sourceGridConsistent'])
        with self.assertRaisesRegex(AssertionError, 'Invalid serialized grid'):
            qa.grid_record(table(grid=(20, 0, 80)))

    def test_identical_visible_pdf_geometry_ignores_metadata_only(self):
        with tempfile.TemporaryDirectory() as temporary:
            a, b = Path(temporary) / 'a.pdf', Path(temporary) / 'b.pdf'
            pdf(a, title='source')
            pdf(b, title='saved')
            result = qa.compare_pdf(a, b)
            self.assertTrue(result['exactVisibleGeometry'])
            self.assertEqual(result['changedWords'], 0)

    def test_one_twip_change_is_never_hidden_by_a_tolerance(self):
        with tempfile.TemporaryDirectory() as temporary:
            a, b = Path(temporary) / 'a.pdf', Path(temporary) / 'b.pdf'
            pdf(a)
            pdf(b, offset=.05)
            result = qa.compare_pdf(a, b)
            self.assertTrue(result['wordSequenceUnchanged'])
            self.assertFalse(result['exactVisibleGeometry'])
            self.assertEqual(result['changedWordPages'], [1])
            self.assertGreater(result['maxAbsDxMm'], .017)
            self.assertEqual(result['maxAbsDyMm'], 0)

    def test_page_count_and_text_changes_reject_exact_visible_geometry(self):
        with tempfile.TemporaryDirectory() as temporary:
            a, b = Path(temporary) / 'a.pdf', Path(temporary) / 'b.pdf'
            pdf(a)
            pdf(b, pages=2)
            self.assertFalse(qa.compare_pdf(a, b)['pageCountsUnchanged'])
            pdf(b, text='Missing canonical text')
            self.assertFalse(qa.compare_pdf(a, b)['wordSequenceUnchanged'])

    def test_paint_changes_fail_even_when_all_words_are_exact(self):
        with tempfile.TemporaryDirectory() as temporary:
            a, b = Path(temporary) / 'a.pdf', Path(temporary) / 'b.pdf'
            pdf(a)
            pdf(b, paint=True)
            result = qa.compare_pdf(a, b)
            self.assertEqual(result['changedWordPages'], [])
            self.assertEqual(result['changedPixelPages'], [1])
            self.assertFalse(result['exactVisibleGeometry'])

    def test_strict_stability_cannot_confuse_successful_collection_with_acceptance(self):
        keys = ('sourceGridConsistencyAcceptance', 'exactVisibleGeometryAcceptance',
                'exactSerializedGeometryAcceptance', 'exactPublicGridStabilityAcceptance')
        accepted = dict.fromkeys(keys, 'pass')
        accepted['collectionStatus'] = 'pass'
        qa.require_stable(accepted)
        for key in (*keys, 'collectionStatus'):
            rejected = dict(accepted, **{key: 'fail'})
            with self.assertRaises(AssertionError):
                qa.require_stable(rejected)

    def test_pdf_substitution_or_an_unbound_old_proof_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / 'content.pdf'
            pdf(path)
            with self.assertRaisesRegex(AssertionError, 'bind exact PDF bytes'):
                qa.verify_pdf_content(path, {}, {})
            with self.assertRaisesRegex(AssertionError, 'bytes differ'):
                qa.verify_pdf_content(path, {}, {'pdfSha256': '0' * 64})


if __name__ == '__main__':
    unittest.main()
