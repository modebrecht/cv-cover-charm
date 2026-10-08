"""Fixture-only check: editable heading shading survives native Save/Reopen."""
import argparse
import json
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'


def headings(path):
    with ZipFile(path) as package:
        root = ET.fromstring(package.read('word/document.xml'))
    result = {}
    for control in root.iter(W + 'sdt'):
        tag = control.find(W + 'sdtPr/' + W + 'tag')
        identity = tag.get(W + 'val', '') if tag is not None else ''
        if identity.startswith('cv.section.') and identity.endswith('.heading'):
            result[identity] = sorted({node.get(W + 'fill') for node in control.iter(W + 'shd')})
    assert result, 'No editable CV heading fields'
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    args = parser.parse_args()
    results = []
    for fixture in json.loads((args.directory / 'manifest.json').read_text()):
        name = fixture['fixture']
        before = headings(args.directory / (name + '.docx'))
        after = headings(args.directory / (name + '-qa') / 'roundtrip' / (name + '.docx'))
        assert before == after, f'{name}: native heading shading changed after Save/Reopen'
        expected = fixture['headingBadgesEnabled']
        assert all(bool(fill) == expected for fill in before.values()), f'{name}: badge enable/disable policy lost'
        results.append({'fixture': name, 'editableHeadingCount': len(before), 'shading': before, 'saveReopen': 'pass'})
    (args.directory / 'heading-badge-report.json').write_text(json.dumps(results, indent=2) + '\n')
    print(json.dumps({'fixtures': len(results), 'editableHeadings': sum(r['editableHeadingCount'] for r in results), 'saveReopenShading': 'pass'}))
