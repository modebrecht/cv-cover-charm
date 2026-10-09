"""Reject mismatched debug identities and plausible but false ELF symbol extents."""
import importlib.util
from pathlib import Path
import struct
import unittest


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


if __name__ == '__main__': unittest.main()
