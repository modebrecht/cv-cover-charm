"""Internal floating-anchor counterfactual, not a Word or product candidate.

Two scopes use the same native picture, zero-offset paragraph/column anchoring
and top/bottom wrapping. Rendering must independently assess the changed flow.
No compensating offsets or paragraph reservations are accepted by this probe.
"""
import argparse
import copy
import importlib.util
import json
from pathlib import Path
from zipfile import ZipFile

from lxml import etree as ET

spec = importlib.util.spec_from_file_location('rich_return',
    Path(__file__).with_name('docx-next-photo-rich-owner-return.py'))
check = importlib.util.module_from_spec(spec)
spec.loader.exec_module(check)
NS, W = check.NS, check.W
SOURCE_HASH = 'ad5fed158088ad5506c1bb483f441212bd58be57a35b7092c2ba299a57978968'
SCOPES = ['inline-owner', 'block-owner']


def transform(root, scope):
    if scope not in SCOPES:
        raise ValueError('Unsupported owner scope')
    owner = check.trial.photo_owner(root)
    props, content = owner.find('w:sdtPr', NS), owner.find('w:sdtContent', NS)
    if any(n.tag not in ['{'+W+'}'+name for name in ['alias', 'tag', 'id']] for n in props):
        raise ValueError('Require unchanged ordinary rich source owner properties')
    parent = owner.getparent()
    if (parent.tag != '{'+W+'}p' or content is None or
            any(n is not owner and n.tag != '{'+W+'}pPr' for n in parent) or
            len(content) != 1 or content[0].tag != '{'+W+'}r' or
            len(content[0]) != 1 or content[0][0].tag != '{'+W+'}drawing' or
            len(content[0][0]) != 1 or content[0][0][0].tag != '{'+NS['wp']+'}inline' or
            len(owner.findall('.//pic:pic', NS)) != 1):
        raise ValueError('Require a dedicated inline ordinary source picture')
    if scope == 'block-owner':
        check.trial.demote(root, 'inline')
        check.trial.promote(root, 'block')
        owner = check.trial.photo_owner(root)
    anchor = owner.find('.//wp:inline', NS)
    anchor.tag = '{'+NS['wp']+'}anchor'
    # Inline picture distances do not define an inline line-box reserve.
    # This diagnostic instead tests zero-clearance natural floating flow.
    anchor.attrib.clear()
    anchor.attrib.update({'distT': '0', 'distB': '0', 'distL': '0', 'distR': '0',
        'simplePos': '0', 'relativeHeight': '1', 'behindDoc': '0', 'locked': '0',
        'layoutInCell': '1', 'allowOverlap': '0'})
    anchor.insert(0, ET.Element('{'+NS['wp']+'}simplePos', x='0', y='0'))
    for index, (axis, relative) in enumerate([('H', 'column'), ('V', 'paragraph')], 1):
        position = ET.Element('{'+NS['wp']+'}position'+axis, relativeFrom=relative)
        ET.SubElement(position, '{'+NS['wp']+'}posOffset').text = '0'
        anchor.insert(index, position)
    doc = anchor.find('wp:docPr', NS)
    if doc is None:
        raise ValueError('Source picture lacks native drawing identity')
    anchor.insert(anchor.index(doc), ET.Element('{'+NS['wp']+'}wrapTopAndBottom'))


def restore(root, scope, source_inline):
    owner = check.trial.photo_owner(root)
    anchor = owner.find('.//wp:anchor', NS)
    anchor.getparent().replace(anchor, copy.deepcopy(source_inline))
    if scope == 'block-owner':
        check.trial.demote(root, 'block')
        check.trial.promote(root, 'inline')


def verify(source, candidate, scope):
    with ZipFile(source) as before, ZipFile(candidate) as after:
        names = before.namelist()
        if (len(names) != len(set(names)) or len(after.namelist()) != len(set(after.namelist())) or
                set(names) != set(after.namelist()) or before.testzip() or after.testzip()):
            raise ValueError('Changed or ambiguous package membership')
        if [n for n in names if before.read(n) != after.read(n)] != ['word/document.xml']:
            raise ValueError('Only main document markup may change')
        original = ET.fromstring(before.read('word/document.xml'))
        actual = ET.fromstring(after.read('word/document.xml'))
        expected = copy.deepcopy(original)
        transform(expected, scope)
        if check.trial.canonical(actual) != check.trial.canonical(expected):
            raise ValueError('Not the exact zero-offset floating transform')
        restored = copy.deepcopy(actual)
        source_inline = check.trial.photo_owner(original).find('.//wp:inline', NS)
        restore(restored, scope, source_inline)
        if check.trial.canonical(restored) != check.trial.canonical(original):
            raise ValueError('Inverse does not restore source markup')
    preservation = check.compare(source, candidate)
    if preservation['failedChecks']:
        raise ValueError('Initial owner/image preservation failed')
    return {'scope': scope, 'sourceSha256': check.reader.digest(Path(source).read_bytes()),
            'probeSha256': check.reader.digest(Path(candidate).read_bytes()),
            'inverseRestoresCanonicalSource': True, 'changedParts': ['word/document.xml'],
            'initialPreservation': preservation, 'renderAcceptance': 'UNVERIFIED',
            'wordAcceptance': 'UNVERIFIED', 'productCandidate': False}


def build(source, output):
    if check.reader.digest(source.read_bytes()) != SOURCE_HASH:
        raise ValueError('Only the pinned complete synthetic rich-owner source is supported')
    if output.exists():
        raise ValueError('Use a new output directory')
    output.mkdir(parents=True)
    reports = []
    with ZipFile(source) as archive:
        original = ET.fromstring(archive.read('word/document.xml'))
        for scope in SCOPES:
            root = copy.deepcopy(original)
            transform(root, scope)
            target = output/(scope+'.docx')
            with ZipFile(target, 'w') as destination:
                for info in archive.infolist():
                    data = ET.tostring(root, xml_declaration=True, encoding='UTF-8') if info.filename == 'word/document.xml' else archive.read(info.filename)
                    destination.writestr(copy.copy(info), data)
            reports.append(verify(source, target, scope))
    (output/'manifest.json').write_text(json.dumps(reports, indent=2)+'\n')
    return reports


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    reports = build(args.source, args.output)
    print(json.dumps({'probes': len(reports), 'productCandidate': False, 'wordAcceptance': 'UNVERIFIED'}))


if __name__ == '__main__':
    main()
