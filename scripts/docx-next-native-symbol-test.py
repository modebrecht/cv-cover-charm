"""Reject mismatched debug identities and plausible but false ELF symbol extents."""
import importlib.util
import json
from pathlib import Path
import struct
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch


spec = importlib.util.spec_from_file_location('symbols', Path(__file__).with_name('docx-next-native-symbol-qa.py'))
qa = importlib.util.module_from_spec(spec); spec.loader.exec_module(qa)


class NativeSymbolTest(unittest.TestCase):
    def setUp(self):
        self.build_id = '01' * 20
        self.note = struct.pack('<III', 4, 20, 3) + b'GNU\0' + bytes.fromhex(self.build_id)
        self.strings = b'\0actual_export\0hidden_caller\0'
        self.symbols = struct.pack('<IBBHQQ', 1, 18, 0, 1, 100, 20) + struct.pack('<IBBHQQ', 15, 2, 0, 1, 200, 30)
        self.exported = [{'name': 'actual_export', 'value': 100, 'size': 20}]

    def parse(self): return qa.parse_symbols(self.symbols, self.strings, self.note, self.build_id, self.exported)

    def test_matching_build_id_and_all_actual_exports_are_required(self):
        self.assertEqual(self.parse(), self.exported + [{'name': 'hidden_caller', 'value': 200, 'size': 30}])
        self.build_id = '02' * 20
        with self.assertRaisesRegex(AssertionError, 'actual GNU build ID'): self.parse()

    def test_changed_native_export_extent_rejects_debug_data(self):
        self.exported[0]['size'] = 21
        with self.assertRaisesRegex(AssertionError, 'actual binary exports'): self.parse()

    def test_truncated_sections_notes_and_invalid_string_offsets_are_rejected(self):
        for kind in ('symbols', 'note', 'strings'):
            original = getattr(self, kind); setattr(self, kind, original[:-1])
            with self.assertRaises(AssertionError): self.parse()
            setattr(self, kind, original)

    def launchpad(self, publications, urls):
        api = 'https://api.launchpad.net/devel/ubuntu/'
        version = '4:25.8.7-0ubuntu0.25.10.1~bpo24.04.1'
        filename = 'libreoffice-writer-dbgsym_' + version.split(':', 1)[1] + '_amd64.ddeb'

        def curl(args, **options):
            url = args[-1]
            if 'ws.op=getPublishedSources' in url: value = {'entries': publications}
            elif 'ws.op=getPackageUploads' in url or 'ws.op=getBuilds' in url: value = {'entries': []}
            elif 'ws.op=binaryFileUrls' in url: value = urls
            else: self.fail('Unexpected public request: ' + url)
            Path(args[args.index('--output') + 1]).write_text(json.dumps(value))
            return SimpleNamespace(returncode=0, stdout='', stderr='')

        with tempfile.TemporaryDirectory() as folder, patch.object(qa.subprocess, 'run', side_effect=curl):
            record = {}; selected = qa.launchpad_url(version, filename, Path(folder), record)
        return selected, record

    def test_absent_uploads_cannot_construct_a_guessed_download_url(self):
        selected, record = self.launchpad([], [])
        self.assertIsNone(selected); self.assertEqual(len(record['launchpadRequests']), 2)

    def test_only_observed_official_exact_version_downloads_are_selected(self):
        api = 'https://api.launchpad.net/devel/ubuntu/'
        version = '4:25.8.7-0ubuntu0.25.10.1~bpo24.04.1'
        pub = {'source_package_name': 'libreoffice', 'source_package_version': version,
               'distro_series_link': api + 'noble', 'self_link': api + '+sourcepub/123'}
        filename = 'libreoffice-writer-dbgsym_' + version.split(':', 1)[1] + '_amd64.ddeb'
        invalid = ['https://unverified.example/' + filename, 'https://launchpad.net/writer_26.2_amd64.ddeb']
        self.assertIsNone(self.launchpad([pub], invalid)[0])
        actual = 'https://launchpad.net/ubuntu/+archive/primary/+files/' + filename
        self.assertEqual(self.launchpad([pub], invalid + [actual])[0], actual)

    def test_source_publication_version_must_match_the_actual_engine(self):
        api = 'https://api.launchpad.net/devel/ubuntu/'
        pub = {'source_package_name': 'libreoffice', 'source_package_version': 'different',
               'distro_series_link': api + 'noble', 'self_link': api + '+sourcepub/123'}
        with self.assertRaises(AssertionError): self.launchpad([pub], [])


if __name__ == '__main__': unittest.main()
