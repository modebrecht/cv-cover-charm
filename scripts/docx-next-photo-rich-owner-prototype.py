"""Internal package-only photo owner trial. Never product output or Word acceptance.

Compare inline rich-text ownership with promotion of the dedicated photo
paragraph into a block rich-text SDT. The drawing and paragraph are retained;
rendering still has to verify whether changing owner scope affects layout.
Word must separately demonstrate conversion to floating, movement, crop/reset,
replacement and preservation of this owner after save. No renderer gate changes.
"""
import argparse
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

from lxml import etree as ET

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
NS = {'w': W, 'wp': 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
      'pic': 'http://schemas.openxmlformats.org/drawingml/2006/picture'}
TAG = 'cv.person.photo'
CONTROL_SOURCE_SHA256 = '5e469d60181f8405fffcb43a57f92377fc6b0daa414d71ac22cd33ed3a6a25e0'


def canonical(node):
    return ET.tostring(node, method='c14n')


def photo_owner(root):
    owners = root.xpath('.//w:sdt[w:sdtPr/w:tag[@w:val=$tag]]', namespaces=NS, tag=TAG)
    if len(owners) != 1:
        raise ValueError('Require exactly one canonical photo owner')
    return owners[0]


def promote(root, mode='block'):
    """Fail closed on anything other than a dedicated inline typed photo."""
    if mode not in ('block', 'inline'):
        raise ValueError('Unsupported trial mode')
    owner = photo_owner(root)
    props, content = owner.find('w:sdtPr', NS), owner.find('w:sdtContent', NS)
    paragraph = owner.getparent()
    if props.find('w:picture', NS) is None or content is None:
        raise ValueError('Require typed source picture')
    if props.find('w:lock', NS) is not None:
        raise ValueError('Do not silently remove source locks')
    if paragraph.tag != '{'+W+'}p' or paragraph.getparent().tag not in [
            '{'+W+'}tc', '{'+W+'}body', '{'+W+'}sdtContent']:
        raise ValueError('Require native block parent')
    if any(n is not owner and n.tag != '{'+W+'}pPr' for n in paragraph):
        raise ValueError('Photo paragraph must not own unrelated content')
    if (len(content) != 1 or content[0].tag != '{'+W+'}r' or
            len(content[0]) != 1 or content[0][0].tag != '{'+W+'}drawing' or
            len(content[0][0]) != 1 or content[0][0][0].tag != '{'+NS['wp']+'}inline' or
            len(content.findall('.//pic:pic', NS)) != 1):
        raise ValueError('Require one ordinary inline native picture')
    if mode == 'inline':
        props.remove(props.find('w:picture', NS))
        return
    # Retain the same tag, alias and numeric SDT identity, while changing its
    # explicit type/scope contract. An untyped SDT is rich text by default.
    parent, position = paragraph.getparent(), paragraph.getparent().index(paragraph)
    drawing_run = content[0]
    content.remove(drawing_run)
    paragraph.remove(owner)
    paragraph.append(drawing_run)
    parent.remove(paragraph)
    props.remove(props.find('w:picture', NS))
    content.append(paragraph)
    parent.insert(position, owner)


def demote(root, mode='block'):
    """Inverse used only to prove that the source-only trial changed no layout."""
    owner = photo_owner(root)
    props, content = owner.find('w:sdtPr', NS), owner.find('w:sdtContent', NS)
    if props.find('w:picture', NS) is not None or len(content) != 1:
        raise ValueError('Require prototype block owner')
    if mode == 'inline':
        props.append(ET.Element('{'+W+'}picture'))
        return
    paragraph = content[0]
    if paragraph.tag != '{'+W+'}p':
        raise ValueError('Require prototype paragraph')
    parent, position = owner.getparent(), owner.getparent().index(owner)
    runs = [n for n in paragraph if n.tag != '{'+W+'}pPr']
    content.remove(paragraph)
    for run in runs:
        paragraph.remove(run)
        content.append(run)
    parent.remove(owner)
    props.append(ET.Element('{'+W+'}picture'))
    paragraph.append(owner)
    parent.insert(position, paragraph)


