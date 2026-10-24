"""Read-only DOCX comparison. XML survival is never a Word/render acceptance."""
import argparse
import hashlib
import importlib.util
import io
import json
import posixpath
import re
from collections import Counter
from decimal import Decimal, InvalidOperation
from pathlib import Path
from zipfile import ZipFile

from lxml import etree as ET
from PIL import Image

_spec = importlib.util.spec_from_file_location(
    'sidebar_inventory', Path(__file__).with_name('docx-next-sidebar-word-layout-qa.py'))
_inventory = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_inventory)
W, R, NS = _inventory.W, _inventory.R, dict(_inventory.NS)
W14 = 'http://schemas.microsoft.com/office/word/2010/wordml'
NS['w14'] = W14
NS['pic'] = 'http://schemas.openxmlformats.org/drawingml/2006/picture'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def text_tokens(node):
    """Retain hard breaks/tabs; do not mistake an inline-to-block rewrite for text loss."""
    result, paragraphs = [], 0
    for child in node.iter():
        if not isinstance(child.tag, str):
            continue
        tag = ET.QName(child).localname
        if ET.QName(child).namespace != W:
            continue
        if tag == 'p':
            if paragraphs:
                result.append('\u2029')
            paragraphs += 1
        elif tag == 't':
            result.append(child.text or '')
        elif tag in ('br', 'cr'):
            kind = child.get('{'+W+'}type', 'textWrapping')
            result.append({'page': '\f', 'column': '\v'}.get(kind, '\n'))
        elif tag == 'tab':
            result.append('\t')
        elif tag == 'noBreakHyphen':
            result.append('\u2011')
        elif tag == 'softHyphen':
            result.append('\u00ad')
        elif tag == 'sym':
            result.append('[symbol:'+child.get('{'+W+'}font', '')+':'+child.get('{'+W+'}char', '')+']')
    return ''.join(result)


def pixels(data):
    try:
        with Image.open(io.BytesIO(data)) as im:
            rgba = im.convert('RGBA')
            return {'width': rgba.width, 'height': rgba.height,
                    'rgbaSha256': digest(rgba.tobytes())}
    except (OSError, ValueError):
        return None


def paragraphs_for(control):
    inside = control.findall('.//w:p', NS)
    if inside:
        return inside
    return control.xpath('ancestor::w:p[1]', namespaces=NS)


def relationships(archive, story):
    path = posixpath.join(posixpath.dirname(story), '_rels', posixpath.basename(story)+'.rels')
    if path not in archive.namelist():
        return {}
    root = ET.fromstring(archive.read(path))
    package_ns = 'http://schemas.openxmlformats.org/package/2006/relationships'
    if root.tag != '{'+package_ns+'}Relationships':
        raise ValueError('Unsupported relationships namespace in '+story)
    rows = [row for row in root if isinstance(row.tag, str)]
    if any(row.tag != '{'+package_ns+'}Relationship' for row in rows):
        raise ValueError('Unsupported relationship element in '+story)
    ids = [row.get('Id') for row in rows]
    if any(not rid for rid in ids):
        raise ValueError('Missing relationship ID in '+story)
    if len(ids) != len(set(ids)):
        raise ValueError('Ambiguous duplicate relationships in '+story)
    return {row.get('Id'): row for row in rows}


def numeric_id(value):
    return str(int(value)) if value is not None and re.fullmatch(r'[+-]?\d+', value) else None


