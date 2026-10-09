"""Bounded official build-ID symbol lookup; never install or modify native engine files."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
from html.parser import HTMLParser
import importlib.util
import json
import os
from pathlib import Path
import re
import struct
import subprocess
import tarfile
import tempfile
from urllib.parse import urljoin, urlencode, urlparse


def module(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name('docx-next-' + name + '.py'))
    result = importlib.util.module_from_spec(spec); spec.loader.exec_module(result); return result


qa = module('native-stack-qa')
SECTIONS = {'.symtab': 'symtab.bin', '.strtab': 'strtab.bin', '.note.gnu.build-id': 'build-id-note.bin'}


def validate_package_pin(pin, version, url, manifest):
    assert pin['package'] == 'libreoffice-writer-dbgsym' and pin['version'] == version and pin['architecture'] == 'amd64', 'Changed debug package identity'
    filename = 'libreoffice-writer-dbgsym_' + version.split(':', 1)[-1] + '_amd64.ddeb'
    assert pin['publicationUrl'] == url, 'Debug package was not selected from the observed publication'
    for link, host in ((pin['publicationUrl'], 'launchpad.net'), (pin['fileUrl'], 'launchpadlibrarian.net')):
        parsed = urlparse(link)
        assert parsed.scheme == 'https' and parsed.hostname == host and not parsed.username and not parsed.password
        assert parsed.path.rsplit('/', 1)[-1] == filename, 'Changed pinned debug download basename'
    assert type(pin['size']) is int and 0 < pin['size'] <= 536870912, 'Invalid bounded debug package size'
    assert isinstance(pin['sha256'], str) and re.fullmatch('[0-9a-f]{64}', pin['sha256']), 'Invalid debug package digest'
    assert set(pin['libraries']) == {'libswlo.so', 'libsw_writerfilterlo.so'}, 'Changed pinned debug member set'
    for name, row in pin['libraries'].items():
        assert row['buildId'] == manifest['libraries'][name]['buildId'], 'Changed pinned debug build ID'
        assert type(row['memberSize']) is int and 0 < row['memberSize'] <= 536870912, 'Invalid bounded debug member size'
    return pin['size']


def verify_pinned_package(path, pin):
    assert path.stat().st_size == pin['size'], 'Changed pinned debug package length'
    with path.open('rb') as stream: digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    assert digest == pin['sha256'], 'Changed pinned debug package bytes'
    fields = subprocess.check_output(['dpkg-deb', '-f', str(path), 'Package', 'Version', 'Architecture'], text=True)
    expected = '\n'.join(key + ': ' + pin[key.lower()] for key in ('Package', 'Version', 'Architecture'))
    assert fields.strip() == expected, 'Changed pinned debug package metadata'
    return digest


def resolution_contract(report):
    for key in ('newNativeExecutions', 'engineFilesModified', 'originalPackagesModified'):
        assert type(report[key]) is int and report[key] == 0, 'Changed read-only symbol scope'
    assert report['productionAcceptance'] == 'blocked' and report['nativeGeometryAcceptance'] == 'unchanged fail'
    fallback = report['officialArchiveFallback']
    assert fallback and fallback['packagePinSha256'], 'Missing exact official debug package provenance'
    libraries = {}
    for name, row in report['libraries'].items():
        assert row['status'] == 'verified GNU build ID and exact exported extents', 'Matching debug symbols remain unavailable'
        for frame in row['resolvedFrames']:
            offset = frame['returnOffset']
            assert type(offset) is int and offset > 0 and frame['functions'], 'Unresolved original native frame'
            for function in frame['functions']:
                assert type(function['value']) is int and type(function['size']) is int and function['size'] > 0
                assert function['value'] <= offset - 1 < function['value'] + function['size'], 'Nearest symbol is not a containing function'
        libraries[name] = {'binaryIdentity': row['binaryIdentity'], 'status': row['status'], 'resolvedFrames': row['resolvedFrames'],
                           'sections': {section: {key: value[key] for key in ('archiveMember', 'elfSection', 'size', 'sha256')}
                                        for section, value in row['sections'].items()}}
    assert set(libraries) == {'libswlo.so', 'libsw_writerfilterlo.so'}
    return {'stackMeasurementSha256': report['stackMeasurementSha256'],
            'package': {key: fallback[key] for key in ('packagePinSha256', 'packageUrl', 'packageSize', 'packageSha256')},
            'libraries': libraries, 'newNativeExecutions': 0, 'engineFilesModified': 0, 'originalPackagesModified': 0,
            'productionAcceptance': 'blocked', 'nativeGeometryAcceptance': 'unchanged fail'}


def compare_resolution(expected, report):
    assert resolution_contract(report) == expected, 'Changed exact original native caller resolution'


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


def launchpad_url(version, filename, folder, record, metadata_root=None):
    api = 'https://api.launchpad.net/devel/ubuntu/'
    queries = [api + '+archive/primary?' + urlencode({'ws.op': 'getPublishedSources', 'source_name': 'libreoffice',
                'version': version, 'exact_match': 'true', 'distro_series': api + 'noble'}),
               api + 'noble?' + urlencode({'ws.op': 'getPackageUploads', 'name': 'libreoffice', 'version': version,
                'exact_match': 'true', 'pocket': 'Backports', 'archive': api + '+archive/primary'})]
    requests = []
    if metadata_root is not None: metadata_root.mkdir(parents=True, exist_ok=True)

    def get(url):
        target = (metadata_root or folder) / ('metadata-' + hashlib.sha256(url.encode()).hexdigest())
        process = subprocess.run(['curl', '--fail', '--silent', '--show-error', '--location', '--connect-timeout', '6', '--max-time', '15',
                                  '--max-filesize', '8388608', '--output', str(target), url], capture_output=True, text=True, timeout=20)
        row = {'url': url, 'curlExitCode': process.returncode}; value = None
        if process.returncode == 0:
            data = target.read_bytes(); assert len(data) <= 8388608
            row['sha256'] = hashlib.sha256(data).hexdigest()
            if metadata_root is not None: row['metadataPath'] = 'native-symbols/launchpad/' + target.name
            if url.startswith(api): value = json.loads(data)
            else: value = data.decode()
        elif target.exists(): target.unlink()
        requests.append(row); return value

    def official_api(url):
        assert isinstance(url, str) and url.startswith(api), 'Unexpected public Launchpad API link'
        return url

    def selected(url):
        parsed = urlparse(url)
        return parsed.scheme == 'https' and parsed.hostname in ('launchpad.net', 'launchpadlibrarian.net', 'api.launchpad.net') and parsed.path.rsplit('/', 1)[-1] == filename

    with ThreadPoolExecutor(max_workers=2) as pool: publications, uploads = list(pool.map(get, queries))
    next_urls = []; build_urls = []
    if publications is not None:
        assert isinstance(publications, dict) and len(publications.get('entries', [])) <= 4 and not publications.get('next_collection_link'), 'Unexpected pinned source publication coverage'
        for entry in publications.get('entries', []):
            assert entry['source_package_name'] == 'libreoffice' and entry['source_package_version'] == version and entry['distro_series_link'] == api + 'noble'
            link = official_api(entry['self_link']); next_urls.append(link + '?ws.op=binaryFileUrls'); build_urls.append(link + '?ws.op=getBuilds')
    if uploads is not None:
        assert isinstance(uploads, dict) and len(uploads.get('entries', [])) <= 12 and not uploads.get('next_collection_link'), 'Unexpected pinned upload coverage'
        for entry in uploads.get('entries', []):
            assert entry['package_name'] == 'libreoffice' and entry['package_version'] == version
            assert entry['distroseries_link'] == api + 'noble' and entry['archive_link'] == api + '+archive/primary' and entry['pocket'] == 'Backports'
            link = official_api(entry['self_link'])
            next_urls.extend(link + '?ws.op=' + operation for operation in ('binaryFileUrls', 'customFileUrls'))
    record['launchpadRequests'] = requests
    with ThreadPoolExecutor(max_workers=8) as pool: files = list(pool.map(get, next_urls))
    candidates = sorted({url for value in files if isinstance(value, list) for url in value if isinstance(url, str) and selected(url)})
    if candidates: return candidates[0]
    with ThreadPoolExecutor(max_workers=4) as pool: builds = list(pool.map(get, build_urls))
    pages = []
    for collection in builds:
        if not isinstance(collection, dict): continue
        for build in collection.get('entries', []):
            if build.get('arch_tag') != 'amd64': continue
            assert build['source_package_name'] == 'libreoffice' and build['source_package_version'] == version
            assert build['distro_series_link'] == api + 'noble' and build['archive_link'] == api + '+archive/primary' and build['pocket'] == 'Backports'
            page = build['web_link']; parsed = urlparse(page)
            assert parsed.scheme == 'https' and parsed.hostname == 'launchpad.net'
            pages.append(page)
    assert len(set(pages)) <= 4

    class FileLinks(HTMLParser):
        def __init__(self, page): super().__init__(); self.page = page; self.urls = []
        def handle_starttag(self, tag, attrs):
            href = dict(attrs).get('href') if tag == 'a' else None
            if href:
                url = urljoin(self.page, href)
                if selected(url): self.urls.append(url)

    for page in sorted(set(pages)):
        content = get(page)
        if content is None: continue
        links = FileLinks(page); links.feed(content); candidates.extend(links.urls)
    return sorted(set(candidates))[0] if candidates else None


def archive_fallback(root, manifest, result, repository, cached_package=None):
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
        if links.matches: url = urljoin(base, links.matches[0])
        else:
            record['directoryStatus'] = 'exact pinned debug package absent from official directory'
            url = launchpad_url(version, filename, folder, record, root / 'native-symbols/launchpad')
            if url is None:
                record['status'] = 'exact pinned debug package unavailable from directory and original publications/uploads/builds'; return record
        record['packageUrl'] = url
        pin_path = repository / 'docs/docx-next/stable-native-debug-package.json'
        pin = json.loads(pin_path.read_text()) if pin_path.is_file() else None
        limit = validate_package_pin(pin, version, url, manifest) if pin else 268435456
        record['packageDownloadLimitBytes'] = limit
        if pin: record['packagePinSha256'] = hashlib.sha256(pin_path.read_bytes()).hexdigest()
        package = folder / 'writer.ddeb'
        if cached_package is not None:
            assert pin is not None, 'A local debug package requires the exact official package pin'
            package = Path(cached_package)
            record['packageSource'] = 'read-only local cache verified against exact official package pin'
        else:
            # The pinned file URL is the already observed official publication redirect,
            # not a constructed package URL. Publication selection and exact bytes remain required.
            download_url = pin['fileUrl'] if pin else url
            record['packageDownloadUrl'] = download_url
            process = subprocess.run(['curl', '--fail', '--silent', '--show-error', '--location', '--connect-timeout', '8', '--max-time', '180',
                                      '--max-filesize', str(limit), '--output', str(package), '--write-out', '%{url_effective}', download_url],
                                     capture_output=True, text=True, timeout=185)
            record['packageCurlExitCode'] = process.returncode
            if process.returncode: return record
            if pin: assert process.stdout.strip() == pin['fileUrl'], 'Changed official debug package redirect'
            record['packageSource'] = 'observed official publication download'
        assert package.stat().st_size <= limit
        if pin: package_digest = verify_pinned_package(package, pin)
        else:
            with package.open('rb') as stream: package_digest = hashlib.file_digest(stream, 'sha256').hexdigest()
        record.update(packageSize=package.stat().st_size, packageSha256=package_digest)
        expected = {'usr/lib/debug/.build-id/' + manifest['libraries'][name]['buildId'][:2] + '/' + manifest['libraries'][name]['buildId'][2:] + '.debug': name
                    for name, row in result.items() if not all(s['curlExitCode'] == 0 for s in row['sections'].values())}
        process = subprocess.Popen(['dpkg-deb', '--fsys-tarfile', str(package)], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        extracted = set()
        try:
            with tarfile.open(fileobj=process.stdout, mode='r|') as archive:
                for member in archive:
                    path = member.name.removeprefix('./')
                    if path not in expected: continue
                    assert member.isfile() and 0 < member.size <= 536870912, 'Unexpected debug member'
                    assert path not in extracted, 'Duplicate debug member'
                    if pin: assert member.size == pin['libraries'][expected[path]]['memberSize'], 'Changed pinned debug member length'
                    extracted.add(path)
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
            if pin: assert extracted == set(expected), 'Missing pinned debug member'
        finally:
            if process.poll() is None: process.kill(); process.communicate()
        record['status'] = 'read-only debug sections extracted; exact build-ID/export verification still required'
    return record


def audit(root, engine, cached_package=None, baseline=None):
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
        fallback = archive_fallback(root, manifest, result, repository, cached_package)
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
    if baseline is not None: compare_resolution(json.loads(baseline.read_text())['stable'], report)
    print(json.dumps({name: row['status'] for name, row in result.items()})); return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__); parser.add_argument('root', type=Path); parser.add_argument('--engine', type=Path)
    parser.add_argument('--cached-debug-package', type=Path, help='Read only an exact hash/version/build-ID-pinned official package; publication lookup remains required')
    parser.add_argument('--baseline', type=Path, help='Require the independently verified exact original caller-resolution contract')
    args = parser.parse_args(); audit(args.root, args.engine or Path(os.environ.get('DOCX_NEXT_LO_ROOT', args.root / 'setup/runtime')), args.cached_debug_package, args.baseline)
