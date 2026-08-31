from pathlib import Path
import re


def load(path: str):
    p = Path(path)
    return p, p.read_text()


def replace_exact(path: str, old: str, new: str, expected: int = 1):
    p, text = load(path)
    count = text.count(old)
    if count != expected:
        raise SystemExit(f"{path}: expected {expected} exact match(es), got {count}: {old[:100]!r}")
    p.write_text(text.replace(old, new))


def replace_regex(path: str, pattern: str, new: str, expected: int = 1):
    p, text = load(path)
    result, count = re.subn(pattern, new, text, flags=re.S)
    if count != expected:
        raise SystemExit(f"{path}: expected {expected} regex match(es), got {count}: {pattern[:100]!r}")
    p.write_text(result)


# Modern: top labels use symmetric 20 mm page margins.
# Blockig: kicker is wide and forced to one line, preventing a dangling "ALS".
replace_regex(
    "src/components/cover/layouts.ts",
    r"function modernTopClusterOffset\(.*?\n\}",
    '''function templateDefaultAdjustment(
  template: TemplateId,
  block: Block,
  overrides: StyleOverrides,
): Block {
  let adjusted = block;

  if (template === "modern") {
    if (block.id === "eyebrow" && overrides[block.id]?.x === undefined) {
      adjusted = { ...adjusted, style: { ...adjusted.style, x: 20 } };
    }
    if (
      (block.id === "foto" || block.id === "modernAccentCircle") &&
      overrides[block.id]?.y === undefined
    ) {
      adjusted = {
        ...adjusted,
        style: { ...adjusted.style, y: adjusted.style.y + MODERN_TOP_CLUSTER_OFFSET_MM },
      };
    }
  }

  if (template === "blockig" && block.id === "kicker") {
    adjusted = {
      ...adjusted,
      style: {
        ...adjusted.style,
        ...(overrides[block.id]?.w === undefined ? { w: 174 } : {}),
        ...(overrides[block.id]?.maxLines === undefined ? { maxLines: 1 } : {}),
      },
    };
  }

  return adjusted;
}''',
)
replace_exact(
    "src/components/cover/layouts.ts",
    "modernTopClusterOffset(template, block, overrides)",
    "templateDefaultAdjustment(template, block, overrides)",
    expected=2,
)

# Colorful: create a proper print-safe header zone.
replace_regex(
    "src/components/cv/archetype.ts",
    r"  colorful: band\(30, \{ footMm: 8 \}\),[^\n]*",
    "  colorful: band(40, { footMm: 8 }), //     CV: 40 mm Druckrand-Kopfzone, 8 mm Fussband",
)

# CV structural bands for Warm and Colorful. Warm deliberately gets no decorative circles.
cover_insert = '''      {template === "freundlich" || template === "colorful" ? (
        <style>{`
          html[data-dossier-template="freundlich"] [data-dossier-document="cv"] [data-cv-page="0"] [data-cv-background="motif"] > div::before {
            content: "";
            position: absolute;
            left: 0;
            right: 0;
            top: 0;
            height: 52mm;
            background: var(--cover-primary);
            pointer-events: none;
          }
          html[data-dossier-template="freundlich"] [data-dossier-document="cv"] [data-cv-page]:not([data-cv-page="0"]) [data-cv-background="motif"] > div::before {
            content: "";
            position: absolute;
            left: 0;
            right: 0;
            top: 0;
            height: 14mm;
            background: var(--cover-primary);
            pointer-events: none;
          }
          html[data-dossier-template="colorful"] [data-dossier-document="cv"] [data-cv-page="0"] [data-cv-background="motif"] > div::before {
            content: "";
            position: absolute;
            left: 0;
            right: 0;
            top: 0;
            height: 40mm;
            background: var(--cover-primary);
            pointer-events: none;
          }
          html[data-dossier-template="colorful"] [data-dossier-document="cv"] [data-cv-page]:not([data-cv-page="0"]) [data-cv-background="motif"] > div::before {
            content: "";
            position: absolute;
            left: 0;
            right: 0;
            top: 0;
            height: 14mm;
            background: var(--cover-primary);
            pointer-events: none;
          }
          html[data-dossier-template="colorful"] [data-dossier-document="cv"] [data-cv-background="motif"] > div::after {
            content: "";
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            height: 8mm;
            background: var(--cover-secondary);
            pointer-events: none;
          }
        `}</style>
      ) : null}
'''
replace_exact(
    "src/components/cover/CoverBackground.tsx",
    '      {template === "blockig" ? (',
    cover_insert + '      {template === "blockig" ? (',
)
replace_exact(
    "src/components/cover/CoverBackground.tsx",
    '            "--cover-accent": colors.accent ?? colors.secondary ?? colors.primary ?? colors.bg,',
    '            "--cover-secondary": colors.secondary ?? colors.accent ?? colors.primary ?? colors.bg,\n            "--cover-accent": colors.accent ?? colors.secondary ?? colors.primary ?? colors.bg,',
)

