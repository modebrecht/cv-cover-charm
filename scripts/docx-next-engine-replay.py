"""Transfer one synthetic reviewed native package through CI logs for exact-source engine replay."""
import argparse
import base64
import hashlib
import json
from pathlib import Path


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    args = parser.parse_args()
    name = 'sidebar-photo-main'
    directory = args.directory
    manifest = json.loads((directory / 'manifest.json').read_text())
    fixture = next(row for row in manifest if row['fixture'] == name)
    identity = next(row for row in json.loads((directory / 'native-identity-report.json').read_text())['fixtures'] if row['fixture'] == name)
    restored = next(row for row in json.loads((directory / 'json-restoration-report.json').read_text())['fixtures'] if row['fixture'] == name)
    data = (directory / (name + '.docx')).read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    assert digest == identity['sourceDocxSha256'] == restored['docxSha256']
    print(json.dumps({'engineReplay': name, 'docxSha256': digest, 'stableIdentity': identity,
                      'manifest': fixture, 'docxBase64': base64.b64encode(data).decode()}))
