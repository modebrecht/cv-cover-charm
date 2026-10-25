"""Extract frozen synthetic control paint for the bounded Letter flow probe.

Never accepts a user/Word-returned document. Output remains outside Git.
Usage: python scripts/docx-next-letter-flow-control-assets.py CONTROL.docx OUTPUT
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
import posixpath
from zipfile import ZipFile

from lxml import etree as ET
from PIL import Image

SOURCE_SHA256 = '5e469d60181f8405fffcb43a57f92377fc6b0daa414d71ac22cd33ed3a6a25e0'
NS = {'wp': 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
      'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    if hashlib.sha256(args.source.read_bytes()).hexdigest() != SOURCE_SHA256:
        raise ValueError('Only the exact current synthetic decision-packet source is permitted')
    if args.output.exists():
        raise ValueError('Use a new output directory')
    assets, payloads = {}, {}
    with ZipFile(args.source) as archive:
        for name in archive.namelist():
            if not name.startswith('word/') or not name.endswith('.xml'):
                continue
            root = ET.fromstring(archive.read(name))
            relpart = posixpath.dirname(name)+'/_rels/'+posixpath.basename(name)+'.rels'
            if relpart not in archive.namelist():
                continue
            rels = {r.get('Id'): r for r in ET.fromstring(archive.read(relpart))}
            for prop in root.findall('.//wp:docPr', NS):
                pictures = prop.getparent().findall('.//a:blip', NS)
                if len(pictures) != 1:
                    continue
                rel = rels.get(pictures[0].get('{'+NS['r']+'}embed'))
                if rel is None or rel.get('Type') != NS['r']+'/image' or rel.get('TargetMode') == 'External':
                    raise ValueError('Require an embedded image relationship')
                target = posixpath.normpath(posixpath.join(posixpath.dirname(name), rel.get('Target')))
                data = archive.read(target)
                digest = hashlib.sha256(data).hexdigest()
                filename = digest+'.png'
                with Image.open(io.BytesIO(data)) as image:
                    if image.format != 'PNG':
                        raise ValueError('The frozen control must contain PNG paint')
                    asset = {'file': filename, 'sha256': digest, 'widthPx': image.width,
                             'heightPx': image.height, 'extension': 'png', 'contentType': 'image/png'}
                identity = prop.get('name')
                if identity in assets and assets[identity] != asset:
                    raise ValueError('Ambiguous frozen paint identity')
                assets[identity], payloads[filename] = asset, data
    args.output.mkdir(parents=True)
    for name, data in payloads.items():
        (args.output/name).write_bytes(data)
    (args.output/'assets.json').write_text(json.dumps({
        'controlSha256': SOURCE_SHA256, 'assets': assets,
        'scope': 'Frozen synthetic paint only; not a fresh browser raster capture'}, indent=2)+'\n')
    print(json.dumps({'assets': len(assets), 'uniquePngs': len(payloads)}))


if __name__ == '__main__':
    main()
