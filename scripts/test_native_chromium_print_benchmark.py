"""Guards for provenance rejection, completeness and strict geometry auditing."""
import tempfile
import unittest
from pathlib import Path
import fitz
from native_chromium_print_benchmark import audit_manifest, geometry_delta, audit_long_distribution
from run_native_chromium_benchmark import experiment_source


class BenchmarkAuditTest(unittest.TestCase):
    def test_detached_ci_requires_exact_experiment_ref_and_sha(self):
        environment = {"GITHUB_ACTIONS":"true","GITHUB_REF":"refs/heads/dev-native-chromium-print","GITHUB_SHA":"a"*40}
        self.assertTrue(experiment_source("","a"*40,environment))
        self.assertTrue(experiment_source("dev-native-chromium-print","a"*40,{}))
        self.assertFalse(experiment_source("dev","a"*40,environment))
        self.assertFalse(experiment_source("","b"*40,environment))
        self.assertFalse(experiment_source("","a"*40,{**environment,"GITHUB_REF":"refs/heads/dev"}))
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

    def test_long_marker_audit_reads_actual_pdf_pages(self):
        markers = [f"Briefmarker{i:02}" for i in range(1,15)] + [f"Praxisstation {i:02}" for i in range(1,19)] + ["Referenzmarker"]
        case = {"base":"long", "canonical":[{"text":"\n".join(markers)}, {"text":"Other page"}]}
        with tempfile.TemporaryDirectory() as folder:
            for path in ["current", "native"]:
                with fitz.open() as pdf:
                    pdf.new_page().insert_text((20,20), "\n".join(markers), fontsize=8)
                    pdf.new_page().insert_text((20,20), "Other page")
                    pdf.save(Path(folder, f"long--{path}.pdf"))
            self.assertEqual(set(audit_long_distribution(case,Path(folder)).values()), {1})
            Path(folder,"long--native.pdf").unlink()
            with fitz.open() as pdf:
                pdf.new_page().insert_text((20,20), "\n".join(markers[1:]), fontsize=8)
                pdf.new_page().insert_text((20,20), markers[0])
                pdf.save(Path(folder,"long--native.pdf"))
            with self.assertRaisesRegex(ValueError,"Changed marker distribution"):
                audit_long_distribution(case,Path(folder))


if __name__ == "__main__": unittest.main()
