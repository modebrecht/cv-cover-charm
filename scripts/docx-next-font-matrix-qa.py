"""Inspect generated OOXML and real isolated LibreOffice Save/Reopen font evidence.

Installed primary fonts are never inferred from matching page counts. Does not
certify Microsoft Word. Uses the existing package validator, without XML edits.
"""
import argparse
from collections import Counter
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import unicodedata
import xml.etree.ElementTree as ET
from zipfile import ZipFile
import fitz
from docx_next_package_qa import check_package

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
FAMILIES = {'roman', 'swiss', 'modern', 'decorative'}
PROBE = re.compile(r'Fontprobe|Fonttext|Fettprobe|Kursivprobe|Mischprobe|Normalprobe|Zellkursiv|Kopfprobe|Fussprobe')


def digest(file): return hashlib.sha256(file.read_bytes()).hexdigest()
def compact(text): return re.sub(r'\s+', '', unicodedata.normalize('NFKC', text).replace('\u00ad', '')).casefold()
def font_key(font): return re.sub(r'[^a-z]', '', font.lower())


def inspect_package(file, fixture):
    check_package(file, expected_sections=fixture['sections'])
    assert digest(file) == fixture['sha256'], 'Source package changed'
    with ZipFile(file) as archive:
        trees = {name: ET.fromstring(archive.read(name)) for name in archive.namelist()
                 if name.startswith('word/') and name.endswith('.xml')}
        assert not any(name.startswith('word/fonts/') for name in archive.namelist()), 'Font payload distributed'
        table = trees['word/fontTable.xml']
        actual = {}
        for node in table.findall(W + 'font'):
            name = node.attrib[W + 'name']
            assert name not in actual, 'Duplicate font definition'
            actual[name] = {'name': name, 'fallback': node.find(W + 'altName').attrib[W + 'val'],
                            'family': node.find(W + 'family').attrib[W + 'val'],
                            'pitch': node.find(W + 'pitch').attrib[W + 'val']}
            assert actual[name]['family'] in FAMILIES and actual[name]['pitch'] in {'fixed', 'variable'}
            assert not list(node.iter(W + 'embedRegular')) and not list(node.iter(W + 'embedBold'))
        assert actual == {row['name']: row for row in fixture['definitions']}, 'Font definitions disagree with native model'
        used = set()
        controls = {}
        for name, tree in trees.items():
            for font in tree.iter(W + 'rFonts'):
                assert font.attrib[W + 'ascii'] == font.attrib[W + 'hAnsi'], 'ASCII/Unicode ownership differs'
                used.add(font.attrib[W + 'ascii'])
            for control in tree.iter(W + 'sdt'):
                tag = control.find(W + 'sdtPr/' + W + 'tag')
                if tag is not None:
                    controls.setdefault(tag.attrib[W + 'val'], []).append(control)
        assert used == set(actual), 'w:rFonts and fontTable disagree'
        for p in fixture['paragraphs']:
            assert len(controls.get(p['id'], [])) == 1, 'Missing/duplicate source paragraph ' + p['id']
            native = controls[p['id']][0]
            native_runs = [run for run in native.iter(W + 'r') if run.find('.//' + W + 't') is not None]
            assert len(native_runs) == len(p['runs']), 'Run ownership changed: ' + p['id']
            for source, run in zip(p['runs'], native_runs):
                assert ''.join(n.text or '' for n in run.iter(W + 't')) == source['text'].replace('\n', '').replace('\t', ''), 'Run text changed'
                props = run.find(W + 'rPr')
                assert props.find(W + 'rFonts').attrib[W + 'ascii'] == source['font'], 'Run font changed'
                for flag in ['bold', 'italic']:
                    assert props.find(W + ('b' if flag == 'bold' else 'i')).attrib[W + 'val'] == str(int(source[flag])), 'Emphasis changed'
        assert trees['word/settings.xml'].find(W + 'embedTrueTypeFonts').attrib[W + 'val'] == '0'
    return {'fontDefinitions': len(actual), 'paragraphs': len(fixture['paragraphs']), 'package': 'pass'}


