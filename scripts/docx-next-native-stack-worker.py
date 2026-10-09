"""Capture native frames inside the pinned original canonical paragraph disposal callback."""
import argparse
import ctypes
import hashlib
import importlib.util
import json
import os
from pathlib import Path


def module(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name('docx-next-' + name + '.py'))
    result = importlib.util.module_from_spec(spec); spec.loader.exec_module(result); return result


elf = module('native-stack-elf')


def instrument(source, expected_sha256, capture):
    assert hashlib.sha256(source).hexdigest() == expected_sha256, 'Changed original callback worker'
    needle = "row = {'event': 'first-paragraph-disposing', 'value': None}"
    text = source.decode(); assert text.count(needle) == 1, 'Ambiguous original disposal callback'
    # Only the observer Python code is instrumented in memory; the pinned file and native engine stay intact.
    namespace = {'__file__': str(Path(__file__).with_name('docx-next-native-import-worker.py')),
                 '__name__': 'native_stack_original_observer', 'capture_native_stack': capture}
    exec(compile(text.replace(needle, needle[:-1] + ", 'nativeStack': capture_native_stack()}"), namespace['__file__'], 'exec'), namespace)
    return namespace['observe']


def observe(requests):
    repository = Path(__file__).resolve().parent.parent
    manifest = json.loads((repository / 'docs/docx-next/stable-native-stack.json').read_text())
    roots = {'engine': Path(os.environ['DOCX_NEXT_LO_ROOT']).resolve() / 'usr/lib/libreoffice/program',
             'binding': Path(os.environ['DOCX_NEXT_UNO_BINDING']).resolve() / 'usr/lib/libreoffice/program'}
    objects = {}
    for name, expected in manifest['libraries'].items():
        path = (roots[expected['scope']] / name).resolve(); image = elf.Elf(path)
        assert image.sha256 == expected['sha256'] and image.build_id == expected['buildId'], 'Changed pinned native stack binary'
        objects[path] = (name, image)
    libc = ctypes.CDLL(None)
    libc.backtrace.argtypes = [ctypes.POINTER(ctypes.c_void_p), ctypes.c_int]; libc.backtrace.restype = ctypes.c_int

    class DlInfo(ctypes.Structure):
        _fields_ = [('filename', ctypes.c_char_p), ('base', ctypes.c_void_p), ('symbol', ctypes.c_char_p), ('symbolAddress', ctypes.c_void_p)]

    libc.dladdr.argtypes = [ctypes.c_void_p, ctypes.POINTER(DlInfo)]; libc.dladdr.restype = ctypes.c_int
    diagnostics = []

    def capture():
        capacity = 128; addresses = (ctypes.c_void_p * capacity)()
        count = libc.backtrace(addresses, capacity)
        assert 0 < count < capacity, 'Empty or truncated native backtrace'
        frames = []; unselected = []
        for index in range(count):
            info = DlInfo(); assert libc.dladdr(addresses[index], ctypes.byref(info)) and info.filename and info.base, 'Unmapped native frame'
            path = Path(info.filename.decode()).resolve(); offset = addresses[index] - info.base
            if path in objects:
                name, image = objects[path]
                frames.append({'library': name, 'returnOffset': offset, 'exportedFunctions': image.resolve(offset)})
            else:
                assert path.name not in manifest['libraries'] and not any(path.is_relative_to(root) for root in roots.values()), 'Unpinned native engine/binding frame'
                unselected.append({'frameIndex': index, 'module': path.name, 'returnOffset': offset})
        diagnostics.append({'observedFrameCount': count, 'unselectedFrames': unselected})
        return {'capacity': capacity, 'truncated': False, 'nativeFrames': frames,
                'addressConvention': 'ELF-relative return address; exported extent contains return address minus one',
                'systemAndInterpreterFramesAccepted': False}

    original = repository / 'scripts/docx-next-native-import-worker.py'; source = original.read_bytes()
    measurement = instrument(source, manifest['originalWorkerSha256'], capture)(requests)
    stacks = []
    for case in measurement['cases']:
        for index, event in enumerate(case['events']):
            if 'nativeStack' in event:
                stacks.append({'fixture': case['fixture'], 'phase': case['phase'], 'eventIndex': index,
                               'canonicalTag': case['canonicalOwnerFieldIds'][0], 'stack': event.pop('nativeStack')})
    for path, (_, image) in objects.items():
        assert hashlib.sha256(path.read_bytes()).hexdigest() == image.sha256, 'Native stack binary changed during import'
    assert original.read_bytes() == source, 'Original observer file changed during import'
    return {'measurement': measurement, 'stacks': stacks, 'diagnostics': diagnostics}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__); parser.add_argument('request', type=Path)
    args = parser.parse_args(); print(json.dumps(observe(json.loads(args.request.read_text()))))
