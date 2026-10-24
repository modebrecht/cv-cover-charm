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


def package(path, root, asset=None, extra=None, stories=None, references=None):
    header_rels = ''.join(f'<Relationship Id="{rid}" Type="{R}/header" Target="{target}"/>'
                          for rid, target in (references or {}).items())
    rels = f'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="{R}/image" Target="media/photo.png"/>{header_rels}</Relationships>'
    with ZipFile(path, 'w') as z:
        z.writestr('word/document.xml', ET.tostring(root))
        z.writestr('word/_rels/document.xml.rels', rels)
        z.writestr('word/media/photo.png', png('teal') if asset is None else asset)
        if extra:
            z.writestr('word/media/retained.png', extra)
        for name, story in (stories or {}).items():
            z.writestr(name, ET.tostring(story))


def text_control(parent, field, text='Contact', native_id=None):
    control = ET.SubElement(parent, '{'+W+'}sdt')
    props = ET.SubElement(control, '{'+W+'}sdtPr')
    ET.SubElement(props, '{'+W+'}tag').set('{'+W+'}val', field)
    if native_id is not None:
        ET.SubElement(props, '{'+W+'}id').set('{'+W+'}val', str(native_id))
    content = ET.SubElement(control, '{'+W+'}sdtContent')
    ET.SubElement(ET.SubElement(content, '{'+W+'}r'), '{'+W+'}t').text = text
    return control


def with_headers(renamed=False, repeated_in_body=True, inherited=False):
    root = document()
    body = root.find('w:body', qa.NS)
    if repeated_in_body:
        text_control(ET.SubElement(body, '{'+W+'}p'), 'cv.person.name')
    section = ET.SubElement(body, '{'+W+'}sectPr')
    stories, refs = {}, {}
    for index, role in enumerate(['first', 'default']):
        name = f'header-renamed-{index}.xml' if renamed else f'header-{role}.xml'
        ref = ET.SubElement(section, '{'+W+'}headerReference')
        ref.set('{'+W+'}type', role)
        ref.set('{'+R+'}id', role)
        refs[role] = name
        story = ET.fromstring(f'<w:hdr xmlns:w="{W}"/>')
        text_control(ET.SubElement(story, '{'+W+'}p'), 'cv.person.name')
        stories['word/'+name] = story
    ET.SubElement(section, '{'+W+'}titlePg')
    if inherited:
        # Both successive sections inherit the first section's two references.
        body.remove(section)
        p = ET.SubElement(body, '{'+W+'}p')
        ET.SubElement(p, '{'+W+'}pPr').append(section)
        ET.SubElement(body, '{'+W+'}sectPr')
    return root, stories, refs


