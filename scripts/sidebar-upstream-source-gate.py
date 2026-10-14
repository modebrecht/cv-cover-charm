"""Prepare a pinned upstream regression packet; never certify a full Writer build."""
import argparse
import difflib
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile
from xml.etree import ElementTree as ET
from zipfile import ZIP_DEFLATED, ZipFile

REPO = Path(__file__).resolve().parent.parent
SOURCE_SHA = "30742500f2d3eb4366ac312fa33d3dcabdb3eba5"
SOURCE_FILE = "sw/source/core/table/swtable.cxx"
SOURCE_DIGEST = "699f8f4ddbfdc97207c66588afc3c4ac02859f801d69a132433b6c214055fe56"
TEST_FILE = "sw/qa/extras/ooxmlexport/ooxmlexport23.cxx"
HELPER_SCOPE = "Actual helper bodies compiled with scalar aliases; not swtable.cxx, Writer or CppUnit"
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
CASES = (
    ("app-body-right", "RightShort", "right"),
    ("app-body-both-long-right", "RightLong", "right"),
    ("app-body-photo-right", "RightPhoto", "right"),
    ("app-body-photo-free-mirrored-side", "RightFreePhoto", "right"),
    ("app-body-left", "LeftShortControl", "left"),
    ("app-body-both-long", "LeftLongControl", "left"),
)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def run(args, cwd=None):
    result = subprocess.run(args, cwd=cwd, capture_output=True, text=True, timeout=60)
    assert result.returncode == 0, result.stderr
    return result.stdout


def function(source, name):
    marker = "template<class T>\nT " + name + "(sal_uInt64 nA, sal_uInt64 nM, sal_uInt64 nD)\n{"
    assert source.count(marker) == 1, "Missing or ambiguous actual upstream helper"
    start = source.index(marker)
    end = source.index("\n}", start) + 2
    return source[start:end]


def compiled_helper_gate(base, patched, output):
    # These aliases allow compiling the exact helper bodies. They do not stand
    # in for Writer headers or make this a compilation of swtable.cxx.
    source = """#include <cassert>
#include <cstdint>
#include <iostream>
#include <random>
using sal_uInt64 = std::uint64_t;
namespace tools { using Long = std::int64_t; }
""" + function(base, "lcl_MulDiv64") + "\n" + function(patched, "lcl_MulDiv64Nearest") + """
int main(int argc, char**) {
    if (argc > 1) {
        return lcl_MulDiv64Nearest<tools::Long>(3, 7, 0) == 21 ? 0 : 1;
    }
    std::mt19937_64 random(20261014);
    std::uint64_t checks = 0;
    for (std::uint64_t i = 0; i < 100000; ++i) {
        const std::uint64_t denominator = 1 + random() % 100000;
        const std::uint64_t position = random() % (denominator + 1);
        const std::uint64_t width = 1 + random() % 65535;
        const unsigned __int128 product = static_cast<unsigned __int128>(position) * width;
        const auto expected = static_cast<tools::Long>((2 * product + denominator) / (2 * denominator));
        const auto actual = lcl_MulDiv64Nearest<tools::Long>(position, width, denominator);
        if (actual != expected || actual < 0 || actual > static_cast<tools::Long>(width)) return 2;
        ++checks;
    }
    for (std::uint64_t width = 1; width <= 1000; ++width) {
        if (lcl_MulDiv64Nearest<tools::Long>(0, width, 10000) != 0) return 3;
        if (lcl_MulDiv64Nearest<tools::Long>(10000, width, 10000) != static_cast<tools::Long>(width)) return 4;
        if (lcl_MulDiv64Nearest<tools::Long>(1, 2 * width + 1, 2) != static_cast<tools::Long>(width + 1)) return 5;
        checks += 3;
    }
    // Exact dynamically observed mirrored boundaries; old and new mappings
    // are both compiled, but no native layout or object lifetime is inferred.
    if (lcl_MulDiv64<tools::Long>(6752, 9638, 10000) != 6507) return 6;
    if (lcl_MulDiv64Nearest<tools::Long>(6752, 9638, 10000) != 6508) return 7;
    if (lcl_MulDiv64<tools::Long>(7106, 9638, 10000) != 6848) return 8;
    if (lcl_MulDiv64Nearest<tools::Long>(7106, 9638, 10000) != 6849) return 9;
    std::cout << checks + 4 << " checks\\n";
}
"""
    unit = output / "actual-helper.cpp"
    unit.write_text(source)
    compiler = run(["g++", "--version"]).splitlines()[0]
    common = ["g++", "-std=c++20", "-Wall", "-Wextra", "-Werror", "-fsanitize=undefined", str(unit)]
    debug = output / "actual-helper-debug"
    release = output / "actual-helper-release"
    run(common + ["-o", str(debug)])
    run(common + ["-DNDEBUG", "-o", str(release)])
    positive = run([str(debug)])
    assert positive.strip() == "103004 checks"
    assert run([str(release)]).strip() == positive.strip()
    zero = subprocess.run([str(debug), "zero"], cwd=output, capture_output=True, text=True, timeout=10)
    assert zero.returncode != 0 and "nD != 0" in zero.stderr, "Debug zero denominator must assert"
    run([str(release), "zero"])
    return {"compiler": compiler, "helperSourceSha256": sha(unit.read_bytes()),
            "debugBinarySha256": sha(debug.read_bytes()), "releaseBinarySha256": sha(release.read_bytes()),
            "positiveChecksPerBuild": 103004, "debugZeroDenominator": "EXPECTED ASSERT",
            "releaseZeroDenominatorFallback": "pass", "ubsan": "pass",
            "scope": HELPER_SCOPE,
            "fullSourceBuildExecuted": False, "productionAcceptance": "blocked"}


