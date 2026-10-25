"""Template-only QA fonts; the existing Sidebar setup and native baselines remain unchanged."""
import argparse
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import shutil
from urllib.request import urlopen
import zipfile


def install_template_fonts(work, assets):
    repository = Path(__file__).resolve().parent.parent
    manifest_path = repository / 'docs/docx-next/template-qa-fonts.json'
    manifest = json.loads(manifest_path.read_text())
    cache = assets / 'template-fonts'
    cache.mkdir(parents=True, exist_ok=True)
    extra = manifest['additionalFiles']
    if not all((cache / f['file']).is_file() and
               hashlib.sha256((cache / f['file']).read_bytes()).hexdigest() == f['sha256']
               for f in extra):
        with urlopen(manifest['url'], timeout=30) as response:
            data = response.read(80_000_001)
        assert len(data) <= 80_000_000, 'Unexpected template font archive size'
        assert hashlib.sha256(data).hexdigest() == manifest['archiveSha256'], 'Template font archive mismatch'
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            for font in extra:
                matches = [n for n in archive.namelist() if n == 'NotoSerif/hinted/ttf/' + font['file']]
                assert len(matches) == 1, 'Missing/ambiguous template font ' + font['file']
                data = archive.read(matches[0])
                assert hashlib.sha256(data).hexdigest() == font['sha256'], 'Template font mismatch'
                (cache / font['file']).write_bytes(data)
    runtime = work / 'runtime'
    destination = runtime / 'usr/lib/libreoffice/share/fonts/truetype'
    for font in extra:
        shutil.copyfile(cache / font['file'], destination / font['file'])
    for font in manifest['files']:
        assert hashlib.sha256((destination / font['file']).read_bytes()).hexdigest() == font['sha256'], 'Runtime font mismatch'
    record_path = runtime / 'runtime-record.json'
    record = json.loads(record_path.read_text())
    record['baseFontManifestSha256'] = record['fontManifestSha256']
    record['fontManifestSha256'] = hashlib.sha256(manifest_path.read_bytes()).hexdigest()
    record['templateAdditionalFonts'] = extra
    record_path.write_text(json.dumps(record, indent=2) + '\n')
    print(json.dumps({'templateFontManifestSha256': record['fontManifestSha256'],
                      'verifiedFonts': len(manifest['files']), 'sidebarRuntime': 'unchanged'}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    parser.add_argument('--assets', required=True, type=Path)
    args = parser.parse_args()
    work, assets = args.directory.resolve(), args.assets.resolve()
    spec = importlib.util.spec_from_file_location('sidebar_setup', Path(__file__).with_name('docx-next-stable-sidebar-setup.py'))
    sidebar_setup = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(sidebar_setup)
    sidebar_setup.setup(work, assets)
    install_template_fonts(work, assets)
