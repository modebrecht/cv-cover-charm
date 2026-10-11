"""Guards for provenance rejection, completeness and strict geometry auditing."""
import tempfile
import unittest
from pathlib import Path
from native_chromium_print_benchmark import audit_manifest, geometry_delta


class BenchmarkAuditTest(unittest.TestCase):
    def test_rejects_pilot(self):
        with self.assertRaisesRegex(ValueError, "complete capture"):
            audit_manifest({"sourceSha": "a"*40, "pilot": True}, Path("."))

    def test_rejects_incomplete_catalog(self):
        with self.assertRaisesRegex(ValueError, "39 unique"):
            audit_manifest({"sourceSha": "a"*40, "rows": []}, Path("."))

    def test_rejects_mixed_sources_and_fixtures(self):
        for changed in ["sourceSha", "fixtureHash"]:
            rows = [{"id":str(i), "base":str(i), "sourceSha":"a"*40, "fixtureHash":"f",
                     "current":{"sourceSha":"a"*40,"fixtureHash":"f"},
                     "native":{"sourceSha":"a"*40,"fixtureHash":"f"}} for i in range(39)]
            rows[0]["native"][changed] = "different"
            with self.assertRaisesRegex(ValueError, "Mixed source SHA or stored fixture"):
                audit_manifest({"sourceSha":"a"*40,"rows":rows,"longs":[{},{}]},Path("."))

    def test_rejects_changed_artifacts(self):
        rows = [{"id":str(i), "base":str(i), "sourceSha":"a"*40, "fixtureHash":"f",
                 "current":{"sourceSha":"a"*40,"fixtureHash":"f","sha256":"wrong"},
                 "native":{"sourceSha":"a"*40,"fixtureHash":"f"}} for i in range(39)]
        with tempfile.TemporaryDirectory() as folder:
            Path(folder,"0--current.pdf").write_bytes(b"changed")
            with self.assertRaisesRegex(ValueError,"Changed PDF artifact"):
                audit_manifest({"sourceSha":"a"*40,"rows":rows,"longs":[{},{}]},Path(folder))

    def test_geometry_rejects_content_and_fonts(self):
        base = {"nodes":[{"text":"same","font":["Cabin"],"box":[0,0,1,1]}]}
        for key in ["text","font"]:
            changed = {"nodes":[{**base["nodes"][0],key:"different"}]}
            with self.assertRaisesRegex(ValueError,"text or computed font"):
                geometry_delta(base,changed)

    def test_geometry_measures_displacement(self):
        base = {"nodes":[{"text":"same","font":[],"box":[0,0,1,1]}]}
        changed = {"nodes":[{"text":"same","font":[],"box":[0,.1,1,1]}]}
        self.assertAlmostEqual(geometry_delta(base,changed),.1)


if __name__ == "__main__": unittest.main()