def pdf_evidence(file, fixture):
    doc = fitz.open(file)
    text = ''.join(page.get_text() for page in doc)
    # Inspect each complete body paragraph in its logical part, excluding running
    # chrome. Whitespace normalization handles tracking/line breaks without
    # reducing coverage to word sets or counting unused first/follow stories twice.
    part_text = {part['id']: '' for part in fixture['parts']}
    for page in doc:
        rendered = compact(page.get_text())
        part_id = 'cover' if page.number == 0 else 'letter' if 'letterkopfprobe' in rendered else 'cv'
        part = next(part for part in fixture['parts'] if part['id'] == part_id)
        box = fitz.Rect(0, max(0, part['margins']['top'] - 3) * 72 / 25.4,
                        page.rect.width, page.rect.height - max(0, part['margins']['bottom'] - 3) * 72 / 25.4)
        part_text[part_id] += page.get_text(clip=box)
    for p in fixture['paragraphs']:
        value = compact(''.join(r['text'] for r in p['runs']))
        chrome = '.header' in p['id'] or '.footer' in p['id']
        assert value in compact(text if chrome else part_text[p['part']]), 'Missing complete source paragraph: ' + p['id']
    for part_id, rendered in part_text.items():
        repeated = Counter(compact(''.join(r['text'] for r in p['runs'])) for p in fixture['paragraphs']
                           if p['part'] == part_id and '.header' not in p['id'] and '.footer' not in p['id'])
        for value, count in repeated.items():
            assert compact(rendered).count(value) >= count, f'Missing repeated source paragraph: {part_id} / {value}'
    spans = [(page.number, span) for page in doc for block in page.get_text('dict')['blocks']
             if block['type'] == 0 for line in block['lines'] for span in line['spans']]
    probes = []
    supplied = fixture['fontPolicy']['availability'] == 'supplied'
    for p in fixture['paragraphs']:
        for run in p['runs']:
            if not PROBE.search(run['text']): continue
            matching = [(page, span) for page, span in spans if compact(run['text']) in compact(span['text'])]
            assert matching, 'Missing unique font probe: ' + run['text']
            if supplied:
                assert all(font_key(span['font']).startswith(font_key(run['font'])) for _, span in matching), \
                    f'Selected font was substituted again: {run["font"]} / {[s["font"] for _, s in matching]}'
            assert all(bool(span['flags'] & 16) == run['bold'] and bool(span['flags'] & 2) == run['italic']
                       for _, span in matching), 'Rendered emphasis changed: ' + run['text']
            probes.append({'id': p['id'], 'text': run['text'], 'selected': run['font'],
                           'actual': sorted(set(s['font'] for _, s in matching)),
                           'positions': [[page + 1, *[round(v, 4) for v in s['bbox']]] for page, s in matching]})
    return {'pages': len(doc), 'fonts': sorted(set(span['font'] for _, span in spans)),
            'text': 'complete', 'probes': probes}


