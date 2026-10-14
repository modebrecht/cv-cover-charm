"""A bounded official transport fallback never accepts a different UNO package."""
import hashlib
import importlib.util
import io
from pathlib import Path
import tempfile
from unittest.mock import patch
from urllib.error import HTTPError
import unittest


spec = importlib.util.spec_from_file_location('setup', Path(__file__).with_name('docx-next-native-grid-setup.py'))
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)
DATA = b'independent pinned package control'
PRIMARY = 'https://snapshot.ubuntu.com/ubuntu/20260828T000000Z/pool/main/p/package/package.deb'
FALLBACK = 'https://launchpadlibrarian.net/123/package.deb'
MANIFEST = {'url': PRIMARY, 'size': len(DATA), 'sha256': hashlib.sha256(DATA).hexdigest()}


class FetchTests(unittest.TestCase):
    def test_primary_verified_bytes_do_not_use_fallback(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(qa, 'urlopen', return_value=io.BytesIO(DATA)) as fetch:
            archive = Path(folder) / 'client.deb'
            record = qa.fetch_archive(MANIFEST, archive, FALLBACK)
            self.assertEqual(archive.read_bytes(), DATA)
            self.assertEqual(record['source'], PRIMARY)
            fetch.assert_called_once_with(PRIMARY, timeout=30)

    def test_actual_server_error_classes_allow_same_pinned_package(self):
        for code in (500, 502, 503, 504):
            with tempfile.TemporaryDirectory() as folder, patch.object(qa, 'urlopen', side_effect=[HTTPError(PRIMARY, code, 'server error', None, None), io.BytesIO(DATA)]) as fetch:
                record = qa.fetch_archive(MANIFEST, Path(folder) / 'client.deb', FALLBACK)
                self.assertEqual(record['source'], FALLBACK)
                self.assertEqual(record['sha256'], MANIFEST['sha256'])
                self.assertEqual([call.args[0] for call in fetch.call_args_list], [PRIMARY, FALLBACK])

    def test_valid_cached_package_needs_no_network(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(qa, 'urlopen') as fetch:
            archive = Path(folder) / 'client.deb'; archive.write_bytes(DATA)
            self.assertEqual(qa.fetch_archive(MANIFEST, archive, FALLBACK)['source'], 'verified cached package')
            fetch.assert_not_called()

    def test_corrupted_primary_bytes_are_a_hard_failure(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(qa, 'urlopen', return_value=io.BytesIO(b'x' * len(DATA))) as fetch:
            archive = Path(folder) / 'client.deb'
            with self.assertRaises(AssertionError):
                qa.fetch_archive(MANIFEST, archive, FALLBACK)
            self.assertFalse(archive.exists())
            self.assertEqual(fetch.call_count, 1)

    def test_corrupted_fallback_and_oversized_responses_are_rejected(self):
        for data in (b'x' * len(DATA), DATA + b'excess'):
            with tempfile.TemporaryDirectory() as folder, patch.object(qa, 'urlopen', side_effect=[HTTPError(PRIMARY, 502, 'server error', None, None), io.BytesIO(data)]):
                archive = Path(folder) / 'client.deb'
                with self.assertRaises(AssertionError):
                    qa.fetch_archive(MANIFEST, archive, FALLBACK)
                self.assertFalse(archive.exists())

    def test_other_http_failures_are_not_silently_retried(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(qa, 'urlopen', side_effect=HTTPError(PRIMARY, 404, 'missing', None, None)) as fetch:
            with self.assertRaises(HTTPError):
                qa.fetch_archive(MANIFEST, Path(folder) / 'client.deb', FALLBACK)
            self.assertEqual(fetch.call_count, 1)

    def test_untrusted_origins_and_changed_package_names_are_rejected(self):
        for url in ('http://launchpadlibrarian.net/123/package.deb', 'https://example.com/package.deb', FALLBACK + '?alternate=1', 'https://launchpadlibrarian.net/123/other.deb'):
            with tempfile.TemporaryDirectory() as folder, patch.object(qa, 'urlopen') as fetch:
                with self.assertRaises(AssertionError):
                    qa.fetch_archive(MANIFEST, Path(folder) / 'client.deb', url)
                fetch.assert_not_called()


if __name__ == '__main__':
    unittest.main()
