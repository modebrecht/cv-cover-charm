"""Read existing body-table paragraph nodes in native enumeration order; no save or layout edits."""
import hashlib
import json
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
worker = REPO / 'scripts/docx-next-native-import-worker.py'
source = worker.read_text()
manifest = json.loads((REPO / 'docs/docx-next/stable-native-stack.json').read_text())
assert hashlib.sha256(source.encode()).hexdigest() == manifest['originalWorkerSha256']


def native_story_nodes(doc, controls, request):
    canonical = request['canonicalOwnerFieldIds'][0]
    first = next(row for row in controls if row['tag'] == canonical)
    assert first['table'] is not None
    table = doc.TextTables.getByName(first['table'])
    result = {}
    def walk(text, path, depth=0):
        assert depth <= 8
        enumeration = text.createEnumeration()
        rows = []
        while enumeration.hasMoreElements():
            block = enumeration.nextElement()
            if block.supportsService('com.sun.star.text.TextTable'):
                for name in block.getCellNames():
                    rows.extend(walk(block.getCellByName(name), path + [{'table': block.Name, 'cell': name}], depth + 1))
            else:
                assert block.supportsService('com.sun.star.text.Paragraph'), 'Unknown native text block'
                rows.append({'text': block.getString(), 'ownerPath': path})
        return rows
    for label, cell in request['nativeStoryCells'].items():
        result[label] = walk(table.getCellByName(cell), [{'table': first['table'], 'cell': cell}])
    assert doc.isReadonly() and not doc.isModified()
    return result


needle = '                    controls = boundary.inventory(doc)'
assert source.count(needle) == 1
source = source.replace(needle, needle + '\n                    story_nodes = native_story_nodes(doc, controls, request)')
needle = "'finalControls': controls, 'nativeTableNames': list(doc.TextTables.ElementNames),"
assert source.count(needle) == 1
source = source.replace(needle, needle + "\n                                  'nativeStoryNodes': story_nodes,")
exec(compile(source, str(worker), 'exec'), {'__file__': str(worker), '__name__': '__main__', 'native_story_nodes': native_story_nodes})
