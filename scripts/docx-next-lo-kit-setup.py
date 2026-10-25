"""Build an isolated pinned Ubuntu 24.04 amd64 LibreOfficeKit QA runtime."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shlex
import shutil
import subprocess
import tempfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--archives', required=True, type=Path, help='Directory of the exact .deb packages in the manifest')
parser.add_argument('--root', required=True, type=Path, help='New, empty runtime directory; never installs globally')
parser.add_argument('--fonts', required=True, type=Path, help='Verified font assets recorded in stable-lo-fonts.json')
parser.add_argument('--font-manifest', type=Path, help='Alternative explicit QA font inventory; default retains the original full inventory')
args = parser.parse_args()
repository = Path(__file__).resolve().parent.parent
manifest_file = repository / 'docs/docx-next/stable-lo-packages.json'
manifest = json.loads(manifest_file.read_text())
root = args.root.resolve()
assert not root.exists() or not any(root.iterdir()), 'Use an empty runtime root'
archives = {hashlib.sha256(p.read_bytes()).hexdigest(): p for p in args.archives.glob('*.deb')}
selected = []
font_manifest_file = args.font_manifest or repository / 'docs/docx-next/stable-lo-fonts.json'
fonts = json.loads(font_manifest_file.read_text())
for font in fonts['files']:
    source = args.fonts / font['file']
    assert source.is_file() and hashlib.sha256(source.read_bytes()).hexdigest() == font['sha256'], f'Missing/mismatched QA font: {source}'
for package in manifest['packages']:
    archive = archives.get(package['sha256'])
    assert archive, f'Missing verified archive: {package["package"]}={package["version"]}'
    fields = subprocess.check_output(['dpkg-deb', '-f', str(archive), 'Package', 'Version', 'Architecture'], text=True)
    expected = '\n'.join(f'{key}: {package[key.lower()]}' for key in ('Package', 'Version', 'Architecture'))
    assert fields.strip() == expected, f'Package metadata mismatch: {archive}'
    selected.append(archive)
root.mkdir(parents=True, exist_ok=True)
for archive in selected:
    subprocess.run(['dpkg-deb', '-x', str(archive), str(root)], check=True)

# Debian absolute links/postinst data assume an installed /usr. Relocate only
# packaged paths and the documented generated main.xcd, without patching binaries.
for link in root.rglob('*'):
    if link.is_symlink() and link.readlink().is_absolute():
        target = root / str(link.readlink()).lstrip('/')
        if link.name == 'main.xcd':
            target = root / 'usr/lib/libreoffice/share/.registry/main.xcd'
        link.unlink()
        link.symlink_to(os.path.relpath(target, link.parent))
program = root / 'usr/lib/libreoffice/program'
font_directory = program.parent / 'share/fonts/truetype'
font_directory.mkdir(parents=True, exist_ok=True)
for font in fonts['files']:
    shutil.copyfile(args.fonts / font['file'], font_directory / font['file'])
fundamental = program / 'fundamentalrc'
lines = fundamental.read_text().splitlines()
assert sum(line.startswith('BRAND_BASE_DIR=') for line in lines) == 1
fundamental.write_text('\n'.join('BRAND_BASE_DIR=' + program.parent.as_uri() if line.startswith('BRAND_BASE_DIR=') else line for line in lines) + '\n')
binary = root / 'docx-next-lo-kit'
subprocess.run(['cc', '-std=c11', '-D_DEFAULT_SOURCE', '-Wall', '-Wextra', '-Werror', '-I', str(root / 'usr/include'),
                str(repository / 'scripts/docx-next-lo-kit.c'), '-ldl', '-o', str(binary)], check=True)
wrapper = root / 'lo-kit'
libraries = str(program) + ':' + str(root / 'usr/lib/x86_64-linux-gnu')
wrapper.write_text('#!/bin/sh\n'
                   'export DOCX_NEXT_LO_ROOT=' + shlex.quote(str(root)) + '\n'
                   'export LD_LIBRARY_PATH=' + shlex.quote(libraries) + '\n'
                   'export SAL_USE_VCLPLUGIN=svp\n'
                   'export LOK_ALLOWLIST_LANGUAGES="de-DE en-US"\n'
                   'exec ' + shlex.quote(str(binary)) + ' "$@"\n')
wrapper.chmod(0o755)
with tempfile.TemporaryDirectory(prefix='docx-next-lo-version-') as profile:
    version = subprocess.run([str(wrapper), '--version', Path(profile).as_uri()], capture_output=True, text=True, check=True, timeout=30)
assert 'error' not in version.stderr.lower() and 'warning' not in version.stderr.lower(), version.stderr
info = json.loads(version.stdout)
assert info['ProductName'] == 'LibreOffice' and info['ProductVersion'] + info['ProductExtension'] == '25.8.7.3', info
record = {'interface': 'LibreOfficeKit', 'version': info,
          'packageManifestSha256': hashlib.sha256(manifest_file.read_bytes()).hexdigest(),
          'fontManifestSha256': hashlib.sha256(font_manifest_file.read_bytes()).hexdigest(),
          'adapterSha256': hashlib.sha256((repository / 'scripts/docx-next-lo-kit.c').read_bytes()).hexdigest(),
          'compiler': subprocess.check_output(['cc', '--version'], text=True).splitlines()[0],
          'host': os.uname().sysname + ' ' + os.uname().machine,
          'packagesVerified': len(selected)}
(root / 'runtime-record.json').write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps(record, indent=2))
print('QA executable:', wrapper)
