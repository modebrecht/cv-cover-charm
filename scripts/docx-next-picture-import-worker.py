"""Read active picture bitmaps and public ranges immediately after an unchanged import."""
import argparse
import ctypes
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile

from PIL import Image


REPO = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('grid', Path(__file__).with_name('docx-next-native-grid-worker.py'))
grid = importlib.util.module_from_spec(spec)
spec.loader.exec_module(grid)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def decode_bitmap(data, reported_size):
    """Compare decoded pixels, not BMP headers, padding or PNG encodings."""
    assert data, 'Empty native bitmap'
    with Image.open(io.BytesIO(data)) as image:
        assert image.format in ('BMP', 'DIB'), 'Unexpected native DIB format'
        rgba = image.convert('RGBA')
        assert list(rgba.size) == reported_size, 'Native bitmap dimensions disagree with its DIB'
        return {'sizePx': list(rgba.size), 'dibSha256': hashlib.sha256(data).hexdigest(),
                'rgbaSha256': hashlib.sha256(rgba.tobytes()).hexdigest()}


def shape_snapshot(shape):
    kind = shape.getShapeType()
    property_name = {'com.sun.star.drawing.CustomShape': 'FillBitmap', 'FrameShape': 'Graphic'}.get(kind)
    assert property_name, 'Unmeasured picture representation: ' + kind
    info = shape.getPropertySetInfo()
    assert info.hasPropertyByName(property_name), 'Missing explicit native bitmap property'
    bitmap = shape.getPropertyValue(property_name)
    assert bitmap is not None, 'Empty explicit native bitmap property'
    size = bitmap.getSize()
    dib = bitmap.getDIB()
    data = dib.value if hasattr(dib, 'value') else bytes(dib)
    row = {'name': shape.getName(), 'shapeType': kind, 'bitmapProperty': property_name,
           'bitmap': decode_bitmap(data, [size.Width, size.Height]), 'properties': {}}
    for key in ('GraphicCrop', 'FillBitmapSizeX', 'FillBitmapSizeY', 'FillBitmapOffsetX',
                'FillBitmapOffsetY', 'FillBitmapStretch', 'FillBitmapTile', 'AnchorType',
                'HoriOrientPosition', 'VertOrientPosition'):
        if not info.hasPropertyByName(key):
            continue
        value = shape.getPropertyValue(key)
        if key == 'GraphicCrop':
            value = {edge: getattr(value, edge) for edge in ('Left', 'Top', 'Right', 'Bottom')}
        elif value is not None and not isinstance(value, (bool, int, float, str)):
            value = str(value)
        row['properties'][key] = value
    return row


def control_snapshots(doc, shape, identity):
    collection = doc.getContentControls()
    rows = []
    for index in range(collection.getCount()):
        control = collection.getByIndex(index)
        if control.Tag != identity:
            continue
        anchor = control.getAnchor()
        text = anchor.getText()
        shape_anchor = shape.getAnchor()
        row = {'tag': control.Tag, 'picture': control.Picture,
               'textLength': len(anchor.String), 'textCodepoints': [ord(value) for value in anchor.String],
               'sameNativeTextObject': text == shape_anchor.getText()}
        if row['sameNativeTextObject']:
            # Raw public comparisons only. They do not assert native ownership
            # from a display name, an empty string or a neighbouring picture.
            row.update(controlStartVsEnd=text.compareRegionStarts(anchor.getStart(), anchor.getEnd()),
                       shapeStartVsControlStart=text.compareRegionStarts(shape_anchor.getStart(), anchor.getStart()),
                       shapeEndVsControlEnd=text.compareRegionEnds(shape_anchor.getEnd(), anchor.getEnd()))
            cursor = text.createTextCursorByRange(anchor.getStart())
            moved = cursor.goRight(1, False)
            row['onePublicCursorStepMoved'] = moved
            if moved:
                row['onePublicStepVsControlEnd'] = text.compareRegionStarts(cursor.getStart(), anchor.getEnd())
        rows.append(row)
    return rows


