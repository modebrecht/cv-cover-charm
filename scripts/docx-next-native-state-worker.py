"""Read original carrier importer state through canonical public callbacks; never change native code."""
import argparse, ctypes, hashlib, importlib.util, json, os, struct, sys
from pathlib import Path
REPO = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('request', type=Path)
parser.add_argument('--helper', type=Path, required=True)
args = parser.parse_args()
layout = json.loads((REPO / 'docs/docx-next/stable-native-state-layout.json').read_text())
fields = layout['fields']
spec = importlib.util.spec_from_file_location('stack', REPO / 'scripts/docx-next-native-stack-worker.py')
stack = importlib.util.module_from_spec(spec)
spec.loader.exec_module(stack)
manifest = json.loads((REPO / 'docs/docx-next/stable-native-stack.json').read_text())

class Frame(ctypes.Structure):
    _fields_ = [(name, ctypes.c_uint64) for name in ('ip', 'cfa', 'rbx', 'rbp', 'r12', 'r13', 'r14', 'r15')]
capture_library = ctypes.CDLL(str(args.helper.resolve()))
capture_library.capture.argtypes = [ctypes.POINTER(Frame), ctypes.c_size_t]
capture_library.capture.restype = ctypes.c_size_t

class DlInfo(ctypes.Structure):
    _fields_ = [('filename', ctypes.c_char_p), ('base', ctypes.c_void_p), ('symbol', ctypes.c_char_p), ('address', ctypes.c_void_p)]
libc = ctypes.CDLL(None)
libc.dladdr.argtypes = [ctypes.c_void_p, ctypes.POINTER(DlInfo)]
libc.dladdr.restype = ctypes.c_int
records = []
verified = set()

def read(address, length):
    assert 0 < length <= 4096
    assert type(address) is int and address > 0 and (type(length) is int)
    mappings = [line.split() for line in Path('/proc/self/maps').read_text().splitlines()]
    assert any(('r' in x[1] and int(x[0].split('-')[0], 16) <= address and (address + length <= int(x[0].split('-')[1], 16)) for x in mappings)), 'Unmapped bounded memory read'
    with open('/proc/self/mem', 'rb', buffering=0) as stream:
        stream.seek(address)
        data = stream.read(length)
        assert len(data) == length
        return data

def u64(address):
    return struct.unpack('<Q', read(address, 8))[0]

def capture_frames():
    frames = (Frame * 128)()
    count = capture_library.capture(frames, 128)
    assert 0 < count < 128
    rows = []
    for f in frames[:count]:
        info = DlInfo()
        if not libc.dladdr(f.ip, ctypes.byref(info)) or not info.filename:
            continue
        name = Path(info.filename.decode()).name
        if name not in manifest['libraries']:
            continue
        identity = manifest['libraries'][name]
        if name not in verified:
            assert hashlib.sha256(Path(info.filename.decode()).read_bytes()).hexdigest() == identity['sha256']
            verified.add(name)
        rows.append(dict(library=name, returnOffset=f.ip - info.base, registers={name: getattr(f, name) for name in ('rbx', 'rbp', 'r12', 'r13', 'r14', 'r15')}, cfa=f.cfa))
    return rows

def capture():
    rows = capture_frames()
    caller = [r for r in rows if r['library'] == 'libsw_writerfilterlo.so' and r['returnOffset'] == layout['frameSites']['disposalMapperReturnOffset']]
    assert len(caller) == 1
    mapper = caller[0]['registers']['rbx']
    impl = u64(mapper + fields['mapperImpl'])
    assert u64(impl + fields['implMapper']) == mapper, 'Mapper/implementation backlink mismatch'
    annotation = struct.unpack('<i', read(impl + fields['implAnnotationId'], 4))[0]
    stream = list(struct.unpack('<10Q', read(impl + fields['implStreamStack'], 80)))
    top = stream[6] - fields['substreamSize'] if stream[6] != stream[7] else u64(stream[9] - 8) + fields['substreamSize']
    dummy = read(top + fields['substreamDummyFlag'], 1)[0]
    assert dummy in (0, 1)
    record = {'dummyFlagDuringDisposal': bool(dummy), 'frames': rows, 'annotationIdDuringDisposal': annotation, 'mapper': mapper, 'impl': impl, 'streamStackWords': list(struct.unpack('<10Q', read(impl + fields['implStreamStack'], 80))), 'sdtStartStackWords': list(struct.unpack('<10Q', read(impl + fields['implSdtStarts'], 80)))}
    records.append(record)
    return record
