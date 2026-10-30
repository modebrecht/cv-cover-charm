"""Re-audit hash-bound, retained app packages without native loads, saves or exports."""
import argparse
import hashlib
import json
from pathlib import Path

from docx_next_picture_owner_qa import picture_inventory, compare_image_data, require_picture_ownership


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def audit(folder):
    content_path = folder / 'app-body-report.json'
    content = json.loads(content_path.read_text())
    names = json.loads((folder / 'manifest.json').read_text())
    assert names and len(names) == len(set(names)), 'Empty or duplicate fixture manifest'
    assert content['contentRoundtripAcceptance'] == 'pass', 'Retained content proof must be complete'
    assert [case['fixture'] for case in content['cases']] == names, 'Retained matrix differs from manifest'
    report = {'scope': 'Retained app package ownership and exact image data', 'collectionStatus': 'pending',
              'contentReportSha256': sha(content_path), 'newNativeLoads': 0, 'newNativeExports': 0,
              'pictureOwnershipAcceptance': 'pending', 'imageDataAcceptance': 'pending',
              'productionAcceptance': 'blocked', 'cases': []}
    for case in content['cases']:
        name = case['fixture']
        fixture = json.loads((folder / (name + '.json')).read_text())
        observations = json.loads((folder / (name + '-native.json')).read_text())['cases']
        assert len(case['phases']) == len(observations) == 3, 'Incomplete phase proof'
        original = folder / (name + '.docx')
        assert sha(original) == fixture['sourceSha256'] == case['sourceSha256'], 'Changed source package'
        source = picture_inventory(original, fixture['pictures'])
        assert source['status'] == 'pass', 'Invalid source picture ownership'
        result = {'fixture': name, 'phases': []}
        for phase, proof, native in zip(('source', 'saved', 'saved2'), case['phases'], observations):
            assert phase == proof['phase'] == native['phase'], 'Reordered retained phase'
            package = original if phase == 'source' else folder / (name + '-' + phase + '.docx')
            pdf = folder / (name + '-' + phase + '.pdf')
            assert sha(package) == native['inputSha256'], 'Package differs from retained native input'
            assert sha(pdf) == proof['pdfSha256'], 'PDF differs from retained content proof'
            ownership = picture_inventory(package, fixture['pictures'])
            result['phases'].append({'phase': phase, 'packageSha256': sha(package), 'pdfSha256': sha(pdf),
                                     'pictureOwnership': ownership, 'imageData': compare_image_data(source, ownership)})
        report['cases'].append(result)
    for key, phase_key in [('pictureOwnershipAcceptance', 'pictureOwnership'), ('imageDataAcceptance', 'imageData')]:
        report[key] = 'pass' if all(phase[phase_key]['status'] == 'pass'
                                  for case in report['cases'] for phase in case['phases']) else 'fail'
    report['collectionStatus'] = 'pass'
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--require-owned', action='store_true')
    args = parser.parse_args()
    result = audit(args.directory.resolve())
    output = args.output or args.directory / 'picture-owner-report.json'
    output.write_text(json.dumps(result, indent=2) + '\n')
    failed = [case['fixture'] for case in result['cases']
              if any(phase['pictureOwnership']['status'] != 'pass' for phase in case['phases'])]
    print(json.dumps({'collectionStatus': result['collectionStatus'], 'cases': len(result['cases']),
                      'pictureOwnershipAcceptance': result['pictureOwnershipAcceptance'],
                      'imageDataAcceptance': result['imageDataAcceptance'], 'failedOwnershipCases': failed}))
    if args.require_owned:
        require_picture_ownership(result)