def observe(requests):
    import uno
    from com.sun.star.beans import PropertyValue
    from com.sun.star.document.MacroExecMode import NEVER_EXECUTE
    from com.sun.star.document.UpdateDocMode import NO_UPDATE

    manifest = json.loads((REPO / 'docs/docx-next/stable-uno-binding.json').read_text())
    binding = Path(os.environ['DOCX_NEXT_UNO_BINDING']) / 'usr/lib/libreoffice/program'
    for name, expected in manifest['nativeFiles'].items():
        assert digest(binding / name) == expected, 'Changed native picture binding'
    root = Path(os.environ['DOCX_NEXT_LO_ROOT'])
    program = root / 'usr/lib/libreoffice/program'
    library_path = program / 'libmergedlo.so'
    library = ctypes.CDLL(str(library_path), mode=ctypes.RTLD_GLOBAL)
    library.lt_db_set_datadir.argtypes = [ctypes.c_char_p]
    library.lt_db_set_datadir(str(root / 'usr/share/liblangtag').encode())
    hook = library.libreofficekit_hook_2
    hook.argtypes = [ctypes.c_char_p, ctypes.c_char_p]
    hook.restype = ctypes.POINTER(grid.Kit)
    assert requests and len({row['name'] for row in requests}) == len(requests), 'Empty or duplicate import scope'
    with tempfile.TemporaryDirectory(prefix='docx-next-picture-import-') as profile:
        kit = hook(str(program).encode(), Path(profile).as_uri().encode())
        assert kit, 'Native Kit initialization failed'
        cls = kit.contents.pClass.contents
        assert cls.nSize >= grid.KitClass.getVersionInfo.offset + ctypes.sizeof(ctypes.c_void_p)
        try:
            pointer = ctypes.CFUNCTYPE(ctypes.c_void_p, ctypes.POINTER(grid.Kit))(cls.getVersionInfo)(kit)
            assert pointer, 'Missing live engine version'
            version = json.loads(ctypes.string_at(pointer))
            libc = ctypes.CDLL(None)
            libc.free.argtypes = [ctypes.c_void_p]
            libc.free(pointer)
            assert version['ProductVersion'] + version['ProductExtension'] == '25.8.7.3'
            context = uno.getComponentContext()
            desktop = context.ServiceManager.createInstanceWithContext('com.sun.star.frame.Desktop', context)
            result = {'version': version, 'librarySha256': digest(library_path),
                      'scope': 'Active public bitmap and control ranges after completed original import, before any save',
                      'nativeBitmapAlphaMaskMeasured': False, 'productionAcceptance': 'blocked',
                      'newReadonlyNativeLoads': 0, 'newNativeExports': 0,
                      'originalPackagesModified': 0, 'cases': []}
            for request in requests:
                path = Path(request['path']).resolve()
                before = digest(path)
                assert before == request['sha256'], 'Changed original import input'
                props = (PropertyValue('Hidden', 0, True, 0), PropertyValue('ReadOnly', 0, True, 0),
                         PropertyValue('MacroExecutionMode', 0, NEVER_EXECUTE, 0),
                         PropertyValue('UpdateDocMode', 0, NO_UPDATE, 0))
                doc = desktop.loadComponentFromURL(path.as_uri(), '_blank', 0, props)
                assert doc and doc.isReadonly() and not doc.isModified(), 'Import modified the original document'
                try:
                    page = doc.getDrawPage()
                    shapes = [page.getByIndex(index) for index in range(page.getCount())
                              if page.getByIndex(index).getName() == request['pictureId']]
                    assert len(shapes) == 1, 'Explicit picture drawing missing or ambiguous'
                    shape = shapes[0]
                    row = {'name': request['name'], 'inputSha256': before,
                           'shape': shape_snapshot(shape),
                           'pictureControls': control_snapshots(doc, shape, request['pictureId']),
                           'readOnly': doc.isReadonly(), 'modified': doc.isModified()}
                    assert row['readOnly'] and not row['modified'], 'Snapshot changed the document'
                    result['cases'].append(row)
                    result['newReadonlyNativeLoads'] += 1
                finally:
                    doc.close(True)
                assert digest(path) == before, 'Native read changed source bytes'
            return result
        finally:
            ctypes.CFUNCTYPE(None, ctypes.POINTER(grid.Kit))(cls.destroy)(kit)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('requests', type=Path)
    args = parser.parse_args()
    print(json.dumps(observe(json.loads(args.requests.read_text())), indent=2))
