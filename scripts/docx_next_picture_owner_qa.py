"""Inspect picture controls and their own embedded image; visibility is not ownership."""
import hashlib
import io
import posixpath
from xml.etree import ElementTree as ET
from zipfile import ZipFile

from PIL import Image

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
A = '{http://schemas.openxmlformats.org/drawingml/2006/main}'
R = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'
REL = '{http://schemas.openxmlformats.org/package/2006/relationships}'
IMAGE_REL = R[1:-1] + '/image'
MC = '{http://schemas.openxmlformats.org/markup-compatibility/2006}'
WPS = 'http://schemas.microsoft.com/office/word/2010/wordprocessingShape'


def effective_document(data):
    """Project the generated Word-2010 shape Choice; never count its VML fallback too."""
    scopes, stack, pending = {}, [], []
    parser = ET.iterparse(io.BytesIO(data), events=('start-ns', 'start', 'end'))
    for event, value in parser:
        if event == 'start-ns':
            pending.append(value)
        elif event == 'start':
            scope = dict(stack[-1]) if stack else {}
            scope.update(pending)
            pending.clear()
            scopes[id(value)] = scope
            stack.append(scope)
        else:
            stack.pop()
    root = parser.root
    def project(parent):
        for node in list(parent):
            if node.tag != MC + 'AlternateContent':
                project(node)
                continue
            choices = [child for child in node if child.tag == MC + 'Choice']
            fallbacks = [child for child in node if child.tag == MC + 'Fallback']
            assert choices and len(fallbacks) <= 1 and len(choices) + len(fallbacks) == len(node), 'Invalid compatibility alternatives'
            selected = None
            for choice in choices:
                required = choice.get('Requires', '').split()
                assert required and all(prefix in scopes[id(choice)] for prefix in required), 'Unbound compatibility requirement'
                if selected is None and all(scopes[id(choice)][prefix] in {WPS} for prefix in required):
                    selected = choice
            if selected is None:
                assert len(fallbacks) == 1, 'No supported compatibility Choice or Fallback'
                selected = fallbacks[0]
            project(selected)
            index = list(parent).index(node)
            parent.remove(node)
            for offset, child in enumerate(list(selected)):
                parent.insert(index + offset, child)
    project(root)
    return root


def picture_inventory(path, pictures):
    """Read only explicitly owned relationships; never borrow a visible/global photo."""
    expected = [picture['id'] for picture in pictures]
    assert len(expected) == len(set(expected)), 'Duplicate expected picture identity'
    with ZipFile(path) as archive:
        document = effective_document(archive.read('word/document.xml'))
        relations = ET.fromstring(archive.read('word/_rels/document.xml.rels'))
        records = []
        for identity in expected:
            owners = [node for node in document.iter(W + 'sdt')
                      if (tag := node.find(W + 'sdtPr/' + W + 'tag')) is not None
                      and tag.get(W + 'val') == identity]
            row = {'id': identity, 'status': 'fail', 'reasons': [], 'ownerCount': len(owners),
                   'typedPicture': False, 'drawingCount': 0, 'imageReferenceCount': 0, 'image': None}
            records.append(row)
            if len(owners) != 1:
                row['reasons'].append('missing-or-duplicate-picture-control')
                continue
            owner = owners[0]
            row['typedPicture'] = owner.find(W + 'sdtPr/' + W + 'picture') is not None
            content = owner.find(W + 'sdtContent')
            if not row['typedPicture']:
                row['reasons'].append('untyped-picture-control')
            if content is None:
                row['reasons'].append('missing-control-content')
                continue
            # ISO/IEC 29500: a picture SDT may contain only its single picture.
            # Zero-width/hidden text can preserve Writer's range, but is not a
            # conforming repair and must not make the strict contract pass.
            if any(node.text for tag in ('t', 'delText', 'instrText', 'delInstrText')
                   for node in content.iter(W + tag)):
                row['reasons'].append('non-picture-text-in-picture-control')
            drawings = list(content.iter(W + 'drawing'))
            row['drawingCount'] = len(drawings)
            blips = list(drawings[0].iter(A + 'blip')) if len(drawings) == 1 else []
            row['imageReferenceCount'] = len(blips)
            if list(content.iter(A + 'blip')) != blips:
                row['reasons'].append('image-reference-is-not-inside-the-single-owned-drawing')
            if row['drawingCount'] != 1:
                row['reasons'].append('picture-control-must-own-one-drawing')
            if list(content.iter(W + 'txbxContent')) or list(content.iter(W + 'sdt')):
                row['reasons'].append('nested-frame-or-control-is-not-single-picture-ownership')
            if len(blips) != 1:
                row['reasons'].append('picture-control-must-own-one-image-reference')
                continue
            rid = blips[0].get(R + 'embed')
            if not rid or blips[0].get(R + 'link'):
                row['reasons'].append('picture-is-not-exclusively-embedded')
                continue
            matches = [relation for relation in relations if relation.get('Id') == rid]
            if len(matches) != 1:
                row['reasons'].append('missing-or-duplicate-image-relationship')
                continue
            relation = matches[0]
            target = relation.get('Target', '')
            if (relation.tag != REL + 'Relationship' or relation.get('Type') != IMAGE_REL
                    or relation.get('TargetMode', 'Internal') != 'Internal'
                    or not target or '\\' in target or target.startswith('/') or ':' in target
                    or '?' in target or '#' in target):
                row['reasons'].append('invalid-or-external-image-relationship')
                continue
            part = posixpath.normpath(posixpath.join('word', target))
            if not part.startswith('word/media/') or part not in archive.namelist():
                row['reasons'].append('missing-or-outside-media-part')
                continue
            try:
                data = archive.read(part)
                with Image.open(io.BytesIO(data)) as source:
                    rgba = source.convert('RGBA')
                    row['image'] = {'part': part, 'sizePx': list(rgba.size),
                                    'payloadSha256': hashlib.sha256(data).hexdigest(),
                                    'rgbaSha256': hashlib.sha256(rgba.tobytes()).hexdigest()}
            except (OSError, ValueError):
                row['reasons'].append('undecodable-image-part')
            row['status'] = 'fail' if row['reasons'] else 'pass'
        return {'status': 'pass' if all(row['status'] == 'pass' for row in records) else 'fail',
                'pictures': records}


def compare_image_data(source, actual):
    """Exact decoded identity; renamed/recompressed equal pixels remain distinguishable."""
    before = {row['id']: row for row in source['pictures']}
    after = {row['id']: row for row in actual['pictures']}
    assert len(before) == len(source['pictures']) and len(after) == len(actual['pictures']), 'Duplicate image inventory'
    assert set(before) == set(after), 'Changed image inventory scope'
    records = []
    for identity, expected in before.items():
        original, observed = expected['image'], after[identity]['image']
        owned = expected['status'] == after[identity]['status'] == 'pass'
        dimensions = bool(owned and original and observed and original['sizePx'] == observed['sizePx'])
        pixels = bool(dimensions and original['rgbaSha256'] == observed['rgbaSha256'])
        records.append({'id': identity, 'status': 'pass' if pixels else 'fail',
                        'ownershipVerified': owned, 'dimensionsUnchanged': dimensions,
                        'rgbaPixelsUnchanged': pixels,
                        'payloadBytesUnchanged': bool(owned and original and observed and
                                                     original['payloadSha256'] == observed['payloadSha256'])})
    return {'status': 'pass' if all(row['status'] == 'pass' for row in records) else 'fail',
            'pictures': records}


def require_picture_ownership(report):
    assert report.get('pictureOwnershipAcceptance') == 'pass', 'Picture control lost its own embedded drawing/image'
