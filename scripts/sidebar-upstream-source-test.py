"""Adversarial preparation checks; these never execute or certify native Writer."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from zipfile import ZIP_DEFLATED, ZipFile

spec = importlib.util.spec_from_file_location("source_gate", Path(__file__).with_name("sidebar-upstream-source-gate.py"))
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)
PACKET = gate.REPO / "docs/qa/upstream-sidebar-14okt"


class SourcePacketTests(unittest.TestCase):
    def modified(self, operation):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            for name in ("source-preflight.json", "libreoffice-sidebar-grid-regression.patch", "libreoffice-sidebar-grid-fixtures.zip"):
                (target / name).write_bytes((PACKET / name).read_bytes())
            report = json.loads((target / "source-preflight.json").read_text())
            operation(target, report)
            (target / "source-preflight.json").write_text(json.dumps(report))
            with self.assertRaises(AssertionError):
                gate.validate_packet(target)

    def test_exact_source_packet_with_all_six_real_source_packages(self):
        self.assertEqual(gate.validate_packet(PACKET), {"preparedCases": 6, "sourceBytesModified": False,
                                                      "fullSourceBuildExecuted": False, "nativeAcceptance": "UNVERIFIED"})

    def test_source_revision_and_original_file_cannot_change(self):
        for key in ("upstreamSourceSha", "sourceFileSha256"):
            self.modified(lambda p, r, key=key: r.update({key: "other"}))

    def test_source_helper_does_not_close_any_native_engine_or_word_gate(self):
        for key in ("fullSourceBuildExecuted", "modifiedOfficeRuntimeDependency"):
            for value in (True, 0):
                self.modified(lambda p, r, key=key, value=value: r.update({key: value}))
        for key in ("sourceCppUnitCompilation", "sourceCppUnitNativeExecution", "originalNativeControlLifetime", "microsoftWordAcceptance"):
            self.modified(lambda p, r, key=key: r.update({key: "PASS"}))
        self.modified(lambda p, r: r.update(productionAcceptance="accepted"))

    def test_helper_gate_cannot_be_relabelled_or_widened(self):
        changes = [("scope", "Full Writer engine"), ("fullSourceBuildExecuted", True),
                   ("productionAcceptance", "accepted"), ("positiveChecksPerBuild", True),
                   ("positiveChecksPerBuild", 103003), ("debugZeroDenominator", "pass"),
                   ("releaseZeroDenominatorFallback", "skipped")]
        for key, value in changes:
            self.modified(lambda p, r, key=key, value=value: r["sourceHelperGate"].update({key: value}))

    def test_missing_duplicate_or_reordered_case_is_rejected(self):
        for operation in (lambda rows: rows.pop(), lambda rows: rows.reverse(),
                          lambda rows: rows.__setitem__(1, copy.deepcopy(rows[0]))):
            self.modified(lambda p, r, operation=operation: operation(r["cases"]))
        self.modified(lambda p, r: r.update(preparedCases=6.0))

    def test_changed_patch_is_rejected(self):
        self.modified(lambda p, r: (p / "libreoffice-sidebar-grid-regression.patch").write_text("replaced"))

    def test_changed_grid_and_complete_field_inventory_are_rejected(self):
        self.modified(lambda p, r: r["cases"][0].update(sourceGrid=[6507, 341, 2790]))
        self.modified(lambda p, r: r["cases"][0]["canonicalOwnerFieldIds"].pop())
        self.modified(lambda p, r: r["cases"][0]["canonicalOwnerFieldIds"].reverse())
        self.modified(lambda p, r: r["cases"][0].update(bodyFieldCount=76))

    def test_changed_fixture_digest_cannot_be_attested_by_its_own_record(self):
        self.modified(lambda p, r: r["cases"][0].update(sha256="forged"))
        def changed(path, report):
            archive = path / "libreoffice-sidebar-grid-fixtures.zip"
            with ZipFile(archive) as source:
                rows = [(name, source.read(name)) for name in source.namelist()]
            rows[0] = (rows[0][0], rows[0][1] + b"changed")
            with ZipFile(archive, "w", compression=ZIP_DEFLATED) as target:
                for name, content in rows: target.writestr(name, content)
            report["fixtureArchiveSha256"] = gate.sha(archive.read_bytes())
            report["cases"][0]["sha256"] = gate.sha(rows[0][1])
        self.modified(changed)

    def test_original_source_and_unexecuted_native_labels_remain(self):
        self.modified(lambda p, r: r["cases"][0].update(sourceBytesModified=True))
        self.modified(lambda p, r: r["cases"][0].update(nativeSourceBuildAcceptance="PASS"))


if __name__ == "__main__":
    unittest.main()
