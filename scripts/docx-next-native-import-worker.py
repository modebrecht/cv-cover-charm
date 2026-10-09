"""Observe original read-only imports through the public XLoadable status callbacks."""
import argparse
import ctypes
import hashlib
import json
import os
from pathlib import Path
import tempfile

import importlib.util


def module(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name('docx-next-' + name + '.py'))
    result = importlib.util.module_from_spec(spec); spec.loader.exec_module(result); return result


grid = module('native-grid-worker'); boundary = module('native-boundary-worker')


def observe(requests):
    repository = Path(__file__).resolve().parent.parent
    manifest = json.loads((repository / 'docs/docx-next/stable-uno-binding.json').read_text())
    binding = Path(os.environ['DOCX_NEXT_UNO_BINDING']) / 'usr/lib/libreoffice/program'
    for name, expected in manifest['nativeFiles'].items():
        assert hashlib.sha256((binding / name).read_bytes()).hexdigest() == expected, 'Changed native import binding'
    import uno
    import unohelper
    from com.sun.star.beans import PropertyValue
    from com.sun.star.document.MacroExecMode import NEVER_EXECUTE
    from com.sun.star.document.UpdateDocMode import NO_UPDATE
    from com.sun.star.task import XStatusIndicator
    from com.sun.star.lang import XEventListener
    root = Path(os.environ['DOCX_NEXT_LO_ROOT']); program = root / 'usr/lib/libreoffice/program'
    library = ctypes.CDLL(str(program / 'libmergedlo.so'), mode=ctypes.RTLD_GLOBAL)
    library.lt_db_set_datadir.argtypes = [ctypes.c_char_p]
    library.lt_db_set_datadir(str(root / 'usr/share/liblangtag').encode())
    hook = library.libreofficekit_hook_2
    hook.argtypes = [ctypes.c_char_p, ctypes.c_char_p]; hook.restype = ctypes.POINTER(grid.Kit)
    with tempfile.TemporaryDirectory(prefix='docx-next-native-import-') as profile:
        kit = hook(str(program).encode(), Path(profile).as_uri().encode()); assert kit
        cls = kit.contents.pClass.contents
        assert cls.nSize >= grid.KitClass.getVersionInfo.offset + ctypes.sizeof(ctypes.c_void_p)
        try:
            info = ctypes.CFUNCTYPE(ctypes.c_void_p, ctypes.POINTER(grid.Kit))(cls.getVersionInfo)(kit); assert info
            version = json.loads(ctypes.string_at(info))
            libc = ctypes.CDLL(None); libc.free.argtypes = [ctypes.c_void_p]; libc.free(info)
            assert version['ProductVersion'] + version['ProductExtension'] == '25.8.7.3'
            context = uno.getComponentContext(); cases = []
            for request in requests:
                path = Path(request['path']); before = hashlib.sha256(path.read_bytes()).hexdigest()
                assert before == request['sha256'], 'Changed original import input'
                canonical = request['canonicalOwnerFieldIds']; grid.validate_canonical(canonical)
                doc = context.ServiceManager.createInstanceWithContext('com.sun.star.text.TextDocument', context)
                events = []; listeners = []; registration = None; loading = True

                class DisposalObserver(unohelper.Base, XEventListener):
                    def disposing(self, event):
                        # XEventListener requires releasing the dying broadcaster without calling it again.
                        listeners.clear()
                        if not loading: return
                        row = {'event': 'first-paragraph-disposing', 'value': None}
                        try:
                            collection = doc.getContentControls(); count = collection.getCount()
                            tags = [collection.getByIndex(i).Tag for i in range(count)]
                            row.update(count=count, tags=tags, firstControl=None, firstControlAnchorSampled=False)
                        except Exception as error: row['error'] = type(error).__name__ + ': ' + str(error)
                        events.append(row)

                class Observer(unohelper.Base, XStatusIndicator):
                    def snapshot(self, event, value=None):
                        row = {'event': event, 'value': value}
                        try:
                            collection = doc.getContentControls(); count = collection.getCount()
                            controls = [collection.getByIndex(i) for i in range(count)]
                            tags = [control.Tag for control in controls]
                            assert len(tags) == len(set(tags)), 'Duplicate progress canonical tag'
                            first = [control for control in controls if control.Tag == canonical[0]]
                            sample = None
                            if first:
                                anchor = first[0].getAnchor()
                                cursor = anchor.getText().createTextCursorByRange(anchor)
                                table, cell = cursor.TextTable, cursor.Cell
                                cursor.gotoStartOfParagraph(False); cursor.gotoEndOfParagraph(True)
                                sample = {'tag': canonical[0], 'text': anchor.String,
                                          'table': None if table is None else table.Name,
                                          'cell': None if cell is None else cell.CellName,
                                          'paragraphText': cursor.String}
                            row.update(count=count, tags=tags, firstControl=sample, firstControlAnchorSampled=True)
                        except Exception as error:
                            # UNO may absorb callback exceptions; make every failure observable and fatal below.
                            row['error'] = type(error).__name__ + ': ' + str(error)
                        events.append(row)
                        nonlocal registration
                        if 'error' not in row and first and registration is None:
                            # Select the paragraph only from the complete supplier's canonical first control anchor.
                            cursor = first[0].getAnchor().getText().createTextCursorByRange(first[0].getAnchor())
                            paragraph = cursor.createEnumeration().nextElement()
                            assert paragraph.supportsService('com.sun.star.text.Paragraph')
                            listener = DisposalObserver(); paragraph.addEventListener(listener)
                            listeners.append((paragraph, listener))
                            registration = {'eventIndex': len(events) - 1, 'canonicalTag': canonical[0],
                                            'paragraphText': paragraph.String}

                    def start(self, text, range): self.snapshot('start', {'text': text, 'range': range})
                    def end(self): self.snapshot('end')
                    def setText(self, text): self.snapshot('text', text)
                    def setValue(self, value): self.snapshot('value', value)
                    def reset(self): self.snapshot('reset')

                observer = Observer()
                try:
                    doc.load((PropertyValue('URL', 0, path.resolve().as_uri(), 0),
                              PropertyValue('FilterName', 0, 'Office Open XML Text', 0),
                              PropertyValue('Hidden', 0, True, 0), PropertyValue('ReadOnly', 0, True, 0),
                              PropertyValue('MacroExecutionMode', 0, NEVER_EXECUTE, 0),
                              PropertyValue('UpdateDocMode', 0, NO_UPDATE, 0),
                              PropertyValue('StatusIndicator', 0, observer, 0)))
                    loading = False
                    assert events and not any('error' in row for row in events), 'Failed native import callback: ' + repr(events)
                    assert doc.isReadonly() and not doc.isModified(), 'Original import modified memory state'
                    controls = boundary.inventory(doc)
                    cases.append({'fixture': request['fixture'], 'phase': request['phase'],
                                  'inputSha256': before, 'canonicalOwnerFieldIds': canonical, 'events': events,
                                  'paragraphDisposalRegistration': registration,
                                  'finalControls': controls, 'nativeTableNames': list(doc.TextTables.ElementNames),
                                  'readOnly': doc.isReadonly(), 'modified': doc.isModified()})
                finally: doc.close(True)
                assert hashlib.sha256(path.read_bytes()).hexdigest() == before, 'Native import changed original package'
            return {'version': version, 'cases': cases, 'newReadonlyNativeLoads': len(cases),
                    'newInMemoryDocuments': 0, 'newPreparedSources': 0, 'newNativeExports': 0, 'originalPackagesModified': 0,
                    'loadOptions': {'Hidden': True, 'ReadOnly': True, 'MacroExecutionMode': NEVER_EXECUTE,
                                    'UpdateDocMode': NO_UPDATE, 'FilterName': 'Office Open XML Text'},
                    'internalStartCursorMeasured': False, 'internalDummyGuardMeasured': False,
                    'exactDetachmentCallMeasured': False}
        finally: ctypes.CFUNCTYPE(None, ctypes.POINTER(grid.Kit))(cls.destroy)(kit)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__); parser.add_argument('request', type=Path)
    args = parser.parse_args(); print(json.dumps(observe(json.loads(args.request.read_text()))))
