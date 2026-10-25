"""Pinned synthetic reference-wrap diagnostics; never a production width fix.

Create package-only counterfactuals, then render each DOCX independently.
Summarize only after supplying the external renderer's per-case PDFs.
All generated DOCX/PDF/PNG files stay outside Git.
"""
import argparse
import copy
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile

from lxml import etree as ET

SOURCE_HASH = '5e469d60181f8405fffcb43a57f92377fc6b0daa414d71ac22cd33ed3a6a25e0'
W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
NS = {'w': W}
TAG = 'cv.entry.referenzen:demo-r1.role'
WIDTHS = [3220, 3222, 3224, 3226, 3230, 3240]


def digest(data):
    return hashlib.sha256(data).hexdigest()


def field(root):
    owners = root.xpath('.//w:sdt[w:sdtPr/w:tag[@w:val=$tag]]', namespaces=NS, tag=TAG)
    if len(owners) != 1:
        raise ValueError('Require exactly one pinned reference-role control')
    return owners[0]


def variants(root):
    """Each variant starts from the same full source, never a previous variant."""
    for width in WIDTHS:
        out = copy.deepcopy(root)
        table = next(n for n in field(out).iterancestors() if n.tag == '{'+W+'}tbl')
        columns = [width, 6746-2*width, width]
        original = [int(n.get('{'+W+'}w')) for n in table.find('w:tblGrid', NS)]
        if original != [3220, 306, 3220]:
            raise ValueError('Pinned source grid changed')
        for node, value in zip(table.find('w:tblGrid', NS), columns):
            node.set('{'+W+'}w', str(value))
        cells = table.find('w:tr', NS).findall('w:tc', NS)
        if len(cells) != 3 or sum(columns) != 6746:
            raise ValueError('Require three cells and conserved outer width')
        for cell, value in zip(cells, columns):
            cell.find('w:tcPr/w:tcW', NS).set('{'+W+'}w', str(value))
        yield f'width-{width}', out, {'gridTwips': columns, 'diagnosticOnly': True}
    for size in ['20', '10.476pt']:
        out = copy.deepcopy(root)
        for tag in ['sz', 'szCs']:
            field(out).find('.//w:'+tag, NS).set('{'+W+'}val', size)
        yield 'size-'+('20' if size == '20' else 'precise'), out, {'nativeSizeValue': size, 'diagnosticOnly': True}
    for mode in ['plain-role', 'inline-role', 'explicit-cell-insets']:
        out = copy.deepcopy(root)
        owner = field(out)
        if mode in ['plain-role', 'inline-role']:
            content = owner.find('w:sdtContent', NS)
            paragraph = content.find('w:p', NS)
            parent, index = owner.getparent(), owner.getparent().index(owner)
            content.remove(paragraph)
            parent.remove(owner)
            parent.insert(index, paragraph)
            if mode == 'inline-role':
                for run in list(paragraph):
                    if run.tag != '{'+W+'}pPr':
                        paragraph.remove(run)
                        content.append(run)
                paragraph.append(owner)
        else:
            table = next(n for n in owner.iterancestors() if n.tag == '{'+W+'}tbl')
            for cell in table.find('w:tr', NS).findall('w:tc', NS):
                props = cell.find('w:tcPr', NS)
                if props.find('w:tcMar', NS) is not None:
                    raise ValueError('Pinned cell already has explicit margins')
                margins = ET.Element('{'+W+'}tcMar')
                for edge in ['top', 'left', 'bottom', 'right']:
                    ET.SubElement(margins, '{'+W+'}'+edge, {'{'+W+'}w': '0', '{'+W+'}type': 'dxa'})
                valign = props.find('w:vAlign', NS)
                props.insert(props.index(valign) if valign is not None else len(props), margins)
        yield mode, out, {'diagnosticOnly': True, 'ownershipIntentionallyLost': mode == 'plain-role'}


def create(source, output):
    if digest(source.read_bytes()) != SOURCE_HASH:
        raise ValueError('Use only the pinned synthetic control')
    if output.exists():
        raise ValueError('Use a new output directory')
    output.mkdir(parents=True)
    cases = []
    with ZipFile(source) as before:
        root = ET.fromstring(before.read('word/document.xml'))
        for name, tree, details in variants(root):
            path = output/(name+'.docx')
            with ZipFile(path, 'w') as after:
                for info in before.infolist():
                    data = ET.tostring(tree, xml_declaration=True, encoding='UTF-8') if info.filename == 'word/document.xml' else before.read(info.filename)
                    after.writestr(copy.copy(info), data)
            with ZipFile(path) as after:
                if any(after.read(n) != before.read(n) for n in before.namelist() if n != 'word/document.xml'):
                    raise ValueError('Unexpected non-document change')
            cases.append({'name': name, 'sha256': digest(path.read_bytes()), **details})
    manifest = {'sourceSha256': SOURCE_HASH, 'scope': 'BOUNDED_DIAGNOSTICS_NO_PRODUCT_FIX', 'cases': cases}
    (output/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    return manifest


def summarize(output):
    import fitz
    manifest = json.loads((output/'manifest.json').read_text())
    if manifest['sourceSha256'] != SOURCE_HASH:
        raise ValueError('Wrong probe manifest')
    reports = []
    for case in manifest['cases']:
        name = case['name']
        if digest((output/(name+'.docx')).read_bytes()) != case['sha256']:
            raise ValueError('Diagnostic DOCX changed after creation')
        pdf = output/name/(name+'.pdf')
        with fitz.open(pdf) as doc:
            if len(doc) != 4:
                raise ValueError('Unexpected dossier page count')
            rows = []
            for block in doc[3].get_text('dict')['blocks']:
                for line in block.get('lines', []):
                    text = ''.join(span['text'] for span in line['spans'])
                    if 'Klassenlehrer' in text or text.strip() == 'Zentrum':
                        rows.append({'text': text, 'bbox': list(line['bbox']),
                                     'fontSizesPt': sorted({span['size'] for span in line['spans']}),
                                     'fontFamilies': sorted({span['font'] for span in line['spans']})})
            if not rows or 'Klassenlehrer' not in rows[0]['text']:
                raise ValueError('Missing diagnostic field; no inferred success')
            reports.append({'name': name, 'pdfSha256': digest(pdf.read_bytes()), 'pages': len(doc),
                            'roleLines': rows, 'oneLineObserved': any(
                                'Klassenlehrer, Schulhaus Zentrum' in r['text'] for r in rows)})
    result = {'scope': manifest['scope'], 'sourceSha256': SOURCE_HASH, 'renderer': 'EXTERNAL_RENDERER_NOT_PROVEN_BY_SCRIPT',
              'cases': reports, 'wordAcceptance': 'UNVERIFIED', 'productFix': False}
    target = output/'render-summary.json'
    if target.exists():
        raise ValueError('Do not overwrite an existing summary')
    target.write_text(json.dumps(result, indent=2)+'\n')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    make = commands.add_parser('create')
    make.add_argument('source', type=Path)
    make.add_argument('output', type=Path)
    read = commands.add_parser('summarize')
    read.add_argument('output', type=Path)
    args = parser.parse_args()
    result = create(args.source, args.output) if args.command == 'create' else summarize(args.output)
    print(json.dumps({'scope': result['scope'], 'caseCount': len(result['cases'])}))


if __name__ == '__main__':
    main()
