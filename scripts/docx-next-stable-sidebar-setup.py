"""Fetch hash-pinned QA packages/fonts and build the existing isolated LibreOfficeKit adapter."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import subprocess
import sys
import tarfile
from urllib.request import urlopen


def setup(work):
    repository = Path(__file__).resolve().parent.parent
    work = work.resolve()
    work.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((repository / 'docs/docx-next/stable-lo-packages.json').read_text())
    font_file = repository / 'docs/docx-next/stable-sidebar-fonts.json'
    fonts = json.loads(font_file.read_text())
    archives, font_directory = work / 'archives', work / 'fonts'
    for directory in [archives, font_directory, work / 'apt-lists/partial', work / 'apt-cache/archives/partial']:
        directory.mkdir(parents=True, exist_ok=True)
    sources = work / 'snapshot.sources'
    sources.write_text('Types: deb\nURIs: https://snapshot.ubuntu.com/ubuntu/20260828T000000Z/\n'
                       'Suites: noble noble-updates noble-security noble-backports\n'
                       'Components: main universe\nSigned-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg\n'
                       'Check-Valid-Until: no\n')
    apt = ['apt-get', '-o', 'Dir::Etc::sourcelist=' + str(sources), '-o', 'Dir::Etc::sourceparts=-',
           '-o', 'Dir::State::lists=' + str(work / 'apt-lists'), '-o', 'Dir::Cache=' + str(work / 'apt-cache'),
           '-o', 'Debug::NoLocking=1', '-o', 'Acquire::Retries=1', '-o', 'Acquire::https::Timeout=30']
    subprocess.run(apt + ['update'], check=True, timeout=120)
    subprocess.run(apt + ['download'] + [package['package'] + '=' + package['version'] for package in manifest['packages']],
                   cwd=archives, check=True, timeout=150)
    with urlopen(fonts['url'], timeout=30) as response:
        data = response.read(5_000_001)
    assert len(data) <= 5_000_000, 'Unexpected font archive size'
    with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as archive:
        for font in fonts['files']:
            matches = [member for member in archive.getmembers() if member.isfile() and Path(member.name).name == font['file']]
            assert len(matches) == 1, 'Missing/ambiguous font ' + font['file']
            content = archive.extractfile(matches[0]).read()
            assert hashlib.sha256(content).hexdigest() == font['sha256'], 'Mismatched font ' + font['file']
            (font_directory / font['file']).write_bytes(content)
    subprocess.run([sys.executable, str(repository / 'scripts/docx-next-lo-kit-setup.py'),
                    '--archives', str(archives), '--root', str(work / 'runtime'), '--fonts', str(font_directory),
                    '--font-manifest', str(font_file)], check=True, timeout=90)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    args = parser.parse_args()
    setup(args.directory)