def fixture(source, case, expected):
    name, test_name, side = case
    path = source / (name + ".docx")
    data = path.read_bytes()
    assert sha(data) == expected["sourceSha256"], "Fixture bytes differ from actual accepted source"
    with ZipFile(path) as archive:
        assert archive.testzip() is None
        root = ET.fromstring(archive.read("word/document.xml"))
    tags = [tag.get(W + "val") for tag in root.iter(W + "tag")]
    assert None not in tags and len(tags) == len(set(tags)), "Duplicated or missing body identity"
    owners = [table for table in root.iter(W + "tbl")
              if (caption := table.find(W + "tblPr/" + W + "tblCaption")) is not None
              and caption.get(W + "val") == "cv.sidebar"]
    assert len(owners) == 1
    owner = owners[0]
    identities = [tag.get(W + "val") for tag in owner.iter(W + "tag")]
    assert identities[0] and all(re.fullmatch(r"[A-Za-z0-9_.:-]+", value) for value in identities)
    assert identities.count("cv.section.person.heading") == 1
    grid = [int(col.get(W + "w")) for col in owner.find(W + "tblGrid")]
    assert grid == ([6508, 341, 2789] if side == "right" else [2789, 340, 6509])
    assert sum(grid) == 9638
    return {"sourceFixture": name, "testName": "testSidebarGrid" + test_name,
            "upstreamFile": "sidebar-grid-" + name.removeprefix("app-body-") + ".docx",
            "sha256": sha(data), "bytes": len(data), "side": side, "sourceGrid": grid,
            "canonicalOwnerFieldIds": identities, "bodyFieldCount": len(tags),
            "sourceBytesModified": False, "nativeSourceBuildAcceptance": "UNVERIFIED"}


def regression_patch(base, rows):
    extra = "\n#include <array>\n#include <initializer_list>\n#include <rtl/strbuf.hxx>\n"
    source = base.replace("#include <swmodeltestbase.hxx>\n", "#include <swmodeltestbase.hxx>\n" + extra, 1)
    position = source.index("\n};", source.index("class Test :"))
    method = """

    void assertSidebarGridRoundTrip(const char* pFile, std::array<sal_Int32, 3> aGrid,
                                   std::initializer_list<const char*> aOwnerIds,
                                   int nBodyFields)
    {
        createSwDoc(pFile);
        const int nPages = getPages();
        const OString aOwner("//w:tbl[w:tr/w:tc//w:tag[@w:val='cv.section.person.heading']]");
        for (int nSave = 0; nSave < 2; ++nSave)
        {
            saveAndReload(u"Office Open XML Text"_ustr);
            CPPUNIT_ASSERT_EQUAL(nPages, getPages());
            xmlDocUniquePtr pXmlDoc = parseExport(u"word/document.xml"_ustr);
            assertXPath(pXmlDoc, aOwner, 1);
            assertXPath(pXmlDoc, aOwner + "/w:tblPr/w:tblW", "w", u"9638");
            assertXPath(pXmlDoc, aOwner + "/w:tblGrid/w:gridCol", 3);
            assertXPath(pXmlDoc, aOwner + "/w:tr", 1);
            assertXPath(pXmlDoc, aOwner + "//w:tag", static_cast<int>(aOwnerIds.size()));
            assertXPath(pXmlDoc, "//w:tag", nBodyFields);
            for (sal_Int32 nCol = 0; nCol < 3; ++nCol)
            {
                const OString aIndex = OString::number(nCol + 1);
                assertXPath(pXmlDoc, aOwner + "/w:tblGrid/w:gridCol[" + aIndex + "]", "w",
                            OUString::number(aGrid[nCol]));
                assertXPath(pXmlDoc, aOwner + "/w:tr/w:tc[" + aIndex + "]/w:tcPr/w:tcW", "w",
                            OUString::number(aGrid[nCol]));
            }
            int nField = 0;
            for (const char* pId : aOwnerIds)
            {
                OStringBuffer aPath(aOwner);
                aPath.append("//w:tag[@w:val='").append(pId).append("']");
                assertXPath(pXmlDoc, aPath.makeStringAndClear(), 1);
                assertXPath(pXmlDoc, "(" + aOwner + "//w:tag)[" + OString::number(++nField) + "]",
                            "val", OUString::createFromAscii(pId));
            }
        }
    }
"""
    source = source[:position] + method + source[position:]
    tests = []
    for row in rows:
        ids = ",\n        ".join(json.dumps(value) for value in row["canonicalOwnerFieldIds"])
        tests.append("CPPUNIT_TEST_FIXTURE(Test, " + row["testName"] + ")\n{\n"
                     "    assertSidebarGridRoundTrip(\"" + row["upstreamFile"] + "\", {"
                     + ", ".join(map(str, row["sourceGrid"])) + "},\n        {" + ids + "}, "
                     + str(row["bodyFieldCount"]) + ");\n}\n\n")
    source = source.replace("CPPUNIT_PLUGIN_IMPLEMENT();", "".join(tests) + "CPPUNIT_PLUGIN_IMPLEMENT();", 1)
    return "diff --git a/" + TEST_FILE + " b/" + TEST_FILE + "\n" + "".join(difflib.unified_diff(
        base.splitlines(keepends=True), source.splitlines(keepends=True),
        fromfile="a/" + TEST_FILE, tofile="b/" + TEST_FILE))


