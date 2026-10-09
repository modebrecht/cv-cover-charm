"""Historical grid ownership cannot be inferred from equal visible text or lost captions."""
import copy
import importlib.util
from pathlib import Path
import unittest
from xml.etree import ElementTree as ET

spec = importlib.util.spec_from_file_location('history', Path(__file__).with_name('docx-next-grid-history-qa.py'))
history = importlib.util.module_from_spec(spec); spec.loader.exec_module(history)


def table(keys, caption=None):
    header = '' if caption is None else '<w:tblCaption w:val="' + caption + '"/>'
    content = ''.join('<w:sdt><w:sdtPr><w:tag w:val="' + key + '"/></w:sdtPr><w:sdtContent><w:p><w:r><w:t>Same</w:t></w:r></w:p></w:sdtContent></w:sdt>' for key in keys)
    return '<w:tbl><w:tblPr>' + header + '</w:tblPr><w:tr><w:tc>' + content + '</w:tc></w:tr></w:tbl>'


def document(body): return ET.fromstring('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + body + '</w:body></w:document>')


class HistoryTest(unittest.TestCase):
    def test_canonical_identity_resolves_owner_even_when_caption_is_lost(self):
        before, after, keys = history.owners(document(table(['a', 'b'], 'cv.sidebar')), document(table(['other']) + table(['a', 'b'])))
        self.assertEqual(keys, ['a', 'b']); self.assertEqual(history.ids(after), ['a', 'b'])

    def test_equal_text_missing_reordered_or_ambiguous_owner_fails(self):
        before = document(table(['a', 'b'], 'cv.sidebar'))
        for body in (table(['x', 'y']), table(['b', 'a']), table(['a', 'b']) + table(['a', 'b'])):
            with self.assertRaisesRegex(AssertionError, 'saved native owner'): history.owners(before, document(body))

    def test_source_canonical_duplicates_and_missing_caption_fail(self):
        for body in (table(['a', 'a'], 'cv.sidebar'), table(['a', 'b'])):
            with self.assertRaises(AssertionError): history.owners(document(body), document(table(['a', 'b'])))

    def test_preferred_width_and_grid_sum_remain_distinct(self):
        result = history.arithmetic([6508, 340, 2789], 9638)
        self.assertEqual(result['sourcePreferredMinusGridTwips'], 1); self.assertEqual(result['predictedGrid'], [6508, 340, 2790])
        carrier = history.arithmetic([2789, 340, 6508], 9637)
        self.assertEqual(carrier['sourcePreferredMinusGridTwips'], 0); self.assertEqual(carrier['predictedGrid'], [2788, 341, 6508])

    def test_invalid_metric_values_fail(self):
        for widths, preferred in (([True, 340, 2789], 9638), ([6508, 0, 2789], 9638), ([6508, 2789], 9638), ([6508, 340, 2789], True)):
            with self.assertRaises(AssertionError): history.arithmetic(widths, preferred)

    def test_strict_baseline_keeps_identity_geometry_caption_and_causality(self):
        base = {'cases': [{'savedDocxSha256': 'zip', 'canonicalOwnerFieldIds': ['a'], 'sourceGeometry': [1], 'savedGeometry': [2], 'tableCaptionAcceptance': 'fail'}], 'historicalEarlyStop': ['stopped'], 'newNativeExports': 0, 'liveNativeIntermediatesInstrumented': False}
        allowed = copy.deepcopy(base); allowed['cases'][0]['savedDocxSha256'] = 'other'; self.assertEqual(history.compare_baseline(base, allowed)['changedCases'], 0)
        for key in ('canonicalOwnerFieldIds', 'sourceGeometry', 'savedGeometry', 'tableCaptionAcceptance'):
            changed = copy.deepcopy(base); changed['cases'][0][key] = 'changed'
            with self.assertRaises(AssertionError): history.compare_baseline(base, changed)
        for key in ('historicalEarlyStop', 'newNativeExports', 'liveNativeIntermediatesInstrumented'):
            changed = copy.deepcopy(base); changed[key] = 'changed'
            with self.assertRaises(AssertionError): history.compare_baseline(base, changed)


if __name__ == '__main__': unittest.main()
