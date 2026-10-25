"""Public UNO first-cell boundary counterexample in two fresh unsaved diagnostic documents."""
import ctypes
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import tempfile


def module(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name('docx-next-' + name + '.py'))
    result = importlib.util.module_from_spec(spec); spec.loader.exec_module(result); return result


grid = module('native-grid-worker')
CANONICAL = ['diagnostic.first', 'diagnostic.after']


def inventory(doc):
    collection = doc.getContentControls(); controls = []
    for index in range(collection.getCount()):
        control = collection.getByIndex(index); anchor = control.getAnchor()
        cursor = anchor.getText().createTextCursorByRange(anchor)
        table, cell = cursor.TextTable, cursor.Cell
        controls.append({'tag': control.Tag, 'text': anchor.String,
                         'table': None if table is None else table.Name,
                         'cell': None if cell is None else cell.CellName})
    return controls


def run():
    repository = Path(__file__).resolve().parent.parent
    manifest = json.loads((repository / 'docs/docx-next/stable-uno-binding.json').read_text())
    binding = Path(os.environ['DOCX_NEXT_UNO_BINDING']) / 'usr/lib/libreoffice/program'
    for name, expected in manifest['nativeFiles'].items():
        assert hashlib.sha256((binding / name).read_bytes()).hexdigest() == expected, 'Changed native boundary binding binary'
    import uno
    from com.sun.star.beans import PropertyValue
    from com.sun.star.document.MacroExecMode import NEVER_EXECUTE
    from com.sun.star.document.UpdateDocMode import NO_UPDATE
    from com.sun.star.text.ControlCharacter import PARAGRAPH_BREAK
    root = Path(os.environ['DOCX_NEXT_LO_ROOT']); program = root / 'usr/lib/libreoffice/program'
    library = ctypes.CDLL(str(program / 'libmergedlo.so'), mode=ctypes.RTLD_GLOBAL)
    library.lt_db_set_datadir.argtypes = [ctypes.c_char_p]
    library.lt_db_set_datadir(str(root / 'usr/share/liblangtag').encode())
    hook = library.libreofficekit_hook_2
    hook.argtypes = [ctypes.c_char_p, ctypes.c_char_p]; hook.restype = ctypes.POINTER(grid.Kit)
    with tempfile.TemporaryDirectory(prefix='docx-next-native-boundary-') as profile:
        kit = hook(str(program).encode(), Path(profile).as_uri().encode()); assert kit, 'Native Kit initialization failed'
        cls = kit.contents.pClass.contents
        assert cls.nSize >= grid.KitClass.getVersionInfo.offset + ctypes.sizeof(ctypes.c_void_p)
        try:
            info = ctypes.CFUNCTYPE(ctypes.c_void_p, ctypes.POINTER(grid.Kit))(cls.getVersionInfo)(kit)
            assert info, 'Missing native boundary version'
            version = json.loads(ctypes.string_at(info))
            libc = ctypes.CDLL(None); libc.free.argtypes = [ctypes.c_void_p]; libc.free(info)
            assert version['ProductVersion'] + version['ProductExtension'] == '25.8.7.3'
            context = uno.getComponentContext()
            desktop = context.ServiceManager.createInstanceWithContext('com.sun.star.frame.Desktop', context)
            cases = []
            for steps in (0, 1):
                # These are deliberately mutable synthetic memory models, never imported application documents.
                doc = desktop.loadComponentFromURL('private:factory/swriter', '_blank', 0,
                      (PropertyValue('Hidden', 0, True, 0), PropertyValue('MacroExecutionMode', 0, NEVER_EXECUTE, 0),
                       PropertyValue('UpdateDocMode', 0, NO_UPDATE, 0)))
                assert doc and not doc.hasLocation() and not doc.isReadonly()
                try:
                    text = doc.Text; text.String = 'alpha'
                    text.insertControlCharacter(text.End, PARAGRAPH_BREAK, False)
                    text.insertString(text.End, 'beta', False)
                    for index, tag in enumerate(CANONICAL):
                        cursor = text.createTextCursor()
                        if index == 0: cursor.gotoStart(False)
                        else: cursor.gotoEnd(False); cursor.gotoStartOfParagraph(False)
                        cursor.gotoEndOfParagraph(True)
                        control = doc.createInstance('com.sun.star.text.ContentControl')
                        control.Tag = tag; control.PlainText = True
                        text.insertTextContent(cursor, control, True)
                    before = inventory(doc)
                    assert [row['tag'] for row in before] == CANONICAL
                    start = text.createTextCursor(); start.gotoStart(False)
                    assert start.goRight(steps, False)
                    end = text.createTextCursor(); end.gotoStart(False); end.gotoEndOfParagraph(False)
                    prefix = text.createTextCursor(); prefix.gotoStart(False); prefix.gotoRange(start, True)
                    selected = text.createTextCursorByRange(start); selected.gotoRange(end, True)
                    sample = {'requestedPublicCursorSteps': steps, 'prefixText': prefix.String,
                              'selectedText': selected.String, 'before': before, 'bodyBefore': text.String}
                    table = text.convertToTable((((start, end),),), (((),),), ((),), ())
                    after = inventory(doc)
                    # Resolve the entire declared owner, with every live control present, before using its name.
                    try:
                        owner, ancestry = grid.canonical_owner([CANONICAL[0]], after, list(doc.TextTables.ElementNames), {})
                        resolution = {'status': 'pass', 'name': owner, 'ancestry': ancestry}
                    except AssertionError as error:
                        resolution = {'status': 'fail', 'reason': str(error)}
                    sample.update(after=after, bodyAfter=doc.Text.String, nativeTableNames=list(doc.TextTables.ElementNames),
                                  tableCellText=table.getCellByName('A1').String, completeOwnerResolution=resolution,
                                  hasLocation=doc.hasLocation(), modified=doc.isModified())
                    assert [row['tag'] for row in after] == CANONICAL and not doc.hasLocation()
                    cases.append(sample)
                finally: doc.close(True)
            return {'version': version, 'cases': cases, 'newInMemoryDocuments': 2, 'existingDocumentLoads': 0,
                    'newPreparedSources': 0, 'newNativeExports': 0, 'originalPackagesModified': 0,
                    'loadOptions': {'Hidden': True, 'MacroExecutionMode': NEVER_EXECUTE, 'UpdateDocMode': NO_UPDATE},
                    'internalImportStartIndexMeasured': False, 'internalNodeSplitInstrumented': False,
                    'causalAcceptance': 'unproven: this public conversion model retains both global native tags; it does not reproduce the original saved-package missing tag'}
        finally: ctypes.CFUNCTYPE(None, ctypes.POINTER(grid.Kit))(cls.destroy)(kit)


if __name__ == '__main__': print(json.dumps(run()))
