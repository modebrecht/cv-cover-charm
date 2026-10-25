"""Read native imported UNO properties, resolving the complete owner by canonical tags first."""
import argparse
import ctypes
import hashlib
import json
import os
from pathlib import Path
import tempfile


def validate_canonical(canonical):
    assert isinstance(canonical, list) and canonical and all(isinstance(value, str) and value for value in canonical) and len(canonical) == len(set(canonical)), 'Invalid canonical owner inventory'


def canonical_owner(canonical, controls, tables, parents):
    validate_canonical(canonical)
    tags = [row['tag'] for row in controls]
    assert len(tags) == len(set(tags)), 'Duplicated live canonical tag'
    assert all(tag in tags for tag in canonical), 'Missing live canonical tag: ' + repr([tag for tag in canonical if tag not in tags])
    assert len(tables) == len(set(tables)), 'Duplicated live table name'
    assert all(child in tables and row['table'] in tables and child != row['table'] for child, row in parents.items()), 'Unknown native parent or self ancestry'
    ancestry = {}
    for row in controls:
        chain = []; name = row['table']
        while name is not None:
            assert name in tables and name not in [entry['table'] for entry in chain], 'Unknown native table or cyclic ancestry'
            chain.append({'table': name, 'cell': row['cell'] if not chain else parents[chain[-1]['table']]['cell']})
            name = parents.get(name, {}).get('table')
        ancestry[row['tag']] = list(reversed(chain))
    matches = [name for name in tables if [row['tag'] for row in controls if any(entry['table'] == name for entry in ancestry[row['tag']])] == canonical]
    assert len(matches) == 1, 'Missing, reordered or ambiguous complete native owner'
    owner = matches[0]
    return owner, [{'fieldId': tag, 'ancestry': ancestry[tag]} for tag in canonical]


class KitClass(ctypes.Structure):
    # Stable public LibreOfficeKit.h prefix through getVersionInfo, all pointer-sized entries.
    _fields_ = [('nSize', ctypes.c_size_t)] + [(name, ctypes.c_void_p) for name in
                 ('destroy', 'documentLoad', 'getError', 'documentLoadWithOptions', 'freeError',
                  'registerCallback', 'getFilterTypes', 'setOptionalFeatures', 'setDocumentPassword', 'getVersionInfo')]


class Kit(ctypes.Structure):
    _fields_ = [('pClass', ctypes.POINTER(KitClass))]


