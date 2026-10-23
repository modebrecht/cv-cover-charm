"""Read-only DOCX comparison. XML survival is never a Word/render acceptance."""
import argparse
import hashlib
import importlib.util
import io
import json
import posixpath
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


def inspect(path):
    fields, duplicate_ids, pictures, all_text, assets = {}, [], [], [], []
    software, revisions = None, 0
    with ZipFile(path) as archive:
        if len(archive.namelist()) != len(set(archive.namelist())):
            raise ValueError('Ambiguous duplicate DOCX package members')
        if 'word/document.xml' not in archive.namelist():
            raise ValueError('Missing supported main document part')
        if archive.testzip() is not None:
            raise ValueError('Corrupt DOCX package')
        if 'docProps/app.xml' in archive.namelist():
            app = ET.fromstring(archive.read('docProps/app.xml'))
            software = next((e.text for e in app.iter() if ET.QName(e).localname == 'Application'), None)
        for name in sorted(archive.namelist()):
            if name.startswith('word/media/'):
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
            revisions += len(root.xpath('.//w:ins | .//w:del | .//w:moveFrom | .//w:moveTo', namespaces=NS))
            all_text.extend(root.xpath('.//w:t/text()', namespaces=NS))
            relpath = posixpath.join(posixpath.dirname(name), '_rels', posixpath.basename(name)+'.rels')
            rels = {} if relpath not in archive.namelist() else {
                e.get('Id'): e for e in ET.fromstring(archive.read(relpath))}
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
                    'typedPicture': props.find('w:picture', NS) is not None,
                    'nativeSdtId': None if native_id is None else native_id.get('{'+W+'}val'),
                    'ancestors': [ET.QName(p).localname for p in control.iterancestors()],
                    'paragraphIds': [p.get('{'+W14+'}paraId') for p in paragraphs_for(control)],
                })
            for image in root.xpath('.//a:blip[@r:embed] | .//v:fill[@r:id] | .//v:imagedata[@r:id]', namespaces=NS):
                rid = image.get('{'+R+'}embed') or image.get('{'+R+'}id')
                rel = rels.get(rid)
                target = None if rel is None else rel.get('Target')
                embedded = None
                if target and rel.get('TargetMode') != 'External':
                    target = target.lstrip('/') if target.startswith('/') else posixpath.normpath(posixpath.join(posixpath.dirname(name), target))
                    if target in archive.namelist():
                        embedded = archive.read(target)
                owners = image.xpath('ancestor::w:sdt/w:sdtPr/w:tag/@w:val', namespaces=NS)
                container = image.getparent()
                crop = container.find('a:srcRect', NS)
                pictures.append({'owners': owners, 'representation': 'DrawingML' if image.tag.endswith('}blip') else 'VML',
                                 'pixels': None if embedded is None else pixels(embedded),
                                 'embeddedFileSha256': None if embedded is None else digest(embedded),
                                 'cropMarkup': None if crop is None else dict(crop.attrib)})
    return {'fields': fields, 'duplicates': sorted(set(duplicate_ids)),
            'pictures': pictures, 'assets': assets, 'plainText': ''.join(all_text),
            'declaredApplication': software, 'trackedRevisionMarkupCount': revisions}


def compare(source, saved):
    before, after = inspect(source), inspect(saved)
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
    saved_photos = [p for p in after['pictures'] if photo in p['owners']]
    picture_report = []
    for a in source_photos:
        owned = saved_photos[0] if len(saved_photos) == 1 and len(after['fields'].get(photo, [])) == 1 else None
        same_pixels = lambda p: a['pixels'] is not None and p == a['pixels']
        picture_report.append({'source': a, 'savedOwnedPictureCount': len(saved_photos),
                               'typedPictureControlSurvives': bool(len(after['fields'].get(photo, [])) == 1 and after['fields'][photo][0]['typedPicture']),
                               'originalPixelsInsideCanonicalControl': bool(owned and same_pixels(owned['pixels'])),
                               'originalPixelsInAnyActivePicture': any(same_pixels(p['pixels']) for p in after['pictures']),
                               'originalPixelsSomewhereInPackage': any(same_pixels(p) for p in after['assets']),
                               'exactCropMarkupUnchanged': bool(owned and a['representation'] == owned['representation'] and a['cropMarkup'] == owned['cropMarkup']),
                               'saved': owned})
    return {'sourceSha256': digest(Path(source).read_bytes()), 'savedSha256': digest(Path(saved).read_bytes()),
            'declaredApplications': {'source': before['declaredApplication'], 'saved': after['declaredApplication']},
            'duplicates': {'source': before['duplicates'], 'saved': after['duplicates']},
            'trackedRevisionMarkupCount': {'source': before['trackedRevisionMarkupCount'], 'saved': after['trackedRevisionMarkupCount']},
            'sourceFields': len(before['fields']), 'savedFields': len(after['fields']),
            'addedFieldIds': sorted(after['fields'].keys()-before['fields'].keys()),
            'fields': rows, 'pictures': picture_report,
            'wordAcceptance': 'UNVERIFIED', 'saveReopenPerformedByThisTool': False,
            'limits': ['XML text presence is not visible rendering or pagination.',
                       'Changed structure or numeric SDT IDs alone do not establish lost canonical ownership.',
                       'Exact crop markup is separate from visible crop equivalence.',
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
                      'changedOrMissingFields': sum(not r['canonicalIdUnique'] or not r['fieldTokensUnchanged'] for r in report['fields']),
                      'photosWithoutTypedCanonicalOwner': sum(not p['typedPictureControlSurvives'] or p['savedOwnedPictureCount'] != 1 for p in report['pictures']),
                      'photosWithChangedOrMissingPixels': sum(not p['originalPixelsInsideCanonicalControl'] for p in report['pictures']),
                      'photosWithChangedCropMarkup': sum(not p['exactCropMarkupUnchanged'] for p in report['pictures']),
                      'wordAcceptance': 'UNVERIFIED'}))


if __name__ == '__main__':
    main()
