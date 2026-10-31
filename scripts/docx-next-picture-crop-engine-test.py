"""Adversarial evidence/overwrite guards; no native execution is faked as acceptance."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('crop_engine_qa',
    Path(__file__).with_name('docx-next-picture-crop-engine-qa.py'))
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)


class CropEvidenceGuards(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def bundle(self, name, salt=b''):
        directory = self.root / name
        directory.mkdir()
        cases = []
        for identity in sorted(qa.NAMES):
            phases = []
            for phase in ('source', 'saved1', 'saved2'):
                row = {'phase': phase}
                for kind in ('docx', 'pdf'):
                    file = directory / f'{identity}-{phase}.{kind}'
                    file.write_bytes(identity.encode() + kind.encode() + salt)
                    row[kind], row[kind + 'Sha256'] = file.name, qa.digest(file)
                phases.append(row)
            cases.append({'name': identity, 'sha256': phases[0]['docxSha256'],
                          'collection': 'complete', 'phases': phases})
        qa.write_new(directory / 'phases.json', {'cases': cases})
        return directory

    def test_existing_output_rejected_before_engine_or_source_access(self):
        target = self.root / 'existing'
        target.mkdir()
        with self.assertRaisesRegex(ValueError, 'new output directory'):
            qa.collect(self.root / 'missing', target, self.root / 'missing-engine',
                       self.root / 'missing-library')

    def test_duplicate_source_cases_rejected_before_any_output(self):
        sources = self.root / 'sources'
        sources.mkdir()
        qa.write_new(sources / 'probe-manifest.json', [{'name': 'crop-repro-rect-full'}] * 4)
        target = self.root / 'must-not-exist'
        with self.assertRaisesRegex(ValueError, 'four minimal crop sources'):
            qa.collect(sources, target, self.root / 'missing-engine', self.root / 'missing-library')
        self.assertFalse(target.exists())

    def test_paths_and_windows_alternate_streams_rejected(self):
        for name in ('../outside.docx', 'child/file.docx', 'child\\file.docx', 'photo.docx:stream'):
            with self.subTest(name=name), self.assertRaisesRegex(ValueError, 'plain local names'):
                qa.safe_child(self.root, name)

    def test_changed_native_file_cannot_keep_its_old_hash(self):
        directory = self.bundle('changed')
        row = qa.read(directory / 'phases.json')['cases'][0]['phases'][1]
        (directory / row['docx']).write_bytes(b'changed after native collection')
        with self.assertRaisesRegex(ValueError, 'collection file changed'):
            qa.validated_collection(directory)

    def test_source_identity_is_checked_against_collected_source(self):
        directory = self.bundle('wrong-source')
        manifest = directory / 'phases.json'
        data = qa.read(manifest)
        data['cases'][0]['sha256'] = '0' * 64
        manifest.write_text(json.dumps(data), encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'declared immutable input'):
            qa.validated_collection(directory)

    def test_phase_alias_cannot_count_the_source_as_a_second_save(self):
        directory = self.bundle('alias')
        manifest = directory / 'phases.json'
        data = qa.read(manifest)
        first, saved = data['cases'][0]['phases'][:2]
        saved['docx'], saved['docxSha256'] = first['docx'], first['docxSha256']
        manifest.write_text(json.dumps(data), encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'Distinct physical files'):
            qa.validated_collection(directory)

    def test_consistent_foreign_reference_cannot_rescue_a_different_source(self):
        candidate, reference = self.bundle('candidate'), self.bundle('reference', b'other input')
        report = self.root / 'report.json'
        with self.assertRaisesRegex(ValueError, 'source packages differ'):
            qa.audit(candidate, reference, report)
        self.assertFalse(report.exists())

    def test_reference_cannot_be_the_candidate_collection_itself(self):
        directory = self.bundle('self-reference')
        with self.assertRaisesRegex(ValueError, 'distinct trusted reference'):
            qa.audit(directory, directory, self.root / 'report.json')

    def test_existing_report_is_not_overwritten(self):
        report = self.root / 'report.json'
        report.write_bytes(b'prior counterevidence')
        with self.assertRaisesRegex(ValueError, 'new report path'):
            qa.audit(self.root / 'missing', self.root / 'missing-reference', report)
        self.assertEqual(report.read_bytes(), b'prior counterevidence')

    def test_incomplete_native_case_is_not_a_pass(self):
        directory = self.bundle('incomplete')
        manifest = directory / 'phases.json'
        data = qa.read(manifest)
        data['cases'][0]['phases'].pop()
        manifest.write_text(json.dumps(data), encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'two native saves'):
            qa.validated_collection(directory)


if __name__ == '__main__':
    unittest.main()
