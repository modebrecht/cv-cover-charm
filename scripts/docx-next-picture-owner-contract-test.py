"""Adversarial ownership cases, including an empty control beside a visible orphan."""
import copy
import io
import unittest
from zipfile import ZipFile

from PIL import Image
from docx_next_picture_owner_qa import (W, A, R, REL, IMAGE_REL, WPS, picture_inventory,
                                       compare_image_data, require_picture_ownership)

DRAWING = '<w:r><w:drawing><a:graphic><a:blip r:embed="image1"/></a:graphic></w:drawing></w:r>'
CONTROL = '<w:sdt><w:sdtPr><w:tag w:val="cv.person.photo"/><w:picture/></w:sdtPr><w:sdtContent>{}</w:sdtContent></w:sdt>'
PICTURES = [{'id': 'cv.person.photo'}]


class PictureOwnershipTests(unittest.TestCase):
    def image(self, size=(3, 4), color=(20, 40, 60, 255)):
        stream = io.BytesIO()
        Image.new('RGBA', size, color).save(stream, format='PNG')
        return stream.getvalue()

    def inspect(self, body=None, relations=None, media=None):
        stream = io.BytesIO()
        with ZipFile(stream, 'w') as archive:
            archive.writestr('word/document.xml',
                f'<w:document xmlns:w="{W[1:-1]}" xmlns:a="{A[1:-1]}" xmlns:r="{R[1:-1]}"><w:body>'
                + (CONTROL.format(DRAWING) if body is None else body) + '</w:body></w:document>')
            archive.writestr('word/_rels/document.xml.rels', f'<Relationships xmlns="{REL[1:-1]}">'
                + (f'<Relationship Id="image1" Type="{IMAGE_REL}" Target="media/photo.png"/>' if relations is None else relations)
                + '</Relationships>')
            archive.writestr('word/media/photo.png', self.image() if media is None else media)
        stream.seek(0)
        return picture_inventory(stream, PICTURES)

    def test_embedded_drawing_inside_typed_control_passes(self):
        self.assertEqual(self.inspect()['status'], 'pass')

    def test_retained_tag_and_visible_orphan_do_not_prove_ownership(self):
        record = self.inspect(CONTROL.format('<w:r/><w:r/>') + DRAWING)
        self.assertEqual(record['status'], 'fail')
        self.assertEqual(record['pictures'][0]['drawingCount'], 0)
        self.assertIsNone(record['pictures'][0]['image'])

    def test_missing_or_duplicate_owner_fails(self):
        for body in [DRAWING, CONTROL.format(DRAWING) * 2]:
            self.assertEqual(self.inspect(body)['status'], 'fail')

    def test_untyped_control_fails(self):
        self.assertEqual(self.inspect(CONTROL.format(DRAWING).replace('<w:picture/>', ''))['status'], 'fail')

    def test_caption_text_does_not_belong_inside_a_picture_control(self):
        record = self.inspect(CONTROL.format(DRAWING + '<w:r><w:t>Caption</w:t></w:r>'))
        self.assertEqual(record['status'], 'fail')
        self.assertEqual(record['pictures'][0]['reasons'], ['non-picture-text-in-picture-control'])

    def test_zero_width_range_markers_cannot_substitute_for_conformance(self):
        marker = '<w:r><w:t>\u2060</w:t></w:r>'
        record = self.inspect(CONTROL.format(marker + DRAWING + marker))
        self.assertEqual(record['status'], 'fail')
        self.assertEqual(record['pictures'][0]['drawingCount'], 1)
        self.assertIsNotNone(record['pictures'][0]['image'])
        self.assertEqual(compare_image_data(self.inspect(), record)['status'], 'fail')

    def test_hidden_or_field_text_is_not_a_picture(self):
        for text in ['<w:r><w:rPr><w:vanish/></w:rPr><w:t>\u2060</w:t></w:r>',
                     '<w:r><w:instrText>NOT A PICTURE</w:instrText></w:r>']:
            self.assertEqual(self.inspect(CONTROL.format(DRAWING + text))['status'], 'fail')

    def test_two_drawings_or_image_references_fail(self):
        for content in [DRAWING * 2, DRAWING.replace('<a:blip r:embed="image1"/>', '<a:blip r:embed="image1"/>' * 2)]:
            self.assertEqual(self.inspect(CONTROL.format(content))['status'], 'fail')

    def test_image_reference_beside_empty_drawing_does_not_prove_ownership(self):
        content = '<w:r><w:drawing/></w:r><a:blip r:embed="image1"/>'
        self.assertEqual(self.inspect(CONTROL.format(content))['status'], 'fail')

    def test_nested_text_frame_cannot_substitute_for_owned_picture(self):
        self.assertEqual(self.inspect(CONTROL.format('<w:txbxContent>' + DRAWING + '</w:txbxContent>'))['status'], 'fail')

    def test_nested_field_cannot_borrow_its_image(self):
        self.assertEqual(self.inspect(CONTROL.format('<w:sdt>' + DRAWING + '</w:sdt>'))['status'], 'fail')

    def test_missing_or_duplicated_relationship_fails(self):
        relation = f'<Relationship Id="image1" Type="{IMAGE_REL}" Target="media/photo.png"/>'
        for rels in ['', relation * 2]:
            self.assertEqual(self.inspect(relations=rels)['status'], 'fail')

    def test_external_link_wrong_type_and_escaping_paths_fail(self):
        relations = [f'<Relationship Id="image1" Type="{IMAGE_REL}" Target="https://example.com/photo.png" TargetMode="External"/>',
                     '<Relationship Id="image1" Type="not-image" Target="media/photo.png"/>']
        relations += [f'<Relationship Id="image1" Type="{IMAGE_REL}" Target="{path}"/>' for path in
                      ['../../private.png', '/word/media/photo.png', 'media/missing.png', 'media/photo.png#x']]
        for relation in relations:
            self.assertEqual(self.inspect(relations=relation)['status'], 'fail')
        linked = DRAWING.replace('r:embed="image1"', 'r:embed="image1" r:link="external"')
        self.assertEqual(self.inspect(CONTROL.format(linked))['status'], 'fail')

    def test_undecodable_payload_is_rejected(self):
        self.assertEqual(self.inspect(media=b'not an image')['status'], 'fail')

    def test_writer_alternate_fallback_is_not_counted_as_two_drawings(self):
        alternate = f'<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"><mc:Choice xmlns:wps="{WPS}" Requires="wps">' + DRAWING + '</mc:Choice><mc:Fallback><w:pict/></mc:Fallback></mc:AlternateContent>'
        self.assertEqual(self.inspect(CONTROL.format(alternate))['status'], 'pass')

    def alternate(self, choice, fallback, namespace=WPS):
        return f'<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"><mc:Choice xmlns:feature="{namespace}" Requires="feature">{choice}</mc:Choice><mc:Fallback>{fallback}</mc:Fallback></mc:AlternateContent>'

    def test_same_field_in_inactive_fallback_is_not_a_second_live_control(self):
        field = CONTROL.format(DRAWING)
        self.assertEqual(self.inspect(self.alternate(field, field))['status'], 'pass')

    def test_real_duplicates_in_the_selected_choice_still_fail(self):
        field = CONTROL.format(DRAWING)
        self.assertEqual(self.inspect(self.alternate(field * 2, field))['status'], 'fail')

    def test_unsupported_choice_uses_only_fallback(self):
        good, bad = CONTROL.format(DRAWING), CONTROL.format('')
        self.assertEqual(self.inspect(self.alternate(bad, good, 'urn:unsupported'))['status'], 'pass')
        self.assertEqual(self.inspect(self.alternate(good, bad, 'urn:unsupported'))['status'], 'fail')

    def test_unbound_compatibility_requirement_is_rejected(self):
        body = self.alternate(CONTROL.format(DRAWING), '').replace('Requires="feature"', 'Requires="unbound"')
        with self.assertRaisesRegex(AssertionError, 'Unbound'):
            self.inspect(body)

    def test_inner_namespace_shadowing_selects_its_own_fallback(self):
        good, bad = CONTROL.format(DRAWING), CONTROL.format('')
        inner = self.alternate(bad, good, 'urn:unsupported')
        outer = self.alternate(inner, bad)
        self.assertEqual(self.inspect(outer)['status'], 'pass')

    def test_picture_outside_selected_control_cannot_be_borrowed_from_fallback(self):
        good, bad = CONTROL.format(DRAWING), CONTROL.format('') + DRAWING
        self.assertEqual(self.inspect(self.alternate(bad, good))['status'], 'fail')

    def test_empty_scope_passes_without_inventing_photos(self):
        stream = io.BytesIO()
        with ZipFile(stream, 'w') as z:
            z.writestr('word/document.xml', f'<w:document xmlns:w="{W[1:-1]}"/>')
            z.writestr('word/_rels/document.xml.rels', f'<Relationships xmlns="{REL[1:-1]}"/>')
        stream.seek(0)
        self.assertEqual(picture_inventory(stream, []), {'status': 'pass', 'pictures': []})

    def test_dimension_rgb_and_alpha_changes_are_rejected(self):
        source = self.inspect()
        for image in [self.image(size=(4, 3)), self.image(color=(20, 40, 61, 255)), self.image(color=(20, 40, 60, 254))]:
            self.assertEqual(compare_image_data(source, self.inspect(media=image))['status'], 'fail')
        self.assertEqual(compare_image_data(source, source)['status'], 'pass')

    def test_equal_pixels_with_different_payload_are_explicitly_distinguished(self):
        source = self.inspect()
        saved = copy.deepcopy(source)
        saved['pictures'][0]['image']['part'] = 'word/media/renamed.png'
        saved['pictures'][0]['image']['payloadSha256'] = 'different encoding'
        result = compare_image_data(source, saved)
        self.assertEqual(result['status'], 'pass')
        self.assertFalse(result['pictures'][0]['payloadBytesUnchanged'])

    def test_no_global_fallback_when_control_is_empty(self):
        source = self.inspect()
        orphan = self.inspect(CONTROL.format('') + DRAWING)
        self.assertEqual(compare_image_data(source, orphan)['status'], 'fail')

    def test_strict_gate_fails_even_when_all_content_checks_pass(self):
        for status in ['pending', 'fail', None]:
            with self.assertRaisesRegex(AssertionError, 'lost its own'):
                require_picture_ownership({'contentRoundtripAcceptance': 'pass', 'pictureOwnershipAcceptance': status})
        require_picture_ownership({'pictureOwnershipAcceptance': 'pass'})


if __name__ == '__main__':
    unittest.main()
