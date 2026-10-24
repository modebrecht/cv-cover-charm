"""Read the four normal App PDFs; source text presence alone is not visible ink."""
import argparse
import hashlib
import json
import re
import unicodedata
from pathlib import Path

import fitz
from PIL import Image


def compact(text):
    return re.sub(r'\s+', '', unicodedata.normalize('NFKC', text))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('folder', type=Path)
    args = parser.parse_args()
    folder = args.folder.resolve()
    report = folder/'pdf-evidence.json'
    if report.exists():
        parser.error('Use a fresh report; previous evidence is never overwritten')
    browser = json.loads((folder/'browser-evidence.json').read_text())
    expected = {'left-sidebar', 'left-half-main', 'right-sidebar', 'right-half-main'}
    rows = browser['rows']
    assert len(rows) == 4 and {row['id'] for row in rows} == expected
    results = []
    for row in rows:
        pdf = folder/row['id']/'App.pdf'
        assert hashlib.sha256(pdf.read_bytes()).hexdigest() == row['pdfSha256']
        assert row['cvPages'] == row['letterPages'] == 1
        with fitz.open(pdf) as document:
            assert len(document) == 3
            text = compact(''.join(page.get_text() for page in document))
            page = document[2]
            pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
            image = Image.frombytes('RGB', (pixmap.width, pixmap.height), pixmap.samples)
            fields = []
            for field in row['fields']:
                count = text.count(compact(field['expected']))
                assert count == 1, (row['id'], field['key'], count)
                left = field['xMm']*pixmap.width/210
                top = field['yMm']*pixmap.height/297
                right = (field['xMm']+field['widthMm'])*pixmap.width/210
                bottom = (field['yMm']+field['heightMm'])*pixmap.height/297
                box = (max(0, int(left)), max(0, int(top)), min(pixmap.width, int(right)+1), min(pixmap.height, int(bottom)+1))
                crop = image.crop(box)
                dark = sum(max(crop.getpixel((x, y))) < 180
                           for y in range(crop.height) for x in range(crop.width))
                assert dark > 5, (row['id'], field['key'], 'no visible field ink')
                fields.append({'key':field['key'], 'searchableOccurrences':count, 'darkPixelsInBrowserFieldBox':dark})
            png = folder/row['id']/'pdf-cv-page-3.png'
            pixmap.save(png)
            results.append({'id':row['id'], 'dossierPages':len(document), 'cvDossierPage':3,
                            'pdfSha256':row['pdfSha256'], 'cvRenderSha256':hashlib.sha256(png.read_bytes()).hexdigest(),
                            'fields':fields})
    result = {'cases':results, 'visibleInkIsOnlyABoundedCheck':True,
              'manualVisualReviewStillRequired':True, 'wordAcceptance':'UNVERIFIED'}
    report.write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps({'cases':len(results), 'fields':sum(len(r['fields']) for r in results),
                      'dossierPages':sum(r['dossierPages'] for r in results), 'wordAcceptance':'UNVERIFIED'}))


if __name__ == '__main__':
    main()
