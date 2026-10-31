"""Create four minimal, synthetic DOCX inputs isolating native shape/crop behavior.

Each one-page input owns the same complete RGB calibration image in a text-free
typed picture control. Only preset geometry and source-crop presence differ.
No native application is started and no acceptance is granted by this producer.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

from PIL import Image
from docx_next_picture_owner_qa import picture_inventory

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
WP = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'
PIC = 'http://schemas.openxmlformats.org/drawingml/2006/picture'
REL = 'http://schemas.openxmlformats.org/package/2006/relationships'
CT = 'http://schemas.openxmlformats.org/package/2006/content-types'
CASES = [(shape, crop) for shape in ('rect', 'ellipse') for crop in (False, True)]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def calibration_png():
    image = Image.new('RGB', (120, 180))
    image.putdata([(x * 2, (y * 7) % 256, (x * 11 + y * 13) % 256)
                   for y in range(180) for x in range(120)])
    stream = io.BytesIO()
    image.save(stream, format='PNG')
    return stream.getvalue()


def document(shape, crop):
    clip = '<a:srcRect l="8400" t="24400" r="11600" b="22267"/>' if crop else ''
    return (f'<w:document xmlns:w="{W}" xmlns:r="{R}" xmlns:a="{A}" xmlns:wp="{WP}" xmlns:pic="{PIC}">'
            '<w:body><w:sdt><w:sdtPr><w:alias w:val="cv.person.photo"/>'
            '<w:tag w:val="cv.person.photo"/><w:id w:val="170031"/><w:picture/>'
            '</w:sdtPr><w:sdtContent><w:p><w:r><w:drawing>'
            '<wp:inline distT="0" distB="0" distL="0" distR="0">'
            '<wp:extent cx="1224000" cy="1224000"/>'
            '<wp:effectExtent l="14400" t="14400" r="14400" b="14400"/>'
            '<wp:docPr id="1" name="Synthetic crop calibration"/>'
            '<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>'
            f'<a:graphic><a:graphicData uri="{PIC}"><pic:pic><pic:nvPicPr>'
            '<pic:cNvPr id="1" name="Synthetic crop calibration"/><pic:cNvPicPr/>'
            '</pic:nvPicPr><pic:blipFill><a:blip r:embed="image1"/>' + clip +
            '<a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr>'
            '<a:xfrm><a:off x="0" y="0"/><a:ext cx="1224000" cy="1224000"/></a:xfrm>'
            f'<a:prstGeom prst="{shape}"><a:avLst/></a:prstGeom>'
            '<a:ln w="14400"><a:solidFill><a:srgbClr val="244A61"/></a:solidFill></a:ln>'
            '</pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline>'
            '</w:drawing></w:r></w:p></w:sdtContent></w:sdt>'
            '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>'
            '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" '
            'w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>')


def generate(output):
    targets = [output / f'crop-repro-{shape}-{"crop" if crop else "full"}.docx'
               for shape, crop in CASES]
    manifest = output / 'probe-manifest.json'
    if any(path.exists() or path.is_symlink() for path in [*targets, manifest]):
        raise ValueError('Existing output files are never overwritten')
    photo = calibration_png()
    common = {
        '[Content_Types].xml': f'<Types xmlns="{CT}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
        '_rels/.rels': f'<Relationships xmlns="{REL}"><Relationship Id="document" Type="{R}/officeDocument" Target="word/document.xml"/></Relationships>',
        'word/_rels/document.xml.rels': f'<Relationships xmlns="{REL}"><Relationship Id="image1" Type="{R}/image" Target="media/calibration.png"/></Relationships>',
        'word/media/calibration.png': photo,
    }
    output.mkdir(parents=True, exist_ok=True)
    report = []
    for (shape, crop), target in zip(CASES, targets):
        with target.open('xb') as stream, ZipFile(stream, 'w') as archive:
            for name, value in {**common, 'word/document.xml': document(shape, crop)}.items():
                info = ZipInfo(name, (2026, 10, 31, 0, 0, 0))
                info.compress_type = ZIP_DEFLATED
                archive.writestr(info, value.encode('utf-8') if isinstance(value, str) else value)
        inventory = picture_inventory(target, [{'id': 'cv.person.photo'}])
        if inventory['status'] != 'pass':
            raise ValueError('Generated source picture contract failed')
        report.append({'name': target.stem, 'file': target.name, 'sha256': sha(target.read_bytes()),
                       'shape': shape, 'sourceCrop': crop, 'photoSha256': sha(photo),
                       'sourcePictureContract': 'pass', 'nativeAcceptance': 'UNVERIFIED'})
    with manifest.open('x', encoding='utf-8') as stream:
        json.dump(report, stream, indent=2)
        stream.write('\n')
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    print(json.dumps({'generated': len(generate(args.output)), 'nativeAcceptance': 'UNVERIFIED'}))
