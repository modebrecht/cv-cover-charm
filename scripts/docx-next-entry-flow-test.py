"""Model-to-package gate must catch losses even when the total is unchanged."""
import copy
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('entry_flow', Path(__file__).with_name('docx-next-entry-flow-qa.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SourceControlTests(unittest.TestCase):
    def setUp(self):
        self.actual = {'letter.attachments-heading': 'Beilagen', 'cv.person.name': 'Lea'}
        self.fixture = {'sourceFields': [{'fieldId': key, 'text': value} for key, value in self.actual.items()],
                        'nativeParagraphs': [{'fieldId': 'cv.person.name'}]}

    def test_complete_fields_include_additional_authored_headings(self):
        module.check_source_controls(self.actual, self.fixture)

    def test_missing_field_fails(self):
        with self.assertRaises(AssertionError):
            module.check_source_controls({'cv.person.name': 'Lea'}, self.fixture)

    def test_equal_count_with_wrong_identity_fails(self):
        with self.assertRaises(AssertionError):
            module.check_source_controls({'letter.wrong': 'Beilagen', 'cv.person.name': 'Lea'}, self.fixture)

    def test_changed_text_fails(self):
        with self.assertRaises(AssertionError):
            module.check_source_controls({**self.actual, 'cv.person.name': 'Anders'}, self.fixture)

    def test_reordered_fields_fail(self):
        with self.assertRaises(AssertionError):
            module.check_source_controls(dict(reversed(list(self.actual.items()))), self.fixture)

    def test_duplicate_model_identity_fails(self):
        fixture = copy.deepcopy(self.fixture)
        fixture['sourceFields'].append(fixture['sourceFields'][0])
        with self.assertRaises(AssertionError): module.check_source_controls(self.actual, fixture)

    def test_missing_cv_model_paragraph_fails(self):
        fixture = copy.deepcopy(self.fixture)
        fixture['nativeParagraphs'] = []
        with self.assertRaises(AssertionError): module.check_source_controls(self.actual, fixture)


if __name__ == '__main__': unittest.main()
