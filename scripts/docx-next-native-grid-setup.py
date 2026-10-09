"""Add a hash-pinned Python UNO client beside the existing isolated stable Kit runtime."""
import argparse
import hashlib
import json
from pathlib import Path
import shlex
import subprocess
import sys
from urllib.request import urlopen


def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()


def setup(runtime, directory):
    assert sys.version_info[:2] == (3, 12), 'Pinned UNO binding requires Python 3.12'
    repository = Path(__file__).resolve().parent.parent
    runtime, directory = runtime.resolve(), directory.resolve()
    manifest_path = repository / 'docs/docx-next/stable-uno-binding.json'
    manifest = json.loads(manifest_path.read_text())
    record = json.loads((runtime / 'runtime-record.json').read_text())
    assert record['version']['ProductVersion'] + record['version']['ProductExtension'] == '25.8.7.3'
    assert record['packageManifestSha256'] == digest(repository / 'docs/docx-next/stable-lo-packages.json')
    assert record['fontManifestSha256'] == digest(repository / 'docs/docx-next/stable-sidebar-fonts.json')
    directory.mkdir(parents=True, exist_ok=True)
    archive = directory / 'python3-uno.deb'
    if not archive.is_file() or digest(archive) != manifest['sha256']:
        with urlopen(manifest['url'], timeout=30) as response: data = response.read(manifest['size'] + 1)
        assert len(data) == manifest['size'] and hashlib.sha256(data).hexdigest() == manifest['sha256'], 'Changed UNO package bytes'
        archive.write_bytes(data)
    assert archive.stat().st_size == manifest['size'] and digest(archive) == manifest['sha256']
    fields = subprocess.check_output(['dpkg-deb', '-f', str(archive), 'Package', 'Version', 'Architecture'], text=True)
    expected = '\n'.join(key + ': ' + manifest[key.lower()] for key in ('Package', 'Version', 'Architecture'))
    assert fields.strip() == expected, 'Mismatched UNO package metadata'
    root = directory / 'binding'
    assert not root.exists() or not any(root.iterdir()), 'Use a fresh UNO binding root'
    subprocess.run(['dpkg-deb', '-x', str(archive), str(root)], check=True, timeout=30)
    program = runtime / 'usr/lib/libreoffice/program'
    binding_program = root / 'usr/lib/libreoffice/program'
    for name, expected_hash in manifest['nativeFiles'].items():
        assert digest(binding_program / name) == expected_hash, 'Changed native UNO binary'
    uno = root / 'usr/lib/python3/dist-packages/uno.py'
    original = uno.read_text()
    # Ubuntu's client has two absolute installed paths. Relocate those paths only;
    # leave every native binary and the verified .deb archive unchanged.
    prefix = "import sys, os\nsys.path.append('/usr/lib/libreoffice/program')\nos.putenv('URE_BOOTSTRAP', 'vnd.sun.star.pathname:/usr/lib/libreoffice/program/fundamentalrc')\n"
    assert original.startswith(prefix), 'Changed packaged UNO bootstrap prefix'
    relocated = ('import sys, os\nsys.path.append(' + repr(str(program)) + ')\n'
                 "os.putenv('URE_BOOTSTRAP', " + repr('vnd.sun.star.pathname:' + str(program / 'fundamentalrc')) + ')\n')
    uno.write_text(relocated + original[len(prefix):])
    wrapper = directory / 'native-uno'
    # The interpreter supplies its own matching libpython; never install packages globally.
    python_libraries = str(Path(sys.executable).resolve().parent.parent / 'lib')
    libraries = ':'.join((str(program), str(runtime / 'usr/lib/x86_64-linux-gnu'), python_libraries))
    python_path = ':'.join((str(binding_program), str(uno.parent)))
    wrapper.write_text('#!/bin/sh\nexport LD_LIBRARY_PATH=' + shlex.quote(libraries) + '\n'
                       'export PYTHONPATH=' + shlex.quote(python_path) + '\n'
                       'export DOCX_NEXT_LO_ROOT=' + shlex.quote(str(runtime)) + '\n'
                       'export DOCX_NEXT_UNO_BINDING=' + shlex.quote(str(root)) + '\n'
                       'export SAL_USE_VCLPLUGIN=svp\nexport LOK_ALLOWLIST_LANGUAGES="de-DE en-US"\n'
                       'exec ' + shlex.quote(sys.executable) + ' ' + shlex.quote(str(repository / 'scripts/docx-next-native-grid-worker.py')) + ' "$@"\n')
    wrapper.chmod(0o755)
    result = {'interface': 'Public LibreOfficeKit initialization and public in-process UNO',
              'bindingManifestSha256': digest(manifest_path), 'packageSha256': manifest['sha256'],
              'nativeFiles': manifest['nativeFiles'], 'pythonMajorMinor': list(sys.version_info[:2]),
              'packagedUnoSourceSha256': hashlib.sha256(original.encode()).hexdigest(),
              'bootstrapRelocation': 'Two installed paths only; native binaries unchanged',
              'workerSha256': digest(repository / 'scripts/docx-next-native-grid-worker.py'), 'engine': record}
    (directory / 'binding-record.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('runtime', type=Path); parser.add_argument('directory', type=Path)
    args = parser.parse_args(); setup(args.runtime, args.directory)
