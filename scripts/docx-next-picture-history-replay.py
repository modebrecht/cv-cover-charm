"""Restore immutable October inputs; never substitute current renderer bytes into old evidence."""
import argparse
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parent.parent
FIXTURE = ROOT / 'tests/fixtures/docx-next/picture-history'
BASELINES = {
    'fixtures': 'sidebar-picture-identity-evidence.json',
    'frames': 'sidebar-picture-frame-evidence.json',
    'precision': 'sidebar-declared-crop-evidence.json',
    'windows': 'sidebar-declared-window-evidence.json',
    'sizes': 'sidebar-photo-size-evidence.json',
    'sized-rectangles': 'sidebar-sized-rectangle-evidence.json',
    'sized-shapes': 'sidebar-sized-shape-evidence.json',
}


def verified_sources(data, record, baseline_root):
    assert record['schemaVersion'] == 1, 'Unknown historical source version'
    assert hashlib.sha256(data).hexdigest() == record['archiveSha256'], 'Historical archive changed'
    assert set(record['matrices']) == set(BASELINES), 'Historical matrix inventory changed'
    with ZipFile(io.BytesIO(data)) as archive:
        names = archive.namelist()
        assert len(names) == len(set(names)), 'Duplicate historical archive paths'
        assert set(names) == set(record['files']), 'Historical file inventory changed'
        assert all(not PurePosixPath(n).is_absolute() and '..' not in PurePosixPath(n).parts
                   and '\\' not in n for n in names), 'Unsafe historical archive path'
        contents = {name: archive.read(name) for name in names}
    for name, content in contents.items():
        assert hashlib.sha256(content).hexdigest() == record['files'][name], 'Historical file changed: ' + name
    for matrix, baseline_file in BASELINES.items():
        manifest = json.loads(contents[matrix + '/picture-identity-manifest.json'])
        assert [row['name'] for row in manifest] == record['matrices'][matrix], 'Historical case order changed'
        assert len(manifest) == len({row['name'] for row in manifest}), 'Duplicate historical case'
        sources = {row['name']: row for row in manifest}
        for name, row in sources.items():
            package = contents[matrix + '/' + name + '.docx']
            assert hashlib.sha256(package).hexdigest() == row['docxSha256'], 'Historical package changed: ' + name
            photo = contents[matrix + '/' + row.get('canonicalPhotoFile', 'canonical-photo.png')]
            assert hashlib.sha256(photo).hexdigest() == row['normalizedSha256'], 'Historical photo changed: ' + name
        baseline = json.loads((baseline_root / baseline_file).read_text())
        for row in baseline['stable']['fixtures']:
            assert row['fixture'] in sources, 'Baseline case missing from historical sources'
            if row['execution'] == 'rendered':
                assert sources[row['fixture']]['docxSha256'] == row['sourceDocxSha256'], 'Historical native evidence source changed'
        if 'preparedSources' in baseline:
            keys = ['name', 'docxSha256', 'normalizedSha256', 'originalPixels', 'canonicalPhotoFile']
            assert [{key: row[key] for key in keys} for row in manifest] == baseline['preparedSources'], 'Historical prepared sources changed'
    return contents


def replay(destination):
    record = json.loads((FIXTURE / 'provenance.json').read_text())
    contents = verified_sources((FIXTURE / 'sources.zip').read_bytes(), record, ROOT / 'docs/docx-next')
    # Refuse to mix source versions or retain stale saved/rendered evidence.
    assert all(not (destination / matrix).exists() for matrix in BASELINES), 'Historical matrix destination already exists'
    for name, content in contents.items():
        target = destination / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
    (destination / 'historical-source-provenance.json').write_text(json.dumps(record, indent=2) + '\n')
    print(f'Restored {sum(map(len, record["matrices"].values()))} immutable historical picture inputs across seven matrices; all source/photo/archive hashes and existing native evidence verified.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    replay(parser.parse_args().directory)
