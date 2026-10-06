"""Fixture-declared opening fields; never a renderer or user-field resolver."""
import re
import unicodedata

import fitz


def compact(value):
    return re.sub(r'\s+', '', unicodedata.normalize('NFKC', value).replace('\u00ad', ''))


def check_first_page_flow(document, fixture):
    """Check sized fixture content in its own first-page body track.

    Whole-document text and a nearby label can both pass while the following
    content is pushed to another page. These explicit fixture expectations cover
    content fields as well as headings, excluding neighbouring tracks and chrome.
    They do not predict pagination for arbitrary user data.
    """
    scale = 72 / 25.4
    start = 0
    for part in fixture['parts']:
        page = document[start]
        margins = part['contentBoxMm']
        for probe in part.get('firstPageFlowProbes', []):
            clip = fitz.Rect(
                (probe['leftMm'] - .5) * scale,
                max(0, (margins['top'] - 3) * scale),
                (probe['rightMm'] + .5) * scale,
                min(page.rect.height, page.rect.height - (margins['bottom'] - 3) * scale),
            )
            expected = compact(probe['text'])
            assert expected, f'Empty first-page fixture probe: {probe["fieldId"]}'
            actual = compact(page.get_text(clip=clip))
            assert expected in actual, (
                f'{fixture["fixture"]}: first-page flow detached: {probe["fieldId"]}'
            )
        start += part['expectedPages']
