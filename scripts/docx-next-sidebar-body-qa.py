"""Independent app-snapshot content and native Save/Reopen gate; no historical sampling dependency."""
import argparse
import hashlib
import importlib.util
import json
import posixpath
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
from xml.etree import ElementTree as ET
from zipfile import ZipFile

import fitz
import numpy as np
from docx_next_story_qa import W, text_value, visible_story

REPO = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('entry_flow', Path(__file__).with_name('docx-next-entry-flow-qa.py'))
entry = importlib.util.module_from_spec(spec); spec.loader.exec_module(entry)
NAMES = ['app-body-' + name for name in (
    'both-long', 'both-long-right', 'left', 'right', 'paragraph-long', 'side-paragraph-long',
    'side-entries-long', 'side-entries-smaller-body', 'placements', 'styled', 'photo-left',
    'photo-right', 'photo-main', 'photo-free-main', 'photo-free-side', 'photo-free-mirrored-side',
    'photo-free-low', 'photo-free-portrait', 'photo-free-chrome', 'contact-long',
    'chrome-continuation', 'chrome-leading')]
MM = 72 / 25.4


def package_controls(path):
    stories = {}
    with ZipFile(path) as archive:
        types = ET.fromstring(archive.read('[Content_Types].xml'))
        declared = {item.get('PartName').lstrip('/') for item in types
                    if item.get('ContentType', '').endswith(('.header+xml', '.footer+xml'))}
        document = ET.fromstring(archive.read('word/document.xml'))
        relations = {item.get('Id'):posixpath.normpath(posixpath.join('word',item.get('Target')))
                     for item in ET.fromstring(archive.read('word/_rels/document.xml.rels'))}
        settings = ET.fromstring(archive.read('word/settings.xml'))
        def enabled(node): return node is not None and node.get(W+'val','1') not in ('0','false','off')
        even = enabled(settings.find(W+'evenAndOddHeaders'))
        active = set()
        for section in document.iter(W+'sectPr'):
            first = enabled(section.find(W+'titlePg'))
            for reference in section:
                if reference.tag not in (W+'headerReference',W+'footerReference'): continue
                kind = reference.get(W+'type')
                if kind == 'default' or (kind == 'first' and first) or (kind == 'even' and even):
                    active.add(relations[reference.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')])
        assert active <= declared, 'Active story has an invalid content type'
        story_parts = {'word/document.xml'} | active
        assert story_parts <= set(archive.namelist()), 'Missing declared package story'
        for name in archive.namelist():
            if name in story_parts:
                records = {}
                for node in ET.fromstring(archive.read(name)).iter(W + 'sdt'):
                    tag = node.find(W + 'sdtPr/' + W + 'tag')
                    assert tag is not None and tag.get(W + 'val') not in records
                    records[tag.get(W + 'val')] = text_value(node)
                stories[name] = records
    # Header part filenames may change on save; canonical identities must not.
    all_fields = {}
    for records in stories.values():
        for tag, text in records.items():
            assert tag not in all_fields, 'Duplicated package canonical field'
            all_fields[tag] = text
    return stories['word/document.xml'], all_fields


def convert(engine, source, target, kind):
    with tempfile.TemporaryDirectory(prefix='docx-next-app-body-') as temporary:
        profile = Path(temporary)
        copy, output = profile / source.name, profile / target.name
        shutil.copyfile(source, copy)
        process = subprocess.run([str(engine / 'lo-kit'), profile.as_uri(), copy.as_uri(), output.as_uri(), kind],
                                 capture_output=True, text=True, timeout=60)
        assert process.returncode == 0 and output.is_file(), process.stderr
        shutil.copyfile(output, target)


def photo_pixels(page):
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    pixels = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3]
    r, g, b = (pixels[:, :, index] for index in range(3))
    mask = ((r > 170) & (g < 100) & (b < 100)) | ((b > 170) & (r < 80) & (g < 150))
    y, x = np.nonzero(mask)
    if not len(x):
        return None
    return {'page': page.number + 1, 'pixels': int(len(x)),
            'bboxMm': [float(x.min() / (2 * MM)), float(y.min() / (2 * MM)),
                       float((x.max() + 1) / (2 * MM)), float((y.max() + 1) / (2 * MM))]}


def audit(folder, engine, binding, replay_existing=False):
    report = {'scope': 'Shared application snapshot/model/export body composition', 'cases': [],
              'contentRoundtripAcceptance': 'pending', 'geometryAcceptance': 'unaccepted',
              'productionAcceptance': 'blocked', 'microsoftWordAccepted': 0,
              'executionMode': 'read-only replay where retained inputs and native hashes match' if replay_existing else 'fresh native Save/Reopen, imports and PDF exports',
              'importObjectLifetime': 'unmeasured; final semantic identity checked'}
    report_path = folder / 'app-body-report.json'
    def retain(): report_path.write_text(json.dumps(report, indent=2) + '\n')
    try:
        assert json.loads((folder / 'manifest.json').read_text()) == NAMES, 'Incomplete app matrix'
        for name in NAMES:
            fixture = json.loads((folder / (name + '.json')).read_text())
            assert fixture['sharedSnapshotExport'] and fixture['bodyBoundaryKeepNext']
            assert fixture['paragraphPoliciesUnchanged'] and fixture['existingStoryPartsUnchanged']
            source = folder / (name + '.docx')
            assert entry.sha(source) == fixture['sourceSha256']
            expected_body, expected_all = package_controls(source)
            for paragraph in fixture['nativeParagraphs']:
                assert expected_body[paragraph['fieldId']] == paragraph['text']
            case = {'fixture': name, 'sourceSha256': entry.sha(source), 'bodyControls': len(expected_body),
                    'allStoryControls': len(expected_all), 'addedFirstFooterStories':fixture['addedFirstFooterStories'],
                    'normalizer': fixture['sourceImageNormalizer'], 'phases': []}
            report['cases'].append(case); retain()
            saved, saved2 = folder / (name + '-saved.docx'), folder / (name + '-saved2.docx')
            cached_native = folder / (name + '-native.json')
            replay_case = replay_existing and saved.is_file() and saved2.is_file() and cached_native.is_file()
            if not replay_case:
                convert(engine, source, saved, 'docx'); convert(engine, saved, saved2, 'docx')
            requests = []
            for phase, docx in [('source', source), ('saved', saved), ('saved2', saved2)]:
                actual_body, actual_all = package_controls(docx)
                assert actual_body == expected_body and list(actual_body) == list(expected_body), 'Serialized body text/IDs/order changed'
                assert actual_all == expected_all, 'Serialized header/footer text or IDs changed'
                requests.append({'fixture': name, 'phase': phase, 'path': str(docx.resolve()), 'sha256': entry.sha(docx),
                                 'canonicalOwnerFieldIds': fixture['canonicalOwnerFieldIds'],
                                 'nativeStoryCells': {label: ('A1' if index == 0 else 'C1')
                                                      for label, index in fixture['declaredStoryCells'].items()}})
            if replay_case:
                observation = json.loads(cached_native.read_text())
                assert all(native['inputSha256'] == request['sha256'] and native['phase'] == request['phase'] and
                           native['canonicalOwnerFieldIds'] == request['canonicalOwnerFieldIds']
                           for request,native in zip(requests,observation['cases'])), 'Retained native input hash or scope changed'
            else:
                with tempfile.TemporaryDirectory(prefix='docx-next-app-body-observe-') as temporary:
                    request_path = Path(temporary) / 'requests.json'; request_path.write_text(json.dumps(requests))
                    process = subprocess.run([sys.executable, str(REPO / 'scripts/docx-next-body-node-worker.py'), str(request_path)],
                                             env=entry.native_environment(engine, binding), capture_output=True, text=True, timeout=90)
                    assert process.returncode == 0, process.stderr
                    observation = json.loads(process.stdout)
            (folder / (name + '-native.json')).write_text(json.dumps(observation, indent=2) + '\n')
            assert len(observation['cases']) == 3
            for request, native in zip(requests, observation['cases']):
                result = {'phase': request['phase'], 'nativeStories': {}, 'visibleStories': {}}
                case['phases'].append(result); retain()
                assert native['readOnly'] and not native['modified']
                inventory = {row['tag']: row['text'] for row in native['finalControls']}
                assert len(inventory) == len(native['finalControls']), 'Duplicate native tag'
                assert set(inventory) == set(expected_all), 'Native story fields missing or added'
                assert [key for key in inventory if key in expected_body] == list(expected_body), 'Native body field order changed'
                assert all(value.replace('\n', '').replace('\t', '') == inventory[tag].replace('\n', '').replace('\t', '')
                           for tag, value in expected_all.items()), 'Native field text changed'
                result['nativeControls'] = len(inventory)
                for label in ('main', 'side'):
                    result['nativeStories'][label] = visible_story(fixture[label + 'Text'],
                        [row['text'] for row in native['nativeStoryNodes'][label]])
                pdf_path = folder / (name + '-' + request['phase'] + '.pdf')
                if not replay_case or not pdf_path.is_file(): convert(engine, Path(request['path']), pdf_path, 'pdf')
                result['pdfSha256'] = entry.sha(pdf_path)
                with fitz.open(pdf_path) as pdf:
                    result.update(pdfPages=len(pdf), emptyCvPages=[], outOfBoundsWords=[], photos=[], imageFrames=[], chrome=[], bodyStarts=[])
                    m = fixture['margins']
                    for label in ('main', 'side'):
                        lane = fixture[label + 'Lane']
                        clip = fitz.Rect((lane['leftMm'] - .5) * MM, (m['top'] - .75) * MM,
                                         (lane['rightMm'] + .5) * MM, (297 - m['bottom'] + .75) * MM)
                        result['visibleStories'][label] = visible_story(fixture[label + 'Text'],
                            [page.get_text(clip=clip) for page in pdf[2:]])
                    body = fitz.Rect(0, (m['top'] - .75) * MM, 210 * MM, (297 - m['bottom'] + .75) * MM)
                    for page in pdf[2:]:
                        photo = photo_pixels(page) if fixture['pictures'] else None
                        if photo: result['photos'].append(photo)
                        for image in page.get_image_info():
                            result['imageFrames'].append({'page':page.number+1, 'bboxMm':[value/MM for value in image['bbox']]})
                        if not page.get_text(clip=body).strip() and not photo: result['emptyCvPages'].append(page.number + 1)
                        starts = [word[1]/MM for word in page.get_text('words',clip=body)]
                        if photo: starts.append(photo['bboxMm'][1])
                        if starts: result['bodyStarts'].append({'page':page.number+1,'topMm':min(starts)})
                        for word in page.get_text('words', clip=body):
                            horizontal = any(word[0] >= (fixture[label + 'Lane']['leftMm'] - .75) * MM and
                                             word[2] <= (fixture[label + 'Lane']['rightMm'] + .75) * MM for label in ('main', 'side'))
                            if not horizontal: result['outOfBoundsWords'].append({'page':page.number + 1, 'word':list(word)})
                        header_clip = fitz.Rect(0, 0, 210 * MM, (m['top'] - .75) * MM)
                        footer_clip = fitz.Rect(0, (297 - m['bottom'] + .75) * MM, 210 * MM, 297 * MM)
                        header_expected = fixture['firstHeaderText'] if page.number == 2 else fixture['headerText']
                        result['chrome'].append({'page':page.number + 1,
                            'header':visible_story(header_expected,[page.get_text(clip=header_clip)]),
                            'footer':visible_story(fixture['footerText'],[page.get_text(clip=footer_clip)])})
                retain()
                assert all(row['status'] == 'pass' for row in result['nativeStories'].values()), 'Native paragraph order/text failure'
                assert all(row['status'] == 'pass' for row in result['visibleStories'].values()), 'Complete visible story text/order failure'
                assert not result['emptyCvPages'], 'Empty CV page remains'
                assert not result['outOfBoundsWords'], 'Text outside its physical track'
                lead=fixture['bodyBoundaryLeadMm']
                assert lead == fixture['layout'].get('pagination',{}).get('firstPageLeadMm',0)
                if lead:
                    assert result['bodyStarts'][0]['page']==3 and result['bodyStarts'][0]['topMm'] >= m['top']+lead-.75, 'First-page inset was lost'
                    assert all(row['topMm'] <= m['top']+20 for row in result['bodyStarts'][1:]), 'First-page inset repeated on continuation'
                assert all(row['header']['status'] == row['footer']['status'] == 'pass' for row in result['chrome']), 'Header/footer visibility or page scope failure'
                assert len(result['photos']) == len(fixture['pictures']), 'Native photo missing, repeated or fragmented'
                assert len(result['imageFrames']) == len(fixture['pictures']), 'Native image frame count changed'
                for actual, frame, picture in zip(result['photos'], result['imageFrames'], fixture['pictures']):
                    lane = fixture[picture['story'] + 'Lane']; x0, y0, x1, y1 = actual['bboxMm']
                    assert x0 >= lane['leftMm'] - .75 and x1 <= lane['rightMm'] + .75, 'Visible photo exceeds its owner track'
                    assert y0 >= m['top'] - .75 and y1 <= 297 - m['bottom'] + .75, 'Visible photo exceeds printable height'
                    fx0, fy0, fx1, fy1 = frame['bboxMm']
                    assert abs(fx1-fx0-picture['widthMm']) < .1 and abs(fy1-fy0-picture['heightMm']) < .1, 'Native image frame dimensions changed'
                    border = picture['borderWidthMm']
                    assert picture['widthMm']-border-.25 <= x1-x0 <= picture['widthMm']+border+.25, 'Visible photo width exceeds declared frame and stroke'
                    assert picture['heightMm']-border-.25 <= y1-y0 <= picture['heightMm']+border+.25, 'Visible photo height exceeds declared frame and stroke'
                assert entry.sha(source) == fixture['sourceSha256']
            case['contentRoundtripAcceptance'] = 'pass'; retain()
        report['contentRoundtripAcceptance'] = 'pass'; retain()
        return report
    except Exception as error:
        report['contentRoundtripAcceptance'] = 'fail'; report['failure'] = type(error).__name__ + ': ' + str(error); retain()
        raise


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path); parser.add_argument('--engine', type=Path, required=True)
    parser.add_argument('--binding', type=Path, required=True)
    parser.add_argument('--replay-existing', action='store_true', help='Read-only local re-audit of retained native observations and exports; CI always uses fresh execution')
    args = parser.parse_args()
    result = audit(args.directory.resolve(), args.engine.resolve(), (args.binding / 'binding').resolve(), args.replay_existing)
    print(json.dumps({'cases':len(result['cases']), 'contentRoundtripAcceptance':result['contentRoundtripAcceptance']}))