# Warm: remove the extra ring around the circular CV photo.
css_anchor = "  box-shadow: 0 0 0 var(--cv-photo-border-width, 0.3mm) var(--cv-photo-border-color, currentColor) !important;\n}\n"
replace_exact(
    "src/components/cv/layout-options.css",
    css_anchor,
    css_anchor
    + '\n/* Warm: no second ring around a circular portrait. */\n'
    + 'html[data-dossier-template="freundlich"] [data-dossier-document="cv"] [data-cv-photo] {\n'
    + '  box-shadow: none !important;\n}\n',
)

# Edel: same dark outer sheet + light inset writing surface as the CV.
# Edel blockig: same strong dark 36 mm top / 16 mm footer language as the CV.
replace_regex(
    "src/components/letter/LetterCanvas.tsx",
    r'''  edelBlockig: \{\n    kind: "band",\n    left: 25,\n    right: 23,\n    top: 31,\n    bottom: 25,\n    bandMm: 14,\n    footMm: 7,\n  \},''',
    '''  edelBlockig: {
    kind: "band",
    left: 25,
    right: 23,
    top: 44,
    bottom: 24,
    bandMm: 36,
    footMm: 16,
  },''',
)
edel_background = '''  const primaryRoles = onColorRoles(primary, accent);

  if (template === "edel") {
    return (
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ backgroundColor: color(colors, "bg") }}
        aria-hidden="true"
      >
        <div className="absolute" style={{ inset: "19mm", backgroundColor: palette.paper }} />
        <div
          className="absolute"
          style={{ inset: "12mm", border: `0.55px solid ${accent}`, opacity: 0.5 }}
        />
        <div
          className="absolute"
          style={{ inset: "15mm", border: `0.35px solid ${accent}`, opacity: 0.3 }}
        />
      </div>
    );
  }

  if (layout.kind === "card") {'''
replace_exact(
    "src/components/letter/LetterCanvas.tsx",
    '  const primaryRoles = onColorRoles(primary, accent);\n\n  if (layout.kind === "card") {',
    edel_background,
)
replace_exact(
    "src/components/letter/LetterCanvas.tsx",
    '            backgroundColor: template === "sonne" ? primary : accent,',
    '            backgroundColor:\n              template === "sonne" || template === "edelBlockig" ? primary : accent,',
)
band_anchor = '''      {layout.kind === "band" && (layout.bandMm ?? 0) > 0 && (
        <div
          className="absolute inset-x-0 top-0"
          style={{ height: `${layout.bandMm}mm`, backgroundColor: primary }}
        />
      )}

'''
replace_exact(
    "src/components/letter/LetterCanvas.tsx",
    band_anchor,
    band_anchor
    + '''      {template === "edelBlockig" && (
        <div
          className="absolute inset-x-0 top-[36mm] h-[0.3mm]"
          style={{ backgroundColor: accent, opacity: 0.72 }}
        />
      )}

''',
)

# Remove the temporary patch plumbing in the real fix commit.
Path(".github/scripts/visual-template-regression-fix.py").unlink()
Path(".github/workflows/visual-template-regression-fix.yml").unlink()
