"""Template evidence: all long contact lines remain visibly on the authored native column color."""
import argparse
import json
from pathlib import Path
import fitz


def check(path):
    lines = []
    pages = []
    with fitz.open(path) as document:
        for index, page in enumerate(document):
            spans = [s for b in page.get_text('dict')['blocks'] for line in b.get('lines', [])
                     for s in line['spans'] if s['text'].startswith('Kontaktzeile ')]
            if not spans:
                continue
            image = page.get_pixmap(alpha=False)
            for span in spans:
                # A point in the native cell padding, immediately beside the actual text.
                x = round(span['bbox'][0] - 4)
                y = round((span['bbox'][1] + span['bbox'][3]) / 2)
                actual = image.pixel(x, y)[:3]
                assert max(abs(a - b) for a, b in zip(actual, (140, 63, 40))) <= 4, (path.name, index + 1, span['text'], actual)
                lines.append(span['text'].strip())
            pages.append(index + 1)
    assert len(lines) == 60, f'{path}: lost long contact lines'
    assert all(f'Kontaktzeile {number}:' in line for number, line in enumerate(lines, 1)), lines
    return {'contactLines': len(lines), 'pages': pages, 'visibleColumnColor': 'pass'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    args = parser.parse_args()
    root = args.directory / 'terracotta-contact-long-qa'
    result = {'source': check(root / 'terracotta-contact-long.pdf'),
              'saved': check(root / 'roundtrip-pdf/terracotta-contact-long.pdf')}
    (args.directory / 'kolumne-visible-contact-report.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result))
