"""QA-only public Narrow faces absent from modern Ubuntu font packages.

The archive and all four faces are hash-pinned; face hashes reuse the existing
authoritative QA font inventory. No system installation or DOCX embedding.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
import tarfile
from urllib.request import urlopen

URL = 'https://dev-www.libreoffice.org/src/liberation-narrow-fonts-ttf-1.07.6.tar.gz'
ARCHIVE_SHA256 = '8879d89b5ff7b506c9fc28efc31a5c0b954bbe9333e66e5283d27d20a8519ea3'


def setup(directory, archive=None):
    directory.mkdir(parents=True, exist_ok=True)
    data = archive.read_bytes() if archive else urlopen(URL, timeout=30).read(1_000_001)
    assert len(data) == 300832 and hashlib.sha256(data).hexdigest() == ARCHIVE_SHA256, 'Changed public Narrow archive'
    manifest = json.loads((Path(__file__).resolve().parent.parent / 'docs/docx-next/stable-lo-fonts.json').read_text())
    faces = [font for font in manifest['files'] if font['file'].startswith('LiberationSansNarrow-')]
    assert len(faces) == 4, 'Authoritative Narrow font inventory changed'
    with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as package:
        prefix = 'liberation-narrow-fonts-ttf-1.07.6/'
        for font in faces:
            content = package.extractfile(prefix + font['file']).read()
            assert hashlib.sha256(content).hexdigest() == font['sha256'], 'Changed public Narrow face'
            (directory / font['file']).write_bytes(content)
        for name in ['License.txt', 'COPYING']:
            (directory / name).write_bytes(package.extractfile(prefix + name).read())
    record = {'source': URL, 'archiveSha256': ARCHIVE_SHA256, 'faces': faces,
              'embedding': 'disabled', 'installation': 'isolated QA directory only'}
    (directory / 'font-record.json').write_text(json.dumps(record, indent=2) + '\n')
    print(json.dumps(record))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    parser.add_argument('--archive', type=Path)
    args = parser.parse_args()
    setup(args.directory, args.archive)