def verify(source, candidate, mode='block'):
    """Verify the initial prototype only; never interprets a Word edit as PASS."""
    with ZipFile(source) as before, ZipFile(candidate) as after:
        names = before.namelist()
        if (len(names) != len(set(names)) or len(after.namelist()) != len(set(after.namelist())) or
                set(names) != set(after.namelist()) or before.testzip() or after.testzip()):
            raise ValueError('Changed or ambiguous package membership')
        changed = [n for n in names if before.read(n) != after.read(n)]
        if changed != ['word/document.xml']:
            raise ValueError('Only main document markup may change')
        original = ET.fromstring(before.read('word/document.xml'))
        actual = ET.fromstring(after.read('word/document.xml'))
        expected = copy.deepcopy(original)
        promote(expected, mode)
        if canonical(actual) != canonical(expected):
            raise ValueError('Candidate differs from the exact owner-only transform')
        restored = copy.deepcopy(actual)
        demote(restored, mode)
        if canonical(restored) != canonical(original):
            raise ValueError('Inverse trial changed layout or content')
    spec = importlib.util.spec_from_file_location('word_reader',
        Path(__file__).with_name('docx-next-word-acceptance-23okt.py'))
    reader = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(reader)
    a, b = reader.inspect(source), reader.inspect(candidate)
    ca, cb = a['fields'][TAG][0], b['fields'][TAG][0]
    pa = [p for p in a['pictures'] if TAG in p['owners']]
    pb = [p for p in b['pictures'] if TAG in p['owners']]
    if len(pa) != 1 or len(pb) != 1 or not pa[0]['storyRoles']:
        raise ValueError('Require one active image inside the canonical owner')
    if (ca['storyRoles'] != cb['storyRoles'] or ca['ancestorFieldIds'] != cb['ancestorFieldIds'] or
            not ca['typedPicture'] or cb['typedPicture'] or cb['contentKind'] != mode):
        raise ValueError('Unexpected owner type, scope or story')
    if pa != pb or a['plainText'] != b['plainText']:
        raise ValueError('Picture bytes, crop, active ownership or text changed')
    if pa[0]['imageRelationshipStatus'] != 'RESOLVED_EMBEDDED_IMAGE' or not pa[0]['pixels']:
        raise ValueError('Require decoded embedded original')
    return {'trial': mode.upper()+'_RICH_TEXT_ORDINARY_INLINE_PICTURE',
            'sourceSha256': hashlib.sha256(Path(source).read_bytes()).hexdigest(),
            'candidateSha256': hashlib.sha256(Path(candidate).read_bytes()).hexdigest(),
            'changedPackageParts': changed,
            'controlOccurrences': sum(map(len, a['fields'].values())),
            'canonicalTags': len(a['fields']),
            'pictureSha256': pa[0]['embeddedFileSha256'],
            'pixels': pa[0]['pixels'], 'cropFractions': pa[0]['cropFractions'],
            'canonicalStoryRoles': cb['storyRoles'],
            'initialDrawingAndParagraphUnchanged': True,
            'inverseTransformRestoresAllDocumentMarkup': True,
            'normalSidebarGuard': 'CLOSED', 'wordAcceptance': 'UNVERIFIED',
            'legacyTypedOwnerGate': 'EXPECTED_FAIL_NO_GATE_WEAKENED',
            'pendingWordActions': ['select', 'wrap-text', 'drag', 'crop-reset',
                                   'replace', 'save-reopen-owner-preservation']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('candidate', type=Path)
    parser.add_argument('evidence', type=Path)
    parser.add_argument('--mode', choices=['block', 'inline'], default='block')
    args = parser.parse_args()
    if hashlib.sha256(args.source.read_bytes()).hexdigest() != CONTROL_SOURCE_SHA256:
        raise ValueError('Only the verified current synthetic decision-packet source is permitted')
    if len({p.resolve() for p in [args.source, args.candidate, args.evidence]}) != 3:
        raise ValueError('Source, output and evidence paths must differ')
    if args.candidate.exists() or args.evidence.exists():
        raise ValueError('Do not overwrite an existing trial')
    with ZipFile(args.source) as archive:
        payloads = {n: archive.read(n) for n in archive.namelist()}
    root = ET.fromstring(payloads['word/document.xml'])
    promote(root, args.mode)
    payloads['word/document.xml'] = ET.tostring(root, xml_declaration=True, encoding='UTF-8')
    args.candidate.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(args.candidate, 'w', ZIP_DEFLATED) as archive:
        for name, data in payloads.items():
            archive.writestr(name, data)
    result = verify(args.source, args.candidate, args.mode)
    args.evidence.parent.mkdir(parents=True, exist_ok=True)
    args.evidence.write_text(json.dumps(result, indent=2)+'\n')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
