"""Adversarial synthetic checks, not Word saves or rendered Office evidence.

python scripts/docx-next-letter-recipient-return-test-25okt.py STANDARD.docx WIDE.docx -v
"""
import copy
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from zipfile import ZipFile, ZIP_DEFLATED

from lxml import etree as ET
from PIL import Image

spec = importlib.util.spec_from_file_location(
    'letter_return', Path(__file__).with_name('docx-next-letter-recipient-return-25okt.py'))
check = importlib.util.module_from_spec(spec)
spec.loader.exec_module(check)
STANDARD, WIDE = [Path(sys.argv.pop(1)) for _ in range(2)] if len(sys.argv) > 2 else [None, None]
W, NS = check.W, check.NS


class LetterReturnTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if (STANDARD is None or WIDE is None or
                check.SOURCES.get(check.reader.digest(STANDARD.read_bytes())) != 'standard' or
                check.SOURCES.get(check.reader.digest(WIDE.read_bytes())) != 'wide'):
            raise ValueError('Supply the two pinned Letter v2 sources')
        with ZipFile(STANDARD) as archive:
            cls.parts = {n: archive.read(n) for n in archive.namelist()}
        cls.temporary = tempfile.TemporaryDirectory()
        cls.folder = Path(cls.temporary.name)

    @classmethod
    def tearDownClass(cls):
        cls.temporary.cleanup()

    def root(self):
        return ET.fromstring(self.parts['word/document.xml'])

    def owner(self, root, tag):
        return root.xpath('.//w:sdt[w:sdtPr/w:tag[@w:val=$tag]]', namespaces=NS, tag=tag)[0]

    def row(self, root):
        return root.xpath('.//w:tr[w:trPr/w:trHeight]', namespaces=NS)[0]

    def write(self, root, mutate=None, filename='saved.docx'):
        parts = dict(self.parts)
        parts['word/document.xml'] = ET.tostring(root, xml_declaration=True, encoding='UTF-8')
        if mutate:
            mutate(parts)
        target = self.folder / filename
        with ZipFile(target, 'w', ZIP_DEFLATED) as archive:
            for name, data in parts.items():
                archive.writestr(name, data)
        return target

    def compare(self, root, mutate=None):
        return check.compare(STANDARD, self.write(root, mutate))

    def assert_failed(self, result, key):
        self.assertEqual(result['preservationStatus'], 'FAIL')
        self.assertIn(key, result['failedChecks'])
        self.assertEqual(result['wordAcceptance'], 'UNVERIFIED')
        self.assertFalse(result['wordUiActionsProven'])

    def add_table_style(self, root, style_xml):
        table = self.row(root).getparent()
        ET.SubElement(table.find('w:tblPr', NS), '{'+W+'}tblStyle').set('{'+W+'}val', 'Trial')
        def mutate(parts):
            styles = ET.fromstring(parts['word/styles.xml'])
            wrapper = ET.fromstring(('<w:styles xmlns:w="'+W+'">'+style_xml+'</w:styles>').encode())
            for child in wrapper:
                styles.append(child)
            parts['word/styles.xml'] = ET.tostring(styles)
        return mutate

    def test_standard_identity_is_only_bounded_preservation(self):
        result = check.compare(STANDARD, STANDARD)
        self.assertEqual(result['failedChecks'], [])
        self.assertEqual(result['fieldOccurrences'], 145)
        self.assertEqual(result['canonicalTags'], 134)
        self.assertFalse(result['saveReopenPerformedByThisTool'])
        self.assertFalse(result['renderingChecked'])
        self.assertFalse(result['legacyReadersOrProductionGatesChanged'])
        self.assertEqual(result['wordAcceptance'], 'UNVERIFIED')

    def test_wide_identity_is_only_bounded_preservation(self):
        result = check.compare(WIDE, WIDE)
        self.assertEqual(result['case'], 'wide')
        self.assertEqual(result['failedChecks'], [])

    def test_standard_and_wide_cannot_be_mixed(self):
        self.assert_failed(check.compare(STANDARD, WIDE), 'allFieldTokensRolesAndNestingUnchanged')

    def test_unpinned_but_readable_source_is_rejected(self):
        changed = self.write(self.root())
        with self.assertRaisesRegex(ValueError, 'exact Standard or Wide source'):
            check.compare(changed, STANDARD)

    def test_exact_height_cannot_masquerade_as_growable(self):
        root = self.root()
        self.row(root).find('w:trPr/w:trHeight', NS).set('{'+W+'}hRule', 'exact')
        self.assert_failed(self.compare(root), 'recipientMinimumStillGrowable')

    def test_changed_minimum_is_not_tolerated_silently(self):
        root = self.root()
        self.row(root).find('w:trPr/w:trHeight', NS).set('{'+W+'}val', '1382')
        self.assert_failed(self.compare(root), 'recipientMinimumStillGrowable')

    def test_removed_height_is_rejected(self):
        root = self.root()
        props = self.row(root).find('w:trPr', NS)
        props.remove(props.find('w:trHeight', NS))
        self.assert_failed(self.compare(root), 'recipientMinimumStillGrowable')

    def test_duplicate_height_is_rejected(self):
        root = self.root()
        props = self.row(root).find('w:trPr', NS)
        props.append(copy.deepcopy(props.find('w:trHeight', NS)))
        self.assert_failed(self.compare(root), 'recipientMinimumStillGrowable')

    def test_direct_no_split_is_rejected(self):
        root = self.root()
        ET.SubElement(self.row(root).find('w:trPr', NS), '{'+W+'}cantSplit')
        self.assert_failed(self.compare(root), 'recipientRowStillSplittable')

    def test_explicit_false_split_property_is_supported(self):
        for value in ['0', 'false', 'off']:
            with self.subTest(value=value):
                root = self.root()
                ET.SubElement(self.row(root).find('w:trPr', NS), '{'+W+'}cantSplit').set('{'+W+'}val', value)
                self.assertEqual(self.compare(root)['failedChecks'], [])

    def test_inherited_no_split_is_rejected(self):
        root = self.root()
        mutate = self.add_table_style(root, '<w:style w:type="table" w:styleId="Trial"><w:trPr><w:cantSplit/></w:trPr></w:style>')
        self.assert_failed(self.compare(root, mutate), 'recipientRowStillSplittable')

    def test_direct_false_overrides_inherited_no_split(self):
        root = self.root()
        ET.SubElement(self.row(root).find('w:trPr', NS), '{'+W+'}cantSplit').set('{'+W+'}val', '0')
        mutate = self.add_table_style(root, '<w:style w:type="table" w:styleId="Trial"><w:trPr><w:cantSplit/></w:trPr></w:style>')
        self.assertEqual(self.compare(root, mutate)['failedChecks'], [])

    def test_nearest_style_false_overrides_base_true(self):
        root = self.root()
        mutate = self.add_table_style(root,
            '<w:style w:type="table" w:styleId="Trial"><w:basedOn w:val="Base"/><w:trPr><w:cantSplit w:val="false"/></w:trPr></w:style>'
            '<w:style w:type="table" w:styleId="Base"><w:trPr><w:cantSplit/></w:trPr></w:style>')
        self.assertEqual(self.compare(root, mutate)['failedChecks'], [])

    def test_conditional_style_requires_separate_review(self):
        root = self.root()
        mutate = self.add_table_style(root,
            '<w:style w:type="table" w:styleId="Trial"><w:tblStylePr w:type="firstRow"><w:trPr><w:cantSplit/></w:trPr></w:tblStylePr></w:style>')
        result = self.compare(root, mutate)
        self.assert_failed(result, 'recipientRowStillSplittable')
        self.assertEqual(result['recipient']['saved']['splitBasis'], 'CONDITIONAL_TABLE_SPLIT_REQUIRES_REVIEW')

    def test_cyclic_style_is_not_guessed(self):
        root = self.root()
        mutate = self.add_table_style(root, '<w:style w:type="table" w:styleId="Trial"><w:basedOn w:val="Trial"/></w:style>')
        self.assert_failed(self.compare(root, mutate), 'recipientRowStillSplittable')

    def test_missing_explicit_style_id_is_not_treated_as_no_style(self):
        root = self.root()
        ET.SubElement(self.row(root).getparent().find('w:tblPr', NS), '{'+W+'}tblStyle')
        self.assert_failed(self.compare(root), 'recipientRowStillSplittable')

    def test_missing_based_on_id_is_not_treated_as_chain_end(self):
        root = self.root()
        mutate = self.add_table_style(root, '<w:style w:type="table" w:styleId="Trial"><w:basedOn/></w:style>')
        self.assert_failed(self.compare(root, mutate), 'recipientRowStillSplittable')

    def test_duplicate_control_tags_are_ambiguous_even_with_same_value(self):
        root = self.root()
        props = self.owner(root, 'cv.person.photo').find('w:sdtPr', NS)
        props.append(copy.deepcopy(props.find('w:tag', NS)))
        self.assert_failed(self.compare(root), 'supportedControlBehavior')

    def test_duplicate_row_properties_are_not_a_preserved_minimum(self):
        root = self.root()
        ET.SubElement(self.row(root), '{'+W+'}trPr')
        self.assert_failed(self.compare(root), 'recipientMinimumStillGrowable')

    def test_invalid_onoff_split_value_is_not_guessed(self):
        root = self.root()
        ET.SubElement(self.row(root).find('w:trPr', NS), '{'+W+'}cantSplit').set('{'+W+'}val', 'maybe')
        self.assert_failed(self.compare(root), 'recipientRowStillSplittable')

    def test_missing_height_rule_does_not_pass_the_explicit_minimum_contract(self):
        root = self.root()
        del self.row(root).find('w:trPr/w:trHeight', NS).attrib['{'+W+'}hRule']
        self.assert_failed(self.compare(root), 'recipientMinimumStillGrowable')

    def test_default_table_style_cannot_hide_no_split(self):
        root = self.root()
        def mutate(parts):
            styles = ET.fromstring(parts['word/styles.xml'])
            style = ET.SubElement(styles, '{'+W+'}style', {'{'+W+'}type': 'table', '{'+W+'}styleId': 'Default', '{'+W+'}default': '1'})
            ET.SubElement(ET.SubElement(style, '{'+W+'}trPr'), '{'+W+'}cantSplit')
            parts['word/styles.xml'] = ET.tostring(styles)
        self.assert_failed(self.compare(root, mutate), 'recipientRowStillSplittable')

    def test_removed_recipient_tag_fails_even_when_text_survives(self):
        root = self.root()
        owner = self.owner(root, check.RECIPIENT[0])
        owner.find('w:sdtPr', NS).remove(owner.find('w:sdtPr/w:tag', NS))
        self.assert_failed(self.compare(root), 'allFieldCountsUnchanged')

    def test_duplicated_recipient_owner_is_rejected(self):
        root = self.root()
        owner = self.owner(root, check.RECIPIENT[0])
        owner.getparent().append(copy.deepcopy(owner))
        self.assert_failed(self.compare(root), 'recipientFieldsRemainInOneRowAndCell')

    def test_recipient_moved_outside_cell_is_rejected(self):
        root = self.root()
        owner = self.owner(root, check.RECIPIENT[0])
        table = self.row(root).getparent()
        table.addnext(owner)
        self.assert_failed(self.compare(root), 'recipientFieldsRemainInOneRowAndCell')

    def test_extra_untagged_recipient_text_is_rejected(self):
        root = self.root()
        cell = self.row(root).find('w:tc', NS)
        ET.SubElement(ET.SubElement(ET.SubElement(cell, '{'+W+'}p'), '{'+W+'}r'), '{'+W+'}t').text = 'Unexpected extra text'
        self.assert_failed(self.compare(root), 'recipientNoAdditionalText')

    def test_property_revision_is_rejected(self):
        root = self.root()
        ET.SubElement(self.row(root).find('w:trPr', NS), '{'+W+'}trPrChange')
        self.assert_failed(self.compare(root), 'recipientNoPropertyRevisions')

    def test_new_data_binding_is_not_an_untouched_control(self):
        root = self.root()
        ET.SubElement(self.owner(root, check.RECIPIENT[0]).find('w:sdtPr', NS), '{'+W+'}dataBinding')
        self.assert_failed(self.compare(root), 'supportedControlBehavior')

    def test_extra_control_with_empty_canonical_tag_is_rejected(self):
        root = self.root()
        control = ET.Element('{'+W+'}sdt')
        ET.SubElement(ET.SubElement(control, '{'+W+'}sdtPr'), '{'+W+'}tag')
        ET.SubElement(ET.SubElement(control, '{'+W+'}sdtContent'), '{'+W+'}p')
        root.find('w:body', NS).insert(0, control)
        result = self.compare(root)
        self.assertTrue(result['checks']['allFieldCountsUnchanged'])
        self.assert_failed(result, 'supportedControlBehavior')

    def test_native_id_regeneration_does_not_imply_lost_owner(self):
        root = self.root()
        self.owner(root, 'cv.person.photo').find('w:sdtPr/w:id', NS).set('{'+W+'}val', '123456789')
        self.assertEqual(self.compare(root)['failedChecks'], [])

    def test_duplicate_native_control_id_is_rejected(self):
        root = self.root()
        ET.SubElement(self.owner(root, check.RECIPIENT[0]).find('w:sdtPr', NS), '{'+W+'}id').set('{'+W+'}val', '8')
        self.assert_failed(self.compare(root), 'nativeControlIdsValidAndUnique')

    def test_frame_resize_is_separate_from_original_pixel_preservation(self):
        root = self.root()
        self.owner(root, 'cv.person.photo').find('.//wp:extent', NS).set('cx', '1008001')
        result = self.compare(root)
        self.assertTrue(result['checks']['typedCanonicalPhotoOriginalAndCropUnchanged'])
        self.assert_failed(result, 'photoFrameAndInlinePlacementUnchanged')

    def test_numeric_crop_change_is_rejected(self):
        root = self.root()
        self.owner(root, 'cv.person.photo').find('.//a:srcRect', NS).set('t', '8334')
        self.assert_failed(self.compare(root), 'typedCanonicalPhotoOriginalAndCropUnchanged')

    def test_explicit_false_drawing_flips_preserve_the_original_frame(self):
        root = self.root()
        transform = self.owner(root, 'cv.person.photo').find('.//pic:spPr/a:xfrm', NS)
        transform.set('flipH', 'false'); transform.set('flipV', '0')
        self.assertEqual(self.compare(root)['failedChecks'], [])

    def test_real_flip_is_rejected_despite_unchanged_embedded_pixels(self):
        root = self.root()
        self.owner(root, 'cv.person.photo').find('.//pic:spPr/a:xfrm', NS).set('flipH', 'true')
        result = self.compare(root)
        self.assertTrue(result['checks']['typedCanonicalPhotoOriginalAndCropUnchanged'])
        self.assert_failed(result, 'photoFrameAndInlinePlacementUnchanged')

    def test_omitted_zero_crop_attributes_preserve_numeric_crop(self):
        root = self.root()
        crop = self.owner(root, 'cv.person.photo').find('.//a:srcRect', NS)
        del crop.attrib['l']; del crop.attrib['r']
        self.assertEqual(self.compare(root)['failedChecks'], [])

    def test_orphan_original_cannot_rescue_replaced_active_photo(self):
        root = self.root()
        package = check.reader.inspect(STANDARD)
        photo = next(p for p in package['pictures'] if 'cv.person.photo' in p['owners'])
        image_hash = photo['embeddedFileSha256']
        target = next(n for n, b in self.parts.items() if check.reader.digest(b) == image_hash)
        image = io.BytesIO(); Image.new('RGB', (1, 1), 'red').save(image, format='PNG')
        def mutate(parts):
            parts['unused/original.png'] = parts[target]
            parts[target] = image.getvalue()
        self.assert_failed(self.compare(root, mutate), 'typedCanonicalPhotoOriginalAndCropUnchanged')

    def test_cli_new_report_and_failure_exit_status(self):
        root = self.root()
        self.row(root).find('w:trPr/w:trHeight', NS).set('{'+W+'}hRule', 'exact')
        saved = self.write(root)
        report = self.folder/'failure-report.json'
        result = subprocess.run([sys.executable, str(Path(check.__file__)), str(STANDARD), str(saved), str(report)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertIn('recipientMinimumStillGrowable', json.loads(report.read_text())['failedChecks'])
        original = report.read_bytes()
        second = subprocess.run([sys.executable, str(Path(check.__file__)), str(STANDARD), str(saved), str(report)], capture_output=True, text=True)
        self.assertEqual(second.returncode, 2)
        self.assertEqual(report.read_bytes(), original)

    def test_cli_cannot_overwrite_an_input(self):
        saved = self.write(self.root())
        original = saved.read_bytes()
        result = subprocess.run([sys.executable, str(Path(check.__file__)), str(STANDARD), str(saved), str(saved)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertEqual(saved.read_bytes(), original)


if __name__ == '__main__':
    unittest.main()