def validate_packet(directory):
    """Reject a changed fixture or an arithmetic proof relabeled as engine acceptance."""
    directory = Path(directory)
    report = json.loads((directory / "source-preflight.json").read_text())
    assert report["upstreamSourceSha"] == SOURCE_SHA
    assert report["sourceFileSha256"] == SOURCE_DIGEST
    for key in ("fullSourceBuildExecuted", "modifiedOfficeRuntimeDependency"):
        assert report[key] is False, "Prepared source packet cannot certify an engine build"
    for key in ("sourceCppUnitCompilation", "sourceCppUnitNativeExecution", "originalNativeControlLifetime", "microsoftWordAcceptance"):
        assert report[key] == "UNVERIFIED", "Unexecuted native gate must remain explicit"
    assert report["productionAcceptance"] == "blocked"
    gate = report["sourceHelperGate"]
    assert gate["scope"] == HELPER_SCOPE, "Arithmetic compilation cannot be relabeled as Writer acceptance"
    assert gate["fullSourceBuildExecuted"] is False and gate["productionAcceptance"] == "blocked"
    assert type(gate["positiveChecksPerBuild"]) is int and gate["positiveChecksPerBuild"] == 103004
    assert gate["debugZeroDenominator"] == "EXPECTED ASSERT" and gate["releaseZeroDenominatorFallback"] == "pass"
    assert type(report["preparedCases"]) is int and report["preparedCases"] == len(CASES)
    assert [row["sourceFixture"] for row in report["cases"]] == [row[0] for row in CASES]
    patch = (directory / "libreoffice-sidebar-grid-regression.patch").read_bytes()
    assert sha(patch) == report["regressionPatchSha256"], "Changed upstream test proposal"
    baseline = json.loads((REPO / "docs/qa/docx-sidebar-architecture-gate-13okt-evidence.json").read_text())
    expected = {row["fixture"]: row for row in baseline["freshNativeMatrix"]["rows"]}
    archive_path = directory / "libreoffice-sidebar-grid-fixtures.zip"
    assert sha(archive_path.read_bytes()) == report["fixtureArchiveSha256"]
    with ZipFile(archive_path) as archive:
        names = ["sw/qa/extras/ooxmlexport/data/" + row["upstreamFile"] for row in report["cases"]]
        assert archive.namelist() == names and len(set(names)) == len(CASES), "Incomplete or duplicated upstream fixtures"
        assert archive.testzip() is None
        with tempfile.TemporaryDirectory(prefix="sidebar-packet-verify-") as temporary:
            source = Path(temporary)
            for row, case, name in zip(report["cases"], CASES, names):
                data = archive.read(name)
                assert sha(data) == row["sha256"] == expected[case[0]]["sourceSha256"]
                assert row["sourceBytesModified"] is False
                assert row["nativeSourceBuildAcceptance"] == "UNVERIFIED"
                (source / (case[0] + ".docx")).write_bytes(data)
                assert fixture(source, case, expected[case[0]]) == row, "Changed complete field/geometry declaration"
                assert row["testName"].encode() in patch
    return {"preparedCases": len(CASES), "sourceBytesModified": False,
            "fullSourceBuildExecuted": False, "nativeAcceptance": "UNVERIFIED"}