def vml_photo(root, fill=False, **attrs):
    photo = root.findall('.//w:sdt', qa.NS)[1]
    run = photo.find('w:sdtContent/w:r', qa.NS)
    run.clear()
    pict = ET.SubElement(run, '{'+W+'}pict')
    shape = ET.SubElement(pict, '{'+qa.NS['v']+'}shape')
    image = ET.SubElement(shape, '{'+qa.NS['v']+'}'+('fill' if fill else 'imagedata'))
    image.set('{'+R+'}id', 'rId1')
    for key, value in attrs.items():
        image.set(key, value)
    return root


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

    def header_comparison(self, a=None, b=None):
        a, b = a or with_headers(), b or with_headers(renamed=True)
        package(self.source, a[0], stories=a[1], references=a[2])
        package(self.saved, b[0], stories=b[1], references=b[2])
        return qa.compare(self.source, self.saved)

    def test_repeated_source_keys_in_three_stories_survive_header_part_renames(self):
        result = self.header_comparison()
        self.assertEqual(result['duplicates']['source'], ['cv.person.name'])
        rows = [r for r in result['instances'] if r['field'] == 'cv.person.name']
        self.assertEqual(len(rows), 3)
        self.assertTrue(all(r['matchStatus'] == 'MATCHED' and r['fieldTokensUnchanged'] for r in rows))
        self.assertTrue(all(r['canonicalStoryRolesUnchanged'] for r in rows))
        self.assertEqual(sum(not r['physicalPartNameUnchanged'] for r in rows), 2)

    def test_losing_only_the_running_control_is_not_hidden_by_identical_first_header_text(self):
        b = with_headers()
        story = b[1]['word/header-default.xml']
        control = story.find('.//w:sdt', qa.NS)
        parent = control.getparent()
        parent.extend(list(control.find('w:sdtContent', qa.NS)))
        parent.remove(control)
        result = self.header_comparison(b=b)
        missing = [r for r in result['instances'] if r['matchStatus'] != 'MATCHED']
        self.assertEqual(len(missing), 1)
        self.assertEqual(missing[0]['sourceStoryRoles'], ['section:1/header:default'])
        self.assertTrue(missing[0]['sourceTextPresentSomewhereInSavedXml'])

    def test_editing_one_header_copy_does_not_change_the_verdict_for_other_copies(self):
        b = with_headers()
        b[1]['word/header-default.xml'].find('.//w:t', qa.NS).text = 'Edited contact'
        result = self.header_comparison(b=b)
        changed = [r for r in result['instances'] if not r['fieldTokensUnchanged']]
        self.assertEqual(len(changed), 1)
        self.assertEqual(changed[0]['matchStatus'], 'MATCHED')
        self.assertEqual(changed[0]['sourceStoryRoles'], ['section:1/header:default'])

    def test_same_tag_duplicates_in_one_role_are_not_paired_by_order_or_equal_text(self):
        a = with_headers()
        text_control(a[1]['word/header-first.xml'].find('w:p', qa.NS), 'cv.person.name')
        result = self.header_comparison(a=a, b=a)
        ambiguous = [r for r in result['instances'] if r['matchStatus'].startswith('AMBIGUOUS')]
        self.assertEqual(len(ambiguous), 2)

    def test_unique_persisted_ids_can_resolve_duplicates_without_matching_text_values(self):
        a = with_headers()
        control = a[1]['word/header-first.xml'].find('.//w:sdt', qa.NS)
        ET.SubElement(control.find('w:sdtPr', qa.NS), '{'+W+'}id').set('{'+W+'}val', '101')
        text_control(control.getparent(), 'cv.person.name', native_id=102)
        result = self.header_comparison(a=a, b=a)
        resolved = [r for r in result['instances'] if r['matchingBasis'] == 'CANONICAL_TAG_ROLE_AND_UNIQUE_PERSISTED_ID']
        self.assertEqual(len(resolved), 2)
        self.assertTrue(all(r['fieldTokensUnchanged'] for r in resolved))

    def test_colliding_word_ids_are_reported_and_cannot_resolve_same_role_duplicates(self):
        a = with_headers()
        p = a[1]['word/header-first.xml'].find('w:p', qa.NS)
        ET.SubElement(p.find('w:sdt/w:sdtPr', qa.NS), '{'+W+'}id').set('{'+W+'}val', '101')
        text_control(p, 'cv.person.name', native_id=101)
        result = self.header_comparison(a=a, b=a)
        self.assertEqual(result['duplicateNativeSdtIds']['source'], ['101'])
        self.assertEqual(sum(r['matchStatus'].startswith('AMBIGUOUS') for r in result['instances']), 2)

    def test_inherited_header_role_addresses_survive_file_renames(self):
        result = self.header_comparison(with_headers(inherited=True), with_headers(renamed=True, inherited=True))
        self.assertEqual(result['sectionCounts'], {'source': 2, 'saved': 2})
        self.assertTrue(all(r['matchStatus'] == 'MATCHED' for r in result['instances']))
        self.assertTrue(any(len(r['sourceStoryRoles']) == 2 for r in result['instances']))

    def test_an_orphan_header_cannot_rescue_a_lost_main_story_control(self):
        a, stories, refs = with_headers(repeated_in_body=False)
        missing = a.find('.//w:sdt', qa.NS)
        field = missing.find('w:sdtPr/w:tag', qa.NS).get('{'+W+'}val')
        orphan = ET.fromstring(f'<w:hdr xmlns:w="{W}"/>')
        orphan.append(missing)
        stories['word/orphan.xml'] = orphan
        result = self.header_comparison(b=(a, stories, refs))
        row = next(r for r in result['instances'] if r['field'] == field)
        self.assertEqual(row['matchStatus'], 'MISSING_OR_MOVED_TO_ANOTHER_STORY_ROLE')
        self.assertTrue(row['sourceTextPresentSomewhereInSavedXml'])

    def test_changed_parent_control_tag_is_an_ownership_change_even_with_equal_ancestor_shapes(self):
        a = document()
        b = document()
        for root, outer_id in [(a, 'owner-one'), (b, 'owner-two')]:
            control = root.find('.//w:sdt', qa.NS)
            parent = control.getparent()
            outer = text_control(parent, outer_id)
            content = outer.find('w:sdtContent', qa.NS)
            content.clear()
            content.append(control)
        result = self.compare(a, b)
        row = next(r for r in result['instances'] if r['field'] == 'cv.entry.description')
        self.assertEqual(row['matchStatus'], 'MATCHED')
        self.assertTrue(row['fieldTokensUnchanged'])
        self.assertFalse(row['controlNestingUnchanged'])

    def test_changed_vml_crop_attributes_are_not_mistaken_for_two_absent_drawingml_crops(self):
        result = self.compare(vml_photo(document(), cropleft='.1'), vml_photo(document(), cropleft='.2'))
        self.assertFalse(result['pictures'][0]['exactCropMarkupUnchanged'])
        self.assertFalse(result['pictures'][0]['originalPixelWindowUnchanged'])
        self.assertTrue(result['pictures'][0]['originalPixelsInsideCanonicalControl'])

    def test_equivalent_vml_fraction_spellings_do_not_pass_exact_markup(self):
        result = self.compare(vml_photo(document(), cropleft='.1'), vml_photo(document(), cropleft='10%'))
        self.assertFalse(result['pictures'][0]['exactCropMarkupUnchanged'])
        self.assertTrue(result['pictures'][0]['originalPixelWindowUnchanged'])

    def test_vml_fill_focus_change_is_recorded_without_inventing_a_comparable_crop_window(self):
        result = self.compare(vml_photo(document(), fill=True, focusposition='.1,.2'),
                              vml_photo(document(), fill=True, focusposition='.2,.2'))
        self.assertFalse(result['pictures'][0]['exactCropMarkupUnchanged'])
        self.assertIsNone(result['pictures'][0]['originalPixelWindowUnchanged'])

    def test_crop_window_equivalence_is_unassessable_after_pixels_change(self):
        result = self.compare(document(), document(), png('orange'))
        self.assertTrue(result['pictures'][0]['encodedCropFractionsUnchanged'])
        self.assertIsNone(result['pictures'][0]['originalPixelWindowUnchanged'])

    def test_unreferenced_source_stories_cannot_receive_a_semantic_instance_pass(self):
        a = with_headers()
        orphan = ET.fromstring(f'<w:hdr xmlns:w="{W}"/>')
        text_control(orphan, 'orphan.field')
        a[1]['word/orphan.xml'] = orphan
        result = self.header_comparison(a=a, b=a)
        row = next(r for r in result['instances'] if r['field'] == 'orphan.field')
        self.assertEqual(row['matchStatus'], 'UNREFERENCED_SOURCE_STORY')

    def test_unresolved_header_references_fail_before_comparing_field_loss(self):
        a = with_headers()
        a[2].pop('default')
        package(self.source, a[0], stories=a[1], references=a[2])
        with self.assertRaisesRegex(ValueError, 'Unresolved'):
            qa.inspect(self.source)

    def test_numeric_id_collisions_include_equal_values_with_different_spelling(self):
        a = with_headers()
        p = a[1]['word/header-first.xml'].find('w:p', qa.NS)
        ET.SubElement(p.find('w:sdt/w:sdtPr', qa.NS), '{'+W+'}id').set('{'+W+'}val', '+00101')
        text_control(p, 'cv.person.name', native_id='101')
        result = self.header_comparison(a=a, b=a)
        self.assertEqual(result['duplicateNativeSdtIds']['source'], ['101'])
        self.assertEqual(sum(r['matchStatus'].startswith('AMBIGUOUS') for r in result['instances']), 2)

    def test_duplicate_header_role_references_fail_before_location_matching(self):
        a = with_headers()
        section = a[0].find('.//w:sectPr', qa.NS)
        extra = ET.SubElement(section, '{'+W+'}headerReference')
        extra.set('{'+W+'}type', 'first')
        extra.set('{'+R+'}id', 'default')
        package(self.source, a[0], stories=a[1], references=a[2])
        with self.assertRaisesRegex(ValueError, 'Ambiguous duplicate header reference'):
            qa.inspect(self.source)

    def test_a_header_relationship_cannot_identify_a_main_document_as_a_header_story(self):
        a = with_headers()
        a[2]['default'] = 'document.xml'
        package(self.source, a[0], stories=a[1], references=a[2])
        with self.assertRaisesRegex(ValueError, 'Wrong root element'):
            qa.inspect(self.source)

    def test_equal_text_and_tag_moved_to_another_body_section_is_not_owner_preservation(self):
        import copy
        a = document()
        body = a.find('w:body', qa.NS)
        ending = ET.Element('{'+W+'}p')
        ET.SubElement(ET.SubElement(ending, '{'+W+'}pPr'), '{'+W+'}sectPr')
        body.insert(0, ending)
        ET.SubElement(body, '{'+W+'}sectPr')
        b = copy.deepcopy(a)
        target = b.find('w:body/w:sdt', qa.NS)
        b.find('w:body', qa.NS).insert(0, target)
        result = self.compare(a, b)
        row = next(r for r in result['instances'] if r['field'] == 'cv.entry.description')
        self.assertEqual(row['sourceStoryRoles'], ['section:2/body'])
        self.assertEqual(row['matchStatus'], 'MISSING_OR_MOVED_TO_ANOTHER_STORY_ROLE')
        self.assertTrue(row['sourceTextPresentSomewhereInSavedXml'])

    def test_a_control_in_the_section_ending_paragraph_keeps_the_ending_section(self):
        a = document()
        paragraph = a.find('.//w:sdtContent/w:p', qa.NS)
        props = ET.Element('{'+W+'}pPr')
        ET.SubElement(props, '{'+W+'}sectPr')
        paragraph.insert(0, props)
        text_control(paragraph, 'ending-paragraph.field')
        ET.SubElement(a.find('w:body', qa.NS), '{'+W+'}sectPr')
        result = self.compare(a, a)
        ending = next(r for r in result['instances'] if r['field'] == 'ending-paragraph.field')
        following = next(r for r in result['instances'] if r['field'] == 'cv.person.photo')
        self.assertEqual(ending['sourceStoryRoles'], ['section:1/body'])
        self.assertEqual(following['sourceStoryRoles'], ['section:2/body'])

    def test_drawingml_fillrect_change_is_separate_from_absent_source_rectangle(self):
        a, b = document(), document()
        for root, top in [(a, '264666'), (b, '52146')]:
            fill = root.find('.//a:blipFill', qa.NS)
            fill.remove(fill.find('a:srcRect', qa.NS))
            rectangle = ET.SubElement(ET.SubElement(fill, '{'+A+'}stretch'), '{'+A+'}fillRect')
            rectangle.set('t', top)
            rectangle.set('b', top)
        result = self.compare(a, b)['pictures'][0]
        self.assertIsNone(result['source']['cropMarkup'])
        self.assertIsNone(result['saved']['cropMarkup'])
        self.assertFalse(result['exactCropMarkupUnchanged'])
        self.assertIsNone(result['originalPixelWindowUnchanged'])


if __name__ == '__main__':
    unittest.main()
