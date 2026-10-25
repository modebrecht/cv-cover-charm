"""Read-only local/stable and source/saved pixel inventories; no acceptance or image edits."""
import argparse
import json
from pathlib import Path
from docx_next_raster_qa import pixel_digest


def inventory(directory):
    report = json.loads((directory / 'container-span-report.json').read_text())
    files = {}
    changes = []
    for row in report['fixtures']:
        if row['execution'] != 'rendered':
            continue
        work = directory / (row['fixture'] + '-qa')
        assert row['render']['pages'] == row['saveReopen']['pages']
        changed = []
        for page in range(1, row['render']['pages'] + 1):
            pair = []
            for phase in ['source', 'saved']:
                path = work / f'{phase}-page-{page}.png'
                digest = pixel_digest(path)
                files[str(path.relative_to(directory))] = digest
                pair.append(digest)
            if pair[0] != pair[1]:
                changed.append(page)
        changes.append({'fixture': row['fixture'], 'sourceSavedChangedPages': changed})
    assert set(files) == {str(path.relative_to(directory)) for path in directory.rglob('*-page-*.png')}, 'Changed rendered page inventory'
    return files, changes


def audit(local, stable):
    before, local_changes = inventory(local)
    after, stable_changes = inventory(stable)
    assert before.keys() == after.keys(), 'Changed actual page inventory'
    different = [name for name in before if before[name] != after[name]]
    cv = [name for name in before if int(Path(name).stem.rsplit('-', 1)[1]) >= 3]
    return {'method': 'SHA-256 of dimensions and every normalized RGBA channel byte',
            'comparedPages': len(before), 'differentPages': different,
            'cvPages': len(cv), 'differentCvPages': [name for name in different if name in cv],
            'newStablePixelVariants': len(set(after.values()) - set(before.values())),
            'localSourceSaved': local_changes, 'stableSourceSaved': stable_changes,
            'architectureAcceptance': 'not inferred; exact native grid and caption failures remain separate'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('local', type=Path)
    parser.add_argument('stable', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    result = audit(args.local, args.stable)
    args.output.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({key: value for key, value in result.items() if key not in ['differentPages', 'localSourceSaved', 'stableSourceSaved']}))