def native_snapshot(path, canonical):
    repository = Path(__file__).resolve().parent.parent
    manifest = json.loads((repository / 'docs/docx-next/stable-uno-binding.json').read_text())
    binding = Path(os.environ['DOCX_NEXT_UNO_BINDING']) / 'usr/lib/libreoffice/program'
    for name, expected in manifest['nativeFiles'].items():
        assert hashlib.sha256((binding / name).read_bytes()).hexdigest() == expected, 'Changed live UNO binding binary'
    import uno
    from com.sun.star.beans import PropertyValue
    from com.sun.star.document.MacroExecMode import NEVER_EXECUTE
    from com.sun.star.document.UpdateDocMode import NO_UPDATE
    root = Path(os.environ['DOCX_NEXT_LO_ROOT'])
    program = root / 'usr/lib/libreoffice/program'
    library = ctypes.CDLL(str(program / 'libmergedlo.so'), mode=ctypes.RTLD_GLOBAL)
    set_data = library.lt_db_set_datadir; set_data.argtypes = [ctypes.c_char_p]
    set_data(str(root / 'usr/share/liblangtag').encode())
    hook = library.libreofficekit_hook_2
    hook.argtypes = [ctypes.c_char_p, ctypes.c_char_p]; hook.restype = ctypes.POINTER(Kit)
    with tempfile.TemporaryDirectory(prefix='docx-next-native-grid-') as profile:
        kit = hook(str(program).encode(), Path(profile).as_uri().encode()); assert kit, 'Native Kit initialization failed'
        cls = kit.contents.pClass.contents
        assert cls.nSize >= KitClass.getVersionInfo.offset + ctypes.sizeof(ctypes.c_void_p), 'Missing public Kit version API'
        doc = None
        try:
            get_version = ctypes.CFUNCTYPE(ctypes.c_void_p, ctypes.POINTER(Kit))(cls.getVersionInfo)
            info = get_version(kit); assert info, 'Missing actual native version'
            version = json.loads(ctypes.string_at(info))
            libc = ctypes.CDLL(None); libc.free.argtypes = [ctypes.c_void_p]; libc.free(info)
            assert version['ProductVersion'] + version['ProductExtension'] == '25.8.7.3', 'Unexpected live engine version'
            context = uno.getComponentContext()
            desktop = context.ServiceManager.createInstanceWithContext('com.sun.star.frame.Desktop', context)
            props = (PropertyValue('Hidden', 0, True, 0), PropertyValue('ReadOnly', 0, True, 0),
                     PropertyValue('MacroExecutionMode', 0, NEVER_EXECUTE, 0), PropertyValue('UpdateDocMode', 0, NO_UPDATE, 0))
            doc = desktop.loadComponentFromURL(path.resolve().as_uri(), '_blank', 0, props)
            assert doc and doc.isReadonly() and not doc.isModified(), 'Native document is not read-only and unmodified'
            native_tables = {name: doc.TextTables.getByName(name) for name in doc.TextTables.ElementNames}
            parents = {}
            for name, table in native_tables.items():
                for cell_name in table.getCellNames():
                    elements = table.getCellByName(cell_name).createEnumeration()
                    while elements.hasMoreElements():
                        element = elements.nextElement()
                        if element.supportsService('com.sun.star.text.TextTable'):
                            assert element.Name not in parents, 'Ambiguous native parent'
                            parents[element.Name] = {'table': name, 'cell': cell_name}
            controls = []; collection = doc.getContentControls()
            for i in range(collection.getCount()):
                control = collection.getByIndex(i); anchor = control.getAnchor()
                cursor = anchor.getText().createTextCursorByRange(anchor)
                table = cursor.TextTable; cell = cursor.Cell
                controls.append({'tag': control.Tag, 'table': None if table is None else table.Name,
                                 'cell': None if cell is None else cell.CellName})
            try:
                owner, ancestry = canonical_owner(canonical, controls, list(native_tables), parents)
                resolution = {'status': 'pass'}
            except AssertionError as error:
                # A missing public control is a measured negative. Never use a partial
                # tag inventory, display text, table ordinal or width to choose its owner.
                owner, ancestry = None, None
                resolution = {'status': 'fail', 'reason': str(error)}
            result = {'version': version, 'readOnly': doc.isReadonly(), 'modified': doc.isModified(),
                      'canonicalOwnerFieldIds': canonical, 'canonicalFieldAncestry': ancestry,
                      'liveCanonicalTags': [row['tag'] for row in controls], 'nativeOwnerName': owner,
                      'ownerResolution': resolution, 'nativeTableCount': len(native_tables), 'nativeTableNames': list(native_tables),
                      'nativeControlAncestryInputs': controls, 'nativeParents': parents,
                      'widthMm100': None, 'relativeSum': None, 'tableSeparators': None,
                      'rowSeparators': None, 'cellNames': None,
                      'loadOptions': {'Hidden': True, 'ReadOnly': True, 'MacroExecutionMode': NEVER_EXECUTE, 'UpdateDocMode': NO_UPDATE},
                      'newNativeExports': 0, 'twipGeometryAvailable': False}
            if owner is not None:
                table = native_tables[owner]; rows = table.getRows()
                def separators(values): return [{'position': value.Position, 'visible': value.IsVisible} for value in values]
                result.update(widthMm100=table.Width, relativeSum=table.TableColumnRelativeSum,
                              tableSeparators=separators(table.TableColumnSeparators),
                              rowSeparators=[separators(rows.getByIndex(i).TableColumnSeparators) for i in range(rows.getCount())],
                              cellNames=list(table.getCellNames()))
            assert [collection.getByIndex(i).Tag for i in range(collection.getCount())] == result['liveCanonicalTags'], 'Measurement changed live canonical controls'
            assert doc.isReadonly() and not doc.isModified(), 'Native measurement modified the document'
            return result
        finally:
            if doc is not None: doc.close(True)
            ctypes.CFUNCTYPE(None, ctypes.POINTER(Kit))(cls.destroy)(kit)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__); parser.add_argument('request', type=Path)
    args = parser.parse_args(); request = json.loads(args.request.read_text()); path = Path(request['path'])
    validate_canonical(request['canonicalOwnerFieldIds'])
    before = hashlib.sha256(path.read_bytes()).hexdigest()
    assert before == request['sha256'], 'Changed native input bytes before loading'
    result = native_snapshot(path, request['canonicalOwnerFieldIds'])
    assert hashlib.sha256(path.read_bytes()).hexdigest() == before, 'Native measurement changed input bytes'
    print(json.dumps(dict(result, inputSha256=before)))
