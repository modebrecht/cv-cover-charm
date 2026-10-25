"""Shared package integrity checks for native DOCX QA and diagnostic specimens."""
import posixpath
import xml.etree.ElementTree as ET
from zipfile import ZipFile

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
PR = '{http://schemas.openxmlformats.org/package/2006/relationships}'
CT = '{http://schemas.openxmlformats.org/package/2006/content-types}'
R = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'


def check_package(file, expected_sections=3, next_package=True):
    with ZipFile(file) as z:
        assert z.testzip() is None, f'{file}: ZIP CRC failed'
        names = set(z.namelist())
        assert len(names) == len(z.namelist()), 'Duplicate ZIP member'
        required = {'[Content_Types].xml', '_rels/.rels', 'word/document.xml'}
        if next_package:
            required |= {'word/styles.xml', 'word/settings.xml', 'word/fontTable.xml', 'word/numbering.xml'}
        assert required <= names, 'Missing required parts'
        trees = {name: ET.fromstring(z.read(name)) for name in names if name.endswith(('.xml', '.rels'))}
        types = trees['[Content_Types].xml']
        overrides = {node.attrib['PartName'].lstrip('/') for node in types.findall(CT + 'Override')}
        defaults = {node.attrib['Extension'] for node in types.findall(CT + 'Default')}
        assert all(name in overrides or name.rsplit('.', 1)[-1] in defaults for name in names if name != '[Content_Types].xml'), 'Missing content type'
        for part, tree in trees.items():
            if not part.endswith('.rels'):
                continue
            base = '' if part == '_rels/.rels' else part.split('_rels/')[0]
            ids = [node.attrib['Id'] for node in tree.findall(PR + 'Relationship')]
            assert len(set(ids)) == len(ids), 'Duplicate relationship ID'
            for node in tree.findall(PR + 'Relationship'):
                target = posixpath.normpath(base + node.attrib['Target'])
                assert target in names, f'{part}: missing target {target}'
        document = trees['word/document.xml']
        assert len(document.findall('.//' + W + 'sectPr')) == expected_sections, 'Unexpected physical section count'
        numbering = trees.get('word/numbering.xml')
        if numbering is not None:
            abstract_ids = [node.attrib[W + 'abstractNumId'] for node in numbering.findall(W + 'abstractNum')]
            assert len(set(abstract_ids)) == len(abstract_ids), 'Duplicate abstract numbering ID'
            num_ids = [node.attrib[W + 'numId'] for node in numbering.findall(W + 'num')]
            assert len(set(num_ids)) == len(num_ids), 'Duplicate numbering instance ID'
            for node in numbering.findall(W + 'num'):
                assert node.find(W + 'abstractNumId').attrib[W + 'val'] in abstract_ids, 'Missing abstract numbering definition'
            for part, tree in trees.items():
                if part.startswith('word/') and part.endswith('.xml'):
                    for node in tree.findall('.//' + W + 'numPr/' + W + 'numId'):
                        assert node.attrib[W + 'val'] == '0' or node.attrib[W + 'val'] in num_ids, f'{part}: missing numbering instance'
        for part, tree in trees.items():
            if not part.startswith('word/') or not part.endswith('.xml'):
                continue
            folder, name = part.rsplit('/', 1)
            rels = trees.get(f'{folder}/_rels/{name}.rels')
            relationships = {node.attrib['Id'] for node in rels} if rels is not None else set()
            for node in tree.iter():
                for key in (R + 'id', R + 'embed', R + 'link'):
                    if key in node.attrib:
                        assert node.attrib[key] in relationships, f'{part}: missing relationship for {node.tag}'
        assert not document.findall('.//' + W + 'txbxContent'), 'Editable content placed in text boxes'
        for control in document.findall('.//' + W + 'sdt'):
            assert not control.findall('.//' + W + 'sdt'), 'Nested controls break LibreOffice flow'
        return len([name for name in names if name.startswith('word/media/')])
