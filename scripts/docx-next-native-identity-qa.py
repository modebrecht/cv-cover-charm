"""Read-only source/saved native identity audit. Visible text cannot substitute for field IDs."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import unicodedata
from xml.etree import ElementTree as ET
from zipfile import ZipFile

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'


def compact(text):
    return re.sub(r'\s+', '', unicodedata.normalize('NFKC', text).replace('\u00ad', ''))


def inventory(path):
    fields, captions, stories = set(), set(), []
    with ZipFile(path) as archive:
        for name in sorted(archive.namelist()):
            if not name.endswith('.xml') or not name.startswith(('word/document', 'word/header', 'word/footer')):
                continue
            root = ET.fromstring(archive.read(name))
            stories.append(compact(''.join(node.text or '' for node in root.iter(W + 't'))))
            for control in root.iter(W + 'sdt'):
                tag = control.find(W + 'sdtPr/' + W + 'tag')
                if tag is not None:
                    identity = tag.get(W + 'val')
                    assert identity, 'Empty native field identity'
                    text = compact(''.join(node.text or '' for node in control.iter(W + 't')))
                    fields.add((identity, text))
            captions.update(node.get(W + 'val') for node in root.iter(W + 'tblCaption'))
    return fields, captions, stories


def audit(source, saved):
    before, before_tables, _ = inventory(source)
    after, after_tables, saved_stories = inventory(saved)
    assert before, 'No source native fields to audit'
    missing = sorted(before - after)
    missing_text = sorted((identity, text) for identity, text in before
                          if text and not any(text in story for story in saved_stories))
    def describe(fields):
        return [{'fieldId': identity, 'characters': len(text), 'textSha256': hashlib.sha256(text.encode()).hexdigest()}
                for identity, text in fields]
    lost_tables = sorted(before_tables - after_tables)
    return {
        'sourceTaggedFields': len(before), 'savedMatchingTaggedFields': len(before & after),
        'completeNativeText': 'fail' if missing_text else 'pass',
        'missingCompleteNativeText': describe(missing_text),
        'fieldIdentity': 'fail' if missing else 'pass', 'missingOrChangedTaggedFields': describe(missing),
        'tableIdentity': 'fail' if lost_tables else 'pass', 'missingTableIds': lost_tables,
        'saveReopenIdentity': 'fail' if missing or lost_tables else 'pass',
    }


def audit_matrix(directory):
    manifest = json.loads((directory / 'manifest.json').read_text())
    results = []
    for fixture in manifest:
        name = fixture['fixture']
        source = directory / (name + '.docx')
        saved = directory / (name + '-qa') / 'roundtrip' / source.name
        results.append({'fixture': name, 'sourceDocxSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                        'savedDocxSha256': hashlib.sha256(saved.read_bytes()).hexdigest(), **audit(source, saved)})
    result = {
        'fixtureCount': len(results),
        'completeNativeText': 'pass' if all(row['completeNativeText'] == 'pass' for row in results) else 'fail',
        'fieldIdentityFailures': sum(row['fieldIdentity'] == 'fail' for row in results),
        'tableIdentityFailures': sum(row['tableIdentity'] == 'fail' for row in results),
        'missingOrChangedTaggedFields': sum(len(row['missingOrChangedTaggedFields']) for row in results),
        'architectureAcceptance': 'blocked: saved native identities lost; no export enablement' if any(row['saveReopenIdentity'] == 'fail' for row in results) else 'bounded identity pass; Word acceptance pending',
        'fixtures': results,
    }
    (directory / 'native-identity-report.json').write_text(json.dumps(result, indent=2) + '\n')
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    args = parser.parse_args()
    result = audit_matrix(args.directory)
    print(json.dumps({key: value for key, value in result.items() if key != 'fixtures'}))
    assert result['completeNativeText'] == 'pass', 'Lost complete native text; retained actual identity evidence'
