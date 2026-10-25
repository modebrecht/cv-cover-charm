"""Adversarial saved-photo checks; synthetic XML mutations are not Word returns.

python scripts/docx-next-photo-rich-owner-return-test.py PINNED-CONTROL.docx -v
"""
import copy
import importlib.util
from pathlib import Path
import sys
import tempfile
import unittest
from zipfile import ZipFile, ZIP_DEFLATED

from lxml import etree as ET

spec = importlib.util.spec_from_file_location('rich_return',
    Path(__file__).with_name('docx-next-photo-rich-owner-return.py'))
check = importlib.util.module_from_spec(spec)
spec.loader.exec_module(check)
SOURCE = Path(sys.argv.pop(1)) if len(sys.argv) > 1 else None
W, NS = check.W, check.NS


class RichOwnerReturnTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if SOURCE is None or check.reader.digest(SOURCE.read_bytes()) != check.trial.CONTROL_SOURCE_SHA256:
            raise ValueError('Pass the pinned synthetic source')
        with ZipFile(SOURCE) as archive:
            cls.parts = {n: archive.read(n) for n in archive.namelist()}
        cls.temp = tempfile.TemporaryDirectory()
        cls.initial = Path(cls.temp.name)/'initial.docx'
        root = ET.fromstring(cls.parts['word/document.xml'])
        check.trial.promote(root, 'inline')
        cls.initial_xml = ET.tostring(root, xml_declaration=True, encoding='UTF-8')
        cls.write(cls.initial, root)
        check.trial.verify(SOURCE, cls.initial, 'inline')

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    @classmethod
    def write(cls, path, root, mutate=None):
        parts = dict(cls.parts)
        parts['word/document.xml'] = ET.tostring(root, xml_declaration=True, encoding='UTF-8')
        if mutate:
            mutate(parts)
        with ZipFile(path, 'w', ZIP_DEFLATED) as archive:
            for name, data in parts.items():
                archive.writestr(name, data)

    def tree(self):
        return ET.fromstring(self.initial_xml)

    def owner(self, root):
        return check.trial.photo_owner(root)

    def compare(self, root, mutate=None):
        with tempfile.TemporaryDirectory() as folder:
            saved = Path(folder)/'synthetic-saved.docx'
            self.write(saved, root, mutate)
            return check.compare(self.initial, saved)

    def assert_failed(self, report, key):
        self.assertEqual(report['preservationStatus'], 'FAIL')
        self.assertIn(key, report['failedChecks'])
        self.assertEqual(report['wordAcceptance'], 'UNVERIFIED')

    def float_picture(self, root):
        inline = self.owner(root).find('.//wp:inline', NS)
        inline.tag = '{'+NS['wp']+'}anchor'
        inline.attrib.update({'simplePos': '0', 'relativeHeight': '1', 'behindDoc': '0', 'locked': '0',
                              'layoutInCell': '1', 'allowOverlap': '1'})
        simple = ET.Element('{'+NS['wp']+'}simplePos', x='0', y='0')
        inline.insert(0, simple)
        for index, (axis, offset) in enumerate([('H', '12000'), ('V', '24000')], 1):
            position = ET.Element('{'+NS['wp']+'}position'+axis, relativeFrom='page')
            ET.SubElement(position, '{'+NS['wp']+'}posOffset').text = offset
            inline.insert(index, position)
        # Anchor wrap belongs after extent/effectExtent, before docPr.
        doc = inline.find('wp:docPr', NS)
        inline.insert(inline.index(doc), ET.Element('{'+NS['wp']+'}wrapSquare', wrapText='bothSides'))
        return inline

    def test_unchanged_trial_is_bounded_xml_preservation_only(self):
        r = self.compare(self.tree())
        self.assertEqual(r['failedChecks'], [])
        self.assertEqual(r['controlOccurrences'], 145)
        self.assertEqual(r['preservationStatus'], 'PRESERVED_WITHIN_BOUNDED_XML_CHECKS')
        self.assertFalse(r['wordUiActionsProven'])
        self.assertFalse(r['renderingChecked'])
        self.assertFalse(r['legacyTypedOwnerGateChanged'])

    def test_synthetic_floating_inside_owner_retains_pixels_and_reports_position(self):
        root = self.tree()
        self.float_picture(root)
        r = self.compare(root)
        self.assertEqual(r['failedChecks'], [])
        self.assertTrue(r['observations']['placementChanged'])
        self.assertTrue(r['observations']['nativePositionChanged'])
        self.assertEqual(r['observations']['native']['saved']['placement'], 'anchor')
        self.assertEqual(r['wordAcceptance'], 'UNVERIFIED')

    def test_changed_native_sdt_id_does_not_prove_lost_semantic_owner(self):
        root = self.tree()
        self.owner(root).find('w:sdtPr/w:id', NS).set('{'+W+'}val', '123456789')
        self.assertEqual(self.compare(root)['failedChecks'], [])

    def test_block_scope_is_reported_without_claiming_layout_invariance(self):
        root = ET.fromstring(self.parts['word/document.xml'])
        check.trial.promote(root, 'block')
        r = self.compare(root)
        self.assertEqual(r['failedChecks'], [])
        self.assertFalse(r['renderingChecked'])

    def test_typed_picture_does_not_pass_alternative_rich_contract(self):
        root = self.tree()
        ET.SubElement(self.owner(root).find('w:sdtPr', NS), '{'+W+'}picture')
        self.assert_failed(self.compare(root), 'supportedRichNativeOwners')

    def test_new_lock_binding_or_placeholder_is_rejected(self):
        for name in ['lock', 'dataBinding', 'placeholder', 'text', 'group']:
            with self.subTest(name=name):
                root = self.tree()
                ET.SubElement(self.owner(root).find('w:sdtPr', NS), '{'+W+'}'+name)
                self.assert_failed(self.compare(root), 'supportedRichNativeOwners')

    def test_picture_moved_outside_owner_cannot_pass_by_package_presence(self):
        root = self.tree()
        owner = self.owner(root)
        run = owner.find('w:sdtContent/w:r', NS)
        owner.find('w:sdtContent', NS).remove(run)
        owner.getparent().append(run)
        r = self.compare(root)
        self.assert_failed(r, 'onePictureInsideCanonicalOwner')

    def test_copied_picture_outside_owner_cannot_pass_as_a_preserved_move(self):
        root = self.tree()
        owner = self.owner(root)
        owner.getparent().append(copy.deepcopy(owner.find('w:sdtContent/w:r', NS)))
        r = self.compare(root)
        self.assertTrue(r['checks']['onePictureInsideCanonicalOwner'])
        self.assert_failed(r, 'otherActivePicturesUnchanged')

    def test_hidden_owned_picture_is_not_supported(self):
        for mode in ['run', 'drawing']:
            with self.subTest(mode=mode):
                root = self.tree()
                owner = self.owner(root)
                if mode == 'run':
                    props = ET.Element('{'+W+'}rPr')
                    ET.SubElement(props, '{'+W+'}vanish')
                    owner.find('w:sdtContent/w:r', NS).insert(0, props)
                else:
                    owner.find('.//wp:docPr', NS).set('hidden', '1')
                self.assert_failed(self.compare(root), 'supportedRichNativeOwners')

    def test_untagged_picture_cannot_pass_by_docpr_name(self):
        root = self.tree()
        self.owner(root).find('w:sdtPr/w:tag', NS).set('{'+W+'}val', 'lost-owner')
        self.assert_failed(self.compare(root), 'oneCanonicalOwner')

    def test_duplicate_owner_is_rejected_even_with_identical_image(self):
        root = self.tree()
        owner = self.owner(root)
        owner.getparent().append(copy.deepcopy(owner))
        self.assert_failed(self.compare(root), 'oneCanonicalOwner')

    def test_moved_owner_to_cover_section_fails_canonical_role(self):
        root = self.tree()
        paragraph = self.owner(root).getparent()
        paragraph.getparent().remove(paragraph)
        root.find('w:body', NS).insert(0, paragraph)
        self.assert_failed(self.compare(root), 'canonicalPhotoRoleAndNestingUnchanged')

    def test_external_wrong_or_missing_relationship_is_rejected(self):
        for mode in ['external', 'wrong-type', 'missing']:
            with self.subTest(mode=mode):
                root = self.tree()
                rid = self.owner(root).find('.//a:blip', NS).get('{'+check.reader.R+'}embed')
                def mutate(parts):
                    rels = ET.fromstring(parts['word/_rels/document.xml.rels'])
                    rel = next(n for n in rels if n.get('Id') == rid)
                    if mode == 'external':
                        rel.set('TargetMode', 'External')
                    elif mode == 'wrong-type':
                        rel.set('Type', check.reader.R+'/hyperlink')
                    else:
                        rels.remove(rel)
                    parts['word/_rels/document.xml.rels'] = ET.tostring(rels)
                self.assert_failed(self.compare(root, mutate), 'activeEmbeddedPictureResolved')

    def test_replacement_cannot_pass_when_original_remains_elsewhere(self):
        root = self.tree()
        photo = self.owner(root).find('.//a:blip', NS)
        other = next(n for n in root.findall('.//a:blip', NS) if n is not photo and
                     n.get('{'+check.reader.R+'}embed') != photo.get('{'+check.reader.R+'}embed'))
        photo.set('{'+check.reader.R+'}embed', other.get('{'+check.reader.R+'}embed'))
        self.assert_failed(self.compare(root), 'originalBytesAndPixelsInsideOwner')

    def test_crop_reset_is_a_separate_intentional_edit(self):
        root = self.tree()
        crop = self.owner(root).find('.//a:srcRect', NS)
        crop.getparent().remove(crop)
        self.assert_failed(self.compare(root), 'numericCropAndFillUnchanged')

    def test_equivalent_zero_crop_attribute_omission_is_allowed(self):
        root = self.tree()
        crop = self.owner(root).find('.//a:srcRect', NS)
        for axis in ['l', 'r']:
            crop.attrib.pop(axis, None)
        self.assertEqual(self.compare(root)['failedChecks'], [])

    def test_resize_and_rotation_are_not_untouched_positioning(self):
        for xpath, key, value in [('.//wp:extent', 'cx', '100000'),
                                   ('.//a:xfrm/a:ext', 'cy', '100000'),
                                   ('.//a:xfrm', 'rot', '60000'),
                                   ('.//a:prstGeom', 'prst', 'rect')]:
            with self.subTest(xpath=xpath):
                root = self.tree()
                self.owner(root).find(xpath, NS).set(key, value)
                self.assert_failed(self.compare(root), 'frameSizeAndShapeUnchanged')

    def test_floating_without_wrap_is_not_supported(self):
        root = self.tree()
        anchor = self.float_picture(root)
        anchor.remove(anchor.find('wp:wrapSquare', NS))
        self.assert_failed(self.compare(root), 'supportedRichNativeOwners')

    def test_radius_offset_and_picture_paint_cannot_change_silently(self):
        for mode in ['radius', 'offset', 'outline', 'blip-effect']:
            with self.subTest(mode=mode):
                root = self.tree()
                owner = self.owner(root)
                key = 'frameSizeAndShapeUnchanged'
                if mode == 'radius':
                    owner.find('.//a:gd', NS).set('fmla', 'val 9999')
                elif mode == 'offset':
                    owner.find('.//a:xfrm/a:off', NS).set('x', '1000')
                elif mode == 'outline':
                    ET.SubElement(owner.find('.//pic:spPr', NS), '{'+NS['a']+'}ln', w='1000')
                else:
                    ET.SubElement(owner.find('.//a:blip', NS), '{'+NS['a']+'}grayscl')
                    key = 'supportedRichNativeOwners'
                self.assert_failed(self.compare(root), key)

    def test_neighbour_text_or_canonical_field_loss_is_not_hidden(self):
        for mode in ['text', 'remove', 'add']:
            with self.subTest(mode=mode):
                root = self.tree()
                field = next(n for n in root.findall('.//w:sdt', NS) if
                             n.find('w:sdtPr/w:tag', NS).get('{'+W+'}val') == 'cover.fullName')
                if mode == 'text':
                    field.find('.//w:t', NS).text = 'Changed neighbour'
                    key = 'allFieldTokensAndRolesUnchanged'
                elif mode == 'remove':
                    field.getparent().remove(field)
                    key = 'allFieldCountsUnchanged'
                else:
                    field.getparent().append(copy.deepcopy(field))
                    key = 'allFieldCountsUnchanged'
                self.assert_failed(self.compare(root), key)

    def test_tracked_revision_requires_separate_review(self):
        root = self.tree()
        ET.SubElement(self.owner(root).find('w:sdtContent', NS), '{'+W+'}ins')
        self.assert_failed(self.compare(root), 'noTrackedRevisions')

    def test_nonselected_fallback_duplicate_is_not_an_active_owner(self):
        root = self.tree()
        owner = self.owner(root)
        parent, index = owner.getparent(), owner.getparent().index(owner)
        alternate = ET.Element('{'+check.reader._inventory.MC+'}AlternateContent',
            nsmap={'wps': 'http://schemas.microsoft.com/office/word/2010/wordprocessingShape'})
        choice = ET.SubElement(alternate, '{'+check.reader._inventory.MC+'}Choice', Requires='wps')
        fallback = ET.SubElement(alternate, '{'+check.reader._inventory.MC+'}Fallback')
        parent.remove(owner)
        choice.append(owner)
        fallback.append(copy.deepcopy(owner))
        parent.insert(index, alternate)
        self.assertEqual(self.compare(root)['failedChecks'], [])


if __name__ == '__main__':
    unittest.main()
