"""Bounded official build-ID symbol lookup; never install or modify native engine files."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
from html.parser import HTMLParser
import importlib.util
import json
import os
from pathlib import Path
import struct
import subprocess
import tarfile
import tempfile
from urllib.parse import urljoin


def module(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name('docx-next-' + name + '.py'))
    result = importlib.util.module_from_spec(spec); spec.loader.exec_module(result); return result


qa = module('native-stack-qa')
SECTIONS = {'.symtab': 'symtab.bin', '.strtab': 'strtab.bin', '.note.gnu.build-id': 'build-id-note.bin'}


def parse_symbols(symbols, strings, note, expected_build_id, exported):
    cursor = 0; ids = []
    while cursor < len(note):
        assert cursor + 12 <= len(note), 'Truncated debug build-ID note'
        names, descs, kind = struct.unpack_from('<III', note, cursor); cursor += 12
        name = note[cursor:cursor + names]; cursor += (names + 3) & ~3
        desc = note[cursor:cursor + descs]; cursor += (descs + 3) & ~3
        assert cursor <= len(note), 'Truncated debug build-ID payload'
        if name == b'GNU\0' and kind == 3: ids.append(desc.hex())
    assert ids == [expected_build_id], 'Debug symbols do not match actual GNU build ID'
    assert symbols and len(symbols) % 24 == 0 and strings and strings[0] == 0, 'Invalid raw ELF64 symbol/string sections'
    functions = []
    for name, info, other, index, value, size in struct.iter_unpack('<IBBHQQ', symbols):
        if info & 15 != 2 or index == 0 or not size: continue
        assert name < len(strings); end = strings.find(b'\0', name); assert end >= 0
        functions.append({'name': strings[name:end].decode(), 'value': value, 'size': size})
    exact = {(row['name'], row['value'], row['size']) for row in functions}
    assert all((row['name'], row['value'], row['size']) in exact for row in exported), 'Debug symbol extents disagree with actual binary exports'
    return functions


def fetch_section(root, name, build_id, section):
    folder = root / 'native-symbols' / name; folder.mkdir(parents=True, exist_ok=True)
    target = folder / SECTIONS[section]
    url = 'https://debuginfod.ubuntu.com/buildid/' + build_id + '/section/' + section
    process = subprocess.run(['curl', '--fail', '--silent', '--show-error', '--location', '--connect-timeout', '8',
                              '--max-time', '20', '--max-filesize', '33554432', '--output', str(target), '--write-out', '%{http_code}', url],
                             capture_output=True, text=True, timeout=25)
    record = {'url': url, 'httpStatus': process.stdout.strip(), 'curlExitCode': process.returncode}
    if process.returncode == 0:
        data = target.read_bytes(); assert len(data) <= 33554432, 'Oversized debug section'
        record.update(size=len(data), sha256=hashlib.sha256(data).hexdigest(), path=str(target.relative_to(root)))
    elif target.exists(): target.unlink()
    return name, section, record


def debug_sections(path):
    data = path.read_bytes()
    assert data[:7] == b'\x7fELF\x02\x01\x01' and struct.unpack_from('<H', data, 18)[0] == 62
    header = struct.unpack_from('<16sHHIQQQIHHHHHH', data)
    offset, size, count, names_index = header[6], header[11], header[12], header[13]
    assert size == 64 and 0 < names_index < count and offset + size * count <= len(data)
    sections = [struct.unpack_from('<IIQQQQIIQQ', data, offset + i * size) for i in range(count)]
    names = sections[names_index]; assert names[4] + names[5] <= len(data)
    strings = data[names[4]:names[4] + names[5]]; result = {}
    for section in sections:
        assert section[0] < len(strings); end = strings.find(b'\0', section[0]); assert end >= 0
        name = strings[section[0]:end].decode()
        if name in SECTIONS:
            assert section[5] <= 33554432 and section[4] + section[5] <= len(data)
            result[name] = data[section[4]:section[4] + section[5]]
    assert set(result) == set(SECTIONS), 'Incomplete extracted debug ELF sections'
    return result


def archive_fallback(root, manifest, result, repository):
    # Select only an actually listed official binary for the pinned writer package version.
    packages = json.loads((repository / 'docs/docx-next/stable-lo-packages.json').read_text())['packages']
    version = next(row['version'] for row in packages if row['package'] == 'libreoffice-writer')
    filename = 'libreoffice-writer-dbgsym_' + version.split(':', 1)[-1] + '_amd64.ddeb'
    base = 'https://ddebs.ubuntu.com/pool/main/libr/libreoffice/'
    record = {'indexUrl': base, 'expectedPackageVersion': version, 'status': 'unavailable'}
    with tempfile.TemporaryDirectory(prefix='docx-next-debug-package-') as temporary:
        folder = Path(temporary); index = folder / 'index.html'
        process = subprocess.run(['curl', '--fail', '--silent', '--show-error', '--location', '--connect-timeout', '8', '--max-time', '20',
                                  '--max-filesize', '16777216', '--output', str(index), base], capture_output=True, text=True, timeout=25)
        record['indexCurlExitCode'] = process.returncode
        if process.returncode: return record
        content = index.read_bytes(); assert len(content) <= 16777216
        record['indexSha256'] = hashlib.sha256(content).hexdigest()

        class Links(HTMLParser):
            def __init__(self): super().__init__(); self.matches = []
            def handle_starttag(self, tag, attrs):
                if tag == 'a':
                    href = dict(attrs).get('href')
                    if href == filename: self.matches.append(href)

        links = Links(); links.feed(content.decode()); assert len(links.matches) <= 1
        if not links.matches:
            record['status'] = 'exact pinned debug package absent from official directory'; return record
        url = urljoin(base, links.matches[0]); record['packageUrl'] = url
        package = folder / 'writer.ddeb'
        process = subprocess.run(['curl', '--fail', '--silent', '--show-error', '--location', '--connect-timeout', '8', '--max-time', '90',
                                  '--max-filesize', '268435456', '--output', str(package), url], capture_output=True, text=True, timeout=95)
        record['packageCurlExitCode'] = process.returncode
        if process.returncode: return record
        assert package.stat().st_size <= 268435456
        record.update(packageSize=package.stat().st_size, packageSha256=hashlib.sha256(package.read_bytes()).hexdigest())
        expected = {'usr/lib/debug/.build-id/' + manifest['libraries'][name]['buildId'][:2] + '/' + manifest['libraries'][name]['buildId'][2:] + '.debug': name
                    for name, row in result.items() if not all(s['curlExitCode'] == 0 for s in row['sections'].values())}
        process = subprocess.Popen(['dpkg-deb', '--fsys-tarfile', str(package)], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        try:
            with tarfile.open(fileobj=process.stdout, mode='r|') as archive:
                for member in archive:
                    path = member.name.removeprefix('./')
                    if path not in expected: continue
                    assert member.isfile() and 0 < member.size <= 536870912, 'Unexpected debug member'
                    stream = archive.extractfile(member); assert stream
                    target = folder / (expected[path] + '.debug')
                    with target.open('wb') as destination:
                        while chunk := stream.read(1048576): destination.write(chunk)
                    assert target.stat().st_size == member.size
                    data = debug_sections(target); name = expected[path]
                    result[name]['sectionRequests'] = result[name]['sections']
                    result[name]['sections'] = {}
                    for section, contents in data.items():
                        saved = root / 'native-symbols' / name / SECTIONS[section]; saved.parent.mkdir(parents=True, exist_ok=True); saved.write_bytes(contents)
                        result[name]['sections'][section] = {'url': url, 'archiveMember': path, 'elfSection': section, 'curlExitCode': 0,
                                                            'path': str(saved.relative_to(root)), 'size': len(contents), 'sha256': hashlib.sha256(contents).hexdigest()}
                    target.unlink()
            _, stderr = process.communicate(timeout=20); assert process.returncode == 0, 'Failed read-only debug package extraction'
        finally:
            if process.poll() is None: process.kill(); process.communicate()
        record['status'] = 'read-only debug sections extracted; exact build-ID/export verification still required'
    return record


def audit(root, engine):
    repository = Path(__file__).resolve().parent.parent
    manifest = json.loads((repository / 'docs/docx-next/stable-native-stack.json').read_text())
    stack = json.loads((root / 'native-stack-report.json').read_text()); qa.validate_report(stack, manifest)
    libraries = ['libswlo.so', 'libsw_writerfilterlo.so']; images = {}
    for name in libraries:
        expected = manifest['libraries'][name]; image = qa.elf.Elf(engine / 'usr/lib/libreoffice/program' / name)
        assert image.sha256 == expected['sha256'] and image.build_id == expected['buildId'], 'Changed actual debug lookup binary'
        images[name] = image
    requests = [(root, name, manifest['libraries'][name]['buildId'], section) for name in libraries for section in SECTIONS]
    result = {name: {'binaryIdentity': manifest['libraries'][name], 'sections': {}} for name in libraries}
    with ThreadPoolExecutor(max_workers=6) as pool:
        for name, section, record in pool.map(lambda args: fetch_section(*args), requests): result[name]['sections'][section] = record
    fallback = None
    if any(not all(section['curlExitCode'] == 0 for section in row['sections'].values()) for row in result.values()):
        fallback = archive_fallback(root, manifest, result, repository)
    frames = stack['stacks'][0]['stack']['nativeFrames']
    for name, row in result.items():
        row['status'] = 'unavailable'; row['resolvedFrames'] = []
        if not all(section['curlExitCode'] == 0 for section in row['sections'].values()): continue
        try:
            data = {section: (root / record['path']).read_bytes() for section, record in row['sections'].items()}
            functions = parse_symbols(data['.symtab'], data['.strtab'], data['.note.gnu.build-id'], row['binaryIdentity']['buildId'], images[name].functions)
            for index, frame in enumerate(frames):
                if frame['library'] != name: continue
                offset = frame['returnOffset']; images[name].resolve(offset)
                matches = sorted([f for f in functions if f['value'] <= offset - 1 < f['value'] + f['size']], key=lambda f: (f['value'], f['size'], f['name']))
                names = [f['name'] for f in matches]
                if names:
                    process = subprocess.run(['c++filt'], input='\n'.join(names) + '\n', capture_output=True, text=True, timeout=5)
                    assert process.returncode == 0; decoded = process.stdout.splitlines(); assert len(decoded) == len(names)
                    matches = [dict(f, demangledName=decoded[i]) for i, f in enumerate(matches)]
                row['resolvedFrames'].append({'stackFrameIndex': index, 'returnOffset': offset, 'functions': matches})
            row['status'] = 'verified GNU build ID and exact exported extents'
        except (AssertionError, UnicodeError, struct.error) as error:
            row['status'] = 'rejected'; row['reason'] = str(error); row['resolvedFrames'] = []
    report = {'scope': 'Read-only official debug section lookup for actual original canonical disposal offsets',
              'stackMeasurementSha256': qa.digest(stack['stacks']), 'libraries': result, 'officialArchiveFallback': fallback,
              'newNativeExecutions': 0, 'engineFilesModified': 0, 'originalPackagesModified': 0,
              'productionAcceptance': 'blocked', 'nativeGeometryAcceptance': 'unchanged fail'}
    (root / 'native-symbol-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({name: row['status'] for name, row in result.items()})); return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__); parser.add_argument('root', type=Path); parser.add_argument('--engine', type=Path)
    args = parser.parse_args(); audit(args.root, args.engine or Path(os.environ.get('DOCX_NEXT_LO_ROOT', args.root / 'setup/runtime')))
