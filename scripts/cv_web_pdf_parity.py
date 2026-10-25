#!/usr/bin/env python3
"""Compare same-SHA Web/PDF galleries using the existing A4/SSIM pipeline."""
import argparse
import csv
from pathlib import Path
from statistics import mean
from skimage.metrics import structural_similarity
from dossier_visual_parity import parse_web_manifest, normalize_image, rasterize_pdf, analysis_arrays, PAGE_KINDS

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--web-dir', type=Path, required=True)
    parser.add_argument('--pdf-dir', type=Path, required=True)
    parser.add_argument('--out-dir', type=Path, required=True)
    args = parser.parse_args()
    web_sha = (args.web_dir / 'SOURCE_SHA.txt').read_text().strip()
    pdf_sha = (args.pdf_dir / 'SOURCE_SHA.txt').read_text().strip()
    if web_sha != pdf_sha or len(web_sha) != 40:
        raise RuntimeError(f'Gallery source revisions differ: Web={web_sha}, PDF={pdf_sha}')
    cases = parse_web_manifest(args.web_dir / 'MANIFEST.txt')
    args.out_dir.mkdir(parents=True, exist_ok=True)
    rows = []
    for case in cases:
        pdf_images = rasterize_pdf(args.pdf_dir / f'{case.base}.pdf', args.out_dir / 'pdf', case.base)
        for kind in PAGE_KINDS:
            web = args.out_dir / 'web' / f'{case.base}--{kind}.png'
            normalize_image(args.web_dir / case.web_files[kind], web)
            w_rgb, w_gray = analysis_arrays(web)
            p_rgb, p_gray = analysis_arrays(pdf_images[kind])
            rows.append({'template': case.label, 'page': kind,
                         'rgb_ssim': float(structural_similarity(w_rgb, p_rgb, data_range=255, channel_axis=2)),
                         'layout_ssim': float(structural_similarity(w_gray, p_gray, data_range=255))})
    with (args.out_dir / 'scores.csv').open('w') as file:
        writer = csv.DictWriter(file, fieldnames=rows[0].keys()); writer.writeheader(); writer.writerows(rows)
    cv = [r for r in rows if r['page'] == 'cv']
    lines = ['# Same-SHA Web ↔ combined PDF parity', '', f'Source: `{web_sha}`. 39 templates / 117 page pairs.', '',
             'RGB and grayscale/layout SSIM use the existing A4 normalization and 265 × 375 analysis grid. Scores report raster similarity; browser geometry, pagination and selection tests provide the structural guarantees.', '',
             '| Page | RGB SSIM mean | Layout SSIM mean |', '|---|---:|---:|']
    for kind in (*PAGE_KINDS, 'all'):
        group = rows if kind == 'all' else [r for r in rows if r['page'] == kind]
        lines.append(f"| {kind} | {mean(r['rgb_ssim'] for r in group):.6f} | {mean(r['layout_ssim'] for r in group):.6f} |")
    lines += ['', 'Lowest CV scores:', '', '| Template | RGB SSIM | Layout SSIM |', '|---|---:|---:|']
    for row in sorted(cv, key=lambda r:r['layout_ssim'])[:10]:
        lines.append(f"| {row['template']} | {row['rgb_ssim']:.6f} | {row['layout_ssim']:.6f} |")
    (args.out_dir / 'REPORT.md').write_text('\n'.join(lines)+'\n')
    print('\n'.join(lines))

if __name__ == '__main__':
    main()
