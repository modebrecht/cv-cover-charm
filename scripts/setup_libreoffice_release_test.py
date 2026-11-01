#!/usr/bin/env python3
"""Official release metadata must identify the exact file and a unique SHA256."""
import unittest
import xml.etree.ElementTree as ET
from setup_libreoffice_release import FILENAME,vendor_sha256


class VendorChecksum(unittest.TestCase):
    def test_mirrorbrain_v3_and_metalink_v4(self):
        for ns,kind in [('http://www.metalinker.org/','sha256'),('urn:ietf:params:xml:ns:metalink','sha-256')]:
            raw=f'<metalink xmlns="{ns}"><files><file name="{FILENAME}"><verification><hash type="{kind}">{"a"*64}</hash></verification></file></files></metalink>'
            self.assertEqual(vendor_sha256(raw),'a'*64)

    def test_piece_hashes_cannot_replace_the_whole_file_hash(self):
        raw=f'<metalink><file name="{FILENAME}"><hash type="sha256">{"a"*64}</hash><pieces type="sha256"><hash>{"b"*64}</hash></pieces></file></metalink>'
        self.assertEqual(vendor_sha256(raw),'a'*64)
        with self.assertRaises(ValueError):vendor_sha256(raw.replace(f'<hash type="sha256">{"a"*64}</hash>',''))

    def test_wrong_release_and_ambiguous_files_rejected(self):
        file=f'<file name="{FILENAME}"><hash type="sha256">{"a"*64}</hash></file>'
        for raw in [f'<metalink>{file.replace(FILENAME,"other.tar.gz")}</metalink>',f'<metalink>{file}{file}</metalink>']:
            with self.assertRaises(ValueError):vendor_sha256(raw)

    def test_missing_invalid_or_conflicting_digest_rejected(self):
        for payload in ['',f'<hash type="md5">{"a"*32}</hash>','<hash type="sha256">invalid</hash>',f'<hash type="sha256">{"a"*64}</hash><hash type="sha256">{"b"*64}</hash>']:
            with self.assertRaises(ValueError):vendor_sha256(f'<metalink><file name="{FILENAME}">{payload}</file></metalink>')

    def test_malformed_xml_rejected(self):
        with self.assertRaises(ET.ParseError):vendor_sha256('<metalink>')


if __name__=='__main__':unittest.main()
