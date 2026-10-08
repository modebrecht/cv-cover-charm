"""Synthetic input fixtures: transparent PNG, RGB/ICC/CMYK/EXIF JPEG."""
import base64
import io
import json
import sys
from PIL import Image, ImageCms, ImageDraw

fixtures = {}
image = Image.new('RGB', (120, 180), (230, 40, 30))
ImageDraw.Draw(image).rectangle((60, 0, 119, 179), fill=(30, 90, 220))
for key, mode, options in [
    ('jpeg', 'RGB', {}),
    ('icc-jpeg', 'RGB', {'icc_profile': ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()}),
    ('cmyk-jpeg', 'CMYK', {}),
    ('exif-jpeg', 'RGB', {'exif': Image.Exif()}),
]:
    if key == 'exif-jpeg':
        options['exif'][274] = 6
    out = io.BytesIO()
    image.convert(mode).save(out, format='JPEG', quality=95, **options)
    fixtures[key] = 'data:image/jpeg;base64,' + base64.b64encode(out.getvalue()).decode()
png = image.convert('RGBA')
png.putpixel((0, 0), (0, 0, 0, 0))
out = io.BytesIO()
png.save(out, format='PNG')
fixtures['png'] = 'data:image/png;base64,' + base64.b64encode(out.getvalue()).decode()
large = image.resize((2400, 3600))
out = io.BytesIO()
large.save(out, format='JPEG', quality=80)
fixtures['large-jpeg'] = 'data:image/jpeg;base64,' + base64.b64encode(out.getvalue()).decode()
if len(sys.argv) == 3:
    assert sys.argv[2] == '--picture-sizes', 'Unknown fixture image option'
    for width, height in [(240, 360), (600, 900)]:
        sized = Image.new('RGB', (width, height), (230, 40, 30))
        ImageDraw.Draw(sized).rectangle((width // 2, 0, width - 1, height - 1), fill=(30, 90, 220))
        out = io.BytesIO()
        sized.save(out, format='JPEG', quality=95, icc_profile=ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes())
        fixtures[f'icc-jpeg-{width}x{height}'] = 'data:image/jpeg;base64,' + base64.b64encode(out.getvalue()).decode()
else:
    assert len(sys.argv) == 2, 'Usage: fixture-images.py OUTPUT [--picture-sizes]'
with open(sys.argv[1], 'w') as f:
    json.dump(fixtures, f)