def saved_font_evidence(file, fixture):
    with ZipFile(file) as archive:
        assert archive.testzip() is None
        trees = [ET.fromstring(archive.read(name)) for name in archive.namelist()
                 if name.startswith('word/') and name.endswith('.xml')]
        styles = next(tree for tree in trees if tree.tag == W + 'styles')
        definitions = {style.attrib[W + 'styleId']: style for style in styles.findall(W + 'style')}
        defaults = styles.find(W + 'docDefaults/' + W + 'rPrDefault/' + W + 'rPr')
        def style_props(style_id, seen=None):
            seen = set() if seen is None else seen
            if style_id not in definitions or style_id in seen: return []
            seen.add(style_id)
            style = definitions[style_id]
            base = style.find(W + 'basedOn')
            return [style.find(W + 'rPr')] + (style_props(base.attrib[W + 'val'], seen) if base is not None else [])
        candidates = []
        for tree in trees:
            for paragraph in tree.iter(W + 'p'):
                pstyle = paragraph.find(W + 'pPr/' + W + 'pStyle')
                for run in paragraph.iter(W + 'r'):
                    text = ''.join(node.text or '' for node in run.iter(W + 't'))
                    if not text: continue
                    rstyle = run.find(W + 'rPr/' + W + 'rStyle')
                    chain = [run.find(W + 'rPr')] + (style_props(rstyle.attrib[W + 'val']) if rstyle is not None else []) + \
                        style_props(pstyle.attrib[W + 'val'] if pstyle is not None else 'Normal') + [defaults]
                    font = next((p.find(W + 'rFonts').attrib.get(W + 'ascii') for p in chain
                                 if p is not None and p.find(W + 'rFonts') is not None and W + 'ascii' in p.find(W + 'rFonts').attrib), None)
                    candidates.append((compact(text), font))
        probes = [r for p in fixture['paragraphs'] for r in p['runs'] if PROBE.search(r['text'])]
        for probe in probes:
            matches = [font for text, font in candidates if compact(probe['text']) in text]
            assert matches, 'Save lost native font probe ' + probe['text']
            assert all(font == probe['font'] for font in matches), f'Save changed requested ownership: {probe["font"]} / {matches}'
        assert not any(name.startswith('word/fonts/') for name in archive.namelist()), 'Save introduced embedded font payload'
    return {'nativeFontProbes': len(probes), 'fontOwnership': 'pass'}


def convert(files, destination, env, soffice):
    destination.mkdir(parents=True, exist_ok=True)
    kind = 'pdf' if destination.name.endswith('pdf') else 'docx:Office Open XML Text'
    for offset in range(0, len(files), 24):
        batch = files[offset:offset + 24]
        with tempfile.TemporaryDirectory(prefix='font-matrix-profile-') as profile:
            result = subprocess.run([soffice, '-env:UserInstallation=' + Path(profile).as_uri(),
                '--headless', '--invisible', '--norestore', '--convert-to', kind, '--outdir', str(destination),
                *map(str, batch)], env=env, capture_output=True, text=True, timeout=180)
            assert result.returncode == 0 and not re.search(r'error|warning', result.stderr, re.I), result.stdout + result.stderr
        for file in batch:
            output = destination / (file.stem + ('.pdf' if kind == 'pdf' else '.docx'))
            assert output.is_file() and output.stat().st_size > 0, 'No fresh conversion: ' + str(file)
        print(f'{destination.name}: {min(offset + 24, len(files))}/{len(files)}', flush=True)


