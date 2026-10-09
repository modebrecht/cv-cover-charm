"""QA-only native gradient text surfaces. Never registers or accepts a template.

Author new minimal packages rather than repairing exported documents. Keep the
same initial geometry when text grows, so a passing result must come from the
editor's native auto-height behavior. Run with --observe to retain negatives.
"""
import argparse
import json
from pathlib import Path
import re
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from xml.sax.saxutils import escape
from zipfile import ZipFile, ZIP_DEFLATED

import fitz
from docx_next_package_qa import check_package

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
SCALE = 72 / 25.4
EMU = 36000


def paragraph(identity, text, color='FFFFFF', size=56):
    return (f'<w:sdt><w:sdtPr><w:alias w:val="{identity}"/><w:tag w:val="{identity}"/>'
            '<w:id w:val="' + str(1000 + int(identity.rsplit('.', 1)[-1])) + '"/></w:sdtPr><w:sdtContent>'
            '<w:p><w:pPr><w:keepNext w:val="0"/><w:keepLines w:val="0"/>'
            '<w:spacing w:before="0" w:after="0" w:line="276" w:lineRule="auto"/></w:pPr>'
            f'<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:color w:val="{color}"/>'
            f'<w:sz w:val="{size}"/></w:rPr><w:t>{escape(text)}</w:t></w:r></w:p></w:sdtContent></w:sdt>')


def surface(kind, content, autofit=True):
    # All source cases start with exactly 20 mm height; never estimate from text.
    cx, cy, inset = 170 * EMU, 20 * EMU, 4 * EMU
    if kind == 'drawingml':
        fit = '<a:spAutoFit/>' if autofit else '<a:noAutofit/>'
        return (f'<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">'
                f'<wp:extent cx="{cx}" cy="{cy}"/><wp:docPr id="1" name="native-gradient-probe"/>'
                '<wp:cNvGraphicFramePr/><a:graphic><a:graphicData '
                'uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">'
                '<wps:wsp><wps:cNvSpPr txBox="1"/><wps:spPr>'
                f'<a:xfrm><a:off x="0" y="0"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm>'
                '<a:prstGeom prst="roundRect"><a:avLst/></a:prstGeom>'
                '<a:gradFill rotWithShape="1"><a:gsLst>'
                '<a:gs pos="0"><a:srgbClr val="0EA5E9"/></a:gs>'
                '<a:gs pos="100000"><a:srgbClr val="8B5CF6"/></a:gs>'
                '</a:gsLst><a:lin ang="5400000" scaled="1"/></a:gradFill>'
                '<a:ln><a:noFill/></a:ln></wps:spPr>'
                + (f'<wps:txbx><w:txbxContent>{content}</w:txbxContent></wps:txbx>' if content else '') +
                f'<wps:bodyPr rot="0" vert="horz" wrap="square" lIns="{inset}" '
                f'tIns="{inset}" rIns="{inset}" bIns="{inset}" anchor="t" anchorCtr="0">'
                f'{fit}</wps:bodyPr></wps:wsp></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>')
    fit = 'mso-fit-shape-to-text:t' if autofit else 'mso-fit-shape-to-text:f'
    return ('<w:r><w:pict><v:roundrect id="native-gradient-probe" '
            'style="width:481.8898pt;height:56.6929pt" arcsize="10%" stroked="f" fillcolor="#0EA5E9">'
            '<v:fill type="gradient" color="#0EA5E9" color2="#8B5CF6" angle="90"/>'
            f'<v:textbox style="{fit}" inset="4mm,4mm,4mm,4mm">'
            f'<w:txbxContent>{content}</w:txbxContent></v:textbox></v:roundrect></w:pict></w:r>')


