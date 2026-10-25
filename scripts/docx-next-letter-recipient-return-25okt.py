"""Read-only, pinned-source checks for untouched Letter recipient Word returns.

Exit 0 means bounded XML preservation, never Word acceptance or visible fidelity.
Exit 1 means a preservation check failed; exit 2 means unsupported/invalid input.
Existing photo and general Word readers are imported unchanged.
"""
import argparse
import importlib.util
import json
from pathlib import Path
from zipfile import BadZipFile, ZipFile

from lxml import etree as ET

spec = importlib.util.spec_from_file_location(
    'letter_word_reader', Path(__file__).with_name('docx-next-word-acceptance-23okt.py'))
reader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reader)
W, NS = reader.W, dict(reader.NS)
NS['wp'] = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'
SOURCES = {
    'b663a5efa1eb2b86494955983f869af5f3d744c40b85b23620e8c201099d7e2b': 'standard',
    'b157868f87d21ff065f2af798add7375542b306f1ca2cb11940607b636b841bc': 'wide',
}
RECIPIENT = ['letter.recipient.'+name for name in ['company', 'name', 'address', 'place']]


def on_off(node):
    if node is None:
        return None
    value = node.get('{'+W+'}val', 'true')
    if value in ['0', 'false', 'off']:
        return False
    if value in ['1', 'true', 'on']:
        return True
    raise ValueError('Unsupported OnOff value: '+value)


def can_split(archive, table, row):
    """Resolve only row split inheritance; conditional styles require review.

Direct row formatting overrides table styles. For an implicit/explicit table
style, follow the basedOn chain and fail closed on ambiguity or conditional
cantSplit rather than assuming that an absent row property means split allowed.
"""
    direct = row.findall('w:trPr/w:cantSplit', NS)
    if len(direct) > 1:
        return None, 'AMBIGUOUS_DIRECT_CANT_SPLIT'
    if direct:
        return not on_off(direct[0]), 'DIRECT_ROW_PROPERTY'
    if 'word/styles.xml' not in archive.namelist():
        return None, 'MISSING_STYLES_PART'
    root = reader._inventory.effective_tree(archive.read('word/styles.xml'))
    refs = table.findall('w:tblPr/w:tblStyle', NS)
    if len(refs) > 1:
        return None, 'AMBIGUOUS_TABLE_STYLE_REFERENCE'
    styles = root.xpath('./w:style[@w:type="table"]', namespaces=NS)
    if refs:
        current = refs[0].get('{'+W+'}val')
        if not current:
            return None, 'MISSING_TABLE_STYLE_ID'
    else:
        defaults = [s for s in styles if s.get('{'+W+'}default') in ['1', 'true', 'on']]
        if len(defaults) > 1:
            return None, 'AMBIGUOUS_DEFAULT_TABLE_STYLE'
        current = defaults[0].get('{'+W+'}styleId') if defaults else None
        if defaults and not current:
            return None, 'MISSING_DEFAULT_TABLE_STYLE_ID'
    seen, resolved = set(), None
    while current is not None:
        matches = [s for s in styles if s.get('{'+W+'}styleId') == current]
        if current in seen or len(matches) != 1:
            return None, 'MISSING_DUPLICATE_OR_CYCLIC_TABLE_STYLE'
        seen.add(current)
        style = matches[0]
        if style.findall('w:tblStylePr/w:trPr/w:cantSplit', NS):
            return None, 'CONDITIONAL_TABLE_SPLIT_REQUIRES_REVIEW'
        values = style.findall('w:trPr/w:cantSplit', NS)
        if len(values) > 1:
            return None, 'AMBIGUOUS_STYLE_CANT_SPLIT'
        if values and resolved is None:
            resolved = on_off(values[0])
        bases = style.findall('w:basedOn', NS)
        if len(bases) > 1:
            return None, 'AMBIGUOUS_TABLE_STYLE_BASE'
        current = bases[0].get('{'+W+'}val') if bases else None
        if bases and not current:
            return None, 'MISSING_BASE_TABLE_STYLE_ID'
    return not resolved, 'TABLE_STYLE_CHAIN' if seen else 'NO_TABLE_SPLIT_OVERRIDE'


