"""Read-only source structure check, not Office rendering or production acceptance.

Requires the pinned external ECMA schema files. The local Office 2010 WPS
subset follows Microsoft's SDK metadata and intentionally excludes legacy wne.
No document is rewritten, no Office engine is started and no schema is fetched.
"""
import argparse
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
from zipfile import ZipFile

from lxml import etree as ET

spec = importlib.util.spec_from_file_location(
    'reader', Path(__file__).with_name('docx-next-word-acceptance-23okt.py'))
reader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reader)
XS = 'http://www.w3.org/2001/XMLSchema'
WP = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'
WPS = 'http://schemas.microsoft.com/office/word/2010/wordprocessingShape'
NS = {**reader.NS, 'wp': WP, 'wps': WPS}
SAFE_PIXELS = {'eb771f4581e88abe918af19b18a50b3503d3f70c0617f101f492c0ca55f40b90',
               '5f8b2539d3fcbdef0442ee8283c29d0bd2579d03055edf84179f97ffc3b330a6'}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def parse(data):
    return ET.fromstring(data, ET.XMLParser(resolve_entities=False, no_network=True))


def errors(schema, root):
    valid = schema.validate(root)
    return valid, [{'path': error.path, 'message': error.message,
                    'kind': error.type_name} for error in schema.error_log]


def source_schema(directory, wps_path):
    """Resolve imports locally; grammar declarations are unchanged."""
    root = parse(wps_path.read_bytes())
    locations = {
        NS['a']: directory/'OfficeOpenXML-XMLSchema-Transitional/dml-main.xsd',
        reader.W: directory/'OfficeOpenXML-XMLSchema-Transitional/wml.xsd',
    }
    for node in root.findall('{'+XS+'}import'):
        node.set('schemaLocation', locations[node.get('namespace')].resolve().as_uri())
    for index, namespace, path in [
        (0, 'http://www.w3.org/XML/1998/namespace', directory/'xml.xsd'),
        (1, NS['pic'], directory/'OfficeOpenXML-XMLSchema-Transitional/dml-picture.xsd'),
    ]:
        node = ET.Element('{'+XS+'}import', namespace=namespace,
                          schemaLocation=path.resolve().as_uri())
        root.insert(index, node)
    return ET.XMLSchema(root)


def check_source(path, schema):
    before_hash = digest(path.read_bytes())
    inventory = reader.inspect(path)
    photos = [p for p in inventory['pictures'] if 'cv.person.photo' in p['owners']]
    assert len(photos) == 1 and photos[0]['pixels']['rgbaSha256'] in SAFE_PIXELS, 'Checked synthetic photo required'
    assert photos[0]['container'] == 'native-picture'
    assert photos[0]['imageRelationshipStatus'] == 'RESOLVED_EMBEDDED_IMAGE'
    self_comparison = reader.compare(path, path)
    assert all(row['matchStatus'] == 'MATCHED' and row['fieldTokensUnchanged'] and
               row['canonicalStoryRolesUnchanged'] and row['controlNestingUnchanged']
               for row in self_comparison['instances'])
    assert all(row['typedPictureControlSurvives'] and row['originalPixelsInsideCanonicalControl']
               and row['canonicalOwnerStoryRolesUnchanged'] for row in self_comparison['pictures'])
    parts, shape_checks = [], []
    with ZipFile(path) as archive:
        for name in archive.namelist():
            if not name.startswith('word/') or not name.endswith('.xml') or '/media/' in name:
                continue
            root = parse(archive.read(name))
            valid, issues = errors(schema, root)
            parts.append({'part': name, 'validInCheckedSchemaSet': valid, 'errors': issues})
            for shape in root.findall('.//wps:wsp', NS):
                # MS-ODRAWXML 2.13.3.3: direct graphicData shapes omit cNvPr.
                direct = shape.getparent().tag == '{'+NS['a']+'}graphicData'
                props = shape.find('wps:cNvPr', NS)
                valid_properties = (props is None) if direct else (props is not None)
                shape_checks.append({'part': name, 'directGraphicData': direct,
                                     'nonVisualPropertyRuleSatisfied': valid_properties})
                assert valid_properties
        main = parse(archive.read('word/document.xml'))
    assert all(row['validInCheckedSchemaSet'] for row in parts), 'Source schema errors remain'
    assert digest(path.read_bytes()) == before_hash
    return {'case': path.parent.name, 'docxSha256': before_hash, 'sourceUnchanged': True,
            'parts': parts, 'wpsNonVisualPropertyChecks': shape_checks,
            'taggedControlOccurrences': sum(len(rows) for rows in inventory['fields'].values()),
            'nativeSdtIdCollisions': inventory['duplicateNativeSdtIds'],
            'sourcePhoto': photos[0], 'selfComparisonAllOccurrencesMatch': True}, main


