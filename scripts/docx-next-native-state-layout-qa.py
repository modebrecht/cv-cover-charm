"""Verify importer field layout directly from the exact matching official debug ELF; no inferior execution."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

TYPE_FIELDS = {
    'mapperImpl': ('writerfilter::dmapper::DomainMapper', 'm_pImpl'),
    'mapperStreamBase': ('writerfilter::dmapper::DomainMapper', 'writerfilter::LoggedStream'),
    'implMapper': ('writerfilter::dmapper::DomainMapper_Impl', 'm_rDMapper'),
    'implStreamStack': ('writerfilter::dmapper::DomainMapper_Impl', 'm_StreamStateStack'),
    'implSdtStarts': ('writerfilter::dmapper::DomainMapper_Impl', 'm_xSdtStarts'),
    'implAnnotationId': ('writerfilter::dmapper::DomainMapper_Impl', 'm_nAnnotationId'),
    'handlerStream': ('writerfilter::ooxml::OOXMLFastContextHandler', 'mpStream'),
    'substreamDummyFlag': ('writerfilter::dmapper::SubstreamContext', 'bDummyParaAddedForTableInSection'),
    'bookmarkIsStart': ('writerfilter::dmapper::BookmarkInsertPosition', 'm_bIsStartOfText'),
    'bookmarkRange': ('writerfilter::dmapper::BookmarkInsertPosition', 'm_xTextRange'),
    'implSdtHelper': ('writerfilter::dmapper::DomainMapper_Impl', 'm_pSdtHelper'),
    'helperImpl': ('writerfilter::dmapper::SdtHelper', 'm_rDM_Impl'),
    'helperTag': ('writerfilter::dmapper::SdtHelper', 'm_aTag'),
}
TYPE_SIZES = {'substreamSize': 'writerfilter::dmapper::SubstreamContext', 'bookmarkSize': 'writerfilter::dmapper::BookmarkInsertPosition'}


def compare_layout(actual, pin):
    assert actual['fields'] == pin['fields'], 'Debug DWARF member layout differs from actual importer observer'
    assert type(actual['pointerSize']) is int and actual['pointerSize'] == pin['pointerSize'] == 8
    for value in actual['fields'].values():
        assert type(value) is int and value >= 0, 'Invalid debug DWARF offset/size'


def audit(debug_elf, gdb, pin_path):
    pin = json.loads(pin_path.read_text())
    with debug_elf.open('rb') as stream: digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    assert digest == pin['debugMemberSha256'], 'Changed exact official debug ELF member'
    command = 'import gdb,json\nfields=' + repr(TYPE_FIELDS) + '\nsizes=' + repr(TYPE_SIZES) + "\nresult={}\n"
    command += "for key,(typename,name) in fields.items():\n t=gdb.lookup_type(typename)\n matches=[f for f in t.fields() if f.name==name]\n assert len(matches)==1 and matches[0].bitpos%8==0\n result[key]=int(matches[0].bitpos//8)\n"
    command += "for key,typename in sizes.items(): result[key]=int(gdb.lookup_type(typename).sizeof)\n"
    command += "print('LAYOUT_JSON:'+json.dumps({'fields':result,'pointerSize':int(gdb.lookup_type('void').pointer().sizeof)}))"
    # Load only the pinned ELF/type information. Never run, attach or call inferior code.
    process = subprocess.run([str(gdb), '--batch', '-nx', '--se', str(debug_elf.resolve()), '-ex', 'python ' + command], capture_output=True, text=True, timeout=30)
    assert process.returncode == 0, process.stderr
    lines = [line.removeprefix('LAYOUT_JSON:') for line in process.stdout.splitlines() if line.startswith('LAYOUT_JSON:')]
    assert len(lines) == 1, 'Ambiguous offline DWARF layout result'
    actual = json.loads(lines[0]); compare_layout(actual, pin)
    return {'status': 'pass', 'fieldAndSizeChecks': len(actual['fields']), 'debugMemberSha256': digest, 'newNativeExecutions': 0, 'engineFilesModified': 0}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__); parser.add_argument('debug_elf', type=Path); parser.add_argument('--gdb', type=Path, required=True)
    parser.add_argument('--pin', type=Path, default=Path(__file__).resolve().parent.parent / 'docs/docx-next/stable-native-state-layout.json')
    args = parser.parse_args(); print(json.dumps(audit(args.debug_elf, args.gdb, args.pin)))