def recipient_state(path):
    result = {'problems': [], 'minimumTwips': None, 'heightRule': None,
              'rowCanSplit': None, 'splitBasis': None, 'fieldsInOrder': [],
              'oneRowOneCell': False, 'noPropertyRevisions': False,
              'noAdditionalRecipientText': False}
    with ZipFile(path) as archive:
        root = reader._inventory.effective_tree(archive.read('word/document.xml'))
        controls = []
        for tag in RECIPIENT:
            matches = root.xpath('.//w:sdt[w:sdtPr/w:tag[@w:val=$tag]]', namespaces=NS, tag=tag)
            if len(matches) != 1:
                result['problems'].append('MISSING_OR_AMBIGUOUS_RECIPIENT_FIELD')
                return result
            controls.append(matches[0])
        cells = [next(c.iterancestors('{'+W+'}tc'), None) for c in controls]
        if cells[0] is None or any(c is not cells[0] for c in cells):
            result['problems'].append('RECIPIENT_FIELDS_NOT_IN_ONE_CELL')
            return result
        cell = cells[0]
        row, table = cell.getparent(), cell.getparent().getparent()
        if row.tag != '{'+W+'}tr' or table.tag != '{'+W+'}tbl':
            result['problems'].append('UNSUPPORTED_RECIPIENT_ROW_STRUCTURE')
            return result
        result['oneRowOneCell'] = len(table.findall('w:tr', NS)) == len(row.findall('w:tc', NS)) == 1
        if any(len(parent.findall('w:'+name, NS)) > 1
               for parent, name in [(table, 'tblPr'), (row, 'trPr'), (cell, 'tcPr')]):
            result['problems'].append('AMBIGUOUS_RECIPIENT_PROPERTY_CONTAINERS')
        result['fieldsInOrder'] = cell.xpath('.//w:sdtPr/w:tag/@w:val', namespaces=NS)
        result['noAdditionalRecipientText'] = not [t for t in cell.findall('.//w:t', NS)
            if t.text and t.text.strip() and not any(c in set(t.iterancestors()) for c in controls)]
        result['noPropertyRevisions'] = not table.xpath(
            './/w:trPrChange | .//w:tblPrChange | .//w:tcPrChange', namespaces=NS)
        heights = row.findall('w:trPr/w:trHeight', NS)
        if len(heights) == 1:
            result['heightRule'] = heights[0].get('{'+W+'}hRule')
            try:
                result['minimumTwips'] = int(heights[0].get('{'+W+'}val'))
            except (ValueError, TypeError):
                result['problems'].append('INVALID_ROW_HEIGHT')
        else:
            result['problems'].append('MISSING_OR_AMBIGUOUS_ROW_HEIGHT')
        try:
            result['rowCanSplit'], result['splitBasis'] = can_split(archive, table, row)
        except ValueError:
            result['problems'].append('INVALID_ROW_SPLIT_VALUE')
    return result


def node_signature(node):
    if node is None:
        return None
    return [node.tag, sorted(node.attrib.items()),
            ' '.join(node.text.split()) if node.text and node.text.strip() else None,
            [node_signature(child) for child in node]]


def control_behavior_supported(path):
    allowed = {'{'+W+'}'+name for name in ['alias', 'tag', 'id', 'rPr', 'picture']}
    allowed |= {'{http://schemas.microsoft.com/office/word/2012/wordml}'+name
                for name in ['appearance', 'color']}
    with ZipFile(path) as archive:
        for name in archive.namelist():
            if not name.startswith('word/') or not name.endswith('.xml'):
                continue
            root = reader._inventory.effective_tree(archive.read(name))
            if root.tag not in ['{'+W+'}'+n for n in ['document', 'hdr', 'ftr']]:
                continue
            for props in root.findall('.//w:sdtPr', NS):
                tag = props.find('w:tag', NS)
                if tag is None or not tag.get('{'+W+'}val'):
                    # Untagged extra controls are outside this pinned contract.
                    return False
                photo = tag.get('{'+W+'}val') == 'cv.person.photo'
                if (any(n.tag not in allowed for n in props) or
                        len(props.findall('w:tag', NS)) != 1 or
                        any(len(props.findall('w:'+n, NS)) > 1 for n in ['alias', 'id', 'rPr']) or
                        len(props.findall('w:picture', NS)) != int(photo)):
                    return False
    return True


