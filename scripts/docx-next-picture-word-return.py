"""Read two returned DOCX copies against the immutable synthetic photo source.

No Office process is started. Package preservation never grants Word acceptance.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path

from docx_next_picture_owner_qa import picture_inventory, compare_image_data

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'tests/fixtures/docx-next/picture-import/app-body-photo-free-main.docx'
SOURCE_SHA256 = '7dd758c90f92d5a490ef022923c738edff042c539aa578e451aa1909bcd81923'
PICTURES = [{'id': 'cv.person.photo'}]
_spec = importlib.util.spec_from_file_location('word_reader',
    Path(__file__).with_name('docx-next-word-acceptance-23okt.py'))
reader = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(reader)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def distinct_files(paths):
    for index, path in enumerate(paths):
        for other in paths[:index]:
            if path.resolve() == other.resolve() or path.samefile(other):
                raise ValueError('Use separate source, first-save and second-save files')


def preservation(before, after):
    comparison = reader.compare(before, after)
    controls = comparison['instances']
    inventory = picture_inventory(after, PICTURES)
    images = compare_image_data(picture_inventory(before, PICTURES), inventory)
    fields = bool(controls) and not comparison['addedFieldIds'] and all(
        row['matchStatus'] == 'MATCHED' and row['fieldTokensUnchanged']
        and row['canonicalStoryRolesUnchanged'] and row['controlNestingUnchanged']
        for row in controls)
    # Exact crop markup is a separate package claim, not visible equivalence.
    crop = len(comparison['pictures']) == 1 and all(
        row['exactCropMarkupUnchanged'] for row in comparison['pictures'])
    structural = (comparison['sectionCounts']['source'] == comparison['sectionCounts']['saved']
        and not any(comparison['trackedRevisionMarkupCount'].values())
        and not any(comparison['duplicateNativeSdtIds'].values())
        and not any(comparison['invalidNativeSdtIds'].values()))
    checks = {'canonicalFields': fields, 'pictureOwnership': inventory['status'] == 'pass',
              'originalImageData': images['status'] == 'pass', 'exactCropMarkup': crop,
              'sectionAndRevisionContract': structural}
    return {'exactPackageContract': 'pass' if all(checks.values()) else 'fail',
            'checks': checks, 'pictureInventory': inventory, 'imageData': images,
            'comparison': comparison}


def audit(first_save, second_save):
    paths = [SOURCE, Path(first_save), Path(second_save)]
    distinct_files(paths)
    hashes = [sha(path) for path in paths]
    if hashes[0] != SOURCE_SHA256:
        raise ValueError('Immutable synthetic source hash differs')
    if picture_inventory(SOURCE, PICTURES)['status'] != 'pass':
        raise ValueError('Source picture contract is invalid')
    comparisons = {
        'sourceToFirstSave': preservation(paths[0], paths[1]),
        'sourceToSecondSave': preservation(paths[0], paths[2]),
        'firstToSecondSave': preservation(paths[1], paths[2]),
    }
    if hashes != [sha(path) for path in paths]:
        raise ValueError('An input changed during inspection; close Office and retry')
    return {'scope': 'Read-only package inspection of two supplied return files',
            'inputs': [{'phase': phase, 'file': path.name, 'sha256': digest}
                       for phase, path, digest in zip(('source', 'saved1', 'saved2'), paths, hashes)],
            'allInputsByteIdentical': len(set(hashes)) == 1,
            'comparisons': comparisons,
            'exactPackageContract': 'pass' if all(row['exactPackageContract'] == 'pass'
                for row in comparisons.values()) else 'fail',
            'wordAcceptance': 'UNVERIFIED', 'saveReopenPerformedByThisTool': False,
            'nativeLoads': 0, 'nativeSaves': 0,
            'limits': [
                'Supplied files and application metadata do not prove Word execution or save/reopen order.',
                'Byte-identical copies can pass the package contract without any native execution.',
                'No native control ranges, editing behavior, visible photo crop, layout or pagination are measured.',
                'Exact crop markup changes require review; they do not alone prove a visible change.',
                'No production or template acceptance is granted.',
            ]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('first_save', type=Path)
    parser.add_argument('second_save', type=Path)
    parser.add_argument('report', type=Path, help='New JSON file; existing files are never overwritten')
    args = parser.parse_args()
    if args.report.exists() or args.report.is_symlink():
        parser.error('Report already exists; choose a new output path')
    result = audit(args.first_save, args.second_save)
    with args.report.open('x', encoding='utf-8') as stream:
        json.dump(result, stream, ensure_ascii=False, indent=2)
        stream.write('\n')
    print(json.dumps({key: result[key] for key in
        ('exactPackageContract', 'allInputsByteIdentical', 'wordAcceptance', 'nativeSaves')}))
    return 0 if result['exactPackageContract'] == 'pass' else 1


if __name__ == '__main__':
    raise SystemExit(main())