def main(args):
    root = args.directory.resolve()
    manifest = json.loads((root / 'manifest.json').read_text())
    summary = {'sourceSha': manifest['sourceSha'], 'templates': manifest['templates'],
               'scenarios': manifest['scenarios'], 'wordAcceptance': 'UNVERIFIED', 'packages': [], 'renders': [], 'failures': []}
    for fixture in manifest['fixtures']:
        try: summary['packages'].append({'key': fixture['key'], **inspect_package(root / (fixture['key'] + '.docx'), fixture)})
        except (AssertionError, KeyError, AttributeError) as error: summary['failures'].append({'key': fixture['key'], 'phase': 'ooxml', 'error': str(error)})
    (root / 'package-results.json').write_text(json.dumps(summary, indent=2) + '\n')
    assert not summary['failures'], summary['failures'][:10]
    if args.packages_only: return
    fonts = root / 'controlled-fonts'
    fonts.mkdir(exist_ok=True)
    sources = [file for folder in args.font_directory for file in folder.resolve().rglob('*.ttf')
               if re.match(r'(Liberation(Sans|SansNarrow|Serif|Mono)-|DejaVuSans(?:-|\.))', file.name)
               and 'ExtraLight' not in file.name]
    for source in sources: shutil.copyfile(source, fonts / source.name)
    config = root / 'fonts.conf'
    config.write_text('<fontconfig><dir>' + str(fonts) + '</dir><cachedir>' + str(root / 'font-cache') + '</cachedir></fontconfig>')
    env = {**os.environ, 'FONTCONFIG_FILE': str(config), 'SAL_USE_VCLPLUGIN': 'svp'}
    inventory = subprocess.check_output(['fc-list', '-f', '%{family}\n'], env=env, text=True).splitlines()
    expected_fonts = {'Liberation Sans', 'Liberation Sans Narrow', 'Liberation Serif', 'Liberation Mono', 'DejaVu Sans'}
    assert set(inventory) == expected_fonts, f'Controlled fallback inventory incomplete or leaked: {set(inventory)}'
    summary['environment'] = {'engine': subprocess.check_output([args.soffice, '--version'], text=True).strip(),
        'fontFamilies': sorted(set(inventory)), 'fontFiles': {f.name: digest(f) for f in sorted(fonts.glob('*.ttf'))}}
    print(json.dumps({'environment': summary['environment']}), flush=True)
    fixtures = [fixture for fixture in manifest['fixtures'] if fixture['render']]
    files = [root / (fixture['key'] + '.docx') for fixture in fixtures]
    for folder in ['initial-pdf', 'saved-docx', 'reopened-pdf']:
        assert not (root / folder).exists(), 'Use fresh outputs; do not accept stale conversion evidence'
    convert(files, root / 'initial-pdf', env, args.soffice)
    convert(files, root / 'saved-docx', env, args.soffice)
    convert([root / 'saved-docx' / file.name for file in files], root / 'reopened-pdf', env, args.soffice)
    for fixture in fixtures:
        key = fixture['key']
        row = {'key': key}
        try: row['savedOoxml'] = saved_font_evidence(root / 'saved-docx' / (key + '.docx'), fixture)
        except AssertionError as error: summary['failures'].append({'key': key, 'phase': 'save-ooxml', 'error': str(error)})
        for phase in ['initial', 'reopened']:
            try: row[phase] = pdf_evidence(root / (phase + '-pdf') / (key + '.pdf'), fixture)
            except AssertionError as error: summary['failures'].append({'key': key, 'phase': phase, 'error': str(error)})
        if 'initial' in row and 'reopened' in row:
            row['pageCountChanged'] = row['initial']['pages'] != row['reopened']['pages']
            row['fontProbesChanged'] = [{ 'id': a['id'], 'text': a['text'], 'before': a['actual'], 'after': b['actual'] }
                for a, b in zip(row['initial']['probes'], row['reopened']['probes']) if a['actual'] != b['actual']]
            row['probeGeometryChanged'] = sum(a['positions'] != b['positions'] for a, b in zip(row['initial']['probes'], row['reopened']['probes']))
            if row['fontProbesChanged']: summary['failures'].append({'key': key, 'phase': 'save-fonts', 'error': row['fontProbesChanged']})
        summary['renders'].append(row)
    (root / 'results.json').write_text(json.dumps(summary, indent=2) + '\n')
    renders = {row['key']: row for row in summary['renders']}
    pairs = [(row, renders[key + '-fallback']) for key, row in renders.items() if key + '-fallback' in renders]
    print(json.dumps({'packages': len(summary['packages']), 'renders': len(summary['renders']), 'failures': len(summary['failures']),
        'savePageChanges': sum(row.get('pageCountChanged', False) for row in renders.values()),
        'saveFontChanges': sum(bool(row.get('fontProbesChanged')) for row in renders.values()),
        'saveProbeGeometryChangedDocuments': sum(bool(row.get('probeGeometryChanged')) for row in renders.values()),
        'requestedFallbackPairs': len(pairs),
        'requestedFallbackPageChanges': sum(a.get('initial', {}).get('pages') != b.get('initial', {}).get('pages') for a, b in pairs),
        'templatePages': {template: {key.split('--')[1]: row.get('initial', {}).get('pages') for key, row in renders.items()
                                   if key.startswith(template + '--')} for template in manifest['templates']}}))
    assert not summary['failures'], summary['failures'][:10]


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    parser.add_argument('--packages-only', action='store_true')
    parser.add_argument('--soffice', default='soffice')
    parser.add_argument('--font-directory', action='append', type=Path, default=[])
    main(parser.parse_args())