def write_package(file, kind, count, autofit):
    fields = [(f'hero.title.{index}', f'Herozeile {index:02}: Sichtbar') for index in range(1, count + 1)]
    content = ''.join(paragraph(identity, text) for identity, text in fields)
    following = paragraph('body.following.999', 'NACH DER VERLAUFSFLAECHE', '111827', 22)
    if kind == 'table-solid':
        # Reviewable visual adaptation only: a fixed gradient banner followed by
        # a SOLID native cell that owns editable content and normal pagination.
        # This is deliberately not described as a flowing gradient surface.
        banner = '<w:p><w:pPr><w:spacing w:after="0"/></w:pPr>' + surface('drawingml', '', False) + '</w:p>'
        table = ('<w:tbl><w:tblPr><w:tblW w:w="9638" w:type="dxa"/><w:tblLayout w:type="fixed"/>'
                 '<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/></w:tblBorders>'
                 '<w:tblCellMar><w:top w:w="227" w:type="dxa"/><w:left w:w="227" w:type="dxa"/>'
                 '<w:bottom w:w="227" w:type="dxa"/><w:right w:w="227" w:type="dxa"/></w:tblCellMar>'
                 '</w:tblPr><w:tblGrid><w:gridCol w:w="9638"/></w:tblGrid><w:tr><w:tc><w:tcPr>'
                 '<w:tcW w:w="9638" w:type="dxa"/><w:shd w:val="clear" w:fill="0EA5E9"/>'
                 f'</w:tcPr>{content}<w:p/></w:tc></w:tr></w:tbl>')
        body = banner + table + following
    else:
        body = '<w:p><w:pPr><w:spacing w:after="0"/></w:pPr>' + surface(kind, content, autofit) + '</w:p>' + following
    ns = (f'xmlns:w="{W}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
          'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
          'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" '
          'xmlns:v="urn:schemas-microsoft-com:vml"')
    document = DECL + f'<w:document {ns}><w:body>{body}<w:sectPr>' + (
        '<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" '
        'w:bottom="1134" w:left="1134" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>')
    with ZipFile(file, 'w', ZIP_DEFLATED) as package:
        package.writestr('[Content_Types].xml', DECL + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                         '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                         '<Default Extension="xml" ContentType="application/xml"/>'
                         '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
        package.writestr('_rels/.rels', DECL + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                         '<Relationship Id="document" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
        package.writestr('word/document.xml', document)
    return fields


def convert(kit, source, destination, format):
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='docx-gradient-profile-') as profile, tempfile.TemporaryDirectory(prefix='docx-gradient-output-') as output:
        fresh = Path(output) / destination.name
        result = subprocess.run([kit, Path(profile).as_uri(), source.resolve().as_uri(),
                                 fresh.as_uri(), format.split(':', 1)[0]], capture_output=True, text=True, timeout=60)
        assert result.returncode == 0 and fresh.is_file() and not re.search(r'error|warning', result.stderr, re.I), result.stdout + result.stderr
        destination.write_bytes(fresh.read_bytes())


def inspect_package(source, fields):
    policy = 'pass'
    try:
        check_package(source, expected_sections=1, next_package=False)
    except AssertionError as error:
        if str(error) != 'Editable content placed in text boxes':
            raise
        policy = 'blocked: existing package policy excludes text boxes'
    with ZipFile(source) as package:
        tree = ET.fromstring(package.read('word/document.xml'))
    ns = {'w': W, 'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
          'wp': 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
          'v': 'urn:schemas-microsoft-com:vml'}
    mc = '{http://schemas.openxmlformats.org/markup-compatibility/2006}'
    fallback_count = 0
    for alternate in tree.iter(mc + 'AlternateContent'):
        choice, fallback = alternate.find(mc + 'Choice'), alternate.find(mc + 'Fallback')
        if choice is not None and fallback is not None:
            # Mutually exclusive representations are not duplicate live fields.
            # Require exactly matching content before inspecting the active choice.
            def branch_fields(branch):
                return [(node.find('w:sdtPr/w:tag', ns).get('{' + W + '}val'),
                         ''.join(text.text or '' for text in node.findall('.//w:t', ns)))
                        for node in branch.findall('.//w:sdt', ns)
                        if node.find('w:sdtPr/w:tag', ns) is not None]
            assert branch_fields(choice) == branch_fields(fallback), 'Alternate representations disagree'
            alternate.remove(fallback)
            fallback_count += 1
    found = {}
    for control in tree.findall('.//w:sdt', ns):
        tag = control.find('w:sdtPr/w:tag', ns)
        if tag is not None:
            identity = tag.get('{' + W + '}val')
            assert identity not in found, 'Duplicate field tag: ' + identity
            found[identity] = ''.join(node.text or '' for node in control.findall('.//w:t', ns))
    missing = [identity for identity, text in fields if found.get(identity) != text]
    return {'packageAndSemanticFlowPolicy': policy, 'lostFieldIds': missing, 'matchingFallbackRepresentations': fallback_count,
            'gradientFills': len(tree.findall('.//a:gradFill', ns)) + len(tree.findall('.//v:fill', ns)),
            'shapeHeightsMm': [int(node.get('cy')) / EMU for node in tree.findall('.//wp:extent', ns)]}


def inspect_pdf(pdf, fields):
    with fitz.open(pdf) as document:
        text = ''.join(page.get_text() for page in document)
        missing = [identity for identity, value in fields if value not in text]
        failures, bottoms, following, overlaps, sizes = [], [], [], [], []
        for page in document:
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
            hero_rects = []
            for identity, value in fields:
                for rect in page.search_for(value):
                    hero_rects.append(rect)
                    bottoms.append(rect.y1 / SCALE)
                    # Probe the background just left of the text baseline, away from glyphs.
                    x = int((rect.x0 - SCALE) * 2)
                    y = int((rect.y0 + rect.y1) / 2 * 2)
                    rgb = pix.pixel(x, y)[:3]
                    if min(rgb) > 235:
                        failures.append({'fieldId': identity, 'page': page.number + 1, 'background': rgb})
            for rect in page.search_for('NACH DER VERLAUFSFLAECHE'):
                following.append({'page': page.number + 1, 'topMm': rect.y0 / SCALE})
                if any(hero.y1 > rect.y0 for hero in hero_rects):
                    overlaps.append(page.number + 1)
            sizes.extend(span['size'] for block in page.get_text('dict')['blocks'] if block['type'] == 0
                         for line in block['lines'] for span in line['spans'] if 'Herozeile' in span['text'])
        document[0].get_pixmap(matrix=fitz.Matrix(1, 1)).save(pdf.with_suffix('.png'))
        return {'pages': len(document), 'missingVisibleFields': missing, 'whiteTextOnWhite': failures,
                'lastHeroBottomMm': max(bottoms, default=0), 'followingText': following,
                'followingTextOverlapsHeroOnPages': overlaps, 'heroFontSizePt': sorted(set(round(size, 2) for size in sizes))}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    parser.add_argument('--libreofficekit', required=True)
    parser.add_argument('--observe', action='store_true')
    parser.add_argument('--kind', choices=['drawingml', 'vml', 'table-solid'], help='Targeted rerun of one native representation')
    args = parser.parse_args()
    args.directory.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='docx-gradient-version-') as profile:
        version = json.loads(subprocess.check_output([args.libreofficekit, '--version', Path(profile).as_uri()], text=True))
    assert not re.search(r'Dev|alpha|beta|rc', json.dumps(version), re.I), 'Stable runtime required'
    report = {'runtime': version, 'initialHeightMm': 20, 'accepted': False, 'cases': []}
    for kind in ([args.kind] if args.kind else ['drawingml', 'vml', 'table-solid']):
        for count, autofit in ([(2, True), (10, True), (36, True)] if kind == 'table-solid' else [(2, False), (2, True), (10, True), (36, True)]):
            key = f'{kind}-{count}-' + ('auto' if autofit else 'fixed-control')
            source = args.directory / (key + '.docx')
            fields = write_package(source, kind, count, autofit)
            pdf = args.directory / (key + '.pdf')
            saved = args.directory / 'saved' / source.name
            saved_pdf = args.directory / 'saved' / pdf.name
            convert(args.libreofficekit, source, pdf, 'pdf')
            convert(args.libreofficekit, source, saved, 'docx:Office Open XML Text')
            convert(args.libreofficekit, saved, saved_pdf, 'pdf')
            row = {'fixture': key, 'lines': count, 'sourcePackage': inspect_package(source, fields),
                   'savedPackage': inspect_package(saved, fields), 'source': inspect_pdf(pdf, fields),
                   'saved': inspect_pdf(saved_pdf, fields)}
            report['cases'].append(row)
            print(json.dumps(row), flush=True)
    negatives = [row['fixture'] for row in report['cases'] if not row['fixture'].endswith('fixed-control') and
                 any(row[stage]['missingVisibleFields'] or row[stage]['whiteTextOnWhite'] or
                     row[stage]['followingTextOverlapsHeroOnPages'] or not row[stage]['followingText'] or
                     row[stage]['heroFontSizePt'] != [28.0] or row[stage + 'Package']['lostFieldIds']
                     for stage in ['source', 'saved'])]
    report['failedAutoFitCases'] = negatives
    report['visualAdaptation'] = 'table-solid is a fixed gradient banner plus a SOLID growing native cell; requires explicit design approval'
    report['result'] = 'blocked' if negatives else 'bounded rendering pass; Word acceptance still pending'
    (args.directory / 'growing-gradient-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'result': report['result'], 'failedAutoFitCases': negatives}))
    assert args.observe or not negatives, 'Native gradient continuation loses visible text'


if __name__ == '__main__':
    main()
