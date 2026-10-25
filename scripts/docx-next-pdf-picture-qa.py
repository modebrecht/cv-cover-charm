"""Read-only rectangular PDF image clips; never change package content or infer a crop."""
import fitz
from pypdf import PdfReader
from pypdf.generic import ContentStream


def image_rectangles(path, page_number):
    reader = PdfReader(path)
    page = reader.pages[page_number]
    assert not page.get('/Rotate', 0), 'Rotated QA page unsupported'
    box = page.mediabox
    left, top = float(box.left), float(box.top)
    images = []

    def rectangle(points):
        if len(points) == 5 and points[0] == points[-1]:
            points = points[:-1]
        if len(points) != 4 or any(abs(a.x - b.x) > 0.00001 and abs(a.y - b.y) > 0.00001 for a, b in zip(points, points[1:] + points[:1])):
            return None
        xs = {round(point.x, 5) for point in points}
        ys = {round(point.y, 5) for point in points}
        if len(xs) != 2 or len(ys) != 2:
            return None
        pairs = {(round(point.x, 5), round(point.y, 5)) for point in points}
        if pairs != {(x, y) for x in xs for y in ys}:
            return None
        return fitz.Rect(min(xs), min(ys), max(xs), max(ys))

    def transformed_rect(values, matrix):
        x0, y0, x1, y1 = map(float, values)
        return rectangle([fitz.Point(x, y) * matrix for x, y in [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]])

    def display(rect):
        return fitz.Rect(rect.x0 - left, top - rect.y1, rect.x1 - left, top - rect.y0)

    def walk(stream, resources, matrix, clip, unknown_clip=False, depth=0):
        assert depth <= 8, 'Recursive PDF forms exceed QA bound'
        stack, points, complex_path, pending_clip = [], [], False, False
        for args, operator in ContentStream(stream, reader).operations:
            if operator == b'q':
                stack.append((fitz.Matrix(matrix), None if clip is None else fitz.Rect(clip), unknown_clip))
            elif operator == b'Q':
                assert stack, 'Unbalanced PDF graphics state'
                matrix, clip, unknown_clip = stack.pop()
            elif operator == b'cm':
                matrix = fitz.Matrix(*map(float, args)) * matrix
            elif operator == b're':
                if points:
                    complex_path = True
                x, y, width, height = map(float, args)
                points.extend(fitz.Point(a, b) * matrix for a, b in [(x, y), (x + width, y), (x + width, y + height), (x, y + height)])
            elif operator in [b'm', b'l']:
                if operator == b'm' and points:
                    complex_path = True
                points.append(fitz.Point(*map(float, args)) * matrix)
            elif operator in [b'c', b'v', b'y']:
                complex_path = True
            elif operator in [b'W', b'W*']:
                pending_clip = True
            elif operator in [b'n', b'S', b's', b'f', b'F', b'f*', b'B', b'B*', b'b', b'b*']:
                if pending_clip:
                    rect = None if complex_path else rectangle(points)
                    if rect is None:
                        unknown_clip = True
                    else:
                        clip = rect if clip is None else clip & rect
                points, complex_path, pending_clip = [], False, False
            elif operator == b'Do':
                obj = resources['/XObject'][args[0]].get_object()
                if obj['/Subtype'] == '/Image':
                    assert not unknown_clip, 'Nonrectangular image clip unsupported by this rectangular QA'
                    raw = transformed_rect([0, 0, 1, 1], matrix)
                    assert raw is not None, 'Rotated/skewed picture unsupported by rectangular QA'
                    visible = raw if clip is None else raw & clip
                    images.append({'raw': display(raw), 'visible': display(visible), 'clip': None if clip is None else display(clip)})
                elif obj['/Subtype'] == '/Form':
                    form_matrix = fitz.Matrix(*map(float, obj.get('/Matrix', [1, 0, 0, 1, 0, 0]))) * matrix
                    form_box = transformed_rect(obj['/BBox'], form_matrix)
                    assert form_box is not None, 'Rotated/skewed form unsupported by rectangular QA'
                    walk(obj, obj.get('/Resources', resources), form_matrix, form_box if clip is None else clip & form_box, unknown_clip, depth + 1)
                else:
                    raise AssertionError('Unknown painted XObject')
            elif operator == b'INLINE IMAGE':
                raise AssertionError('Inline PDF image unsupported by this QA')
        assert not stack, 'Unbalanced PDF graphics state'

    walk(page.get_contents(), page['/Resources'], fitz.Matrix(1, 0, 0, 1, 0, 0), None)
    return images
