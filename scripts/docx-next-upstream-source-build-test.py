"""Reject source build exits and incomplete native test output masquerading as engine acceptance."""
import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('build', Path(__file__).with_name('docx-next-upstream-source-build.py'))
qa = importlib.util.module_from_spec(spec); spec.loader.exec_module(qa)
NAMES = ['testSidebarGrid' + name for name in ('RightShort', 'RightLong', 'RightPhoto', 'RightFreePhoto', 'LeftShortControl', 'LeftLongControl')]
RUNS = '\n'.join('[_RUN_____] Test::' + name for name in NAMES)
NEGATIVE = RUNS + '\n' + '\n'.join('Test name: Test::' + name for name in NAMES[:4])
POSITIVE = RUNS + '\nOK (90 tests)\n'


class SourceBuildTests(unittest.TestCase):
    def test_actual_upstream_wrapper_form_uses_an_explicit_shell(self):
        with tempfile.TemporaryDirectory() as folder:
            script = Path(folder) / 'autogen.sh'
            # Exact executable wrapper form from pinned upstream autogen.sh.
            script.write_text(':\n    eval \'exec perl -S $0 ${1+"$@"}\'\n        if 0;\nuse strict;\nprint join("|", @ARGV), "\\n";\n')
            script.chmod(0o755)
            with self.assertRaises(OSError): subprocess.run([str(script)], check=True)
            receipt = qa.run(['/bin/sh', './autogen.sh', 'positive-control'], Path(folder), Path(folder) / 'run.log', 5)
            self.assertEqual(receipt['exitCode'], 0)
            self.assertEqual((Path(folder) / 'run.log').read_text(), 'positive-control\n')

    def test_unlaunchable_commands_retain_failed_exit_receipts(self):
        with tempfile.TemporaryDirectory() as folder:
            receipt = qa.run(['./absent'], Path(folder), Path(folder) / 'failed.log', 5)
            self.assertLess(receipt['exitCode'], 0)
            self.assertIn('FileNotFoundError', (Path(folder) / 'failed.log').read_text())

    def test_precise_baseline_counterexamples_and_positive_native_target(self):
        self.assertEqual(qa.classify_test(2, NEGATIVE, NAMES[:4], NAMES)['result'], 'EXPECTED FAIL')
        self.assertEqual(qa.classify_test(0, POSITIVE, [], NAMES)['result'], 'PASS')

    def test_compile_failures_timeouts_and_absent_tests_do_not_pass(self):
        for code, log in ((2, 'compiler failed'), (124, POSITIVE), (0, 'OK (84 tests)')):
            with self.assertRaises(AssertionError): qa.classify_test(code, log, [], NAMES)

    def test_names_in_text_without_native_execution_markers_do_not_pass(self):
        with self.assertRaises(AssertionError): qa.classify_test(0, '\n'.join(NAMES) + '\nOK (90 tests)', [], NAMES)

    def test_baseline_success_or_unrelated_failures_do_not_pass(self):
        for code, log in ((0, POSITIVE), (2, NEGATIVE + '\nTest name: Test::testOther\n'), (2, NEGATIVE.replace(NAMES[0], 'testOther'))):
            with self.assertRaises(AssertionError): qa.classify_test(code, log, NAMES[:4], NAMES)

    def test_duplicate_failures_and_incomplete_controls_do_not_pass(self):
        for log in (NEGATIVE + '\nTest name: Test::' + NAMES[0] + '\n', NEGATIVE.replace(NAMES[-1], '')):
            with self.assertRaises(AssertionError): qa.classify_test(2, log, NAMES[:4], NAMES)

    def test_candidate_failure_cannot_be_relabelled_as_expected_baseline(self):
        with self.assertRaises(AssertionError): qa.classify_test(2, NEGATIVE, [], NAMES)


if __name__ == '__main__':
    unittest.main()