def story_roles(archive):
    """Section/reference addresses survive header-file renames. No text matching.

    Roles identify referenced stories, not which pages a renderer displays.
    Inherited references can give one physical story several role addresses.
    """
    main = 'word/document.xml'
    root = _inventory.effective_tree(archive.read(main))
    refs = relationships(archive, main)
    roles, inherited = {main: ['body']}, {}
    sections = root.xpath('.//w:sectPr[not(ancestor::w:sectPrChange) and not(ancestor::w:txbxContent)]', namespaces=NS)
    for index, section in enumerate(sections, 1):
        seen_references = set()
        for scope in ['header', 'footer']:
            for ref in section.findall('w:'+scope+'Reference', NS):
                kind = ref.get('{'+W+'}type')
                if kind not in ['default', 'first', 'even']:
                    raise ValueError('Unsupported '+scope+' reference role')
                if (scope, kind) in seen_references:
                    raise ValueError('Ambiguous duplicate '+scope+' reference in one section')
                seen_references.add((scope, kind))
                rel = refs.get(ref.get('{'+R+'}id'))
                if rel is None or rel.get('TargetMode') == 'External':
                    raise ValueError('Unresolved or external '+scope+' reference')
                if not rel.get('Type', '').endswith('/'+scope):
                    raise ValueError('Wrong relationship type for '+scope+' reference')
                target = rel.get('Target', '')
                target = target.lstrip('/') if target.startswith('/') else posixpath.normpath(posixpath.join('word', target))
                if target not in archive.namelist():
                    raise ValueError('Missing '+scope+' part')
                if _inventory.effective_tree(archive.read(target)).tag != '{'+W+'}'+('hdr' if scope == 'header' else 'ftr'):
                    raise ValueError('Wrong root element in '+scope+' part')
                inherited[(scope, kind)] = target
        for (scope, kind), target in inherited.items():
            roles.setdefault(target, []).append(f'section:{index}/{scope}:{kind}')
    return roles, max(1, len(sections))


def body_locations(root):
    """Section-end paragraph properties belong to that paragraph's section.

    Textboxes cannot introduce body sections. An outer control can cover more
    than one section; do not collapse those locations into a global body tag.
    """
    positions = {node: index for index, node in enumerate(root.iter())}
    ends = []
    for section in root.xpath('.//w:sectPr[not(ancestor::w:sectPrChange) and not(ancestor::w:txbxContent)]', namespaces=NS):
        paragraph = section.xpath('ancestor::w:p[1]', namespaces=NS)
        boundary = paragraph[0] if paragraph else section
        ends.append(max(positions[n] for n in boundary.iter()))

    def locations(node):
        start, end = positions[node], max(positions[n] for n in node.iter())
        first = 1 + sum(p < start for p in ends)
        last = 1 + sum(p < end for p in ends)
        return [f'section:{index}/body' for index in range(first, last + 1)]
    return locations


def crop_encoding(image):
    fill_markup = None
    if image.tag == '{'+NS['a']+'}blip':
        crop = image.getparent().find('a:srcRect', NS)
        markup = None if crop is None else dict(crop.attrib)
        fill = image.getparent().find('a:stretch/a:fillRect', NS)
        fill_markup = None if fill is None else dict(fill.attrib)
        try:
            values = [Decimal((markup or {}).get(k, '0')) / 100000 for k in ['l', 't', 'r', 'b']]
        except InvalidOperation:
            values = None
        try:
            if any(Decimal(value) != 0 for value in (fill_markup or {}).values()):
                values = None
        except InvalidOperation:
            values = None
        if image.getparent().find('a:tile', NS) is not None:
            values = None
        container = 'native-picture' if image.xpath('ancestor::pic:pic', namespaces=NS) else 'drawing-shape-fill'
    else:
        keys = {'cropleft', 'croptop', 'cropright', 'cropbottom', 'focusposition',
                'focussize', 'aspect', 'origin', 'position', 'size', 'type'}
        markup = {ET.QName(k).localname: v for k, v in image.attrib.items()
                  if ET.QName(k).localname in keys} or None
        values = None
        if image.tag == '{'+NS['v']+'}imagedata':
            def fraction(value):
                if value.endswith('f'):
                    return Decimal(value[:-1])/65536
                if value.endswith('%'):
                    return Decimal(value[:-1])/100
                return Decimal(value)
            try:
                values = [fraction((markup or {}).get(k, '0')) for k in
                          ['cropleft', 'croptop', 'cropright', 'cropbottom']]
            except InvalidOperation:
                values = None
        container = 'vml-image' if image.tag.endswith('}imagedata') else 'vml-shape-fill'
    if values is not None and (any(not v.is_finite() or v < 0 or v >= 1 for v in values)
                               or values[0]+values[2] >= 1 or values[1]+values[3] >= 1):
        values = None
    return markup, None if values is None else [str(v.normalize()) for v in values], container, fill_markup


