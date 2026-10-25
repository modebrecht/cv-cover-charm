"""Read-only comparison of earlier stopped grids; no new sources, exports or accepted geometry."""
import argparse
import copy
import hashlib
import json
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'


def document(path):
    with ZipFile(path) as archive: return ET.fromstring(archive.read('word/document.xml'))


def ids(table):
    return [tag.get(W + 'val') for node in table.iter(W + 'sdt') if (tag := node.find(W + 'sdtPr/' + W + 'tag')) is not None]


def owners(before, after):
    candidates = [table for table in before.iter(W + 'tbl') if (caption := table.find(W + 'tblPr/' + W + 'tblCaption')) is not None and caption.get(W + 'val') == 'cv.sidebar']
    assert len(candidates) == 1, 'Missing or duplicated declared source owner'
    source = candidates[0]; canonical = ids(source)
    assert canonical and len(canonical) == len(set(canonical)), 'Invalid original canonical ID inventory'
    matches = [table for table in after.iter(W + 'tbl') if ids(table) == canonical]
    assert len(matches) == 1, 'Missing, reordered or ambiguous saved native owner'
    return source, matches[0], canonical


def geometry(table):
    width = table.find(W + 'tblPr/' + W + 'tblW')
    assert width is not None and width.get(W + 'type') == 'dxa', 'Unsupported native width unit'
    return {'preferredWidthTwips': int(width.get(W + 'w')), 'grid': [int(col.get(W + 'w')) for col in table.find(W + 'tblGrid')],
            'cellWidths': [[int(cell.find(W + 'tcPr/' + W + 'tcW').get(W + 'w')) for cell in row.findall(W + 'tc')] for row in table.findall(W + 'tr')]}


def arithmetic(widths, preferred):
    assert len(widths) == 3 and all(type(width) is int and width > 0 for width in widths) and type(preferred) is int and preferred > 0
    total = sum(widths); borders = [widths[0], widths[0] + widths[1]]
    separators = [(2 * border * 10000 + total) // (2 * total) for border in borders]
    mapped = [separator * preferred // 10000 for separator in separators]
    return {'sourceGridSumTwips': total, 'sourcePreferredWidthTwips': preferred, 'sourcePreferredMinusGridTwips': preferred - total,
            'roundedRelativeSeparators': separators, 'truncatedCumulativeTwips': mapped,
            'predictedGrid': [mapped[0], mapped[1] - mapped[0], preferred - mapped[1]]}


def audit(root):
    directory = root / 'continuous-cell'; previous = json.loads((directory / 'continuous-cell-report.json').read_text())
    assert previous['actualCases'] == 2 and [row['fixture'] for row in previous['cases']] == ['right-three-row-220', 'right-continuous-cell-220'], 'Changed historical stopped inventory'
    results = []
    for row in previous['cases']:
        name = row['fixture']; source = directory / (name + '.docx'); saved = directory / (name + '-saved.docx')
        for path, key in ((source, 'docxSha256'), (saved, 'savedDocxSha256')):
            assert hashlib.sha256(path.read_bytes()).hexdigest() == row[key], 'Changed actual historical package'
        before, after, canonical = owners(document(source), document(saved))
        a, b = geometry(before), geometry(after); stages = arithmetic(a['grid'], a['preferredWidthTwips'])
        caption = after.find(W + 'tblPr/' + W + 'tblCaption')
        results.append({'fixture': name, 'sourceDocxSha256': row['docxSha256'], 'savedDocxSha256': row['savedDocxSha256'], 'canonicalOwnerFieldIds': canonical,
                        'sourceGeometry': a, 'savedGeometry': b, 'gridDeltaTwips': [y - x for x, y in zip(a['grid'], b['grid'])],
                        'arithmetic': stages, 'arithmeticMatchesObservedGrid': stages['predictedGrid'] == b['grid'],
                        'exactGeometryAcceptance': 'pass' if a == b else 'fail', 'savedTableCaption': None if caption is None else caption.get(W + 'val'),
                        'tableCaptionAcceptance': 'pass' if caption is not None and caption.get(W + 'val') == 'cv.sidebar' else 'fail'})
    return {'scope': 'Two already executed historical packages; native owners resolved from canonical IDs before any geometry comparison',
            'cases': results, 'historicalEarlyStop': previous['earlyStop'], 'newPreparedSources': 0, 'newNativeExports': 0,
            'liveNativeIntermediatesInstrumented': False, 'causalAcceptance': 'unproven; arithmetic agreement does not measure live import/export stages'}


def compare_baseline(before, after):
    a, b = copy.deepcopy(before), copy.deepcopy(after)
    for report in (a, b):
        for row in report['cases']: row.pop('savedDocxSha256', None)
    assert a == b, 'Changed historical native grid, canonical ownership, caption or scope/stop evidence'
    return {'status': 'pass', 'changedCases': 0}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root', type=Path); parser.add_argument('--baseline', type=Path)
    args = parser.parse_args(); result = audit(args.root)
    if args.baseline: compare_baseline(json.loads(args.baseline.read_text())['historicalGridAudit']['stable'], result)
    (args.root / 'grid-history-report.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({'historicalCases': len(result['cases']), 'arithmeticMatches': [row['arithmeticMatchesObservedGrid'] for row in result['cases']], 'exactGeometry': [row['exactGeometryAcceptance'] for row in result['cases']], 'newNativeExports': 0}))
