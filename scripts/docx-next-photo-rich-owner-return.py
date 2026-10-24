"""Read-only preservation check for a saved rich-owner photo experiment.

An XML preservation result never proves Word UI actions, rendering or acceptance.
The CLI requires a pinned synthetic control/Letter source and its exact inline-rich trial.
Use separate returned files for untouched saves and intentional picture edits.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
from zipfile import ZipFile

from lxml import etree as ET


def load_module(name, filename):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(filename))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


trial = load_module('rich_trial', 'docx-next-photo-rich-owner-prototype.py')
reader = load_module('rich_return_reader', 'docx-next-word-acceptance-23okt.py')
W, NS, TAG = reader.W, reader.NS, trial.TAG
NS['wp'] = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'
SYNTHETIC_SOURCES = {
    trial.CONTROL_SOURCE_SHA256: 'PINNED_SYNTHETIC_CONTROL',
    '4818ed92d27358cc719309a5431a1d45278b0631cb851089d3a6aa71bd0c0c73':
        'PINNED_SYNTHETIC_LETTER_SOURCE_FLOW_CANDIDATE',
}


def semantic_tree(node):
    """Compare picture paint without namespace-prefix or attribute-order noise."""
    if node is None:
        return None
    return [node.tag, sorted(node.attrib.items()), node.text if node.text and node.text.strip() else None,
            [semantic_tree(child) for child in node]]


def other_active_pictures(package):
    """A moved/copied picture outside its owner cannot masquerade as success."""
    return sorted(json.dumps({k: p[k] for k in ['owners', 'storyRoles', 'pixels', 'cropFractions']},
                             sort_keys=True) for p in package['pictures']
                  if p['storyRoles'] and TAG not in p['owners'])


def native_owner(path, record):
    """Read the one active owner, never a fallback copy or an object name."""
    with ZipFile(path) as archive:
        root = reader._inventory.effective_tree(archive.read(record['story']))
    owners = root.xpath('.//w:sdt[w:sdtPr/w:tag[@w:val=$tag]]', namespaces=NS, tag=TAG)
    if len(owners) != 1:
        raise ValueError('Require exactly one active owner in the matched story')
    owner = owners[0]
    props, content = owner.find('w:sdtPr', NS), owner.find('w:sdtContent', NS)
    # Fail closed on typed controls and new owner behavior. Word may add visual
    # control chrome, but binding, placeholder, temporary or lock semantics need
    # a separate contract. Native numeric IDs can legitimately be regenerated.
    allowed = {f'{{{W}}}{name}' for name in ['alias', 'tag', 'id', 'rPr']}
    allowed |= {f'{{http://schemas.microsoft.com/office/word/2012/wordml}}{name}'
                for name in ['appearance', 'color']}
    problems = []
    if content is None or any(p.tag not in allowed for p in props):
        problems.append('RICH_OWNER_PROPERTIES_NOT_SUPPORTED')
    result = {'problems': problems, 'placement': None, 'extentEmu': None,
              'pictureExtentEmu': None, 'presetGeometry': None,
              'position': None, 'wrap': None, 'rotation': None, 'pictureOffsetEmu': None,
              'geometryAdjustments': None, 'picturePaint': None}
    if content is None:
        return result
    if (content.xpath('.//w:vanish[not(@w:val="0" or @w:val="false" or @w:val="off")] | '
                      './/w:webHidden[not(@w:val="0" or @w:val="false" or @w:val="off")] | '
                      './/*[@hidden="1" or @hidden="true" or @hidden="on"]', namespaces=NS)):
        problems.append('HIDDEN_PICTURE_REQUIRES_SEPARATE_REVIEW')
    drawings = content.findall('.//w:drawing', NS)
    containers = content.xpath('.//wp:inline | .//wp:anchor', namespaces=NS)
    pictures = content.findall('.//pic:pic', NS)
    if (len(drawings) != 1 or len(containers) != 1 or len(pictures) != 1 or
            containers[0].getparent() is not drawings[0] or
            pictures[0] not in set(containers[0].iter()) or
            owner.xpath('ancestor::w:txbxContent', namespaces=NS) or
            content.findall('.//w:txbxContent', NS) or content.findall('.//v:shape', NS)):
        problems.append('REQUIRE_ONE_ORDINARY_NATIVE_PICTURE_INSIDE_OWNER')
        return result
    container, picture = containers[0], pictures[0]
    result['placement'] = ET.QName(container).localname
    extent = container.find('wp:extent', NS)
    shape_extent = picture.find('pic:spPr/a:xfrm/a:ext', NS)
    for key, element in [('extentEmu', extent), ('pictureExtentEmu', shape_extent)]:
        try:
            result[key] = [int(element.get(axis)) for axis in ['cx', 'cy']]
            if any(v <= 0 for v in result[key]):
                raise ValueError('Nonpositive extent')
        except (AttributeError, TypeError, ValueError):
            problems.append('MISSING_OR_INVALID_' + key.upper())
    transform = picture.find('pic:spPr/a:xfrm', NS)
    result['rotation'] = {'rot': '0', 'flipH': '0', 'flipV': '0'}
    if transform is not None:
        result['rotation'].update({k: transform.get(k, v) for k, v in result['rotation'].items()})
    offset = picture.find('pic:spPr/a:xfrm/a:off', NS)
    try:
        result['pictureOffsetEmu'] = [int(offset.get(axis)) for axis in ['x', 'y']]
    except (AttributeError, TypeError, ValueError):
        problems.append('MISSING_OR_INVALID_PICTURE_OFFSET')
    geometry = picture.find('pic:spPr/a:prstGeom', NS)
    result['presetGeometry'] = None if geometry is None else geometry.get('prst')
    result['geometryAdjustments'] = semantic_tree(geometry)
    shape = picture.find('pic:spPr', NS)
    result['picturePaint'] = {'attributes': sorted(shape.attrib.items()),
        'children': [semantic_tree(n) for n in shape
                     if n.tag not in ['{'+NS['a']+'}xfrm', '{'+NS['a']+'}prstGeom']]} if shape is not None else None
    if (any(n.tag not in ['{'+NS['pic']+'}'+name for name in ['nvPicPr', 'blipFill', 'spPr']] for n in picture)
            or content.findall('.//w:object', NS)):
        problems.append('EXTRA_PICTURE_STYLE_OR_OBJECT_REQUIRES_SEPARATE_REVIEW')
    if picture.find('pic:blipFill/a:blip', NS) is not None and len(picture.find('pic:blipFill/a:blip', NS)):
        problems.append('PICTURE_BLIP_EFFECTS_REQUIRE_SEPARATE_REVIEW')
    if result['presetGeometry'] is None:
        problems.append('UNSUPPORTED_PICTURE_GEOMETRY')
    # Report native positions, without guessing rendered page coordinates.
    result['position'] = {axis: None if container.find('wp:position'+axis, NS) is None else {
        'relativeFrom': container.find('wp:position'+axis, NS).get('relativeFrom'),
        'children': [(ET.QName(n).localname, n.text) for n in container.find('wp:position'+axis, NS)]
    } for axis in ['H', 'V']}
    wraps = [ET.QName(n).localname for n in container if ET.QName(n).localname.startswith('wrap')]
    result['wrap'] = wraps
    if result['placement'] == 'anchor' and len(wraps) != 1:
        problems.append('MISSING_OR_AMBIGUOUS_ANCHOR_WRAP')
    return result


def compare(initial, saved):
    """Bounded untouched-image/positioning gate. Replacement/reset never pass it."""
    before, after = reader.inspect(initial), reader.inspect(saved)
    checks, observations = {}, {}
    checks['noTrackedRevisions'] = not (before['trackedRevisionMarkupCount'] or after['trackedRevisionMarkupCount'])
    checks['sectionCountUnchanged'] = before['sectionCount'] == after['sectionCount']
    checks['allFieldCountsUnchanged'] = ({k: len(v) for k, v in before['fields'].items()} ==
                                       {k: len(v) for k, v in after['fields'].items()})
    checks['otherActivePicturesUnchanged'] = other_active_pictures(before) == other_active_pictures(after)
    instances = reader.compare_instances(before, after)
    checks['allFieldTokensAndRolesUnchanged'] = all(
        r['matchStatus'] == 'MATCHED' and r['fieldTokensUnchanged'] and r['canonicalStoryRolesUnchanged']
        for r in instances)
    checks['canonicalFieldNestingUnchanged'] = all(
        r['matchStatus'] == 'MATCHED' and
        before['fields'][r['field']][r['sourceOccurrence']-1]['ancestorFieldIds'] ==
        after['fields'][r['field']][r['savedOccurrence']-1]['ancestorFieldIds'] for r in instances)
    a, b = before['fields'].get(TAG, []), after['fields'].get(TAG, [])
    checks['oneCanonicalOwner'] = len(a) == len(b) == 1
    ap = [p for p in before['pictures'] if TAG in p['owners']]
    bp = [p for p in after['pictures'] if TAG in p['owners']]
    checks['onePictureInsideCanonicalOwner'] = len(ap) == len(bp) == 1
    if checks['oneCanonicalOwner']:
        checks['canonicalPhotoRoleAndNestingUnchanged'] = bool(a[0]['storyRoles']) and (
            a[0]['storyRoles'] == b[0]['storyRoles'] and a[0]['ancestorFieldIds'] == b[0]['ancestorFieldIds'])
        source_native, saved_native = native_owner(initial, a[0]), native_owner(saved, b[0])
        observations['native'] = {'initial': source_native, 'saved': saved_native}
        checks['supportedRichNativeOwners'] = not source_native['problems'] and not saved_native['problems']
        checks['frameSizeAndShapeUnchanged'] = all(source_native[k] is not None and source_native[k] == saved_native[k]
            for k in ['extentEmu', 'pictureExtentEmu', 'presetGeometry', 'rotation', 'pictureOffsetEmu',
                      'geometryAdjustments', 'picturePaint'])
        observations['placementChanged'] = source_native['placement'] != saved_native['placement']
        observations['nativePositionChanged'] = source_native['position'] != saved_native['position']
        observations['wrapChanged'] = source_native['wrap'] != saved_native['wrap']
    if checks['onePictureInsideCanonicalOwner']:
        pa, pb = ap[0], bp[0]
        checks['activeEmbeddedPictureResolved'] = all(p['imageRelationshipStatus'] == 'RESOLVED_EMBEDDED_IMAGE'
            and p['storyRoles'] and p['container'] == 'native-picture' for p in [pa, pb])
        checks['originalBytesAndPixelsInsideOwner'] = bool(pa['pixels']) and pa['pixels'] == pb['pixels'] and (
            bool(pa['embeddedFileSha256']) and pa['embeddedFileSha256'] == pb['embeddedFileSha256'])
        checks['numericCropAndFillUnchanged'] = pa['cropFractions'] is not None and (
            pa['cropFractions'] == pb['cropFractions'] and pa['fillRectMarkup'] == pb['fillRectMarkup'])
        checks['pictureStoryRolesUnchanged'] = bool(pa['storyRoles']) and pa['storyRoles'] == pb['storyRoles']
        observations['pictureSha256'] = {'initial': pa['embeddedFileSha256'], 'saved': pb['embeddedFileSha256']}
    failed = [k for k, v in checks.items() if not v]
    return {'contract': 'INLINE_RICH_OWNER_POSITIONING_WITH_UNCHANGED_PICTURE_V1',
            'preservationStatus': 'FAIL' if failed else 'PRESERVED_WITHIN_BOUNDED_XML_CHECKS',
            'failedChecks': failed, 'checks': checks, 'observations': observations,
            'sourceSha256': reader.digest(Path(initial).read_bytes()),
            'savedSha256': reader.digest(Path(saved).read_bytes()),
            'controlOccurrences': sum(map(len, before['fields'].values())),
            'wordAcceptance': 'UNVERIFIED', 'wordUiActionsProven': False,
            'renderingChecked': False, 'legacyTypedOwnerGateChanged': False,
            'limits': ['Positioning may change; image bytes, crop, frame and canonical containment must not.',
                       'Crop reset, resize, rotation and replacement are separate intentional-edit tests.',
                       'XML does not prove Word UI actions, saved program, visible placement, schema validity or reopen.',
                       'Markup compatibility uses the existing reader capabilities, not a full Word interpreter.',
                       'This read-only check cannot grant production or general Sidebar acceptance.']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ['source', 'initial', 'saved', 'report']:
        parser.add_argument(name, type=Path)
    args = parser.parse_args()
    paths = [args.source, args.initial, args.saved, args.report]
    if len({p.resolve() for p in paths}) != len(paths) or args.report.exists():
        raise ValueError('Use distinct inputs and a new report path')
    source_hash = hashlib.sha256(args.source.read_bytes()).hexdigest()
    if source_hash not in SYNTHETIC_SOURCES:
        raise ValueError('Only a pinned current synthetic source is supported')
    trial.verify(args.source, args.initial, 'inline')
    result = compare(args.initial, args.saved)
    result['transformSource'] = SYNTHETIC_SOURCES[source_hash]
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(result, indent=2)+'\n')
    print(json.dumps({k: result[k] for k in ['preservationStatus', 'failedChecks', 'wordAcceptance']}, indent=2))
    if result['failedChecks']:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