def inspect(path):
    fields, duplicate_ids, pictures, all_text, assets = {}, [], [], [], []
    software, revisions, native_ids = None, 0, []
    with ZipFile(path) as archive:
        if len(archive.namelist()) != len(set(archive.namelist())):
            raise ValueError('Ambiguous duplicate DOCX package members')
        if 'word/document.xml' not in archive.namelist():
            raise ValueError('Missing supported main document part')
        if archive.testzip() is not None:
            raise ValueError('Corrupt DOCX package')
        roles, section_count = story_roles(archive)
        if 'docProps/app.xml' in archive.namelist():
            app = ET.fromstring(archive.read('docProps/app.xml'))
            software = next((e.text for e in app.iter() if ET.QName(e).localname == 'Application'), None)
        for name in sorted(archive.namelist()):
            # OPC does not require image parts to live under word/media.
            # Package presence remains separate from resolved active pictures.
            asset = pixels(archive.read(name))
            if asset:
                assets.append(asset)
            if not name.startswith('word/') or not name.endswith('.xml'):
                continue
            root = _inventory.effective_tree(archive.read(name))
            if name == 'word/document.xml' and root.tag != '{'+W+'}document':
                raise ValueError('Unsupported main document namespace; field loss cannot be assessed')
            if root.tag not in ['{'+W+'}'+n for n in ['document', 'hdr', 'ftr']]:
                continue
            locations = body_locations(root) if name == 'word/document.xml' else lambda _: roles.get(name, [])
            revisions += len(root.xpath('.//w:ins | .//w:del | .//w:moveFrom | .//w:moveTo', namespaces=NS))
            all_text.extend(root.xpath('.//w:t/text()', namespaces=NS))
            rels = relationships(archive, name)
            control_records = {}
            native_ids.extend(root.xpath('.//w:sdtPr/w:id/@w:val', namespaces=NS))
            for control in root.findall('.//w:sdt', NS):
                tag = control.find('w:sdtPr/w:tag', NS)
                if tag is None or not tag.get('{'+W+'}val'):
                    continue
                field = tag.get('{'+W+'}val')
                content = control.find('w:sdtContent', NS)
                if content is None:
                    continue
                if field in fields:
                    duplicate_ids.append(field)
                props = control.find('w:sdtPr', NS)
                native_id = props.find('w:id', NS)
                fields.setdefault(field, []).append({
                    'text': text_tokens(content),
                    'plainText': ''.join(content.xpath('.//w:t/text()', namespaces=NS)),
                    'story': name,
                    'storyRoles': locations(control),
                    'ancestorFieldIds': control.xpath('ancestor::w:sdt/w:sdtPr/w:tag/@w:val', namespaces=NS),
                    'contentKind': 'block' if content.find('w:p', NS) is not None or content.find('w:tbl', NS) is not None else 'inline',
                    'typedPicture': props.find('w:picture', NS) is not None,
                    'nativeSdtId': None if native_id is None else native_id.get('{'+W+'}val'),
                    'nativeSdtIdValue': None if native_id is None else numeric_id(native_id.get('{'+W+'}val')),
                    'ancestors': [ET.QName(p).localname for p in control.iterancestors()],
                    'paragraphIds': [p.get('{'+W14+'}paraId') for p in paragraphs_for(control)],
                })
                # Addresses identify the owner already found in this package;
                # compare_instances decides cross-package matches without order.
                control_records[control] = {'field': field, 'occurrence': len(fields[field])}
            for image in root.xpath('.//a:blip[@r:embed] | .//v:fill[@r:id] | .//v:imagedata[@r:id]', namespaces=NS):
                rid = image.get('{'+R+'}embed') or image.get('{'+R+'}id')
                rel = rels.get(rid)
                target = None if rel is None else rel.get('Target')
                embedded = None
                relationship_status = ('MISSING_RELATIONSHIP' if rel is None else
                                       'WRONG_RELATIONSHIP_TYPE' if rel.get('Type') != R+'/image' else
                                       'EXTERNAL_RELATIONSHIP' if rel.get('TargetMode') == 'External' else
                                       'MISSING_PACKAGE_PART')
                if target and relationship_status == 'MISSING_PACKAGE_PART':
                    target = target.lstrip('/') if target.startswith('/') else posixpath.normpath(posixpath.join(posixpath.dirname(name), target))
                    if target in archive.namelist():
                        embedded = archive.read(target)
                        relationship_status = 'RESOLVED_EMBEDDED_IMAGE'
                owners = image.xpath('ancestor::w:sdt/w:sdtPr/w:tag/@w:val', namespaces=NS)
                owner_occurrences = [control_records[control] for control in image.iterancestors()
                                     if control in control_records]
                crop, fractions, container, fill = crop_encoding(image)
                pictures.append({'owners': owners, 'representation': 'DrawingML' if image.tag.endswith('}blip') else 'VML',
                                 'ownerOccurrences': owner_occurrences,
                                 'imageRelationshipStatus': relationship_status,
                                 'story': name, 'storyRoles': locations(image), 'container': container,
                                 'pixels': None if embedded is None else pixels(embedded),
                                 'embeddedFileSha256': None if embedded is None else digest(embedded),
                                 'cropMarkup': crop, 'cropFractions': fractions, 'fillRectMarkup': fill})
    return {'fields': fields, 'duplicates': sorted(set(duplicate_ids)),
            'pictures': pictures, 'assets': assets, 'plainText': ''.join(all_text),
            'declaredApplication': software, 'trackedRevisionMarkupCount': revisions,
            'sectionCount': section_count, 'storyRoles': roles,
            'duplicateNativeSdtIds': sorted(k for k, count in Counter(numeric_id(v) for v in native_ids).items() if k is not None and count > 1),
            'invalidNativeSdtIds': [v for v in native_ids if numeric_id(v) is None]}


