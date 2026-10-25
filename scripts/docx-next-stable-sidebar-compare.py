"""Compare complete stable observations against committed development-engine evidence; never accept export."""
import argparse
import json
from pathlib import Path


def compare_suite(baseline, observed, count):
    baseline = baseline.get('diagnostics', baseline)
    previous = {case['fixture']: case for case in baseline['cases']}
    current = {case['fixture']: case for case in observed['cases']}
    assert len(previous) == len(baseline['cases']) == count, 'Changed/duplicate baseline matrix'
    assert len(current) == len(observed['cases']) == count and current.keys() == previous.keys(), 'Changed observation matrix'
    cases = []
    for name, now in current.items():
        before = previous[name]
        assert now['docxSha256'] == before['docxSha256'], 'Changed candidate package ' + name
        for phase in ['render', 'saveReopen']:
            assert now[phase].get('fullTextVisible', now[phase].get('semanticTextPreserved', False)), 'Lost full text ' + name
        differences = []
        for phase in ['render', 'saveReopen']:
            a, b = before[phase], now[phase]
            for field in ['pages', 'openingCvPages']:
                if a[field] != b[field]:
                    differences.append({'phase': phase, 'field': field, 'development': a[field], 'stable': b[field]})
            assert [field['fieldId'] for field in a['metadataMetrics']] == [field['fieldId'] for field in b['metadataMetrics']], 'Changed metadata identities'
            for old, new in zip(a['metadataMetrics'], b['metadataMetrics']):
                for metric in ['leftPt', 'widthPt']:
                    if abs(old[metric] - new[metric]) >= .6:
                        differences.append({'phase': phase, 'fieldId': old['fieldId'], 'metric': metric,
                                            'development': old[metric], 'stable': new[metric]})
        cases.append({'fixture': name, 'docxSha256': now['docxSha256'], 'developmentOpening': before['render']['openingCvPages'],
                      'stableOpening': now['render']['openingCvPages'], 'stablePages': now['render']['pages'],
                      'stableOpeningAttachment': now['render']['openingAttachment'], 'fullTextAndSaveReopen': 'pass',
                      'differences': differences})
    return {'cases': cases, 'changedCases': sum(bool(case['differences']) for case in cases),
            'stableNegativeOpenings': sum(case['stableOpeningAttachment'] == 'known-negative' for case in cases)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    parser.add_argument('--include-selective-row', action='store_true')
    args = parser.parse_args()
    repository = Path(__file__).resolve().parent.parent
    result = {'architectureAcceptance': 'pending: measurements never unlock export', 'microsoftWord': 'pending', 'suites': {}}
    suites = [
        ('cellEnding', 'cell-ending/cell-ending-report.json', 'sidebar-cell-ending-evidence.json', 12),
        ('ownership', 'body/body-attachment-report.json', 'sidebar-body-attachment-evidence.json', 24),
    ]
    if args.include_selective_row:
        suites.append(('selectiveRow', 'selective-row/selective-row-report.json', 'sidebar-selective-row-evidence.json', 18))
    for suite, report, baseline, count in suites:
        observed = json.loads((args.directory / report).read_text())
        recorded = json.loads((repository / 'docs/docx-next' / baseline).read_text())
        result['suites'][suite] = compare_suite(recorded, observed, count)
        result['suites'][suite]['stableVersion'] = observed['libreOfficeVersion']
    result['changedCases'] = sum(suite['changedCases'] for suite in result['suites'].values())
    (args.directory / 'stable-comparison.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result, indent=2), flush=True)


if __name__ == '__main__':
    main()
