import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('qa', Path(__file__).with_name('docx-next-sidebar-word-layout-qa.py'))
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)


def field(text):
    return f'<w:sdt><w:sdtPr><w:tag w:val="same"/></w:sdtPr><w:sdtContent><w:r><w:t>{text}</w:t></w:r></w:sdtContent></w:sdt>'


class EffectiveMarkupTests(unittest.TestCase):
    def document(self, body):
        return f'<w:document xmlns:w="{qa.W}" xmlns:mc="{qa.MC}" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" xmlns:unknown="urn:unknown"><w:body>{body}</w:body></w:document>'.encode()

    def test_supported_choice_is_counted_once(self):
        xml = self.document('<mc:AlternateContent><mc:Choice Requires="wps">'+field('active')+'</mc:Choice><mc:Fallback>'+field('fallback')+'</mc:Fallback></mc:AlternateContent>')
        self.assertEqual(qa.control_fields(qa.effective_tree(xml)), {'same': 'active'})

    def test_unknown_choice_uses_fallback(self):
        xml = self.document('<mc:AlternateContent><mc:Choice Requires="unknown">'+field('unsupported')+'</mc:Choice><mc:Fallback>'+field('fallback')+'</mc:Fallback></mc:AlternateContent>')
        self.assertEqual(qa.control_fields(qa.effective_tree(xml)), {'same': 'fallback'})

    def test_real_duplicate_active_fields_still_reject(self):
        with self.assertRaisesRegex(AssertionError, 'Duplicate active field'):
            qa.control_fields(qa.effective_tree(self.document(field('one')+field('two'))))

    def test_missing_usable_representation_rejects(self):
        with self.assertRaisesRegex(AssertionError, 'No supported'):
            qa.effective_tree(self.document('<mc:AlternateContent><mc:Choice Requires="unknown"/></mc:AlternateContent>'))


if __name__ == '__main__':
    unittest.main()
