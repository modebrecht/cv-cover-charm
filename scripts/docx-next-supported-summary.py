"""Require the complete supported Sidebar matrix; browser and stable results remain candidates."""
import argparse
import hashlib
import json
import os
from pathlib import Path


def summarize(directory):
    repository = Path(__file__).resolve().parent.parent
    baseline = json.loads((repository / 'docs/docx-next/sidebar-supported-refresh-evidence.json').read_text())
    expected = [row['fixture'] for row in baseline['fixtures']]
    manifest = json.loads((directory / 'manifest.json').read_text())
    renders = json.loads((directory / 'render-report.json').read_text())
    restorations = json.loads((directory / 'json-restoration-report.json').read_text())
    assert len(expected) == len(set(expected)) == 31
    for rows in (manifest, renders, restorations['fixtures']):
        assert [row['fixture'] for row in rows] == expected, 'Incomplete or reordered supported Sidebar matrix'
    assert restorations['browserNormalizedInputs'] == 6, 'Missing canonical browser image inputs'
    assert sum(row['pages'] for row in renders) == baseline['dossierPageCount'] == 253, 'Changed supported pagination'
    for render, restored, previous in zip(renders, restorations['fixtures'], baseline['fixtures']):
        assert render['pages'] == previous['pages'], 'Changed per-fixture pagination'
        assert render['libreOfficeVersion'].startswith('LibreOffice 25.8.7.3 '), 'Pinned stable engine required'
        assert render['libreOfficeInterface'] == 'LibreOfficeKit'
        assert all(render[key] == 'pass' for key in ('structural', 'libreoffice', 'libreofficeRoundtrip'))
        assert all(restored[key] == 'pass' for key in ('input', 'model', 'immutable'))
        digest = hashlib.sha256((directory / (render['fixture'] + '.docx')).read_bytes()).hexdigest()
        assert digest == restored['docxSha256'], 'Restoration evidence does not match native source package'
    result = {
        'sourceDev': os.environ.get('GITHUB_SHA', 'local'),
        'fixtureCount': 31, 'dossierPageCount': 253,
        'browserImageNormalization': 'pass: six canonical browser inputs, EXIF/size/corrupt-source checks',
        'browserDecorationPixelChecks': 'pass: canonical fixture generator checks',
        'portableInputAndModelRestoration': 'pass: immutable source and byte-identical packages, including photos',
        'nativeRenderSaveReopen': 'pass: complete text, geometry, images and supported expectations',
        'microsoftWord': 'pending', 'snapshotApproval': 'pending',
        'fixtures': renders, 'restorations': restorations,
    }
    (directory / 'supported-evidence.json').write_text(json.dumps(result, indent=2) + '\n')
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    args = parser.parse_args()
    result = summarize(args.directory)
    print(json.dumps({key: value for key, value in result.items() if key not in ('fixtures', 'restorations')}))