def negative_checks(automatic, free, schema):
    def remove(node):
        node.getparent().remove(node)

    mutations = [
        ('picture-child-order', automatic, lambda r: r.find('.//pic:pic', NS).insert(0, r.find('.//pic:blipFill', NS))),
        ('missing-drawing-identity', automatic, lambda r: remove(r.find('.//wp:docPr', NS))),
        ('invalid-crop-number', automatic, lambda r: r.find('.//a:srcRect', NS).set('t', 'banana')),
        ('block-inside-inline-picture-control', automatic, lambda r: r.xpath(
            './/w:sdt[w:sdtPr/w:picture]/w:sdtContent', namespaces=NS)[0].append(ET.Element('{'+reader.W+'}p'))),
        ('missing-free-shape-body-properties', free, lambda r: remove(r.find('.//wps:bodyPr', NS))),
        ('invalid-free-anchor-origin', free, lambda r: r.find('.//wp:positionH', NS).set('relativeFrom', 'planet')),
    ]
    checks = []
    for name, original, mutate in mutations:
        root = copy.deepcopy(original)
        mutate(root)
        valid, issues = errors(schema, root)
        assert not valid, 'Schema check accepted damaged '+name
        checks.append({'mutation': name, 'rejected': True, 'errorKinds': sorted({e['kind'] for e in issues})})
    return checks


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('automatic', type=Path)
    parser.add_argument('free', type=Path)
    parser.add_argument('report', type=Path)
    parser.add_argument('--schemas', required=True, type=Path)
    fixtures = Path(__file__).resolve().parent.parent/'tests/fixtures/docx-next'
    parser.add_argument('--pins', type=Path, default=fixtures/'source-schema-pins-24okt.json')
    parser.add_argument('--wps-schema', type=Path, default=fixtures/'wps-office2010-schema-audit.xsd')
    parser.add_argument('--additional-source', type=Path, action='append', default=[])
    args = parser.parse_args()
    sources = [args.automatic, args.free, *args.additional_source]
    if args.report.suffix.lower() != '.json' or args.report.resolve() in {
        p.resolve() for p in [*sources, args.pins, args.wps_schema]
    }:
        parser.error('Write a separate JSON report')
    pins = json.loads(args.pins.read_text())
    checked_files = []
    for row in pins['files']:
        path = args.schemas / row['file']
        data = path.read_bytes()
        blob = hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
        assert blob == row['gitBlobSha'], 'External schema pin mismatch: '+row['file']
        checked_files.append({'file': row['file'], 'gitBlobSha': blob, 'sha256': digest(data)})
    schema = source_schema(args.schemas, args.wps_schema)
    cases, roots = [], []
    for path in sources:
        case, root = check_source(path, schema)
        cases.append(case)
        roots.append(root)
    report = {'productBase': '9e7579c08527310d8b21bba2807924fb0c8de463',
              'branchBase': 'b1b10e350194286d3d146d021a6269bbea020b63',
              'schemaSources': pins['sources'], 'schemaFiles': checked_files,
              'wpsSubsetSha256': digest(args.wps_schema.read_bytes()),
              'cases': cases, 'negativeSchemaChecks': negative_checks(roots[0], roots[1], schema),
              'limits': ['Pinned ECMA schema copy and an explicitly limited Office2010 WPS subset.',
                         'No full Open XML SDK semantic validation, legacy wne support or MC conformance certification.',
                         'Package media/reference survival is separate from visible rendering and Word editability.',
                         'Only the supplied source files are assessed; this is not a template matrix.'],
              'productCodeChanged': False, 'officeEngineStartedByThisTool': False,
              'currentWordAcceptance': 'UNVERIFIED'}
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps({'cases': len(cases), 'xmlParts': sum(len(c['parts']) for c in cases),
                      'negativeChecksRejected': len(report['negativeSchemaChecks']),
                      'wordAcceptance': 'UNVERIFIED'}))


if __name__ == '__main__':
    main()