def compare_instances(before, after):
    """Match source roles and tags; never pair ambiguous copies by value or order."""
    rows = []
    for field, originals in before['fields'].items():
        saved = after['fields'].get(field, [])
        for ordinal, source in enumerate(originals):
            roles = set(source['storyRoles'])
            candidates = [f for f in saved if roles.intersection(f['storyRoles'])] if roles else []
            peers = [f for f in originals if roles.intersection(f['storyRoles'])] if roles else []
            match, basis = None, None
            if len(peers) == len(candidates) == 1:
                match, basis = candidates[0], 'CANONICAL_TAG_AND_SECTION_STORY_ROLE'
            elif roles and source['nativeSdtIdValue'] is not None:
                native_id = source['nativeSdtIdValue']
                if native_id not in before['duplicateNativeSdtIds'] and native_id not in after['duplicateNativeSdtIds']:
                    exact = [f for f in candidates if f['nativeSdtIdValue'] == native_id]
                    if len(exact) == 1:
                        match, basis = exact[0], 'CANONICAL_TAG_ROLE_AND_UNIQUE_PERSISTED_ID'
            if not roles:
                status = 'UNREFERENCED_SOURCE_STORY'
            elif match is not None:
                status = 'MATCHED'
            elif not candidates:
                status = 'MISSING_OR_MOVED_TO_ANOTHER_STORY_ROLE'
            else:
                status = 'AMBIGUOUS_DUPLICATE_WITHIN_STORY_ROLE'
            ids = source['paragraphIds']
            paragraph = 'NOT_ASSESSABLE_SOURCE_HAS_NO_PARAGRAPH_IDS'
            if ids and all(ids):
                paragraph = 'UNCHANGED' if match and ids == match['paragraphIds'] else 'CHANGED_OR_MISSING'
            rows.append({'field': field, 'sourceOccurrence': ordinal + 1,
                         'sourceStory': source['story'], 'sourceStoryRoles': source['storyRoles'],
                         'matchStatus': status, 'matchingBasis': basis,
                         'savedOccurrence': None if match is None else next(
                             index for index, row in enumerate(saved, 1) if row is match),
                         'savedStory': None if match is None else match['story'],
                         'savedStoryRoles': [] if match is None else match['storyRoles'],
                         'fieldTokensUnchanged': bool(match and source['text'] == match['text']),
                         'canonicalStoryRolesUnchanged': bool(match and source['storyRoles'] == match['storyRoles']),
                         'physicalPartNameUnchanged': bool(match and source['story'] == match['story']),
                         'controlNestingUnchanged': bool(match and source['ancestors'] == match['ancestors'] and
                                                         source['ancestorFieldIds'] == match['ancestorFieldIds']),
                         'sourceTextPresentSomewhereInSavedXml': source['plainText'] in after['plainText'] if source['plainText'] else None,
                         'nativeSdtId': {'source': source['nativeSdtId'], 'saved': None if match is None else match['nativeSdtId']},
                         'persistedParagraphIdComparison': paragraph})
    return rows


