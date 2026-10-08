"""Compare every rendered RGBA channel; PNG metadata and alpha masks cannot hide changes."""
import hashlib
from PIL import Image


def pixel_digest(path):
    with Image.open(path) as image:
        rgba = image.convert('RGBA')
        dimensions = f'{rgba.width}x{rgba.height}\0'.encode()
        return hashlib.sha256(dimensions + rgba.tobytes()).hexdigest()


def same_pixels(first, second):
    return pixel_digest(first) == pixel_digest(second)
