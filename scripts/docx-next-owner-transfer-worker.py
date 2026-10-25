"""Trace exact canonical control disposal during an unchanged guarded table transfer."""
import argparse
import ctypes
import hashlib
import json
from pathlib import Path
import sys

REPO = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('request', type=Path)
parser.add_argument('--helper', required=True, type=Path)
args = parser.parse_args()
manifest = json.loads((REPO / 'docs/docx-next/stable-native-stack.json').read_text())

class Frame(ctypes.Structure):
    _fields_ = [(key, ctypes.c_uint64) for key in ('ip', 'cfa', 'rbx', 'rbp', 'r12', 'r13', 'r14', 'r15')]

class DlInfo(ctypes.Structure):
    _fields_ = [('filename', ctypes.c_char_p), ('base', ctypes.c_void_p),
                ('symbol', ctypes.c_char_p), ('address', ctypes.c_void_p)]

helper = ctypes.CDLL(str(args.helper.resolve()))
helper.capture.argtypes = [ctypes.POINTER(Frame), ctypes.c_size_t]
helper.capture.restype = ctypes.c_size_t
libc = ctypes.CDLL(None)
libc.dladdr.argtypes = [ctypes.c_void_p, ctypes.POINTER(DlInfo)]
libc.dladdr.restype = ctypes.c_int
verified = set()

def capture_control_transfer():
    frames = (Frame * 128)()
    count = helper.capture(frames, 128)
    assert 0 < count < 128, 'Missing or truncated native transfer stack'
    result = []
    for frame in frames[:count]:
        info = DlInfo()
        if not libc.dladdr(frame.ip, ctypes.byref(info)) or not info.filename:
            continue
        filename = Path(info.filename.decode())
        if filename.name not in manifest['libraries']:
            continue
        if filename.name not in verified:
            assert hashlib.sha256(filename.read_bytes()).hexdigest() == manifest['libraries'][filename.name]['sha256']
            verified.add(filename.name)
        result.append({'library': filename.name, 'returnOffset': frame.ip - info.base})
    assert result
    return result

worker = REPO / 'scripts/docx-next-owner-boundary-worker.py'
source = worker.read_text()
expected = json.loads((REPO / 'docs/docx-next/sidebar-owner-boundary-evidence.json').read_text())['local']['boundaryWorkerSha256']
assert hashlib.sha256(source.encode()).hexdigest() == expected
needle = "'sameRegisteredInterface': event.Source == tracked_control})"
assert source.count(needle) == 1
source = source.replace(needle, "'sameRegisteredInterface': event.Source == tracked_control,\n                                                     'nativeFrames': capture_control_transfer()})")
needle = "{'__file__': str(worker), '__name__': '__main__'}"
assert source.count(needle) == 1
source = source.replace(needle, "{'__file__': str(worker), '__name__': '__main__', 'capture_control_transfer': capture_control_transfer}")
sys.argv = [str(worker), str(args.request)]
exec(compile(source, str(worker), 'exec'),
     {'__file__': str(worker), '__name__': '__main__', 'capture_control_transfer': capture_control_transfer})
