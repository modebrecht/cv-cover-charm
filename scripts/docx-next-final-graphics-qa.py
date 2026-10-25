"""Bounded template visual checks supplement the existing native source/save QA."""
import argparse
import json
from pathlib import Path
import fitz

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('directory', type=Path)
parser.add_argument('--observe', action='store_true', help='Record the stopped proposal as negative evidence; never approves it')
args = parser.parse_args()
manifest = json.loads((args.directory / 'manifest.json').read_text())
rows = []
failures = []
for fixture in manifest:
    key = fixture['fixture']
    if not key.startswith('aurora-'):
        continue
    folder = args.directory / (key + '-qa')
    for stage, pdf in [('source', folder / (key + '.pdf')),
                       ('saved', folder / 'roundtrip-pdf' / (key + '.pdf'))]:
        document = fitz.open(pdf)
        spans = [span for block in document[0].get_text('dict')['blocks'] if block['type'] == 0
                 for line in block['lines'] for span in line['spans'] if span['text'].strip()]
        white_hero = [span for span in spans if span['color'] == 0xffffff and 'Lehrbeginn' not in span['text']]
        assert white_hero, f'{key}/{stage}: missing editable white hero text'
        escaped = [span for span in white_hero if span['bbox'][3] / (72 / 25.4) >= 128]
        if escaped:
            failures.append({'fixture': key, 'stage': stage, 'failure': 'white editable hero text on white paper outside fixed gradient',
                             'spans': [{'text': span['text'], 'bottomMm': span['bbox'][3] / (72 / 25.4)} for span in escaped]})
        names = [span for span in spans if 'Lea' in span['text'] or 'Herozeile 1:' in span['text']]
        assert names and all(span['bbox'][1] / (72 / 25.4) >= 128 for span in names), f'{key}/{stage}: name must start on paper after the fixed hero'
        if key in ('aurora-normal', 'aurora-images', 'aurora-long-values'):
            cv_start = fixture['parts'][0]['expectedPages'] + fixture['parts'][1]['expectedPages']
            header = [span for block in document[cv_start].get_text('dict')['blocks'] if block['type'] == 0
                      for line in block['lines'] for span in line['spans'] if 'Lea' in span['text'] and span['bbox'][1] < 40 * 72 / 25.4]
            assert header and min(span['bbox'][1] for span in header) / (72 / 25.4) >= 16, f'{key}/{stage}: default contact chrome collides with Aurora rail'
        rows.append({'fixture': key, 'stage': stage, 'fixedHeroContrastAndNamePlacement': 'fail' if escaped else 'pass'})
report = {'result': 'blocked' if failures else 'bounded pass', 'failures': failures, 'checks': len(rows), 'fixtures': rows, 'unboundedGrowingHero': 'not claimed: app source fixes height at 128 mm'}
(args.directory / 'template-visual-report.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'checks': len(rows), 'failures': len(failures), 'result': report['result']}))
assert args.observe or not failures, 'Aurora fixed hero loses visible semantic text; proposal remains stopped'
