"""Reject mismatched debug identities and plausible but false ELF symbol extents."""
import importlib.util
import copy
import hashlib
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

    def launchpad(self, publications, urls, uploads=None, custom_urls=None, builds=None, page_content=None):
        api = 'https://api.launchpad.net/devel/ubuntu/'
        version = '4:25.8.7-0ubuntu0.25.10.1~bpo24.04.1'
        filename = 'libreoffice-writer-dbgsym_' + version.split(':', 1)[1] + '_amd64.ddeb'

        def curl(args, **options):
            url = args[-1]
            if 'ws.op=getPublishedSources' in url: value = {'entries': publications}
            elif 'ws.op=getPackageUploads' in url: value = {'entries': uploads or []}
            elif 'ws.op=getBuilds' in url: value = {'entries': builds or []}
            elif 'ws.op=binaryFileUrls' in url: value = urls
            elif 'ws.op=customFileUrls' in url: value = custom_urls or []
            elif page_content is not None and any(url == build['web_link'] for build in builds or []): value = page_content
            else: self.fail('Unexpected public request: ' + url)
            Path(args[args.index('--output') + 1]).write_text(value if isinstance(value, str) else json.dumps(value))
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

    def upload(self):
        api = 'https://api.launchpad.net/devel/ubuntu/'
        return {'package_name': 'libreoffice', 'package_version': '4:25.8.7-0ubuntu0.25.10.1~bpo24.04.1',
                'distroseries_link': api + 'noble', 'archive_link': api + '+archive/primary',
                'pocket': 'Backports', 'self_link': api + 'noble/+upload/123'}

    def test_documented_nonempty_upload_schema_resolves_observed_custom_files(self):
        upload = self.upload()
        filename = 'libreoffice-writer-dbgsym_' + upload['package_version'].split(':', 1)[1] + '_amd64.ddeb'
        actual = 'https://launchpadlibrarian.net/123/' + filename
        selected, record = self.launchpad([], [], [upload], [actual])
        self.assertEqual(selected, actual)
        self.assertEqual(len(record['launchpadRequests']), 4)
        self.assertTrue(any('ws.op=customFileUrls' in row['url'] for row in record['launchpadRequests']))

    def test_upload_package_version_series_archive_and_pocket_are_exact(self):
        for field in ('package_name', 'package_version', 'distroseries_link', 'archive_link', 'pocket'):
            upload = self.upload(); upload[field] = 'different'
            with self.subTest(field=field), self.assertRaises(AssertionError): self.launchpad([], [], [upload])

    def build(self):
        api = 'https://api.launchpad.net/devel/ubuntu/'
        version = self.upload()['package_version']
        return {'arch_tag': 'amd64', 'source_package_name': 'libreoffice', 'source_package_version': version,
                'distro_series_link': api + 'noble', 'archive_link': api + '+archive/primary', 'pocket': 'Backports',
                'web_link': 'https://launchpad.net/ubuntu/+source/libreoffice/' + version + '/+build/123'}

    def publication(self):
        api = 'https://api.launchpad.net/devel/ubuntu/'
        return {'source_package_name': 'libreoffice', 'source_package_version': self.upload()['package_version'],
                'distro_series_link': api + 'noble', 'self_link': api + '+sourcepub/123'}

    def test_documented_amd64_build_schema_selects_only_observed_file_links(self):
        filename = 'libreoffice-writer-dbgsym_' + self.upload()['package_version'].split(':', 1)[1] + '_amd64.ddeb'
        actual = 'https://launchpadlibrarian.net/123/' + filename
        content = '<a href="https://unverified.example/' + filename + '">wrong</a><a href="' + actual + '">actual</a>'
        self.assertEqual(self.launchpad([self.publication()], [], builds=[self.build()], page_content=content)[0], actual)
        self.assertIsNone(self.launchpad([self.publication()], [], builds=[self.build()], page_content='<p>No files</p>')[0])
        build = self.build(); build['arch_tag'] = 'arm64'
        self.assertIsNone(self.launchpad([self.publication()], [], builds=[build], page_content=content)[0])

    def test_build_source_version_series_archive_pocket_and_domain_are_exact(self):
        for field in ('source_package_name', 'source_package_version', 'distro_series_link', 'archive_link', 'pocket', 'web_link'):
            build = self.build(); build[field] = 'https://unverified.example/'
            with self.subTest(field=field), self.assertRaises(AssertionError): self.launchpad([self.publication()], [], builds=[build])

    def package_pin(self):
        repository = Path(__file__).resolve().parent.parent
        pin = json.loads((repository / 'docs/docx-next/stable-native-debug-package.json').read_text())
        manifest = json.loads((repository / 'docs/docx-next/stable-native-stack.json').read_text())
        return pin, manifest

    def validate_pin(self, pin, manifest):
        return qa.validate_package_pin(pin, self.upload()['package_version'], self.package_pin()[0]['publicationUrl'], manifest)

    def test_only_the_exact_observed_pinned_archive_can_exceed_default_transfer_budget(self):
        pin, manifest = self.package_pin()
        self.assertEqual(self.validate_pin(pin, manifest), 373517628)
        for field in ('package', 'version', 'architecture', 'publicationUrl', 'fileUrl'):
            changed = copy.deepcopy(pin); changed[field] = 'different'
            with self.subTest(field=field), self.assertRaises(AssertionError): self.validate_pin(changed, manifest)

    def test_pinned_byte_limits_and_digests_reject_unbounded_or_boolean_inputs(self):
        pin, manifest = self.package_pin()
        for size in (True, 0, -1, 536870913, 373517628.0):
            changed = copy.deepcopy(pin); changed['size'] = size
            with self.subTest(size=size), self.assertRaises(AssertionError): self.validate_pin(changed, manifest)
        for digest in ('f' * 63, 'g' * 64, True):
            changed = copy.deepcopy(pin); changed['sha256'] = digest
            with self.subTest(digest=digest), self.assertRaises(AssertionError): self.validate_pin(changed, manifest)

    def test_pinned_native_members_require_actual_build_ids_and_bounded_exact_sizes(self):
        pin, manifest = self.package_pin()
        for name in pin['libraries']:
            for field, value in (('buildId', 'ff' * 20), ('memberSize', True), ('memberSize', 536870913)):
                changed = copy.deepcopy(pin); changed['libraries'][name][field] = value
                with self.subTest(name=name, field=field), self.assertRaises(AssertionError): self.validate_pin(changed, manifest)
        changed = copy.deepcopy(pin); changed['libraries'].pop('libswlo.so')
        with self.assertRaises(AssertionError): self.validate_pin(changed, manifest)

    def test_local_cache_cannot_bypass_archive_bytes_length_or_debian_metadata(self):
        pin, _ = self.package_pin(); payload = b'actual test archive'
        pin.update(size=len(payload), sha256=hashlib.sha256(payload).hexdigest())
        fields = '\n'.join(key + ': ' + pin[key.lower()] for key in ('Package', 'Version', 'Architecture'))
        with tempfile.TemporaryDirectory() as temporary, patch.object(qa.subprocess, 'check_output', return_value=fields):
            path = Path(temporary) / 'writer.ddeb'; path.write_bytes(payload)
            self.assertEqual(qa.verify_pinned_package(path, pin), pin['sha256'])
            path.write_bytes(b'x' * len(payload))
            with self.assertRaisesRegex(AssertionError, 'package bytes'): qa.verify_pinned_package(path, pin)
            path.write_bytes(payload + b'x')
            with self.assertRaisesRegex(AssertionError, 'package length'): qa.verify_pinned_package(path, pin)
            path.write_bytes(payload)
            with patch.object(qa.subprocess, 'check_output', return_value=fields.replace('amd64', 'arm64')):
                with self.assertRaisesRegex(AssertionError, 'package metadata'): qa.verify_pinned_package(path, pin)

    def measured_resolution(self):
        repository = Path(__file__).resolve().parent.parent
        measured = json.loads((repository / 'docs/docx-next/stable-native-symbols.json').read_text())['local']
        report = copy.deepcopy(measured)
        report['officialArchiveFallback'] = report.pop('package')
        return measured, report

    def test_original_caller_resolution_requires_every_measured_frame_and_identity(self):
        expected, report = self.measured_resolution()
        qa.compare_resolution(expected, report)
        for mutation in ('missing_frame', 'changed_caller', 'changed_binary', 'changed_section', 'changed_package', 'changed_stack'):
            changed = copy.deepcopy(report); library = changed['libraries']['libsw_writerfilterlo.so']
            if mutation == 'missing_frame': library['resolvedFrames'].pop(0)
            elif mutation == 'changed_caller': library['resolvedFrames'][0]['functions'][0]['demangledName'] = 'plausible wrong caller'
            elif mutation == 'changed_binary': library['binaryIdentity']['buildId'] = 'ff' * 20
            elif mutation == 'changed_section': library['sections']['.symtab']['sha256'] = 'f' * 64
            elif mutation == 'changed_package': changed['officialArchiveFallback']['packageSha256'] = 'f' * 64
            else: changed['stackMeasurementSha256'] = 'f' * 64
            with self.subTest(mutation=mutation), self.assertRaises(AssertionError): qa.compare_resolution(expected, changed)

    def test_nearest_symbol_empty_resolution_and_changed_scope_cannot_pass(self):
        expected, report = self.measured_resolution()
        for mutation in ('nearest', 'empty', 'unavailable', 'execution', 'engine', 'package', 'production', 'geometry'):
            changed = copy.deepcopy(report); library = changed['libraries']['libsw_writerfilterlo.so']
            frame = library['resolvedFrames'][0]
            if mutation == 'nearest': frame['functions'][0]['value'] = frame['returnOffset']
            elif mutation == 'empty': frame['functions'] = []
            elif mutation == 'unavailable': library['status'] = 'unavailable'
            elif mutation == 'execution': changed['newNativeExecutions'] = 1
            elif mutation == 'engine': changed['engineFilesModified'] = 1
            elif mutation == 'package': changed['originalPackagesModified'] = 1
            elif mutation == 'production': changed['productionAcceptance'] = 'accepted'
            else: changed['nativeGeometryAcceptance'] = 'pass'
            with self.subTest(mutation=mutation), self.assertRaises(AssertionError): qa.compare_resolution(expected, changed)


if __name__ == '__main__': unittest.main()