def compare(source, saved):
    before, after = inspect(source), inspect(saved)
    instances = compare_instances(before, after)
    rows = []
    for field, original in before['fields'].items():
        actual = after['fields'].get(field, [])
        a, b = original[0], actual[0] if len(actual) == 1 else None
        ids = a['paragraphIds']
        paragraph_identity = 'NOT_ASSESSABLE_SOURCE_HAS_NO_PARAGRAPH_IDS'
        if ids and all(ids):
            paragraph_identity = 'UNCHANGED' if b and ids == b['paragraphIds'] else 'CHANGED_OR_MISSING'
        rows.append({'field': field, 'sourceCount': len(original), 'savedCount': len(actual),
                     'canonicalIdUnique': len(original) == len(actual) == 1,
                     'fieldTokensUnchanged': bool(b and a['text'] == b['text']),
                     'sourceTextPresentSomewhereInSavedXml': (a['plainText'] in after['plainText']) if a['plainText'] else None,
                     'sourceTextSha256': digest(a['text'].encode()),
                     'savedTextSha256': None if b is None else digest(b['text'].encode()),
                     'storyUnchanged': bool(b and a['story'] == b['story']),
                     'controlNestingUnchanged': bool(b and a['ancestors'] == b['ancestors']),
                     'nativeSdtId': {'source': a['nativeSdtId'], 'saved': None if b is None else b['nativeSdtId']},
                     'persistedParagraphIdComparison': paragraph_identity})
    photo = 'cv.person.photo'
    source_photos = [p for p in before['pictures'] if photo in p['owners']]
    picture_report = []
    for a in source_photos:
        owner_refs = [owner for owner in a['ownerOccurrences'] if owner['field'] == photo]
        instance = next((row for row in instances if row['field'] == photo and
                         len(owner_refs) == 1 and row['sourceOccurrence'] == owner_refs[0]['occurrence']), None)
        role_counts = {phase: sum(bool(set(a['storyRoles']).intersection(control['storyRoles']))
                                 for control in package['fields'].get(photo, []))
                       for phase, package in [('source', before), ('saved', after)]}
        matched = (instance is not None and instance['matchStatus'] == 'MATCHED' and
                   role_counts['source'] == role_counts['saved'])
        saved_occurrence = instance['savedOccurrence'] if matched else None
        saved_control = after['fields'][photo][saved_occurrence-1] if matched else None
        saved_photos = [picture for picture in after['pictures'] if matched and any(
            owner['field'] == photo and owner['occurrence'] == saved_occurrence
            for owner in picture['ownerOccurrences'])]
        owned = saved_photos[0] if len(saved_photos) == 1 else None
        same_pixels = lambda p: a['pixels'] is not None and p == a['pixels']
        picture_report.append({'source': a, 'savedOwnedPictureCount': len(saved_photos),
                               'canonicalOwnerMatchStatus': ('AMBIGUOUS_CHANGED_OWNER_COUNT' if instance and
                                   instance['matchStatus'] == 'MATCHED' and not matched else
                                   instance['matchStatus'] if instance else 'AMBIGUOUS_SOURCE_PICTURE_OWNER'),
                               'canonicalOwnerRoleCounts': role_counts,
                               'savedPhotoControlOccurrence': saved_occurrence,
                               'typedPictureControlSurvives': bool(saved_control and saved_control['typedPicture']),
                               'originalPixelsInsideCanonicalControl': bool(owned and same_pixels(owned['pixels'])),
                               'originalPixelsInAnyActivePicture': any(p['storyRoles'] and
                                   p['imageRelationshipStatus'] == 'RESOLVED_EMBEDDED_IMAGE' and
                                   same_pixels(p['pixels']) for p in after['pictures']),
                               'originalPixelsSomewhereInPackage': any(same_pixels(p) for p in after['assets']),
                               'exactCropMarkupUnchanged': bool(owned and a['representation'] == owned['representation'] and a['cropMarkup'] == owned['cropMarkup'] and a['fillRectMarkup'] == owned['fillRectMarkup']),
                               'encodedCropFractionsUnchanged': None if not owned or a['cropFractions'] is None or owned['cropFractions'] is None else a['cropFractions'] == owned['cropFractions'],
                               'originalPixelWindowUnchanged': None if not owned or not same_pixels(owned['pixels']) or a['cropFractions'] is None or owned['cropFractions'] is None else a['cropFractions'] == owned['cropFractions'],
                               'canonicalOwnerStoryRolesUnchanged': bool(owned and a['storyRoles'] and a['storyRoles'] == owned['storyRoles']),
                               'saved': owned})
    return {'sourceSha256': digest(Path(source).read_bytes()), 'savedSha256': digest(Path(saved).read_bytes()),
            'declaredApplications': {'source': before['declaredApplication'], 'saved': after['declaredApplication']},
            'duplicates': {'source': before['duplicates'], 'saved': after['duplicates']},
            'trackedRevisionMarkupCount': {'source': before['trackedRevisionMarkupCount'], 'saved': after['trackedRevisionMarkupCount']},
            'sourceFields': len(before['fields']), 'savedFields': len(after['fields']),
            'sectionCounts': {'source': before['sectionCount'], 'saved': after['sectionCount']},
            'duplicateNativeSdtIds': {'source': before['duplicateNativeSdtIds'], 'saved': after['duplicateNativeSdtIds']},
            'invalidNativeSdtIds': {'source': before['invalidNativeSdtIds'], 'saved': after['invalidNativeSdtIds']},
            'addedFieldIds': sorted(after['fields'].keys()-before['fields'].keys()),
            'fields': rows, 'instances': instances, 'pictures': picture_report,
            'wordAcceptance': 'UNVERIFIED', 'saveReopenPerformedByThisTool': False,
            'limits': ['XML text presence is not visible rendering or pagination.',
                       'Global canonical-tag uniqueness is separate from repeated source occurrences in different stories.',
                       'Section/reference roles tolerate part renames but do not prove native object identity or edit synchronization.',
                       'Unreferenced stories and same-tag copies within a role cannot pass by text-value or ordinal matching.',
                       'Picture ownership follows the matched control occurrence; orphan stories and non-image relationships cannot rescue active original pixels.',
                       'Package presence scans directly decodable image parts at any OPC path; nested containers or arbitrary base64 XML payloads are not a forensic archive search.',
                       'VML fill viewports without explicit crop fractions are not numerically comparable.',
                       'Changed structure or numeric SDT IDs alone do not establish lost canonical ownership.',
                       'Exact crop markup is separate from visible crop equivalence.',
                       'Original-image crop windows cannot be compared after the original pixels change.',
                       'w14:paraId equality is persisted metadata, not proof of native importer object identity.',
                       'When tracked revisions exist, counts include revision markup and require revision-aware review.',
                       'Intentional editing changes must be assessed separately from untouched Save/Reopen.',
                       'Application metadata alone cannot prove which program performed Save/Reopen.']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('saved', type=Path)
    parser.add_argument('report', type=Path)
    args = parser.parse_args()
    if args.report.resolve() in [args.source.resolve(), args.saved.resolve()]:
        parser.error('Report must not overwrite an input document')
    report = compare(args.source, args.saved)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps({'sourceFields': report['sourceFields'], 'savedFields': report['savedFields'],
                      'changedOrAmbiguousSourceOccurrences': sum(r['matchStatus'] != 'MATCHED' or not r['fieldTokensUnchanged'] or not r['canonicalStoryRolesUnchanged'] or not r['controlNestingUnchanged'] for r in report['instances']),
                      'globallyRepeatedCanonicalTags': report['duplicates'],
                      'photosWithoutTypedCanonicalOwner': sum(not p['typedPictureControlSurvives'] or p['savedOwnedPictureCount'] != 1 or
                          not p['canonicalOwnerStoryRolesUnchanged'] for p in report['pictures']),
                      'photosWithChangedOrMissingPixels': sum(not p['originalPixelsInsideCanonicalControl'] for p in report['pictures']),
                      'photosWithChangedCropMarkup': sum(not p['exactCropMarkupUnchanged'] for p in report['pictures']),
                      'wordAcceptance': 'UNVERIFIED'}))


if __name__ == '__main__':
    main()