def prepare(source, fixtures, output):
    source, fixtures, output = source.resolve(), fixtures.resolve(), output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    assert run(["git", "rev-parse", "HEAD"], source).strip() == SOURCE_SHA, "Wrong upstream source revision"
    base = subprocess.check_output(["git", "show", "HEAD:" + SOURCE_FILE], cwd=source).decode()
    assert sha(base.encode()) == SOURCE_DIGEST, "Wrong original upstream source bytes"
    patched = (source / SOURCE_FILE).read_text()
    changed = run(["git", "diff", "--name-only", "HEAD"], source).splitlines()
    assert changed == [SOURCE_FILE], "Source experiment must isolate the declared source file"
    with tempfile.TemporaryDirectory(prefix="sidebar-exact-source-") as directory:
        target = Path(directory) / SOURCE_FILE
        target.parent.mkdir(parents=True)
        target.write_text(base)
        proposal = REPO / "docs/docx-next/libreoffice-nearest-tabcols-proposal.patch"
        run(["git", "apply", str(proposal)], directory)
        assert patched == target.read_text(), "Source changes exceed the exact retained proposal"
    assert patched.count("nNewPos = lcl_MulDiv64Nearest<tools::Long>") == 1
    assert patched.count("nOldPos = lcl_MulDiv64Nearest<tools::Long>") == 1
    body = function(patched, "lcl_MulDiv64Nearest")
    assert function(base, "lcl_MulDiv64") == function(patched, "lcl_MulDiv64"), "Original shared helper changed"
    baseline = json.loads((REPO / "docs/qa/docx-sidebar-architecture-gate-13okt-evidence.json").read_text())
    expected = {row["fixture"]: row for row in baseline["freshNativeMatrix"]["rows"]}
    rows = [fixture(fixtures, case, expected[case[0]]) for case in CASES]
    test_base = subprocess.check_output(["git", "show", "HEAD:" + TEST_FILE], cwd=source).decode()
    patch = regression_patch(test_base, rows)
    (output / "libreoffice-sidebar-grid-regression.patch").write_text(patch)
    with ZipFile(output / "libreoffice-sidebar-grid-fixtures.zip", "w", compression=ZIP_DEFLATED) as archive:
        for row in rows:
            archive.writestr("sw/qa/extras/ooxmlexport/data/" + row["upstreamFile"],
                             (fixtures / (row["sourceFixture"] + ".docx")).read_bytes())
    # Verify patch application on the real source revision. Never execute the
    # original binary modification experiment or change the CV application.
    with tempfile.TemporaryDirectory(prefix="sidebar-source-patch-") as directory:
        target = Path(directory) / TEST_FILE
        target.parent.mkdir(parents=True)
        target.write_text(test_base)
        run(["git", "apply", "--check", str(output / "libreoffice-sidebar-grid-regression.patch")], directory)
    gate = compiled_helper_gate(base, patched, output)
    report = {"schemaVersion": 1, "upstreamSourceSha": SOURCE_SHA,
              "sourceFileSha256": SOURCE_DIGEST, "patchedSourceFileSha256": sha(patched.encode()),
              "nearestHelperSha256": sha(body.encode()), "testSourceBaseSha256": sha(test_base.encode()),
              "regressionPatchSha256": sha(patch.encode()), "preparedCases": len(rows), "cases": rows,
              "fixtureArchiveSha256": sha((output / "libreoffice-sidebar-grid-fixtures.zip").read_bytes()),
              "sourceHelperGate": gate, "sourceCppUnitCompilation": "UNVERIFIED",
              "sourceCppUnitNativeExecution": "UNVERIFIED", "fullSourceBuildExecuted": False,
              "expectedUnpatchedFailures": [r["testName"] for r in rows if r["side"] == "right"],
              "expectedUnpatchedPositiveControls": [r["testName"] for r in rows if r["side"] == "left"],
              "originalNativeControlLifetime": "UNVERIFIED", "microsoftWordAcceptance": "UNVERIFIED",
              "productionAcceptance": "blocked", "modifiedOfficeRuntimeDependency": False}
    (output / "source-preflight.json").write_text(json.dumps(report, indent=2) + "\n")
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--fixtures", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    report = prepare(args.source, args.fixtures, args.output)
    print(json.dumps({"preparedCases": report["preparedCases"], "sourceHelperGate": report["sourceHelperGate"],
                      "fullSourceBuildExecuted": False, "sourceCppUnitNativeExecution": "UNVERIFIED"}))
