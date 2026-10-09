"""Read-only whole-story contract. Resolve native identity before examining visible text."""
import hashlib
import json
from xml.etree import ElementTree as ET
from zipfile import ZipFile

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'


def text_value(node):
    return ''.join((item.text or '') if item.tag == W + 't' else '\t' if item.tag == W + 'tab' else '\n'
                   for item in node.iter() if item.tag in (W + 't', W + 'tab', W + 'br', W + 'cr'))


def sha(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def native_stories(path, field_ids, story_owners=None):
    """Inventory actual XML order, one whole paragraph per ID, and complete ancestor ownership."""
    assert field_ids and len(field_ids) == len(set(field_ids)), 'Invalid declared paragraph inventory'
    with ZipFile(path) as archive:
        root = ET.fromstring(archive.read('word/document.xml'))
    parents = {child: parent for parent in root.iter() for child in parent}
    tables = list(root.iter(W + 'tbl'))
    floating = [table for table in tables if table.find(W + 'tblPr/' + W + 'tblpPr') is not None]
    if story_owners is None:
        assert len(floating) == 1, 'Whole-story audit requires one declared floating side story'
        story_owners = {'side': tables.index(floating[0])}
    else:
        assert set(story_owners) == {'main', 'side'}, 'Invalid declared independent native owners'
        if all(isinstance(owner, dict) for owner in story_owners.values()):
            keys = []
            for owner in story_owners.values():
                assert set(owner) == {'table', 'row', 'cell'} and all(type(value) is int and value >= 0 for value in owner.values()), 'Invalid declared native cell owner'
                index, row, cell = (owner[key] for key in ('table', 'row', 'cell'))
                assert index < len(tables) and row < len(tables[index].findall(W + 'tr')) and cell < len(tables[index].findall(W + 'tr')[row].findall(W + 'tc')), 'Missing declared native cell owner'
                keys.append((index, row, cell))
            assert len(set(keys)) == 2, 'Invalid declared independent native owners'
            assert {key[0] for key in keys} == {tables.index(table) for table in floating}, 'Changed declared independent floating owners'
        else:
            assert all(type(owner) is int for owner in story_owners.values()) and len(set(story_owners.values())) == 2, 'Invalid declared independent native owners'
            assert len(floating) == 2 and set(story_owners.values()) == {tables.index(table) for table in floating}, 'Changed declared independent floating owners'
    positions = {paragraph: index for index, paragraph in enumerate(root.iter(W + 'p'))}
    controls = {key: [] for key in field_ids}
    for control in root.iter(W + 'sdt'):
        tag = control.find(W + 'sdtPr/' + W + 'tag')
        if tag is not None and tag.get(W + 'val') in controls:
            controls[tag.get(W + 'val')].append(control)
    errors, records = [], []
    resolved = {}
    for key, matches in controls.items():
        if len(matches) != 1:
            errors.append({'fieldId': key, 'reason': 'missing-or-duplicate-native-id', 'count': len(matches)})
            continue
        control = matches[0]
        paragraphs = list(control.iter(W + 'p'))
        ancestor = parents.get(control)
        if not paragraphs:
            while ancestor is not None and ancestor.tag != W + 'p':
                ancestor = parents.get(ancestor)
            if ancestor is not None:
                paragraphs = [ancestor]
        if len(paragraphs) != 1:
            errors.append({'fieldId': key, 'reason': 'fragmented-or-missing-whole-paragraph', 'count': len(paragraphs)})
            continue
        paragraph = paragraphs[0]
        resolved.setdefault(paragraph, []).append(key)
        if text_value(paragraph) != text_value(control):
            errors.append({'fieldId': key, 'reason': 'native-control-does-not-own-whole-paragraph'})
        owners = []
        ancestor = parents.get(paragraph)
        while ancestor is not None:
            if ancestor.tag == W + 'tc':
                row, table = parents[ancestor], parents[parents[ancestor]]
                assert row.tag == W + 'tr' and table.tag == W + 'tbl', 'Invalid native cell ancestry'
                owners.append({'table': tables.index(table), 'row': table.findall(W + 'tr').index(row),
                               'cell': row.findall(W + 'tc').index(ancestor)})
            ancestor = parents.get(ancestor)
        labels = [label for label, declared in story_owners.items() if any(owner == declared if isinstance(declared, dict) else owner['table'] == declared for owner in owners)]
        if len(story_owners) == 2 and len(labels) != 1:
            errors.append({'fieldId': key, 'reason': 'field-outside-declared-independent-owner'})
        records.append({'fieldId': key, 'story': labels[0] if labels else 'main',
                        'owners': owners, 'textSha256': sha(text_value(control)), 'xmlPosition': positions[paragraph]})
    body = root.find(W + 'body')
    siblings = list(body)
    assert all(table in siblings for table in floating), 'Floating story is no longer a top-level native owner'
    cv_blocks = set(siblings[min(siblings.index(table) for table in floating):])
    for paragraph in positions:
        ancestor = paragraph
        while parents.get(ancestor) is not body and parents.get(ancestor) is not None:
            ancestor = parents[ancestor]
        if ancestor not in cv_blocks:
            continue
        fields = resolved.get(paragraph, [])
        if text_value(paragraph) and not fields:
            errors.append({'xmlPosition': positions[paragraph], 'reason': 'undeclared-native-story-text'})
        if len(fields) > 1:
            errors.append({'fieldIds': fields, 'reason': 'multiple-semantic-fields-share-native-paragraph'})
    stories = {}
    for label in ('main', 'side'):
        ordered = sorted((row for row in records if row['story'] == label), key=lambda row: row['xmlPosition'])
        for row in ordered:
            row.pop('xmlPosition')
        expected_order = [key for key in field_ids if any(row['fieldId'] == key for row in ordered)]
        if [row['fieldId'] for row in ordered] != expected_order:
            errors.append({'story': label, 'reason': 'changed-declared-native-paragraph-order'})
        stories[label] = ordered
    return {'stories': stories, 'errors': errors}


def compare_native_stories(source, saved):
    errors = [{'phase': phase, **error} for phase, value in (('source', source), ('saved', saved)) for error in value['errors']]
    for label in ('main', 'side'):
        if source['stories'][label] != saved['stories'][label]:
            errors.append({'story': label, 'reason': 'changed-whole-story-order-text-or-native-owner'})
    return {'status': 'fail' if errors else 'pass', 'errors': errors}


def visible_story(expected, actual_pages):
    """Compare the whole authored sequence, preserving authored duplicates and page-spanning paragraphs.

    This checks content only. Native fields and owners always come from XML, never PDF text.
    """
    import re
    import unicodedata
    def normalize(value):
        return re.sub(r'\s+', '', unicodedata.normalize('NFKC', value).replace('\u00ad', ''))
    authored, actual = normalize(''.join(expected)), normalize(''.join(actual_pages))
    return {'status': 'pass' if authored == actual else 'fail', 'authoredCharacters': len(authored),
            'actualCharacters': len(actual), 'authoredSha256': sha(authored), 'actualSha256': sha(actual)}


def write_story_report(result, target, baseline=None):
    """Retain actual evidence even when the strict independent comparison rejects it."""
    target.write_text(json.dumps(result, indent=2) + '\n')
    if baseline is not None:
        assert result == json.loads(baseline.read_text())['stable'], 'Changed strict whole-story contract evidence'
