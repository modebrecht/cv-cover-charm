"""Adversarial strict baseline and early-stop checks; no editor needed."""
import copy
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('continuation', Path(__file__).with_name('docx-next-floating-continuation-qa.py'))
qa = importlib.util.module_from_spec(spec); spec.loader.exec_module(qa)


def example():
    native = {'allPages': True, 'geometry': {'grid': [1234], 'position': {'tblpX': '400'}},
              'paragraphs': [{'fieldId': 'stable.id', 'owner': 'body', 'paragraphCount': 1, 'flags': {'keepNext': True}}]}
    render = {'pages': 7, 'allTextAndBounds': True, 'openingMatches': True,
              'tracks': {'main': {'firstCvPage': 1}, 'side': {'firstCvPage': 1}}}
    return {'libreOfficeVersion': 'one runtime', 'preparedSources': [{'name': 'one', 'docxSha256': 'source'}],
            'earlyStop': None, 'actualCases': 1, 'actualDossierPages': 7,
            'cases': [{'docxSha256': 'source', 'savedDocxSha256': 'zip-metadata', 'sourceNative': native,
                       'savedNative': copy.deepcopy(native), 'render': render, 'saveReopen': copy.deepcopy(render),
                       'nativeIdentity': {'fieldIdentity': 'pass', 'completeNativeText': 'pass', 'tableIdentity': 'fail'},
                       'rasterPages': {'render': ['all-RGBA-bytes'], 'saveReopen': ['all-RGBA-bytes']}}]}


class Test(unittest.TestCase):
    def test_only_engine_version_and_saved_zip_metadata_are_excluded(self):
        before = example(); after = copy.deepcopy(before)
        after['libreOfficeVersion'] = 'independent runtime'; after['cases'][0]['savedDocxSha256'] = 'new-zip-metadata'
        self.assertEqual(qa.compare_baseline(before, after)['changedCases'], 0)

    def test_all_native_and_visible_channels_remain_strict(self):
        changes = [lambda j: j['cases'][0].update(docxSha256='changed-source'),
                   lambda j: j['cases'][0]['savedNative']['geometry']['grid'].__setitem__(0, 1235),
                   lambda j: j['cases'][0]['savedNative']['geometry']['position'].update(tblpX='401'),
                   lambda j: j['cases'][0]['savedNative'].update(allPages=False),
                   lambda j: j['cases'][0]['savedNative']['paragraphs'][0].update(owner='side-cell'),
                   lambda j: j['cases'][0]['savedNative']['paragraphs'][0]['flags'].update(keepNext=False),
                   lambda j: j['cases'][0]['nativeIdentity'].update(tableIdentity='pass'),
                   lambda j: j['cases'][0]['render']['tracks']['main'].update(firstCvPage=7),
                   lambda j: j['cases'][0]['rasterPages']['render'].__setitem__(0, 'RGB-changed-alpha-identical'),
                   lambda j: j.update(earlyStop={'reasons': ['opening']}),
                   lambda j: j['preparedSources'][0].update(docxSha256='different'),
                   lambda j: j.update(actualCases=2)]
        for change in changes:
            with self.subTest(change=change):
                before = example(); after = copy.deepcopy(before); change(after)
                with self.assertRaises(AssertionError): qa.compare_baseline(before, after)

    def test_candidate_stops_for_each_loss_without_guessing_container_identity(self):
        row = example()['cases'][0]
        self.assertEqual(qa.candidate_failures(row), [])
        for change, reason in [(lambda j: j['nativeIdentity'].update(fieldIdentity='fail'), 'native-fields-or-text'),
                               (lambda j: j['savedNative'].update(allPages=False), 'native-owners-policy-or-exact-geometry'),
                               (lambda j: j['render'].update(allTextAndBounds=False), 'render-text-or-bounds'),
                               (lambda j: j['saveReopen'].update(openingMatches=False), 'saveReopen-opening'),
                               (lambda j: j['rasterPages']['saveReopen'].__setitem__(0, 'changed'), 'save-reopen-pixels')]:
            altered = copy.deepcopy(row); change(altered)
            self.assertIn(reason, qa.candidate_failures(altered))
        self.assertEqual(row['nativeIdentity']['tableIdentity'], 'fail')

    def test_duplicated_visible_title_fails_even_with_all_native_ids(self):
        row = example()['cases'][0]
        row['render']['textMultiplicityMatches'] = False
        self.assertIn('render-paragraph-text-multiplicity', qa.candidate_failures(row))
        self.assertEqual(row['nativeIdentity']['fieldIdentity'], 'pass')

    def test_authored_repetitions_and_short_text_inside_other_fields_are_preserved(self):
        self.assertEqual(qa.paragraph_multiplicity(['Title', 'Body contains Title', 'Body contains Title'], ['Title', 'Body contains Title', 'Body contains Title']), [])

    def test_page_spanning_whole_paragraph_and_soft_hyphen_do_not_create_duplicates(self):
        self.assertEqual(qa.paragraph_multiplicity(['One complete paragraph'], ['One complete para\u00ad', 'graph']), [])

    def test_excess_visible_title_and_missing_authored_repetition_are_both_rejected(self):
        self.assertEqual(qa.paragraph_multiplicity(['Title', 'Body'], ['TitleBody', 'Title']), [{'paragraphIndex': 0, 'expectedOccurrences': 1, 'actualOccurrences': 2}])
        self.assertEqual(qa.paragraph_multiplicity(['Repeat', 'Repeat'], ['Repeat']), [{'paragraphIndex': 0, 'expectedOccurrences': 2, 'actualOccurrences': 1}, {'paragraphIndex': 1, 'expectedOccurrences': 2, 'actualOccurrences': 1}])

    def test_title_alone_on_page_one_does_not_pass_a_detached_opening(self):
        row = example()['cases'][0]
        for phase in ('render', 'saveReopen'):
            row[phase]['tracks']['main']['openingCvPages'] = [1, 7, 7, 7, 7, 7, 7, 7, 7]
        self.assertIn('render-detached-main-opening', qa.candidate_failures(row))
        self.assertIn('saveReopen-detached-main-opening', qa.candidate_failures(row))


if __name__ == '__main__': unittest.main()
