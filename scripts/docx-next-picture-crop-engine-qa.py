"""Collect/audit the synthetic 2x2 crop regression against a LibreOfficeKit adapter.

Collection uses only the Python standard library. Audit needs the project's
existing Pillow/PyMuPDF QA dependencies. Package preservation, source fidelity,
and within-engine save stability are independent mandatory gates.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

NAMES = {f'crop-repro-{shape}-{crop}' for shape in ('rect', 'ellipse')
         for crop in ('full', 'crop')}
PICTURES = [{'id': 'cv.person.photo'}]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def write_new(path, value):
    with path.open('x', encoding='utf-8') as stream:
        json.dump(value, stream, indent=2)
        stream.write('\n')


def safe_child(directory, name):
    if (not isinstance(name, str) or Path(name).name != name
            or '/' in name or '\\' in name or ':' in name):
        raise ValueError('Collection filenames must be plain local names')
    path = directory / name
    if not path.is_file() or path.is_symlink():
        raise ValueError('A regular collection file is required: ' + name)
    return path


def collect(sources, output, engine, library):
    if output.exists() or output.is_symlink():
        raise ValueError('Use a new output directory; existing collections are never overwritten')
    specs = read(sources / 'probe-manifest.json')
    if len(specs) != 4 or {row['name'] for row in specs} != NAMES:
        raise ValueError('Exactly the four minimal crop sources are required')
    for row in specs:
        source = safe_child(sources, row['file'])
        if digest(source) != row['sha256']:
            raise ValueError('Source hash differs: ' + row['name'])
    engine, library = engine.resolve(strict=True), library.resolve(strict=True)
    evidence = {'adapterCommand': str(engine), 'adapterCommandSha256': digest(engine),
                'library': str(library), 'librarySha256': digest(library)}
    output.mkdir(parents=True)
    report = {'scope': 'Native execution of four immutable synthetic crop inputs',
              'engine': evidence, 'cases': []}

    def convert(source, target, kind):
        with tempfile.TemporaryDirectory(prefix='docx-crop-engine-') as temporary:
            profile = Path(temporary)
            local_source, local_target = profile / source.name, profile / target.name
            shutil.copyfile(source, local_source)
            result = subprocess.run([str(engine), profile.as_uri(), local_source.as_uri(),
                                     local_target.as_uri(), kind], capture_output=True,
                                    text=True, timeout=60)
            if result.returncode or not local_target.is_file():
                raise RuntimeError(result.stderr[-4000:] or 'Native output was not produced')
            shutil.copyfile(local_target, target)

    for spec in specs:
        row = {**spec, 'phases': []}
        report['cases'].append(row)
        try:
            target = output / (spec['name'] + '-source.docx')
            shutil.copyfile(sources / spec['file'], target)
            for phase in ('source', 'saved1', 'saved2'):
                if phase != 'source':
                    prior, target = target, output / (spec['name'] + '-' + phase + '.docx')
                    convert(prior, target, 'docx')
                pdf = output / (spec['name'] + '-' + phase + '.pdf')
                convert(target, pdf, 'pdf')
                row['phases'].append({'phase': phase, 'docx': target.name,
                                      'docxSha256': digest(target), 'pdf': pdf.name,
                                      'pdfSha256': digest(pdf)})
            row['collection'] = 'complete'
        except Exception as error:
            row['collection'], row['error'] = 'fail', str(error)
        print(spec['name'], row['collection'], flush=True)
    if digest(engine) != evidence['adapterCommandSha256'] or digest(library) != evidence['librarySha256']:
        raise ValueError('Engine files changed during collection')
    write_new(output / 'phases.json', report)
    return report


def validated_collection(directory):
    manifest = directory / 'phases.json'
    data = read(manifest)
    cases = data['cases']
    if len(cases) != 4 or {row['name'] for row in cases} != NAMES:
        raise ValueError('Exactly four uniquely named minimal cases are required')
    inputs = [{'file': str(manifest), 'sha256': digest(manifest)}]
    physical_files = []
    for case in cases:
        if case.get('collection') != 'complete':
            raise ValueError('Incomplete native case: ' + case['name'])
        phases = case['phases']
        if [row['phase'] for row in phases] != ['source', 'saved1', 'saved2']:
            raise ValueError('Source and two native saves are required')
        for phase in phases:
            for kind in ('docx', 'pdf'):
                file = safe_child(directory, phase[kind])
                if any(file.samefile(prior) for prior in physical_files):
                    raise ValueError('Distinct physical files are required for all native phases')
                physical_files.append(file)
                if digest(file) != phase[kind + 'Sha256']:
                    raise ValueError('A native collection file changed: ' + file.name)
                inputs.append({'file': str(file), 'sha256': phase[kind + 'Sha256']})
        if phases[0]['docxSha256'] != case['sha256']:
            raise ValueError('Collected source is not the declared immutable input')
    return data, inputs


def audit(directory, reference, report_path):
    if report_path.exists() or report_path.is_symlink():
        raise ValueError('Use a new report path; prior results are never overwritten')
    if directory.resolve() == reference.resolve():
        raise ValueError('Use a distinct trusted reference collection')
    import fitz
    from docx_next_picture_owner_qa import (picture_inventory, compare_image_data,
                                           PICTURE_OWNERSHIP_CONTRACT_VERSION)
    spec = importlib.util.spec_from_file_location('crop_geometry',
        Path(__file__).with_name('docx-next-sidebar-save-geometry-qa.py'))
    geometry = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(geometry)
    data, inputs = validated_collection(directory)
    control, control_inputs = validated_collection(reference)
    inputs += control_inputs
    controls = {row['name']: row for row in control['cases']}
    result = {'scope': 'Read-only crop regression; package and view gates are independent',
              'productionAcceptance': 'blocked', 'nativeExecutionVerifiedByAudit': False,
              'pictureOwnershipContractVersion': PICTURE_OWNERSHIP_CONTRACT_VERSION,
              'limits': ['Audit inspects supplied files; hashes and metadata alone do not prove native execution.',
                         'Source fidelity is relative to the separately selected trusted reference.',
                         'No Desktop Word or production acceptance is granted.'],
              'inputs': inputs, 'cases': []}

    def photo(file):
        with fitz.open(file) as doc:
            images = [(page.number, image) for page in doc for image in page.get_image_info()
                      if image['width'] > 1 and image['height'] > 1]
            if len(doc) != 1 or len(images) != 1:
                raise ValueError('The minimal fixture must have one page and one actual bitmap')
            page, image = images[0]
            # The same page-space region is used for all sources and save phases.
            clip = fitz.Rect(50, 50, 162, 175)
            if page != 0 or not clip.intersects(fitz.Rect(image['bbox'])):
                raise ValueError('Expected photo region is empty')
            pix = doc[0].get_pixmap(matrix=fitz.Matrix(8, 8), clip=clip, alpha=False)
            return hashlib.sha256(pix.samples).hexdigest()

    for case in data['cases']:
        counterpart = controls[case['name']]
        if case['sha256'] != counterpart['sha256']:
            raise ValueError('Reference and candidate source packages differ')
        first = case['phases'][0]
        original = picture_inventory(directory / first['docx'], PICTURES)
        row = {'name': case['name'], 'phases': [], 'saveGeometry': []}
        result['cases'].append(row)
        reference_pdf = reference / counterpart['phases'][0]['pdf']
        source_pdf = directory / first['pdf']
        row['sourceFidelity'] = geometry.compare_pdf(reference_pdf, source_pdf)
        row['sourcePhoto8xUnchanged'] = photo(reference_pdf) == photo(source_pdf)
        for phase in case['phases']:
            inventory = picture_inventory(directory / phase['docx'], PICTURES)
            row['phases'].append({**phase, 'ownership': inventory,
                'originalImageData': compare_image_data(original, inventory),
                'photo8xSha256': photo(directory / phase['pdf'])})
        for before, after in zip(case['phases'], case['phases'][1:]):
            row['saveGeometry'].append(geometry.compare_pdf(directory / before['pdf'],
                                                           directory / after['pdf']))
        row['gates'] = {
            'typedOwnImage': all(v['ownership']['status'] == 'pass' for v in row['phases']),
            # Pixel identity is observed separately from the stronger native-
            # picture gate. Both must pass; intact pixels in a WPS cannot pass.
            'originalPixels': all(all(p['decodedPixelsEqual'] for p in v['originalImageData']['pictures'])
                                  for v in row['phases']),
            'sourceFidelity': row['sourceFidelity']['exactVisibleGeometry'] and row['sourcePhoto8xUnchanged'],
            'saveStability': all(v['exactVisibleGeometry'] for v in row['saveGeometry'])
                and len({v['photo8xSha256'] for v in row['phases']}) == 1,
        }
        row['acceptance'] = 'pass' if all(row['gates'].values()) else 'fail'
        print(row['name'], json.dumps(row['gates']), flush=True)
    for item in inputs:
        if digest(Path(item['file'])) != item['sha256']:
            raise ValueError('An input changed during inspection')
    result['allFourPass'] = all(row['acceptance'] == 'pass' for row in result['cases'])
    report_path.parent.mkdir(parents=True, exist_ok=True)
    write_new(report_path, result)
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_subparsers(dest='mode', required=True)
    c = modes.add_parser('collect')
    c.add_argument('--sources', type=Path, required=True)
    c.add_argument('--output', type=Path, required=True)
    c.add_argument('--engine', type=Path, required=True)
    c.add_argument('--engine-library', type=Path, required=True)
    a = modes.add_parser('audit')
    a.add_argument('--collection', type=Path, required=True)
    a.add_argument('--reference', type=Path, required=True)
    a.add_argument('--report', type=Path, required=True)
    args = parser.parse_args()
    if args.mode == 'collect':
        result = collect(args.sources, args.output, args.engine, args.engine_library)
        raise SystemExit(0 if all(v.get('collection') == 'complete' for v in result['cases']) else 1)
    result = audit(args.collection, args.reference, args.report)
    raise SystemExit(0 if result['allFourPass'] else 1)
