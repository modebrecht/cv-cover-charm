"""Generate rejected, prospective floating-table picture sources from pinned app fixtures.

This does not modify the renderer, repair saved packages or grant acceptance.
Each result needs independent source-fidelity, native save and Word checks.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
import re
from xml.etree import ElementTree as ET
from zipfile import ZipFile

from docx_next_picture_owner_qa import W, picture_inventory

PINS = {
    'main': '7dd758c90f92d5a490ef022923c738edff042c539aa578e451aa1909bcd81923',
    'low': 'e0cff56f46c69d4b721f52b51e95f6797c5542cae8165cfbaa279f775237622c',
    'portrait': 'eebd6665b1b0bc73ea333027ea985dfb7445aef8f8ee226c02abb7a2b0a23b89',
    'chrome': '647333a0d741f6a13402a7d4332e7d9b9262f55c9c435774502223d12605161b',
}
PICTURES = [{'id': 'cv.person.photo'}]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def table_picture(document):
    matches = list(re.finditer(r'<w:sdt><w:sdtPr><w:alias w:val="cv.person.photo"/>(?:(?!<w:sdt>).)*?</w:sdt>', document, re.S))
    assert len(matches) == 1, 'One unambiguous pinned photo control required'
    match = matches[0]
    owner = match[0]
    assert '<w:picture/>' in owner and not re.search(r'<w:(?:t|instrText|delText|delInstrText)(?:\s|>)', owner), 'Require a text-free typed source picture'
    assert owner.count('<w:drawing>') == owner.count('<wp:anchor ') == owner.count('<a:blip ') == 1
    image = re.search(r'<w:r><w:drawing>.*?</w:drawing></w:r>', owner, re.S)[0]
    x = int(re.search(r'<wp:positionH relativeFrom="column"><wp:posOffset>(-?\d+)', image)[1])
    y = int(re.search(r'<wp:positionV relativeFrom="paragraph"><wp:posOffset>(-?\d+)', image)[1])
    cx, cy = map(int, re.search(r'<wp:extent cx="(\d+)" cy="(\d+)"/>', image).groups())
    left, top, right, bottom = map(int, re.search(r'<wp:effectExtent l="(\d+)" t="(\d+)" r="(\d+)" b="(\d+)"/>', image).groups())
    gap = int(re.search(r'<wp:anchor distT="(\d+)"', image)[1])
    assert cx > 0 and cy > 0 and min(left, top, right, bottom, gap) >= 0
    inline = re.sub(r'<wp:anchor\b[^>]*>', '<wp:inline distT="0" distB="0" distL="0" distR="0">', image, count=1)
    inline = inline.replace('</wp:anchor>', '</wp:inline>')
    inline = re.sub(r'<wp:simplePos[^>]*/>|<wp:position[HV][^>]*>.*?</wp:position[HV]>|<wp:wrap(?:Square|None|TopAndBottom)[^>]*/>', '', inline, flags=re.S)
    assert '<wp:wrap' not in inline and '<wp:anchor' not in inline
    properties = re.search(r'<w:sdtPr>.*?</w:sdtPr>', owner, re.S)[0]
    control = ('<w:sdt>' + properties + '<w:sdtContent><w:p><w:pPr>'
               '<w:spacing w:before="0" w:after="0"/><w:rPr><w:sz w:val="2"/></w:rPr>'
               '</w:pPr>' + inline + '</w:p></w:sdtContent></w:sdt>')
    # The inline image reserves its outline through effectExtent. Position the
    # outer table at that box's origin; never compensate using observed PDFs.
    tx, ty = round((x - left) / 635), round((y - top) / 635)
    # Word clips the right outline if the fixed cell reserves only the image's
    # core extent. Inline layout also reserves the declared effect box.
    width, distance = round((cx + left + right) / 635), round(gap / 635)
    margins = ''.join(f'<w:{edge} w:w="0" w:type="dxa"/>' for edge in ('top', 'left', 'bottom', 'right'))
    table = (f'<w:tbl><w:tblPr><w:tblpPr w:horzAnchor="text" w:vertAnchor="text" w:tblpX="{tx}" w:tblpY="{ty}" '
             f'w:leftFromText="{distance}" w:rightFromText="{distance}" w:topFromText="{distance}" w:bottomFromText="{distance}"/>'
             f'<w:tblW w:w="{width}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblCellMar>{margins}</w:tblCellMar>'
             f'</w:tblPr><w:tblGrid><w:gridCol w:w="{width}"/></w:tblGrid><w:tr><w:tc><w:tcPr>'
             f'<w:tcW w:w="{width}" w:type="dxa"/></w:tcPr>{control}</w:tc></w:tr></w:tbl>')
    start = list(re.finditer(r'<w:p(?:\s[^>]*)?>', document[:match.start()]))[-1].start()
    end = document.index('</w:p>', match.end()) + len('</w:p>')
    paragraph = document[start:end]
    assert paragraph.count(owner) == 1, 'Photo paragraph boundary is ambiguous'
    candidate = document[:start] + table + paragraph.replace(owner, '') + document[end:]
    before, after = ET.fromstring(document), ET.fromstring(candidate)
    for name in ('tag', 't'):
        assert [ET.tostring(node) for node in before.iter(W + name)] == [ET.tostring(node) for node in after.iter(W + name)], 'Canonical field order or text changed'
    return candidate


def generate(sources, output, cases):
    assert cases and len(cases) == len(set(cases)) and set(cases) <= set(PINS)
    targets = [output / ('floating-table-' + case + '.docx') for case in cases]
    manifest_path = output / 'floating-picture-manifest.json'
    assert not any(path.exists() or path.is_symlink() for path in [*targets, manifest_path]), 'Existing outputs are never overwritten'
    prepared = []
    for case, target in zip(cases, targets):
        source = sources / ('app-body-photo-free-' + case + '.docx')
        data = source.read_bytes()
        assert sha(data) == PINS[case], 'Changed pinned synthetic app source: ' + case
        assert picture_inventory(source, PICTURES)['status'] == 'pass'
        with ZipFile(io.BytesIO(data)) as archive:
            parts = [(info, archive.read(info.filename)) for info in archive.infolist()]
        document = next(value.decode('utf-8') for info, value in parts if info.filename == 'word/document.xml')
        prepared.append((case, target, source, parts, table_picture(document)))
    output.mkdir(parents=True, exist_ok=True)
    report = {'scope': 'Prospective floating-table inputs from four immutable synthetic sources; not native saved-file repair',
              'productionAcceptance': 'blocked', 'rendererChanged': False, 'cases': []}
    for case, target, source, parts, document in prepared:
        with target.open('xb') as stream, ZipFile(stream, 'w') as archive:
            for info, value in parts:
                archive.writestr(info, document.encode('utf-8') if info.filename == 'word/document.xml' else value)
        with ZipFile(target) as archive:
            assert all(archive.read(info.filename) == value for info, value in parts if info.filename != 'word/document.xml')
        assert picture_inventory(target, PICTURES)['status'] == 'pass'
        report['cases'].append({'fixture': case, 'name': 'floating-table-' + case, 'file': target.name,
                                'sourceSha256': PINS[case], 'sha256': sha(target.read_bytes()),
                                'sourcePictureContract': 'pass', 'allNonDocumentPartsUnchanged': True,
                                'sourceFidelity': 'UNVERIFIED', 'nativeSaveStability': 'UNVERIFIED', 'wordAcceptance': 'UNVERIFIED'})
    with manifest_path.open('x', encoding='utf-8') as stream:
        json.dump(report, stream, indent=2)
        stream.write('\n')
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('sources', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--cases', nargs='+', choices=list(PINS), default=list(PINS))
    args = parser.parse_args()
    result = generate(args.sources, args.output, args.cases)
    print(json.dumps({'generated': len(result['cases']), 'productionAcceptance': 'blocked'}))
