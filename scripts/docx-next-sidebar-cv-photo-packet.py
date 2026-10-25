"""Extract the unchanged final CV section for focused photo QA, never product export."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
from zipfile import ZipFile

from lxml import etree as ET

_spec = importlib.util.spec_from_file_location(
    "sidebar_qa", Path(__file__).with_name("docx-next-sidebar-word-layout-qa.py"))
_qa = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_qa)
inventory = _qa.inventory


def extract_cv(source, target):
    ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    with ZipFile(source) as archive:
        root = ET.fromstring(archive.read('word/document.xml'))
        body = root.find('w:body', ns)
        boundaries = [i for i, node in enumerate(body)
                      if node.find('w:pPr/w:sectPr', ns) is not None]
        assert len(boundaries) == 2, 'Expected cover, letter and final CV sections'
        assert body[-1].tag == '{'+ns['w']+'}sectPr', 'Expected final CV section properties'
        for node in list(body)[:boundaries[-1]+1]:
            body.remove(node)
        assert len(root.findall('.//w:sectPr', ns)) == 1
        tags = root.xpath('.//w:tag/@w:val', namespaces=ns)
        assert tags and all(tag.startswith('cv.') for tag in tags), 'Non-CV content remains'
        document = ET.tostring(root, xml_declaration=True, encoding='UTF-8')
        with ZipFile(target, 'w') as output:
            for entry in archive.infolist():
                # Keep native CV resources and geometry exactly as generated.
                output.writestr(entry, document if entry.filename == 'word/document.xml'
                                else archive.read(entry.filename))
    before, after = inventory(source), inventory(target)
    cv_fields = {k: v for k, v in before['fields'].items() if k.startswith('cv.')}
    assert after['fields'] == cv_fields, 'CV identity or text changed during extraction'
    assert after['pictures'] == before['pictures'], 'Picture/crop changed during extraction'
    return {'file': target.name, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
            'cvFields': len(cv_fields), 'source': source.name,
            'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    rows = [extract_cv(args.source/(source+'.docx'), args.output/(target+'.docx'))
            for source, target in [('04-Foto-Portrait', '04-NUR-CV-Portrait-V3'),
                                   ('05-Freies-Foto-rechts', '05-NUR-CV-Foto-rechts-V3')]]
    (args.output/'packet-manifest.json').write_text(json.dumps({
        'scope': 'CV photo outline only; no cover or letter',
        'extraction': 'Unchanged native final CV section from fresh full model exports',
        'desktopWordCandidateAcceptance': 'UNVERIFIED', 'files': rows}, indent=2)+'\n')
    print(json.dumps(rows))


if __name__ == '__main__':
    main()