def photo_frame(path, picture):
    """Observe the active picture inside the matched owner, never a package copy."""
    if picture is None:
        return None
    with ZipFile(path) as archive:
        root = reader._inventory.effective_tree(archive.read(picture['story']))
    owners = root.xpath('.//w:sdt[w:sdtPr/w:tag[@w:val="cv.person.photo"]]', namespaces=NS)
    if len(owners) != 1:
        return None
    owner = owners[0]
    containers = owner.xpath('.//wp:inline | .//wp:anchor', namespaces=NS)
    shapes = owner.findall('.//pic:pic/pic:spPr', NS)
    if len(containers) != 1 or len(shapes) != 1:
        return None
    container, shape = containers[0], shapes[0]
    try:
        outer = container.find('wp:extent', NS)
        inner = shape.find('a:xfrm/a:ext', NS)
        offset = shape.find('a:xfrm/a:off', NS)
        xfrm = shape.find('a:xfrm', NS)
        flips = {}
        for name in ['flipH', 'flipV']:
            value = xfrm.get(name, '0')
            if value not in ['0', '1', 'false', 'true']:
                return None
            flips[name] = int(value in ['1', 'true'])
        return {'placement': ET.QName(container).localname,
            'outerExtentEmu': [int(outer.get(k)) for k in ['cx', 'cy']],
            'innerExtentEmu': [int(inner.get(k)) for k in ['cx', 'cy']],
            'offsetEmu': [int(offset.get(k)) for k in ['x', 'y']],
            'rotation': {'rot': int(xfrm.get('rot', '0')), **flips},
            'geometry': node_signature(shape.find('a:prstGeom', NS)),
            'paint': [node_signature(n) for n in shape
                      if n.tag not in ['{'+NS['a']+'}xfrm', '{'+NS['a']+'}prstGeom']]}
    except (AttributeError, TypeError, ValueError):
        return None


