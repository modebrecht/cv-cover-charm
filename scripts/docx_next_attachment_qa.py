"""Read-only explicit native paragraph flags/owners. Never a container-ID substitute."""
from xml.etree import ElementTree as ET
from zipfile import ZipFile

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'


def explicit_flag(properties, name):
    node = properties.find(W + name) if properties is not None else None
    if node is None:
        return None  # Do not guess style inheritance or substitute an assumed default.
    value = node.get(W + 'val', 'true')
    assert value in ('true', 'false', '1', '0', 'on', 'off'), 'Unknown explicit native boolean'
    return value in ('true', '1', 'on')


def paragraph_inventory(path, fixture):
    with ZipFile(path) as archive:
        root = ET.fromstring(archive.read('word/document.xml'))
    parents = {child: parent for parent in root.iter() for child in parent}
    expected = fixture['nativeParagraphs']
    result = []
    for field in expected:
        markers = [node for node in root.iter(W + 'sdt')
                   if (tag := node.find(W + 'sdtPr/' + W + 'tag')) is not None and tag.get(W + 'val') == field['fieldId']]
        assert len(markers) == 1, 'Missing or duplicate semantic paragraph ID'
        marker = markers[0]
        paragraphs = list(marker.iter(W + 'p'))
        form = 'block'
        if not paragraphs:
            form = 'inline'
            ancestor = parents.get(marker)
            while ancestor is not None and ancestor.tag != W + 'p':
                ancestor = parents.get(ancestor)
            if ancestor is not None:
                paragraphs = [ancestor]
        assert len(paragraphs) == 1, 'A complete semantic field must retain one native paragraph'
        paragraph = paragraphs[0]
        tags = [tag.get(W + 'val') for tag in paragraph.iter(W + 'tag')]
        assert tags == ([] if form == 'block' else [field['fieldId']]), 'Shared or fragmented native paragraph'
        cell = parents.get(paragraph)
        while cell is not None and cell.tag != W + 'tc':
            cell = parents.get(cell)
        row = parents.get(cell)
        table = parents.get(row)
        assert cell is not None and row is not None and table is not None and row.tag == W + 'tr' and table.tag == W + 'tbl', 'Semantic field outside its native table owner'
        properties = paragraph.find(W + 'pPr')
        flags = {name: explicit_flag(properties, name) for name in ['keepNext', 'keepLines', 'widowControl']}
        assert flags == field['flags'], 'Changed or missing explicit native attachment flags'
        result.append({'fieldId': field['fieldId'], 'row': table.findall(W + 'tr').index(row),
                       'cell': row.findall(W + 'tc').index(cell), 'paragraphCount': 1,
                       'flags': flags, 'controlForm': form})
    assert len(result) == len({row['fieldId'] for row in result}) == 10
    return result


def attachment_audit(source, saved, fixture):
    before, after = paragraph_inventory(source, fixture), paragraph_inventory(saved, fixture)
    semantic = lambda rows: [{key: value for key, value in row.items() if key != 'controlForm'} for row in rows]
    assert semantic(before) == semantic(after), 'Changed native paragraph owner/attachment policy'
    endings = []
    for path in [source, saved]:
        with ZipFile(path) as archive:
            root = ET.fromstring(archive.read('word/document.xml'))
        tables = list(root.iter(W + 'tbl'))
        assert len(tables) == 1, 'Changed bounded native table count; no container ID inferred'
        rows = tables[0].findall(W + 'tr')
        flags = []
        for row in rows:
            cells = row.findall(W + 'tc')
            assert len(cells) == 3, 'Changed native cell inventory'
            ending = [list(cell)[-1] for cell in cells]
            assert all(node.tag == W + 'p' and not list(node.iter(W + 't')) for node in ending), 'Changed required empty native ending'
            flags.append([explicit_flag(node.find(W + 'pPr'), 'keepNext') for node in ending])
        assert flags == fixture['cellEndKeepNext'], 'Changed explicit native cell-ending attachment'
        endings.append(flags)
    return {'status': 'pass', 'semanticParagraphs': semantic(before),
            'sourceControlForms': [row['controlForm'] for row in before],
            'savedControlForms': [row['controlForm'] for row in after],
            'sourceCellEndingFlags': endings[0], 'savedCellEndingFlags': endings[1],
            'containerIdentity': 'not inferred; original caption audit remains separate'}