source = (REPO / 'scripts/docx-next-native-import-worker.py').read_bytes()
progress = []

def capture_progress(event, value):
    if event == 'value':
        rows = capture_frames()
        frame = [x for x in rows if x['library'] == 'libsw_writerfilterlo.so' and x['returnOffset'] == layout['frameSites']['progressFactoryReturnOffset']]
        assert len(frame) == 1
        handler = frame[0]['registers']['rbx']
        stream = u64(handler + fields['handlerStream'])
        mapper = stream - fields['mapperStreamBase']
        impl = u64(mapper + fields['mapperImpl'])
        assert u64(impl + fields['implMapper']) == mapper
        streamStack = list(struct.unpack('<10Q', read(impl + fields['implStreamStack'], 80)))
        top = streamStack[6] - fields['substreamSize'] if streamStack[6] != streamStack[7] else u64(streamStack[9] - 8) + fields['substreamSize']
        flag = read(top + fields['substreamDummyFlag'], 1)[0]
        assert flag in (0, 1)
        sdt = list(struct.unpack('<10Q', read(impl + fields['implSdtStarts'], 80)))
        helper = u64(impl + fields['implSdtHelper'])
        assert u64(helper + fields['helperImpl']) == impl
        tagPointer = u64(helper + fields['helperTag'])
        tagLength = struct.unpack('<i', read(tagPointer + 4, 4))[0]
        assert 0 <= tagLength <= 200
        tag = read(tagPointer + 8, tagLength * 2).decode('utf-16le') if tagLength else ''
        start = None
        if sdt[2] != sdt[6]:
            entry = sdt[6] - 24 if sdt[6] != sdt[7] else u64(sdt[9] - 8) + 480
            start = {'isStartOfText': read(entry, 1)[0], 'rangePointer': u64(entry + 16)}
        progress.append({'value': value, 'frames': rows, 'mapper': mapper, 'impl': impl, 'dummyFlag': bool(flag), 'annotationId': struct.unpack('<i', read(impl + fields['implAnnotationId'], 4))[0], 'sdtStartStackWords': sdt, 'activeSdtTag': tag, 'cachedSdtStart': start})
assert hashlib.sha256(source).hexdigest() == manifest['originalWorkerSha256']
text = source.decode()
needle = "row = {'event': 'first-paragraph-disposing', 'value': None}"
assert text.count(needle) == 1
text = text.replace(needle, needle[:-1] + ", 'nativeStack': capture()}")
needle = 'events.append(row)\n                        nonlocal registration'
assert text.count(needle) == 1
text = text.replace(needle, 'events.append(row)\n                        capture_progress(event,value)\n                        nonlocal registration')
namespace = {'__file__': str(REPO / 'scripts/docx-next-native-import-worker.py'), '__name__': 'original_probe', 'capture': capture, 'capture_progress': capture_progress}
exec(compile(text, namespace['__file__'], 'exec'), namespace)
measurement = namespace['observe'](json.loads(args.request.read_text()))
for case in measurement['cases']:
    for event in case['events']:
        event.pop('nativeStack', None)
assert len(records) == 1 and progress and all((x['impl'] == records[0]['impl'] for x in progress))
normalized = []
for x in progress:
    assert x['cachedSdtStart'] is None, 'An active cached SDT start requires separate canonical range measurement'
    normalized.append(dict({key: x[key] for key in ('value', 'dummyFlag', 'annotationId', 'activeSdtTag')}, cachedSdtStartCount=0))
frames = [{key: x[key] for key in ('library', 'returnOffset')} for x in records[0]['frames']]
print(json.dumps({'measurement': measurement, 'progressStates': normalized, 'disposalState': {key: records[0][key] for key in ('annotationIdDuringDisposal', 'dummyFlagDuringDisposal')}, 'disposalFrames': frames, 'sameImplementationThroughout': True, 'cachedSdtStartObserved': False, 'helperSha256': hashlib.sha256(args.helper.read_bytes()).hexdigest()}))