def compare(source, saved):
    source_hash = reader.digest(Path(source).read_bytes())
    if source_hash not in SOURCES:
        raise ValueError('Require the exact Standard or Wide source from the separate Letter v2 packet')
    legacy = reader.compare(source, saved)
    instances, photos = legacy['instances'], legacy['pictures']
    before, after = recipient_state(source), recipient_state(saved)
    picture = photos[0] if len(photos) == 1 else None
    initial_frame = photo_frame(source, picture['source']) if picture else None
    saved_frame = photo_frame(saved, picture['saved']) if picture else None
    checks = {
        'allFieldCountsUnchanged': (not legacy['addedFieldIds'] and
            all(r['sourceCount'] == r['savedCount'] for r in legacy['fields'])),
        'allFieldTokensRolesAndNestingUnchanged': all(r['matchStatus'] == 'MATCHED' and
            r['fieldTokensUnchanged'] and r['canonicalStoryRolesUnchanged'] and
            r['controlNestingUnchanged'] for r in instances),
        'sectionCountUnchanged': legacy['sectionCounts']['source'] == legacy['sectionCounts']['saved'],
        'noTrackedRevisions': not any(legacy['trackedRevisionMarkupCount'].values()),
        'supportedControlBehavior': control_behavior_supported(saved),
        'nativeControlIdsValidAndUnique': not legacy['duplicateNativeSdtIds']['saved'] and
            not legacy['invalidNativeSdtIds']['saved'],
        'recipientFieldsRemainInOneRowAndCell': after['oneRowOneCell'] and after['fieldsInOrder'] == RECIPIENT,
        'recipientMinimumStillGrowable': not after['problems'] and
            after['minimumTwips'] == before['minimumTwips'] == 1381 and after['heightRule'] == 'atLeast',
        'recipientRowStillSplittable': after['rowCanSplit'] is True,
        'recipientNoPropertyRevisions': after['noPropertyRevisions'],
        'recipientNoAdditionalText': after['noAdditionalRecipientText'],
        'typedCanonicalPhotoOriginalAndCropUnchanged': bool(picture and
            picture['savedOwnedPictureCount'] == 1 and picture['typedPictureControlSurvives'] and
            picture['canonicalOwnerStoryRolesUnchanged'] and picture['originalPixelsInsideCanonicalControl'] and
            picture['encodedCropFractionsUnchanged'] and picture['source']['embeddedFileSha256'] and
            picture['saved']['embeddedFileSha256'] == picture['source']['embeddedFileSha256']),
        'photoFrameAndInlinePlacementUnchanged': initial_frame is not None and initial_frame == saved_frame,
    }
    failures = [key for key, passed in checks.items() if not passed]
    return {'contract': 'UNTOUCHED_LETTER_RECIPIENT_MINIMUM_V2', 'case': SOURCES[source_hash],
        'sourceSha256': source_hash, 'savedSha256': legacy['savedSha256'],
        'preservationStatus': 'FAIL' if failures else 'PRESERVED_WITHIN_BOUNDED_XML_CHECKS',
        'checks': checks, 'failedChecks': failures,
        'fieldOccurrences': len(instances), 'canonicalTags': legacy['sourceFields'],
        'savedOccurrencesOfSourceFields': sum(r['savedCount'] for r in legacy['fields']),
        'savedCanonicalTags': legacy['savedFields'], 'addedCanonicalFieldIds': legacy['addedFieldIds'],
        'declaredApplications': legacy['declaredApplications'],
        'changedOrAmbiguousFields': [r['field'] for r in instances if r['matchStatus'] != 'MATCHED' or
            not r['fieldTokensUnchanged'] or not r['canonicalStoryRolesUnchanged'] or not r['controlNestingUnchanged']],
        'recipient': {'source': before, 'saved': after},
        'photoFrame': {'source': initial_frame, 'saved': saved_frame},
        'wordAcceptance': 'UNVERIFIED', 'wordUiActionsProven': False,
        'saveReopenPerformedByThisTool': False, 'renderingChecked': False,
        'legacyReadersOrProductionGatesChanged': False,
        'limits': ['Untouched saves only; intentional text, crop, size, placement or picture edits are separate.',
            'XML preservation does not establish Word UI, saved application, visible pagination or actual reopen.',
            'Application metadata is observed, not proof of which application performed the save.',
            'Native row height and split inheritance are bounded checks, not full table style/schema validation.',
            'Conditional split styles, unsupported structures or ambiguous fields require separate review.',
            'All visible spacing, wrapping, borders and fonts still need Word/PDF review.',
            'Other active decorative pictures, arbitrary non-field content and complete formatting are not fully compared.',
            'No Sidebar production or general Word acceptance is granted.']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ['source', 'saved', 'report']:
        parser.add_argument(name, type=Path)
    args = parser.parse_args()
    if len({p.resolve() for p in [args.source, args.saved, args.report]}) != 3 or args.report.exists():
        parser.error('Use distinct input paths and a new report path')
    try:
        report = compare(args.source, args.saved)
    except (ValueError, OSError, BadZipFile, ET.XMLSyntaxError) as error:
        parser.error(str(error))
    args.report.parent.mkdir(parents=True, exist_ok=True)
    with args.report.open('x', encoding='utf-8') as output:
        json.dump(report, output, ensure_ascii=False, indent=2)
        output.write('\n')
    print(json.dumps({k: report[k] for k in ['case', 'preservationStatus', 'failedChecks', 'wordAcceptance']}))
    raise SystemExit(1 if report['failedChecks'] else 0)


if __name__ == '__main__':
    main()
