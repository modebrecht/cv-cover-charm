"""Adversarial package-reader tests; no Office engine or application export runs."""
import hashlib
import importlib.util
import io
import tempfile
import unittest
from pathlib import Path
from zipfile import ZipFile

from lxml import etree as ET
from PIL import Image

_spec = importlib.util.spec_from_file_location('acceptance', Path(__file__).with_name('docx-next-word-acceptance-23okt.py'))
qa = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(qa)
W, R, W14 = qa.W, qa.R, qa.W14
A = qa.NS['a']
MC = 'http://schemas.openxmlformats.org/markup-compatibility/2006'
WPS = 'http://schemas.microsoft.com/office/word/2010/wordprocessingShape'


def document(para_id=None):
    attr = '' if para_id is None else f' w14:paraId="{para_id}"'
    return ET.fromstring(f'''<w:document xmlns:w="{W}" xmlns:r="{R}" xmlns:a="{A}" xmlns:w14="{W14}" xmlns:mc="{MC}" xmlns:wps="{WPS}"><w:body>
      <w:sdt><w:sdtPr><w:tag w:val="cv.entry.description"/></w:sdtPr><w:sdtContent><w:p{attr}><w:r><w:t>First</w:t><w:br/><w:t>Second</w:t><w:tab/><w:t>tail</w:t></w:r></w:p></w:sdtContent></w:sdt>
      <w:p><w:sdt><w:sdtPr><w:tag w:val="cv.person.photo"/><w:id w:val="7"/><w:picture/></w:sdtPr><w:sdtContent><w:r><w:drawing><a:blipFill><a:blip r:embed="rId1"/><a:srcRect l="1000" t="0" r="1000" b="0"/></a:blipFill></w:drawing></w:r></w:sdtContent></w:sdt></w:p>
    </w:body></w:document>''')


def png(color):
    stream = io.BytesIO()
    Image.new('RGBA', (2, 3), color).save(stream, 'PNG')
    return stream.getvalue()


def package(path, root, asset=None, extra=None):
    rels = f'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="{R}/image" Target="media/photo.png"/></Relationships>'
    with ZipFile(path, 'w') as z:
        z.writestr('word/document.xml', ET.tostring(root))
        z.writestr('word/_rels/document.xml.rels', rels)
        z.writestr('word/media/photo.png', png('teal') if asset is None else asset)
        if extra:
            z.writestr('word/media/retained.png', extra)


class AcceptanceTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.source = Path(self.tmp.name)/'source.docx'
        self.saved = Path(self.tmp.name)/'saved.docx'

    def compare(self, a, b, asset=None, extra=None):
        package(self.source, a)
        package(self.saved, b, asset, extra)
        hashes = [hashlib.sha256(p.read_bytes()).hexdigest() for p in [self.source, self.saved]]
        result = qa.compare(self.source, self.saved)
        self.assertEqual(hashes, [hashlib.sha256(p.read_bytes()).hexdigest() for p in [self.source, self.saved]])
        self.assertEqual(result['wordAcceptance'], 'UNVERIFIED')
        self.assertFalse(result['saveReopenPerformedByThisTool'])
        return result

    def test_equal_packages_retain_tokens_and_pixels_without_inventing_paragraph_identity(self):
        r = self.compare(document(), document())
        self.assertEqual(r['sourceFields'], 2)
        self.assertTrue(all(f['fieldTokensUnchanged'] for f in r['fields']))
        self.assertIn('NOT_ASSESSABLE', r['fields'][0]['persistedParagraphIdComparison'])
        self.assertTrue(r['pictures'][0]['originalPixelsInsideCanonicalControl'])

    def test_hard_break_or_tab_loss_is_detected_despite_equal_concatenated_words(self):
        for token in ['br', 'tab']:
            with self.subTest(token=token):
                b = document()
                node = b.find('.//w:'+token, qa.NS)
                node.getparent().remove(node)
                row = self.compare(document(), b)['fields'][0]
                self.assertTrue(row['sourceTextPresentSomewhereInSavedXml'])
                self.assertFalse(row['fieldTokensUnchanged'])

    def test_lost_control_is_not_called_lost_visible_text(self):
        b = document()
        control = b.find('.//w:sdt', qa.NS)
        content = control.find('w:sdtContent', qa.NS)
        parent = control.getparent()
        for node in list(content):
            parent.insert(0, node)
        parent.remove(control)
        row = self.compare(document(), b)['fields'][0]
        self.assertTrue(row['sourceTextPresentSomewhereInSavedXml'])
        self.assertEqual(row['savedCount'], 0)
        self.assertFalse(row['canonicalIdUnique'])

    def test_new_numeric_word_ids_are_separate_from_canonical_ids(self):
        b = document()
        props = b.find('.//w:sdtPr', qa.NS)
        ET.SubElement(props, '{'+W+'}id').set('{'+W+'}val', '12345')
        row = self.compare(document(), b)['fields'][0]
        self.assertTrue(row['canonicalIdUnique'])
        self.assertTrue(row['fieldTokensUnchanged'])
        self.assertEqual(row['nativeSdtId'], {'source': None, 'saved': '12345'})

    def test_persisted_paragraph_ids_are_compared_only_if_source_has_real_ids(self):
        same = self.compare(document('00112233'), document('00112233'))
        self.assertEqual(same['fields'][0]['persistedParagraphIdComparison'], 'UNCHANGED')
        changed = self.compare(document('00112233'), document('00998877'))
        self.assertEqual(changed['fields'][0]['persistedParagraphIdComparison'], 'CHANGED_OR_MISSING')
        self.assertTrue(changed['fields'][0]['fieldTokensUnchanged'])

    def test_surviving_tag_does_not_prove_typed_picture_control(self):
        b = document()
        node = b.find('.//w:picture', qa.NS)
        node.getparent().remove(node)
        r = self.compare(document(), b)
        self.assertTrue(r['pictures'][0]['originalPixelsInsideCanonicalControl'])
        self.assertFalse(r['pictures'][0]['typedPictureControlSurvives'])

    def test_unowned_original_active_picture_is_distinct_from_original_in_control(self):
        b = document()
        photo = b.findall('.//w:sdt', qa.NS)[1]
        image_run = photo.find('.//w:r', qa.NS)
        photo.getparent().append(image_run)
        r = self.compare(document(), b)['pictures'][0]
        self.assertFalse(r['originalPixelsInsideCanonicalControl'])
        self.assertTrue(r['originalPixelsInAnyActivePicture'])
        self.assertTrue(r['originalPixelsSomewhereInPackage'])

    def test_png_recompression_changes_bytes_without_losing_original_pixels(self):
        stream = io.BytesIO()
        Image.new('RGBA', (2, 3), 'teal').save(stream, 'PNG', compress_level=0)
        self.assertNotEqual(stream.getvalue(), png('teal'))
        r = self.compare(document(), document(), stream.getvalue())['pictures'][0]
        self.assertTrue(r['originalPixelsInsideCanonicalControl'])
        self.assertNotEqual(r['source']['embeddedFileSha256'], r['saved']['embeddedFileSha256'])

    def test_unused_original_media_does_not_prove_active_image_survival(self):
        r = self.compare(document(), document(), png('orange'), png('teal'))['pictures'][0]
        self.assertFalse(r['originalPixelsInsideCanonicalControl'])
        self.assertFalse(r['originalPixelsInAnyActivePicture'])
        self.assertTrue(r['originalPixelsSomewhereInPackage'])

    def test_crop_change_does_not_claim_original_pixels_were_lost(self):
        b = document()
        b.find('.//a:srcRect', qa.NS).set('l', '1001')
        r = self.compare(document(), b)['pictures'][0]
        self.assertTrue(r['originalPixelsInsideCanonicalControl'])
        self.assertFalse(r['exactCropMarkupUnchanged'])

    def test_duplicate_active_photo_tags_do_not_create_unique_picture_ownership(self):
        b = document()
        extra = ET.SubElement(b.find('w:body', qa.NS), '{'+W+'}sdt')
        props = ET.SubElement(extra, '{'+W+'}sdtPr')
        ET.SubElement(props, '{'+W+'}tag').set('{'+W+'}val', 'cv.person.photo')
        ET.SubElement(extra, '{'+W+'}sdtContent')
        r = self.compare(document(), b)
        self.assertEqual(r['duplicates']['saved'], ['cv.person.photo'])
        self.assertFalse(r['pictures'][0]['originalPixelsInsideCanonicalControl'])

    def test_unknown_strict_namespace_fails_before_claiming_field_loss(self):
        b = ET.fromstring(ET.tostring(document()).replace(W.encode(), b'http://purl.oclc.org/ooxml/wordprocessingml/main'))
        package(self.saved, b)
        with self.assertRaisesRegex(ValueError, 'Unsupported main document namespace'):
            qa.inspect(self.saved)

    def test_duplicate_package_members_are_ambiguous_not_accepted(self):
        import warnings
        package(self.saved, document())
        with warnings.catch_warnings():
            warnings.simplefilter('ignore', UserWarning)
            with ZipFile(self.saved, 'a') as z:
                z.writestr('word/document.xml', ET.tostring(document()))
        with self.assertRaisesRegex(ValueError, 'Ambiguous duplicate'):
            qa.inspect(self.saved)

    def test_revision_markup_is_reported_and_xml_comments_do_not_become_text(self):
        b = document()
        paragraph = b.find('.//w:p', qa.NS)
        paragraph.append(ET.Comment('not visible text'))
        revision = ET.SubElement(paragraph, '{'+W+'}ins')
        ET.SubElement(revision, '{'+W+'}r')
        r = self.compare(document(), b)
        self.assertEqual(r['trackedRevisionMarkupCount'], {'source': 0, 'saved': 1})
        self.assertTrue(r['fields'][0]['fieldTokensUnchanged'])

    def test_inactive_fallback_control_is_not_a_duplicate_or_second_active_image(self):
        import copy
        a = document()
        body = a.find('w:body', qa.NS)
        control = body[0]
        alternative = ET.Element('{'+MC+'}AlternateContent')
        body.replace(control, alternative)
        choice = ET.SubElement(alternative, '{'+MC+'}Choice', Requires='wps')
        fallback = ET.SubElement(alternative, '{'+MC+'}Fallback')
        choice.append(control)
        fallback.append(copy.deepcopy(control))
        r = self.compare(a, a)
        self.assertEqual(r['sourceFields'], 2)
        self.assertEqual(r['duplicates']['source'], [])


if __name__ == '__main__':
    unittest.main()
