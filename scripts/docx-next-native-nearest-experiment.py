"""Isolated, fingerprinted LibreOffice intervention; never an accepted runtime or DOCX fix.

Only two unsigned divisions in NewSetTabCols are replaced by nearest division.
No source DOCX, authored width, normal QA runtime, or production gate is modified.
The equivalent source proposal still needs an official source build and upstream review.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import struct
import sys

STOCK_SHA = 'ecc533cd929a8a044129026b519a87917803e0db7eb1c6bbec84f5511231397b'
LIBRARY = Path('usr/lib/libreoffice/program/libswlo.so')
CAVE = 0x113bcd0
SITES = ((0x92cf1f, -0xa0, 0), (0x92cf2e, -0x98, 48))


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def patch_bytes(original):
    assert hashlib.sha256(original).hexdigest() == STOCK_SHA, 'Wrong stock Writer binary'
    data = bytearray(original)
    assert data[CAVE:CAVE+96] == bytes(96), 'Executable padding is occupied'
    assert data[:6] == b'\x7fELF\x02\x01', 'Expected little-endian AMD64 ELF64'
    assert struct.unpack_from('<H', data, 18)[0] == 62, 'Expected AMD64 architecture'
    patches = []
    for site, displacement, offset in SITES:
        division = b'\x48\xf7\xb5' + struct.pack('<i', displacement)
        assert data[site:site+7] == division, 'Unexpected NewSetTabCols instruction'
        # The live measured products fit uint64 without overflow. RBP remains
        # unchanged across CALL. Preserve every register except the division's
        # original RAX/RDX outputs. Flags are unused until the following CMP.
        code = (b'\x48\x8b\x95' + struct.pack('<i', displacement) +
                b'\x48\xd1\xea\x48\x01\xd0\x31\xd2' + division + b'\xc3')
        target = CAVE + offset
        replacement = b'\xe8' + struct.pack('<i', target-site-5) + b'\x90\x90'
        data[target:target+len(code)] = code
        data[site:site+7] = replacement
        patches.append({'instructionAddress': hex(site), 'original': division.hex(),
                        'replacement': replacement.hex(), 'trampolineAddress': hex(target),
                        'trampoline': code.hex()})
    phoff = struct.unpack_from('<Q', data, 32)[0]
    phsize, phnum = struct.unpack_from('<HH', data, 54)
    headers = []
    for index in range(phnum):
        pos = phoff + index*phsize
        kind, flags, offset, address, _, size, memory, _ = struct.unpack_from('<II6Q', data, pos)
        if kind == 1 and flags == 5:
            assert offset == address == 0x36c000 and size == memory == 0xdcfcad
            new_size = CAVE + 96 - offset
            assert offset+new_size < 0x113c000, 'Intervention would overlap read-only data'
            struct.pack_into('<QQ', data, pos+32, new_size, new_size)
            headers.append({'headerOffset': pos, 'oldSize': size, 'newSize': new_size})
    assert len(headers) == 1, 'Unexpected executable segment layout'
    allowed = set()
    for site, _, offset in SITES:
        allowed.update(range(site, site+7))
        allowed.update(range(CAVE+offset, CAVE+offset+23))
    for header in headers:
        allowed.update(range(header['headerOffset']+32, header['headerOffset']+48))
    changed = [index for index, (a, b) in enumerate(zip(original, data)) if a != b]
    assert len(data) == len(original) and set(changed) <= allowed, 'Unexpected binary changes'
    return bytes(data), {'stockWriterSha256': STOCK_SHA, 'candidateWriterSha256': hashlib.sha256(data).hexdigest(),
                         'patches': patches, 'segmentHeaders': headers, 'changedBytes': len(changed)}


def prepare(stock, candidate):
    stock, candidate = stock.resolve(), candidate.resolve()
    assert stock.is_dir() and not candidate.exists(), 'Candidate must be a new directory'
    assert stock not in candidate.parents and candidate not in stock.parents, 'Runtime directories must be independent'
    original = (stock/LIBRARY).read_bytes()
    patched, evidence = patch_bytes(original)
    launcher = (stock/'lo-kit').read_text()
    assert str(stock) in launcher, 'Expected self-contained stock launcher'
    shutil.copytree(stock, candidate, symlinks=True)
    (candidate/LIBRARY).write_bytes(patched)
    (candidate/'lo-kit').write_text(launcher.replace(str(stock), str(candidate)))
    assert sha(stock/LIBRARY) == STOCK_SHA, 'Stock runtime changed'
    evidence.update(scope='Isolated binary intervention; not an official build, stock runtime, or production fix',
                    sourceProposal='docs/docx-next/libreoffice-nearest-tabcols-proposal.patch',
                    primaryCommit='30742500f2d3eb4366ac312fa33d3dcabdb3eba5',
                    productionAcceptance='blocked', microsoftWordAccepted=0,
                    sourceBuildExecuted=False, arbitraryWidthAcceptance='unaccepted')
    (candidate/'rounding-experiment.json').write_text(json.dumps(evidence, indent=2)+'\n')
    return evidence


def module(name):
    path = Path(__file__).with_name(name+'.py')
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec); spec.loader.exec_module(result)
    return result


def run_matrix(stock, candidate, fixtures, output, binding, require_exact=False):
    app = module('docx-next-sidebar-body-qa')
    geometry = module('docx-next-sidebar-save-geometry-qa')
    assert not output.exists(), 'Output must be a new directory'
    names = json.loads((fixtures/'manifest.json').read_text())
    assert names == app.NAMES, 'Expected all 22 canonical application cases'
    output.mkdir(parents=True)
    inventory = {}
    for path in [fixtures/'manifest.json'] + [fixtures/(name+suffix) for name in names for suffix in ('.docx','.json')]:
        inventory[path.name] = sha(path)
        shutil.copyfile(path, output/path.name)
    provenance = json.loads((candidate/'rounding-experiment.json').read_text())
    provenance['inputs'] = inventory
    proof = output/'experimental-runtime-provenance.json'
    proof.write_text(json.dumps(provenance, indent=2)+'\n')
    assert sha(stock/LIBRARY) == STOCK_SHA and sha(candidate/LIBRARY) == provenance['candidateWriterSha256']
    try:
        content = app.audit(output, candidate, binding/'binding')
        assert content['contentRoundtripAcceptance'] == 'pass'
        result = geometry.audit(output, candidate, binding/'binding')
        provenance['contentRoundtripAcceptance'] = content['contentRoundtripAcceptance']
        checks = ('sourceGridConsistencyAcceptance', 'exactVisibleGeometryAcceptance',
                  'exactSerializedGeometryAcceptance', 'exactPublicGridStabilityAcceptance')
        provenance['experimentalGeometryChecks'] = {key: result[key] for key in checks}
        provenance['experimentalExactGeometry'] = 'pass' if all(result[key]=='pass' for key in checks) else 'fail'
        provenance['geometryAcceptance'] = result['geometryAcceptance']
        provenance['cases'] = len(result['cases'])
        provenance['exactStableCases'] = sum(all(row['exactVisibleGeometry'] and row['exactSerializedTables'] and
                                                row['exactPublicGrid'] for row in case['comparisons'])
                                            for case in result['cases'])
        provenance['pages'] = sum(phase['pdfPages'] for case in content['cases'] for phase in case['phases'])
    finally:
        assert sha(stock/LIBRARY) == STOCK_SHA, 'Stock runtime changed'
        assert all(sha(fixtures/name) == expected and sha(output/name) == expected for name,expected in inventory.items()), 'Source fixture changed'
        proof.write_text(json.dumps(provenance, indent=2)+'\n')
    if require_exact:
        geometry.require_stable(result)
    return provenance


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--stock-engine', type=Path, required=True)
    parser.add_argument('--candidate-engine', type=Path, required=True)
    parser.add_argument('--prepare-only', action='store_true')
    parser.add_argument('--require-exact', action='store_true', help='Fail on any geometric change in the experimental runtime')
    parser.add_argument('--fixtures', type=Path)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--binding', type=Path)
    args = parser.parse_args()
    if not args.prepare_only:
        assert args.fixtures and args.output and args.binding, 'Full matrix paths are required'
    evidence = prepare(args.stock_engine, args.candidate_engine)
    if not args.prepare_only:
        evidence = run_matrix(args.stock_engine.resolve(), args.candidate_engine.resolve(),
                              args.fixtures.resolve(), args.output.resolve(), args.binding.resolve(), args.require_exact)
    print(json.dumps(evidence, indent=2))
