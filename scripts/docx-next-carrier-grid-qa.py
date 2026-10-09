"""Read-only exact grid audit of the stopped carrier; arithmetic match is not live causality."""
import argparse
import copy
import hashlib
import importlib.util
import json
from pathlib import Path

spec = importlib.util.spec_from_file_location('carrier', Path(__file__).with_name('docx-next-carrier-story-qa.py'))
carrier = importlib.util.module_from_spec(spec); spec.loader.exec_module(carrier)


def relative_roundtrip(widths, total):
    assert all(type(value) is int and value > 0 for value in widths) and type(total) is int and total > 0
    assert len(widths) == 3 and sum(widths) == total, 'Malformed complete carrier grid'
    borders = [widths[0], widths[0] + widths[1]]
    # DomainMapperTableManager: rounded cumulative positions on the 10000-point UNO grid.
    separators = [(2 * border * 10000 + total) // (2 * total) for border in borders]
    # SwTable::NewSetTabCols / lcl_MulDiv64: positive integer division back to twips.
    mapped = [separator * total // 10000 for separator in separators]
    return {'sourceCumulativeTwips': borders, 'relativeSum': 10000, 'roundedRelativeSeparators': separators,
            'truncatedCumulativeTwips': mapped, 'predictedGrid': [mapped[0], mapped[1] - mapped[0], total - mapped[1]]}


def audit(directory):
    report = json.loads((directory / 'carrier-story-report.json').read_text())
    assert report['actualCases'] == 1 and len(report['cases']) == 1 and len(report['earlyStop']['unrenderedCases']) == 5, 'Changed stopped carrier inventory'
    row = report['cases'][0]; name = row['fixture']
    source = directory / (name + '.docx'); saved = directory / (name + '-saved.docx')
    assert hashlib.sha256(source.read_bytes()).hexdigest() == row['docxSha256'] and hashlib.sha256(saved.read_bytes()).hexdigest() == row['savedDocxSha256'], 'Changed actual source or saved package'
    before, after = carrier.native_geometry(source), carrier.native_geometry(saved)
    assert before == row['sourceGeometry'] and after == row['savedGeometry'], 'Archived geometry disagrees with actual package'
    assert before[0]['grid'] == before[0]['rows'][0]['cells'] and after[0]['grid'] == after[0]['rows'][0]['cells'], 'Grid/cell mismatch'
    arithmetic = relative_roundtrip(before[0]['grid'], before[0]['width'])
    return {'fixture': name, 'sourceDocxSha256': row['docxSha256'], 'savedDocxSha256': row['savedDocxSha256'],
            'sourceGeometry': before, 'savedGeometry': after, 'gridDeltaTwips': [b - a for a, b in zip(before[0]['grid'], after[0]['grid'])],
            'totalWidthUnchanged': before[0]['width'] == after[0]['width'], 'nestedEntryGeometryUnchanged': before[1:] == after[1:],
            'arithmetic': arithmetic, 'arithmeticMatchesObservedGrid': arithmetic['predictedGrid'] == after[0]['grid'],
            'exactGeometryAcceptance': 'pass' if before == after else 'fail', 'liveNativeIntermediatesInstrumented': False,
            'causalAcceptance': 'unproven; source arithmetic alone does not establish live import/export internals',
            'earlyStop': report['earlyStop'], 'actualCases': 1, 'newNativeExports': 0}


def compare_baseline(before, after):
    a, b = copy.deepcopy(before), copy.deepcopy(after)
    for report in (a, b): report.pop('savedDocxSha256', None)
    assert a == b, 'Changed actual carrier grid or arithmetic scope/stop evidence'
    return {'status': 'pass', 'changedCases': 0}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path); parser.add_argument('--baseline', type=Path)
    args = parser.parse_args(); result = audit(args.directory)
    if args.baseline: compare_baseline(json.loads(args.baseline.read_text())['gridAudit']['stable'], result)
    (args.directory / 'carrier-grid-report.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({'exactGeometry': result['exactGeometryAcceptance'], 'arithmeticMatches': result['arithmeticMatchesObservedGrid'], 'newNativeExports': 0}))
