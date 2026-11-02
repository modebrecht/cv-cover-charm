"""Historical replay must reject corruption and source/evidence version mixing."""
import copy
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile, ZIP_DEFLATED

spec = importlib.util.spec_from_file_location('picture_history', Path(__file__).with_name('docx-next-picture-history-replay.py'))
history = importlib.util.module_from_spec(spec)
spec.loader.exec_module(history)


class PictureHistoryTests(unittest.TestCase):
    def setUp(self):
        self.data = (history.FIXTURE / 'sources.zip').read_bytes()
        self.record = json.loads((history.FIXTURE / 'provenance.json').read_text())
        self.baselines = history.ROOT / 'docs/docx-next'

    def verify(self, data=None, record=None):
        return history.verified_sources(data if data is not None else self.data,
                                        record if record is not None else self.record, self.baselines)

    def repack(self, edits):
        files = self.verify()
        files.update(edits)
        buffer = io.BytesIO()
        with ZipFile(buffer, 'w', compression=ZIP_DEFLATED) as archive:
            for name, content in files.items():
                archive.writestr(name, content)
        data = buffer.getvalue()
        record = copy.deepcopy(self.record)
        record['archiveSha256'] = hashlib.sha256(data).hexdigest()
        record['files'] = {name: hashlib.sha256(content).hexdigest() for name, content in files.items()}
        return data, record

    def test_all_26_original_sources_bind_to_seven_existing_baselines(self):
        self.assertEqual(len(self.verify()), 44)
        self.assertEqual(sum(map(len, self.record['matrices'].values())), 26)

    def test_archive_corruption_rejects_before_extraction(self):
        with self.assertRaisesRegex(AssertionError, 'archive changed'):
            self.verify(self.data + b'changed')

    def test_wrong_member_hash_rejects(self):
        self.record['files']['fixtures/picture-identity-body-plain.docx'] = '0' * 64
        with self.assertRaisesRegex(AssertionError, 'file changed'):
            self.verify()

    def test_untracked_archive_member_rejects(self):
        del self.record['files']['fixtures/picture-identity-body-plain.docx']
        with self.assertRaisesRegex(AssertionError, 'file inventory'):
            self.verify()

    def test_changed_case_order_rejects(self):
        self.record['matrices']['fixtures'].reverse()
        with self.assertRaisesRegex(AssertionError, 'case order'):
            self.verify()

    def test_current_renderer_package_cannot_replace_historical_native_source(self):
        # Even a new, internally consistent archive cannot relabel a changed DOCX
        # as the source of the immutable native observation.
        matrix = 'precision'
        name = self.record['matrices'][matrix][0]
        manifest_path = matrix + '/picture-identity-manifest.json'
        manifest = json.loads(self.verify()[manifest_path])
        changed = b'different serializer source'
        manifest[0]['docxSha256'] = hashlib.sha256(changed).hexdigest()
        data, record = self.repack({matrix + '/' + name + '.docx': changed,
                                    manifest_path: json.dumps(manifest).encode()})
        with self.assertRaisesRegex(AssertionError, 'native evidence source'):
            self.verify(data, record)

    def test_parent_path_rejects_even_with_consistent_hashes(self):
        data, record = self.repack({'../escape.docx': b'bad'})
        with self.assertRaisesRegex(AssertionError, 'Unsafe'):
            self.verify(data, record)

    def test_existing_matrix_cannot_mix_fresh_and_stale_evidence(self):
        with tempfile.TemporaryDirectory() as work:
            root = Path(work)
            (root / 'precision').mkdir()
            with self.assertRaisesRegex(AssertionError, 'already exists'):
                history.replay(root)
            self.assertEqual(list(root.iterdir()), [root / 'precision'])


if __name__ == '__main__':
    unittest.main()
