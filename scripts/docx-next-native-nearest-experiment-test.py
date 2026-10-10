"""Protect the experiment boundary: never overwrite or misidentify a stock runtime."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('experiment', Path(__file__).with_name('docx-next-native-nearest-experiment.py'))
experiment = importlib.util.module_from_spec(spec); spec.loader.exec_module(experiment)


class ExperimentBoundaryTest(unittest.TestCase):
    def test_unpinned_binary_is_rejected_without_modification(self):
        data = b'not the independently verified Writer binary'
        with self.assertRaisesRegex(AssertionError, 'Wrong stock'):
            experiment.patch_bytes(data)
        self.assertEqual(data, b'not the independently verified Writer binary')

    def test_same_directory_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder)
            with self.assertRaisesRegex(AssertionError, 'new directory'):
                experiment.prepare(path, path)

    def test_nested_candidate_is_rejected_before_any_copy(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder); candidate = path/'candidate'
            with self.assertRaisesRegex(AssertionError, 'independent'):
                experiment.prepare(path, candidate)
            self.assertFalse(candidate.exists())

    def test_existing_candidate_is_never_overwritten(self):
        with tempfile.TemporaryDirectory() as folder:
            stock = Path(folder)/'stock'; candidate = Path(folder)/'candidate'
            stock.mkdir(); candidate.mkdir(); sentinel = candidate/'retain.txt'
            sentinel.write_text('keep')
            with self.assertRaisesRegex(AssertionError, 'new directory'):
                experiment.prepare(stock, candidate)
            self.assertEqual(sentinel.read_text(), 'keep')

    def test_invalid_stock_leaves_no_candidate_and_keeps_source(self):
        with tempfile.TemporaryDirectory() as folder:
            stock = Path(folder)/'stock'; candidate = Path(folder)/'candidate'
            library = stock/experiment.LIBRARY
            library.parent.mkdir(parents=True); library.write_bytes(b'wrong build')
            with self.assertRaisesRegex(AssertionError, 'Wrong stock'):
                experiment.prepare(stock, candidate)
            self.assertFalse(candidate.exists())
            self.assertEqual(library.read_bytes(), b'wrong build')


if __name__ == '__main__':
    unittest.main()
