"""Product-facing content gate for whole body-table entries; independent of historical debugger sampling."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
from xml.etree import ElementTree as ET
from zipfile import ZipFile

import fitz
from docx_next_story_qa import W, text_value, visible_story

REPO = Path(__file__).resolve().parent.parent


def controls(path):
    with ZipFile(path) as archive:
        root = ET.fromstring(archive.read('word/document.xml'))
    result = {}
    for node in root.iter(W + 'sdt'):
        tag = node.find(W + 'sdtPr/' + W + 'tag')
        assert tag is not None
        key = tag.get(W + 'val')
        assert key and key not in result, 'Missing or duplicate canonical tag'
        result[key] = text_value(node)
    return result


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def native_environment(engine, binding):
    program = engine / 'usr/lib/libreoffice/program'
    env = os.environ.copy()
    env.update(LD_LIBRARY_PATH=':'.join((str(program), str(engine / 'usr/lib/x86_64-linux-gnu'), str(Path(sys.executable).resolve().parent.parent / 'lib'))),
               PYTHONPATH=':'.join((str(binding / 'usr/lib/libreoffice/program'), str(binding / 'usr/lib/python3/dist-packages'))),
               DOCX_NEXT_LO_ROOT=str(engine), DOCX_NEXT_UNO_BINDING=str(binding), SAL_USE_VCLPLUGIN='svp', LOK_ALLOWLIST_LANGUAGES='de-DE en-US')
    return env


def audit(folder, engine, binding):
    report = {'scope': 'Whole native paragraphs; no nested keep-together entry tables', 'cases': [],
              'contentRoundtripAcceptance': 'pending', 'geometryAcceptance': 'unaccepted',
              'productionAcceptance': 'blocked', 'microsoftWordAccepted': 0,
              'importObjectLifetime': 'unmeasured; final semantic identity checked'}
    report_path = folder / 'entry-flow-report.json'
    def retain():
        report_path.write_text(json.dumps(report, indent=2) + '\n')
    def convert(source, target, kind):
        with tempfile.TemporaryDirectory(prefix='docx-next-entry-flow-') as temporary:
            profile = Path(temporary)
            copy, output = profile / source.name, profile / target.name
            shutil.copyfile(source, copy)
            p = subprocess.run([str(engine / 'lo-kit'), profile.as_uri(), copy.as_uri(), output.as_uri(), kind],
                               capture_output=True, text=True, timeout=60)
            assert p.returncode == 0 and output.is_file(), p.stderr
            shutil.copyfile(output, target)
    try:
        names = json.loads((folder / 'manifest.json').read_text())
        assert names == ['entry-flow-left-both-long', 'entry-flow-right-both-long',
                         'entry-flow-left-left', 'entry-flow-left-side-long',
                         'entry-flow-right-left', 'entry-flow-right-side-long'], 'Missing or reordered content matrix'
        for name in names:
            fixture = json.loads((folder / (name + '.json')).read_text())
            source = folder / (name + '.docx')
            assert sha(source) == fixture['sourceSha256']
            expected = controls(source)
            required = 382 if name.endswith('both-long') else 129 if name.endswith('side-long') else 77
            assert len(expected) == required, 'Incomplete serialized source control inventory'
            assert len(fixture['mainText']) == (279 if name.endswith('both-long') else 26)
            assert len(fixture['sideText']) == (21 if name.endswith('-left') else 73)
            case = {'fixture': name, 'sourceSha256': sha(source), 'controls': len(expected),
                    'removedEntryTables': len(fixture['removedEntryTables']), 'phases': []}
            report['cases'].append(case)
            retain()
            saved, saved2 = folder / (name + '-saved.docx'), folder / (name + '-saved2.docx')
            convert(source, saved, 'docx'); convert(saved, saved2, 'docx')
            requests = []
            for phase, docx in [('source', source), ('saved', saved), ('saved2', saved2)]:
                actual = controls(docx)
                assert list(actual) == list(expected) and actual == expected, 'Serialized field text/order lost on Save/Reopen'
                requests.append({'fixture': name, 'phase': phase, 'path': str(docx.resolve()), 'sha256': sha(docx),
                                 'canonicalOwnerFieldIds': [row['fieldId'] for row in fixture['nativeParagraphs']],
                                 'nativeStoryCells': {label: ('A1' if index == 0 else 'C1')
                                                      for label, index in fixture['declaredStoryCells'].items()}})
            with tempfile.TemporaryDirectory(prefix='docx-next-entry-flow-observe-') as temporary:
                request_path = Path(temporary) / 'requests.json'
                request_path.write_text(json.dumps(requests))
                p = subprocess.run([sys.executable, str(REPO / 'scripts/docx-next-body-node-worker.py'), str(request_path)],
                                   env=native_environment(engine, binding), capture_output=True, text=True, timeout=90)
                assert p.returncode == 0, p.stderr
                observation = json.loads(p.stdout)
            (folder / (name + '-native.json')).write_text(json.dumps(observation, indent=2) + '\n')
            assert len(observation['cases']) == 3
            for request, native in zip(requests, observation['cases']):
                phase = request['phase']
                result = {'phase': phase, 'nativeControls': len(native['finalControls']),
                          'nativeStories': {}, 'visibleStories': {}}
                case['phases'].append(result)
                assert native['readOnly'] and not native['modified']
                inventory = {row['tag']: row['text'] for row in native['finalControls']}
                assert list(inventory) == list(expected), 'Native tags missing, duplicated or reordered'
                assert all(inventory[tag].replace('\n', '').replace('\t', '') == value.replace('\n', '').replace('\t', '')
                           for tag, value in expected.items()), 'Native field text changed'
                for label in ('main', 'side'):
                    result['nativeStories'][label] = visible_story(fixture[label + 'Text'],
                        [row['text'] for row in native['nativeStoryNodes'][label]])
                pdf_path = folder / (name + '-' + phase + '.pdf')
                convert(Path(request['path']), pdf_path, 'pdf')
                with fitz.open(pdf_path) as pdf:
                    result['pdfPages'] = len(pdf)
                    result['emptyCvPages'] = [i + 1 for i, page in enumerate(pdf) if i >= 2 and not page.get_text().strip()]
                    result['schoolOrder'] = []
                    for label in ('main', 'side'):
                        lane, m, mm = fixture[label + 'Lane'], fixture['margins'], 72 / 25.4
                        clip = fitz.Rect((lane['leftMm'] - .5) * mm, (m['top'] - 3) * mm,
                                         (lane['rightMm'] + .5) * mm, pdf[2].rect.height - (m['bottom'] - 3) * mm)
                        result['visibleStories'][label] = visible_story(fixture[label + 'Text'],
                            [page.get_text(clip=clip) for page in pdf[2:]])
                    for index, page in enumerate(pdf):
                        if index < 2:
                            continue
                        words = page.get_text('words')
                        for i, word in enumerate(words[:-1]):
                            if word[4] == 'Schule' and words[i + 1][4].isdigit():
                                result['schoolOrder'].append(int(words[i + 1][4]))
                retain()
                assert all(row['status'] == 'pass' for row in result['nativeStories'].values()), 'Native story text/order failure'
                assert all(row['status'] == 'pass' for row in result['visibleStories'].values()), 'Visible story text/order failure'
                school_numbers = [int(value.split()[1]) for value in fixture['mainText']
                                  if value.startswith('Schule ') and value.split()[1].isdigit()]
                assert result['schoolOrder'] == school_numbers, 'Visible school order failure'
                assert sha(source) == fixture['sourceSha256'], 'Source package modified'
            case['contentRoundtripAcceptance'] = 'pass'
            retain()
        report['contentRoundtripAcceptance'] = 'pass'
        retain()
        return report
    except Exception as error:
        report['contentRoundtripAcceptance'] = 'fail'
        report['failure'] = type(error).__name__ + ': ' + str(error)
        retain()
        raise


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    parser.add_argument('--engine', type=Path, required=True)
    parser.add_argument('--binding', type=Path, required=True, help='Root containing binding/')
    args = parser.parse_args()
    report = audit(args.directory.resolve(), args.engine.resolve(), (args.binding / 'binding').resolve())
    print(json.dumps({'cases': len(report['cases']), 'contentRoundtripAcceptance': report['contentRoundtripAcceptance'],
                      'geometryAcceptance': report['geometryAcceptance'], 'productionAcceptance': report['productionAcceptance']}))
