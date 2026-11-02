"""Bounded native check for two synthetic detached body-story candidates.

Keeps source/save1/save2 package identities and visible fields separate from
product or Microsoft Word acceptance. No photo/22-case approval is inferred.
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
import unicodedata
from zipfile import ZipFile, BadZipFile
import fitz

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('body_qa', Path(__file__).with_name('docx-next-sidebar-body-qa.py'))
body = importlib.util.module_from_spec(spec)
spec.loader.exec_module(body)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def compact(text):
    return ''.join(c for c in unicodedata.normalize('NFKD', text.casefold()) if c.isalnum())


def require_source(source, metadata):
    expected = {'body-long-left', 'body-long-right'}
    assert {r['id'] for r in metadata['cases']} == expected and len(metadata['cases']) == 2, 'Unexpected candidate matrix'
    assert metadata['sha'] == os.environ.get('GITHUB_SHA', metadata['sha']), 'Mixed source/implementation SHA'
    baseline = json.loads((ROOT/'tests/fixtures/docx-next/word-consolidation-baseline.json').read_text())
    assert metadata['baseline_commit'] == baseline['baseline_commit'], 'Baseline implementation differs'
    assert metadata['normal_packages_identical'] == 8 and metadata['normal_package_sha256'] == baseline['normal_package_sha256'], 'Normal export bytes changed'
    for row in metadata['cases']:
        path = source/(row['id']+'.docx')
        assert digest(path) == row['sha256'], 'Candidate source hash differs'
        body.check_cell_start_attachments(path, False)


def source_lanes(path):
    # Use the declared source grid, not inferred PDF word positions.
    with ZipFile(path) as archive:
        root = body.ET.fromstring(archive.read('word/document.xml'))
    ns = {'w': body.W[1:-1]}
    margins = root.find('w:body/w:sectPr/w:pgMar', ns)
    left = int(margins.get(body.W+'left')) * 25.4 / 1440
    table = next(t for t in root.findall('w:body/w:tbl', ns)
                 if (caption := t.find('w:tblPr/w:tblCaption', ns)) is not None
                 and caption.get(body.W+'val') == 'cv.sidebar')
    widths = [int(c.get(body.W+'w'))*25.4/1440 for c in table.findall('w:tblGrid/w:gridCol', ns)]
    assert len(widths) == 3 and all(w > 0 for w in widths), 'Invalid source grid'
    return [(left, left+widths[0]), (left+sum(widths[:2]), left+sum(widths))]


def visible_fields(fields, pdf, lanes=()):
    with fitz.open(pdf) as doc:
        streams = [compact(''.join(page.get_text() for page in doc))]
        for left, right in lanes:
            streams.append(compact(''.join(page.get_text(clip=fitz.Rect(
                (left-.75)*72/25.4, 0, (right+.75)*72/25.4, page.rect.height)) for page in doc)))
        pages = len(doc)
        for page in doc:
            assert page.get_text().strip(), 'Unexpected blank page'
    missing = [key for key, value in fields.items()
               if compact(value) and not any(compact(value) in text for text in streams)]
    return pages, missing


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source-dir', type=Path, required=True)
    p.add_argument('--out-dir', type=Path, required=True)
    p.add_argument('--libreoffice', default='libreoffice')
    a = p.parse_args(argv)
    source, out = a.source_dir.resolve(), a.out_dir.resolve()
    out.mkdir(parents=True, exist_ok=True)
    report = {'status':'BLOCKED', 'production_acceptance':'BLOCKED', 'microsoft_word_accepted':False,
              'scope':'Two long non-photo body-story candidates, each source and two native save cycles; not the full 22-case/photo matrix',
              'cases':[], 'conversions':[]}

    def convert(input_path, folder, kind):
        folder.mkdir(parents=True, exist_ok=True)
        result = folder/(input_path.stem+'.'+kind)
        assert not result.exists() and input_path.resolve() != result.resolve(), 'Refusing source/output overwrite'
        profile = folder/'profile'
        command = [a.libreoffice,'--headless','--nologo','--nodefault','--nofirststartwizard',
                   '-env:UserInstallation='+profile.as_uri(),'--convert-to',
                   'docx:Office Open XML Text' if kind == 'docx' else 'pdf', '--outdir',str(folder),str(input_path)]
        timing = folder/'resources.json'
        if Path('/usr/bin/time').exists():
            command = ['/usr/bin/time','-f','{"max_rss_kib":%M,"seconds":%e,"exit_code":%x}','-o',str(timing),*command]
        start = time.monotonic()
        with (folder/'conversion.log').open('w') as log:
            process = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT, timeout=60)
        resource = {'id':str(folder.relative_to(out)), 'seconds':round(time.monotonic()-start,3), 'exit_code':process.returncode}
        if timing.exists():
            resource.update(json.loads(next(line for line in timing.read_text().splitlines() if line.startswith('{'))))
        report['conversions'].append(resource)
        assert process.returncode == 0 and result.is_file() and result.stat().st_size > 1000, 'Native conversion failed: '+resource['id']
        shutil.rmtree(profile, ignore_errors=True)
        return result

    try:
        metadata = json.loads((source/'MANIFEST.json').read_text())
        require_source(source, metadata)
        report.update(implementation_sha=metadata['sha'], baseline_commit=metadata['baseline_commit'],
                      normal_packages_identical=metadata['normal_packages_identical'],
                      converter_version=subprocess.check_output([a.libreoffice,'--version'],text=True,timeout=10).strip())
        for meta in metadata['cases']:
            original = source/(meta['id']+'.docx')
            original_hash = digest(original)
            expected = body.package_controls(original)
            lanes = source_lanes(original)
            folder = out/meta['id']
            saved = convert(original,folder/'save1','docx')
            saved2 = convert(saved,folder/'save2','docx')
            row = {'id':meta['id'],'status':'BLOCKED','phases':[]}
            report['cases'].append(row)
            page_counts = []
            for label, path in [('source',original),('save1',saved),('save2',saved2)]:
                observed = body.package_controls(path)
                assert observed == expected and list(observed[0]) == list(expected[0]), 'Serialized field identities/text/order changed'
                pdf = convert(path,folder/(label+'-pdf'),'pdf')
                pages, missing = visible_fields(expected[1],pdf,lanes)
                row['phases'].append({'phase':label,'docx_sha256':digest(path),'pdf_sha256':digest(pdf),
                                     'pages':pages,'body_fields':len(observed[0]),'all_fields':len(observed[1]),'missing_visible_fields':missing})
                assert not missing, 'Visible fields lost: '+str(missing[:6])
                page_counts.append(pages)
                with fitz.open(pdf) as doc:
                    # One overview per native phase, retained for human inspection.
                    thumbs = []
                    from PIL import Image
                    for page in doc:
                        pix = page.get_pixmap(matrix=fitz.Matrix(.35,.35),alpha=False)
                        thumbs.append(Image.frombytes('RGB',(pix.width,pix.height),pix.samples))
                    sheet = Image.new('RGB',(thumbs[0].width,len(thumbs)*thumbs[0].height),'white')
                    for i, im in enumerate(thumbs):sheet.paste(im,(0,i*im.height))
                    sheet.save(folder/(label+'-overview.jpg'),quality=85)
            assert len(set(page_counts)) == 1, 'Page count changed across saves'
            assert digest(original) == original_hash, 'Original source changed'
            row.update(status='PASS', source_unchanged=True)
        report['status'] = 'PASS' if len(report['cases']) == 2 and all(c['status']=='PASS' for c in report['cases']) else 'FAIL'
    except (AssertionError,OSError,ValueError,KeyError,BadZipFile,subprocess.SubprocessError) as exc:
        report['error'] = str(exc)
    finally:
        (out/'RESULTS.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
        summary=['# Word/body-story consolidation smoke','',report['scope'],'',
                 '| Case | Source/save1/save2 |', '|---|---|']
        summary += [f"| {r['id']} | {r['status']} |" for r in report['cases']]
        summary += ['', 'Bounded native check: **'+report['status']+'**',
                    'Product/Word acceptance: **BLOCKED**', 'Conversions: '+str(len(report['conversions']))]
        if report.get('error'):summary+=['',report['error']]
        (out/'SUMMARY.md').write_text('\n'.join(summary)+'\n')
    return 0 if report['status']=='PASS' else 1


if __name__ == '__main__':raise SystemExit(main())
