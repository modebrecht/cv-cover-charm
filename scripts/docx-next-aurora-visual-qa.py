"""Bounded contrast/readability check for the approved Aurora solid hero adaptation."""
import argparse
import json
import statistics
from pathlib import Path
import fitz

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('directory', type=Path)
parser.add_argument('--contrast-only', action='store_true', help='Historical fixed-hero negative control only; does not certify the new stripe')
args = parser.parse_args()
rows = []
for fixture in json.loads((args.directory / 'manifest.json').read_text()):
    key = fixture['fixture']
    assert key.startswith('aurora-')
    root = args.directory / (key + '-qa')
    for stage, pdf in [('source', root / (key + '.pdf')), ('saved', root / 'roundtrip-pdf' / (key + '.pdf'))]:
        document = fitz.open(pdf)
        cover_pages = fixture['parts'][0]['expectedPages']
        if not args.contrast_only:
            stripe = next(shape for shape in fixture['parts'][0]['pageScopedShapes'] if shape['id'].endswith('motif.first:1'))
            fill = stripe['fill']
            a, b = fill['color'], fill['endColor']
            expected = tuple(round((int(a[i:i+2], 16) + int(b[i:i+2], 16)) / 2) for i in (0, 2, 4))
            pixel = document[0].get_pixmap(matrix=fitz.Matrix(4, 4), alpha=False)
            # A symmetric interior patch averages PDF image resampling/chroma artifacts.
            # The analytic mean of this linear gradient patch is still its midpoint.
            samples = [pixel.pixel(round(x * 72 / 25.4 * 4), round(y * 72 / 25.4 * 4))
                       for x in (9, 9.25, 9.5, 9.75, 10, 10.25, 10.5, 10.75, 11)
                       for y in (150.5, 150.65, 150.8, 150.95, 151.1)]
            actual = tuple(round(statistics.mean(sample[i] for sample in samples)) for i in range(3))
            assert max(abs(a-b) for a, b in zip(actual[:3], expected)) <= 4, f'{key}/{stage}: lost gutter stripe'
            gutter = fitz.Rect(*(value * 72 / 25.4 for value in (4, 150, 16, 151.6)))
            for block in document[0].get_text('dict')['blocks']:
                if block['type'] == 0:
                    for line in block['lines']:
                        for span in line['spans']:
                            assert not fitz.Rect(span['bbox']).intersects(gutter), f'{key}/{stage}: stripe overlaps editable text'
    
        title_lines, white_count = set(), 0
        for page in list(document)[:cover_pages]:
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
            for block in page.get_text('dict')['blocks']:
                if block['type'] != 0:
                    continue
                for line in block['lines']:
                    for span in line['spans']:
                        if not span['text'].strip():
                            continue
                        if 'Berufszeile' in span['text']:
                            title_lines.add(span['text'].split(':')[0].strip())
                        if span['color'] != 0xffffff:
                            continue
                        # Sample the backing just outside the text ink inside its native cell.
                        x = max(0, min(pix.width - 1, round((span['bbox'][0] - 1.5) * 2)))
                        y = max(0, min(pix.height - 1, round((span['bbox'][1] + span['bbox'][3]) * 1)))
                        rgb = pix.pixel(x, y)
                        assert min(rgb[:3]) < 235, f'{key}/{stage}: white text on white backing: {span["text"]}'
                        white_count += 1
        if key.endswith('title-long') or key.endswith('title-pages'):
            expected = 36 if key.endswith('title-pages') else 5
            assert {f'Berufszeile {i}' for i in range(1, expected + 1)} <= title_lines, f'{key}/{stage}: clipped title lines'
        assert white_count > 0, f'{key}/{stage}: missing white editable text'
        rows.append({'fixture': key, 'stage': stage, 'whiteSpansOnVisibleBacking': white_count, 'titleLines': len(title_lines), 'coverPages': cover_pages})
report = {'result': 'bounded pass; Microsoft Word acceptance pending', 'checks': len(rows), 'fixtures': rows}
(args.directory / 'aurora-visual-report.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'result': report['result'], 'checks': len(rows)}))
